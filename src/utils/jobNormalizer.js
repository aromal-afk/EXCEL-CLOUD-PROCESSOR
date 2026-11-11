import { ACTIVE_STATUSES, STALE_AFTER_MS } from "../constants/jobStatus";
import {
  parseJobTimestamp,
  jobDurationLabel,
  durationTooltip,
} from "./formatting";

/**
 * Returns true if a job is still actively progressing and worth polling.
 * Jobs that haven't been touched within STALE_AFTER_MS are considered orphaned.
 */
export const isPollable = (job) => {
  if (!ACTIVE_STATUSES.has(job.status)) return false;

  const touched = Date.parse(
    job.updated_at || job.queued_at || job.created_at
  );

  return Number.isNaN(touched) || Date.now() - touched < STALE_AFTER_MS;
};

/**
 * Convert a raw Firestore job document into the shape used by the frontend.
 *
 * @param {object} job              - Raw job data from the API.
 * @param {object} [options]
 * @param {number|null} [options.uploadFinishedAt] - Client-side timestamp (ms)
 *   recorded the moment the GCS PUT request completed. Used to calculate the
 *   total processing duration without depending on server-side timestamps.
 */
export const normalizeJob = (job, { uploadFinishedAt = null } = {}) => ({
  jobId: job.job_id,
  filename: job.filename || "Unknown file",
  status: job.status || "Unknown",
  validRows: job.valid_rows ?? null,
  invalidRows: job.invalid_rows ?? null,
  savedRecords: job.saved_records ?? null,
  errorReportAvailable: Boolean(job.error_report_object_name),
  uploadFinishedAt:
    uploadFinishedAt ??
    parseJobTimestamp(job.uploaded_at) ??
    parseJobTimestamp(job.queued_at),
  totalDurationLabel: jobDurationLabel(job, uploadFinishedAt),
  totalDurationTooltip: durationTooltip(job, uploadFinishedAt),
  pollable: isPollable(job),
  refreshing: false,
  downloading: false,
  error: null,
});

