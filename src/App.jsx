import { useState } from "react";
import "./App.css";

import { createJob, uploadToGCS, confirmUpload } from "./services/api";
import { fileKey } from "./utils/formatting";
import { useJobHistory } from "./hooks/useJobHistory";
import DropZone from "./components/DropZone";
import JobList from "./components/JobList";

function App() {
  const [files, setFiles] = useState([]);
  const [dragActive, setDragActive] = useState(false);
  const [selectionNotice, setSelectionNotice] = useState("");
  const [uploading, setUploading] = useState(false);

  const {
    results,
    setResults,
    loadingHistory,
    historyError,
    loadJobHistory,
    updateResult,
    handleRefreshStatus,
    handleDownloadErrors,
  } = useJobHistory();

  // ── File selection helpers ──────────────────────────────────────────────────

  const addFiles = (fileList) => {
    const incoming = Array.from(fileList);
    const excel = incoming.filter((file) =>
      file.name.toLowerCase().endsWith(".xlsx")
    );
    const skipped = incoming.length - excel.length;

    setSelectionNotice(
      skipped
        ? `${skipped} file${skipped > 1 ? "s were" : " was"} skipped. Only .xlsx files are supported.`
        : ""
    );

    setFiles((previous) => {
      const existing = new Set(previous.map((item) => item.id));
      const additions = excel
        .map((file) => ({ id: fileKey(file), file }))
        .filter((item) => !existing.has(item.id));

      return [...previous, ...additions];
    });
  };

  const handleFileChange = (event) => {
    addFiles(event.target.files);
    // Allow the same file to be picked again after removal.
    event.target.value = "";
  };

  const handleRemoveFile = (id) => {
    setFiles((previous) => previous.filter((item) => item.id !== id));
  };

  const handleClearFiles = () => {
    setFiles([]);
    setSelectionNotice("");
  };

  // ── Drag-and-drop handlers ──────────────────────────────────────────────────

  const handleDragOver = (event) => {
    event.preventDefault();
    if (!uploading) setDragActive(true);
  };

  const handleDragLeave = (event) => {
    event.preventDefault();
    setDragActive(false);
  };

  const handleDrop = (event) => {
    event.preventDefault();
    setDragActive(false);
    if (uploading) return;
    addFiles(event.dataTransfer.files);
  };

  // ── Upload sequence ─────────────────────────────────────────────────────────

  const handleUpload = async () => {
    if (!files.length || uploading) return;

    setUploading(true);
    setSelectionNotice("");

    await Promise.all(
      files.map(async ({ file }) => {
        const temporaryId = crypto.randomUUID();

        // Insert a placeholder row immediately so the user sees progress.
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

          // Replace the temporary placeholder with the real job ID.
          setResults((previous) =>
            previous.map((result) =>
              result.jobId === temporaryId
                ? { ...result, jobId: job.job_id, status: "Uploading", isTemporary: false }
                : result
            )
          );

          await uploadToGCS(
            file,
            job.upload_url,
            job.upload_content_type,
            // Show "Uploading (retry N/M)…" in the UI on each retry.
            (attempt, max) => {
              if (attempt > 1) {
                updateResult(currentId, {
                  status: `Uploading (retry ${attempt}/${max})`,
                });
              }
            }
          );

          const uploadFinishedAt = Date.now();
          updateResult(currentId, { status: "Confirming upload", uploadFinishedAt });

          const confirmation = await confirmUpload(job.job_id);
          updateResult(currentId, {
            status: confirmation.status || "Queued",
            pollable: true,
          });
        } catch (error) {
          updateResult(currentId, { status: "Failed", error: error.message });
        }
      })
    );

    setUploading(false);
    setFiles([]);

    // Reload the latest job records from Firestore.
    await loadJobHistory();
  };

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <main className="container">
      <header className="page-header">
        <h1>Bulk Excel Processor</h1>
        <p className="subtitle">
          Upload multiple Excel files for asynchronous processing.
        </p>
      </header>

      <DropZone
        files={files}
        dragActive={dragActive}
        uploading={uploading}
        selectionNotice={selectionNotice}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onFileChange={handleFileChange}
        onRemoveFile={handleRemoveFile}
        onClearFiles={handleClearFiles}
        onUpload={handleUpload}
      />

      <JobList
        results={results}
        loadingHistory={loadingHistory}
        historyError={historyError}
        uploading={uploading}
        onRefreshAll={loadJobHistory}
        onRefreshStatus={handleRefreshStatus}
        onDownloadErrors={handleDownloadErrors}
      />
    </main>
  );
}

export default App;
