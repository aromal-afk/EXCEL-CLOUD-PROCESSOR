
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

// Upload Excel directly to Google Cloud Storage
export async function uploadToGCS(file, uploadUrl, contentType) {
  const response = await fetch(uploadUrl, {
    method: "PUT",
    headers: {
      "Content-Type": contentType,
    },
    body: file,
  });

  if (!response.ok) {
    throw new Error(
      `GCS upload failed: HTTP ${response.status}`
    );
  }

  return true;
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
