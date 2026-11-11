# EXCEL-CLOUD-PROCESSOR

React (Vite) frontend for the Bulk Excel Processor.

Full architecture, design decisions, deployment and performance results live in
the main README:
[EXCEL-PROCESSOR-API/README.md](https://github.com/aromal-afk/EXCEL-PROCESSOR-API#readme).

## Features

* Drag-and-drop or browse to select multiple `.xlsx` files. Each file can be removed before uploading.
* Every file is uploaded in parallel and directly to Cloud Storage through a
  signed URL. The API only creates the job and queues it.
* Job history with colour-coded status, valid/invalid/saved row counts,
  per-job refresh and an error report download for jobs with invalid rows.
* Status refreshes automatically every 5 seconds while any job is queued or
  processing, and stops when all jobs have finished.

## Upload flow (`src/services/api.js`)

1. `POST /jobs` creates the job and returns a signed `PUT` URL.
2. The browser `PUT`s the file straight to Cloud Storage.
3. `POST /jobs/{id}/confirm` queues the job on Pub/Sub.
4. `GET /jobs` and `GET /jobs/{id}` show status.
5. `GET /jobs/{id}/error-report` returns a short-lived download URL.

## Run locally

```bash
npm install
echo "VITE_API_BASE_URL=http://localhost:8000" > .env.local
npm run dev     # http://localhost:5173
```

The bucket must allow the frontend origin in its CORS config (`cors.json` in
the API repo), and the API's `CORS_ORIGINS` must include it.

## Build

```bash
npm run build   # outputs dist/, deployable to Firebase Hosting, Cloud Storage or Cloud Run
```
