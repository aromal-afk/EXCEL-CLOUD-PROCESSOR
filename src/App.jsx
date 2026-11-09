
import { useEffect, useState } from "react";
import "./App.css";

import {
  createJob,
  uploadToGCS,
  confirmUpload,
  getJobs,
  getJobStatus,
  getErrorReportUrl,
} from "./services/api";

function App() {
  const [files, setFiles] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [results, setResults] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [historyError, setHistoryError] = useState("");

  // Convert Firestore job data into frontend format.
  const normalizeJob = (job) => ({
    jobId: job.job_id,
    filename: job.filename || "Unknown file",
    status: job.status || "Unknown",
    validRows: job.valid_rows ?? null,
    invalidRows: job.invalid_rows ?? null,
    savedRecords: job.saved_records ?? null,
    errorReportAvailable: Boolean(
      job.error_report_object_name
    ),
    refreshing: false,
    downloading: false,
    error: null,
  });

  // Update a job using its unique job ID.
  const updateResult = (jobId, changes) => {
    setResults((previous) =>
      previous.map((result) =>
        result.jobId === jobId
          ? { ...result, ...changes }
          : result
      )
    );
  };

  // Fetch saved jobs from Firestore through FastAPI.
  const loadJobHistory = async () => {
    setLoadingHistory(true);
    setHistoryError("");

    try {
      const jobs = await getJobs();
      setResults(jobs.map(normalizeJob));
    } catch (error) {
      setHistoryError(error.message);
    } finally {
      setLoadingHistory(false);
    }
  };

  // Automatically restore history when React loads.
  useEffect(() => {
    loadJobHistory();
  }, []);

  const handleFileChange = (event) => {
    setFiles(Array.from(event.target.files));
  };

  const handleUpload = async () => {
    if (!files.length || uploading) return;

    setUploading(true);

    await Promise.all(
      files.map(async (file) => {
        const temporaryId = crypto.randomUUID();

        setResults((previous) => [
          {
            jobId: temporaryId,
            filename: file.name,
            status: "Creating job",
            isTemporary: true,
            error: null,
          },
          ...previous,
        ]);

        let currentId = temporaryId;

        try {
          const job = await createJob(file.name);
          currentId = job.job_id;

          setResults((previous) =>
            previous.map((result) =>
              result.jobId === temporaryId
                ? {
                    ...result,
                    jobId: job.job_id,
                    status: "Uploading",
                    isTemporary: false,
                  }
                : result
            )
          );

          await uploadToGCS(
            file,
            job.upload_url,
            job.upload_content_type
          );

          updateResult(currentId, {
            status: "Confirming upload",
          });

          const confirmation = await confirmUpload(
            job.job_id
          );

          updateResult(currentId, {
            status: confirmation.status || "Queued",
          });
        } catch (error) {
          updateResult(currentId, {
            status: "Failed",
            error: error.message,
          });
        }
      })
    );

    setUploading(false);
    setFiles([]);

    // Reload the latest job records from Firestore.
    await loadJobHistory();
  };

  const handleRefreshStatus = async (jobId) => {
    updateResult(jobId, {
      refreshing: true,
      error: null,
    });

    try {
      const job = await getJobStatus(jobId);

      updateResult(jobId, {
        status: job.status || "Unknown",
        validRows: job.valid_rows ?? null,
        invalidRows: job.invalid_rows ?? null,
        savedRecords: job.saved_records ?? null,
        errorReportAvailable: Boolean(
          job.error_report_object_name
        ),
      });
    } catch (error) {
      updateResult(jobId, {
        error: error.message,
      });
    } finally {
      updateResult(jobId, {
        refreshing: false,
      });
    }
  };

  const handleDownloadErrors = async (jobId) => {
    updateResult(jobId, {
      downloading: true,
      error: null,
    });

    try {
      const downloadUrl = await getErrorReportUrl(jobId);

      // Navigate to the temporary signed download URL.
      window.location.assign(downloadUrl);
    } catch (error) {
      updateResult(jobId, {
        error: error.message,
      });
    } finally {
      updateResult(jobId, {
        downloading: false,
      });
    }
  };

  return (
    <main className="container">
      <h1>Bulk Excel Processor</h1>

      <p>
        Upload multiple Excel files for asynchronous processing.
      </p>

      <section className="upload-card">
        <input
          type="file"
          accept=".xlsx"
          multiple
          onChange={handleFileChange}
          disabled={uploading}
        />

        <button
          onClick={handleUpload}
          disabled={!files.length || uploading}
        >
          {uploading ? "Uploading..." : "Upload Files"}
        </button>
      </section>

      <section className="results">
        <h2>Job History</h2>

        <button
          type="button"
          onClick={loadJobHistory}
          disabled={loadingHistory || uploading}
        >
          {loadingHistory
            ? "Loading..."
            : "Refresh All Jobs"}
        </button>

        {historyError && (
          <p className="error">{historyError}</p>
        )}

        {results.length === 0 && !loadingHistory && (
          <p>No jobs found.</p>
        )}

        {results.map((result) => (
          <div
            className="result-item"
            key={result.jobId}
          >
            <div>
              <strong>{result.filename}</strong>

              <small>Job ID: {result.jobId}</small>

              {result.validRows != null && (
                <small>
                  Valid rows: {result.validRows}
                </small>
              )}

              {result.invalidRows != null && (
                <small>
                  Invalid rows: {result.invalidRows}
                </small>
              )}

              {result.savedRecords != null && (
                <small>
                  Saved records: {result.savedRecords}
                </small>
              )}
            </div>

            <div>
              <span>{result.status}</span>

              {result.error && (
                <small className="error">
                  {result.error}
                </small>
              )}

              {!result.isTemporary && (
                <button
                  type="button"
                  disabled={result.refreshing}
                  onClick={() =>
                    handleRefreshStatus(result.jobId)
                  }
                >
                  {result.refreshing
                    ? "Refreshing..."
                    : "Refresh Status"}
                </button>
              )}

              {result.errorReportAvailable && (
                <button
                  type="button"
                  disabled={result.downloading}
                  onClick={() =>
                    handleDownloadErrors(result.jobId)
                  }
                >
                  {result.downloading
                    ? "Preparing..."
                    : "Download Error Report"}
                </button>
              )}
            </div>
          </div>
        ))}
      </section>
    </main>
  );
}

export default App;
