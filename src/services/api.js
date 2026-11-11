
const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || "http://localhost:8000";

// Create a new Excel processing job
export async function createJob(filename) {
  const response = await fetch(`${API_BASE_URL}/jobs`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ filename }),
  });

  if (!response.ok) {
    throw new Error(
      `Job creation failed: HTTP ${response.status}`
    );
  }

  return response.json();
}

// Upload Excel directly to Google Cloud Storage.
// Retries up to MAX_UPLOAD_ATTEMPTS times on transient failures
// (network errors or 5xx responses) using exponential backoff.
// A 409 Conflict (ifGenerationMatch=0 — object already exists)
// is a permanent error and is never retried.
const MAX_UPLOAD_ATTEMPTS = 3;
const UPLOAD_RETRY_BASE_MS = 1000;

export async function uploadToGCS(file, uploadUrl, contentType, onRetry) {
  let lastError;

  for (let attempt = 1; attempt <= MAX_UPLOAD_ATTEMPTS; attempt++) {
    // Notify the caller on every retry (not the first attempt).
    if (attempt > 1 && typeof onRetry === "function") {
      onRetry(attempt, MAX_UPLOAD_ATTEMPTS);
    }

    try {
      const response = await fetch(uploadUrl, {
        method: "PUT",
        headers: {
          "Content-Type": contentType,
        },
        body: file,
      });

      if (response.ok) {
        return true;
      }

      // 409 Conflict: the signed URL's ifGenerationMatch=0 guard fired,
      // meaning the object already exists. Retrying won't help.
      if (response.status === 409) {
        throw new Error(
          `GCS upload failed: object already exists (HTTP 409)`
        );
      }

      // Any other non-OK status is treated as transient on the first
      // two attempts, then surfaced as a permanent error on the last.
      lastError = new Error(
        `GCS upload failed: HTTP ${response.status} (attempt ${attempt}/${MAX_UPLOAD_ATTEMPTS})`
      );
    } catch (err) {
      // Re-throw permanent errors immediately (409 or any error we
      // explicitly threw above without setting lastError).
      if (!lastError && err.message.includes("already exists")) {
        throw err;
      }

      // Network-level error (fetch itself threw — offline, DNS, etc.)
      lastError = lastError ?? new Error(
        `GCS upload failed: ${err.message} (attempt ${attempt}/${MAX_UPLOAD_ATTEMPTS})`
      );
    }

    if (attempt < MAX_UPLOAD_ATTEMPTS) {
      // Exponential backoff: 1 s, 2 s before the 2nd and 3rd attempts.
      await new Promise((resolve) =>
        setTimeout(resolve, UPLOAD_RETRY_BASE_MS * 2 ** (attempt - 1))
      );
    }
  }

  throw lastError;
}

// Confirm upload and queue the job for processing
export async function confirmUpload(jobId) {
  const response = await fetch(
    `${API_BASE_URL}/jobs/${encodeURIComponent(jobId)}/confirm`,
    {
      method: "POST",
    }
  );

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));

    throw new Error(
      error.detail || `Confirmation failed: HTTP ${response.status}`
    );
  }

  return response.json();
}

// Fetch recent jobs from Firestore via FastAPI
export async function getJobs() {
  const response = await fetch(`${API_BASE_URL}/jobs`);

  if (!response.ok) {
    throw new Error(
      `Failed to load job history: HTTP ${response.status}`
    );
  }

  const data = await response.json();

  return data.jobs;
}

// Get complete processing status of one job
export async function getJobStatus(jobId) {
  const response = await fetch(
    `${API_BASE_URL}/jobs/${encodeURIComponent(jobId)}`
  );

  if (!response.ok) {
    throw new Error(
      `Unable to fetch job status: HTTP ${response.status}`
    );
  }

  return response.json();
}

// Generate a temporary download URL for the error CSV
export async function getErrorReportUrl(jobId) {
  const response = await fetch(
    `${API_BASE_URL}/jobs/${encodeURIComponent(jobId)}/error-report`
  );

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));

    throw new Error(
      error.detail ||
        `Unable to get error report: HTTP ${response.status}`
    );
  }

  const data = await response.json();

  return data.download_url;
}
