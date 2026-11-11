import { TERMINAL_SUCCESS } from "../constants/jobStatus";

/** Format raw byte counts into a human-readable string. */
export const formatBytes = (bytes) => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

/** Format a duration in milliseconds into a human-readable string (e.g. "2m 30s"). */
export const formatDuration = (ms) => {
  if (ms == null || ms < 0) return null;
  const totalSeconds = Math.round(ms / 1000);
  if (totalSeconds < 60) return `${totalSeconds}s`;
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  if (minutes < 60) {
    return seconds > 0 ? `${minutes}m ${seconds}s` : `${minutes}m`;
  }
  const hours = Math.floor(minutes / 60);
  const remMin = minutes % 60;
  return remMin > 0 ? `${hours}h ${remMin}m` : `${hours}h`;
};

/**
 * Parse a Firestore timestamp value (object with seconds/nanoseconds, or an
 * ISO string) into a Unix millisecond epoch. Returns null if unparseable.
 */
export const parseJobTimestamp = (value) => {
  if (value == null || value === "") return null;

  if (typeof value === "object" && value.seconds != null) {
    return value.seconds * 1000 + Math.floor((value.nanoseconds || 0) / 1e6);
  }

  const ms = Date.parse(String(value));
  return Number.isNaN(ms) ? null : ms;
};

/**
 * Returns the best available "start" timestamp for a job's total duration
 * calculation, preferring the client-measured upload finish time.
 */
export const jobStartTimestamp = (job, clientUploadFinishedAt = null) =>
  clientUploadFinishedAt ??
  parseJobTimestamp(job.uploaded_at) ??
  parseJobTimestamp(job.queued_at) ??
  parseJobTimestamp(job.started_at) ??
  parseJobTimestamp(job.created_at);

/** Returns a tooltip string explaining what the duration interval covers. */
export const durationTooltip = (job, clientUploadFinishedAt = null) => {
  if (clientUploadFinishedAt != null) {
    return "From file upload finished to processing finished";
  }
  if (job.uploaded_at || job.queued_at) {
    return "From upload confirmed to processing finished";
  }
  if (job.started_at) {
    return "From worker start to processing finished (upload/queue timestamps missing on this job)";
  }
  return "From job created to processing finished";
};

/** Wall time from upload / queue / worker start to terminal success. */
export const jobDurationLabel = (job, clientUploadFinishedAt = null) => {
  if (!TERMINAL_SUCCESS.has(job.status)) return null;

  const start = jobStartTimestamp(job, clientUploadFinishedAt);
  const end = parseJobTimestamp(job.completed_at);

  if (start == null || end == null) return null;

  return formatDuration(end - start);
};

/** Stable identity key for a local File object (used for deduplication). */
export const fileKey = (file) =>
  `${file.name}-${file.size}-${file.lastModified}`;

