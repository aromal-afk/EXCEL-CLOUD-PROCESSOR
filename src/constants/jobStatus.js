// Status → badge colour mapping used by the job list.
export const STATUS_TONES = {
  Completed: "success",
  CompletedWithErrors: "warning",
  Failed: "danger",
  RetryPending: "warning",
  Processing: "info",
  Queued: "info",
  Queueing: "info",
  Uploading: "info",
  "Uploading (retry 2/3)": "warning",
  "Uploading (retry 3/3)": "warning",
  "Creating job": "info",
  "Confirming upload": "info",
};

// Human-readable overrides for status strings that differ from their label.
export const STATUS_LABELS = {
  AwaitingUpload: "Awaiting upload",
  CompletedWithErrors: "Completed with errors",
  RetryPending: "Retry pending",
};

// Jobs in these statuses are actively progressing and should be polled.
// AwaitingUpload is excluded so abandoned uploads don't poll forever.
export const ACTIVE_STATUSES = new Set([
  "Queueing",
  "Queued",
  "Processing",
  "RetryPending",
]);

// Jobs whose status indicates terminal success (used for duration display).
export const TERMINAL_SUCCESS = new Set([
  "Completed",
  "CompletedWithErrors",
]);

// How often the frontend polls GCS/Firestore for job updates (ms).
export const POLL_INTERVAL_MS = 5000;

// Workers renew their lease (and updated_at) every batch, so an active job
// untouched for this long is considered orphaned and not worth polling.
export const STALE_AFTER_MS = 30 * 60 * 1000;

