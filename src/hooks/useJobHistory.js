import { useEffect, useState } from "react";
import { getJobs, getJobStatus, getErrorReportUrl } from "../services/api";
import { normalizeJob } from "../utils/jobNormalizer";
import { POLL_INTERVAL_MS } from "../constants/jobStatus";

/**
 * useJobHistory — manages fetching, polling, and mutating the job results list.
 *
 * Returns:
 *  results           {Array}    Normalised job objects (including temporary ones during upload).
 *  setResults        {function} Setter — exposed so the upload flow can inject temporary rows.
 *  loadingHistory    {boolean}
 *  historyError      {string}
 *  loadJobHistory    {function} Manually re-fetch all jobs.
 *  updateResult      {function(jobId, changes)} Patch a single result entry.
 *  handleRefreshStatus  {function(jobId)}
 *  handleDownloadErrors {function(jobId)}
 */
export function useJobHistory() {
  const [results, setResults] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [historyError, setHistoryError] = useState("");

  // Patch a single result entry by job ID.
  const updateResult = (jobId, changes) => {
    setResults((previous) =>
      previous.map((result) =>
        result.jobId === jobId ? { ...result, ...changes } : result
      )
    );
  };

  // Fetch the full job list from the API and replace the results state.
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

  // Load history on mount.
  useEffect(() => {
    loadJobHistory();
  }, []);

  const hasActiveJobs = results.some(
    (result) => !result.isTemporary && result.pollable
  );

  // Poll the API while any job is still queued or processing.
  useEffect(() => {
    if (!hasActiveJobs) return undefined;

    const timer = setInterval(async () => {
      try {
        const jobs = await getJobs();
        const latest = new Map(jobs.map((job) => [job.job_id, job]));

        setResults((previous) =>
          previous.map((result) => {
            const job = latest.get(result.jobId);

            if (!job || result.isTemporary) return result;

            const merged = normalizeJob(
              { ...job, job_id: result.jobId },
              { uploadFinishedAt: result.uploadFinishedAt }
            );

            return {
              ...result,
              ...merged,
              // Preserve transient UI flags that the poll should not reset.
              refreshing: result.refreshing,
              downloading: result.downloading,
              error: result.error,
            };
          })
        );
      } catch {
        // Keep the last known state; the next tick will retry.
      }
    }, POLL_INTERVAL_MS);

    return () => clearInterval(timer);
  }, [hasActiveJobs]);

  // Refresh a single job's status on demand.
  const handleRefreshStatus = async (jobId) => {
    updateResult(jobId, { refreshing: true, error: null });

    try {
      const job = await getJobStatus(jobId);

      setResults((previous) =>
        previous.map((result) => {
          if (result.jobId !== jobId) return result;

          const merged = normalizeJob(
            { ...job, job_id: jobId },
            { uploadFinishedAt: result.uploadFinishedAt }
          );

          return {
            ...result,
            ...merged,
            refreshing: result.refreshing,
            downloading: result.downloading,
            error: result.error,
          };
        })
      );
    } catch (error) {
      updateResult(jobId, { error: error.message });
    } finally {
      updateResult(jobId, { refreshing: false });
    }
  };

  // Obtain a signed download URL for an error report and navigate to it.
  const handleDownloadErrors = async (jobId) => {
    updateResult(jobId, { downloading: true, error: null });

    try {
      const downloadUrl = await getErrorReportUrl(jobId);
      window.location.assign(downloadUrl);
    } catch (error) {
      updateResult(jobId, { error: error.message });
    } finally {
      updateResult(jobId, { downloading: false });
    }
  };

  return {
    results,
    setResults,
    loadingHistory,
    historyError,
    loadJobHistory,
    updateResult,
    handleRefreshStatus,
    handleDownloadErrors,
  };
}

