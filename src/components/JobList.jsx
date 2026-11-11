import { STATUS_TONES, STATUS_LABELS } from "../constants/jobStatus";
import { SheetIcon } from "./icons/Icons";

/**
 * JobList — renders the full Job History section including the refresh button,
 * loading / error / empty states, and each individual job card.
 *
 * Props:
 *  results         {Array}    Normalised job objects.
 *  loadingHistory  {boolean}  True while the initial history fetch is in-flight.
 *  historyError    {string}   Non-empty string when the fetch failed.
 *  uploading       {boolean}  Disables the "Refresh all" button during uploads.
 *  onRefreshAll    {function} Reload all jobs from the API.
 *  onRefreshStatus {function(jobId)} Refresh a single job's status.
 *  onDownloadErrors{function(jobId)} Trigger error-report download.
 */
export default function JobList({
  results,
  loadingHistory,
  historyError,
  uploading,
  onRefreshAll,
  onRefreshStatus,
  onDownloadErrors,
}) {
  return (
    <section className="card">
      <div className="section-header">
        <div>
          <h2>Job History</h2>
          {!loadingHistory && results.length > 0 && (
            <span className="muted">
              {results.length} job{results.length > 1 ? "s" : ""}
            </span>
          )}
        </div>

        <button
          type="button"
          className="button button-secondary"
          onClick={onRefreshAll}
          disabled={loadingHistory || uploading}
        >
          {loadingHistory ? "Loading..." : "Refresh all"}
        </button>
      </div>

      {historyError && (
        <p className="alert">{historyError}</p>
      )}

      {results.length === 0 && !loadingHistory && !historyError && (
        <p className="empty-state">
          No jobs yet. Uploaded files will appear here.
        </p>
      )}

      <ul className="job-list">
        {results.map((result) => (
          <li className="job-item" key={result.jobId}>
            <div className="job-main">
              <div className="job-title-row">
                <span className="file-icon">
                  <SheetIcon />
                </span>
                <strong className="job-filename" title={result.filename}>
                  {result.filename}
                </strong>
                <span
                  className={`badge badge-${
                    STATUS_TONES[result.status] || "neutral"
                  }`}
                >
                  {STATUS_LABELS[result.status] || result.status}
                </span>
              </div>

              <code className="job-id">{result.jobId}</code>

              {(result.validRows != null ||
                result.invalidRows != null ||
                result.savedRecords != null ||
                result.totalDurationLabel) && (
                <div className="stats">
                  {result.validRows != null && (
                    <span className="stat">
                      <span className="stat-value">{result.validRows}</span>
                      valid
                    </span>
                  )}
                  {result.invalidRows != null && (
                    <span
                      className={`stat${
                        result.invalidRows > 0 ? " stat-danger" : ""
                      }`}
                    >
                      <span className="stat-value">{result.invalidRows}</span>
                      invalid
                    </span>
                  )}
                  {result.savedRecords != null && (
                    <span className="stat">
                      <span className="stat-value">{result.savedRecords}</span>
                      saved
                    </span>
                  )}
                  {result.totalDurationLabel && (
                    <span
                      className="stat stat-duration"
                      title={result.totalDurationTooltip}
                    >
                      <span className="stat-value">
                        {result.totalDurationLabel}
                      </span>
                      total time
                    </span>
                  )}
                </div>
              )}

              {result.error && (
                <p className="job-error">{result.error}</p>
              )}
            </div>

            <div className="job-actions">
              {!result.isTemporary && (
                <button
                  type="button"
                  className="button button-secondary button-small"
                  disabled={result.refreshing}
                  onClick={() => onRefreshStatus(result.jobId)}
                >
                  {result.refreshing ? "Refreshing..." : "Refresh"}
                </button>
              )}

              {result.errorReportAvailable && (
                <button
                  type="button"
                  className="button button-danger-soft button-small"
                  disabled={result.downloading}
                  onClick={() => onDownloadErrors(result.jobId)}
                >
                  {result.downloading ? "Preparing..." : "Error report"}
                </button>
              )}
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}

