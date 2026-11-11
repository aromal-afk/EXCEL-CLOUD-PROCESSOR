import { formatBytes } from "../utils/formatting";
import { XIcon, SheetIcon, UploadIcon } from "./icons/Icons";

/**
 * DropZone — drag-and-drop / file picker section plus the pending-file list.
 *
 * Props:
 *  files         {Array}    Items in the pending queue: [{ id, file }, ...]
 *  dragActive    {boolean}  Whether a drag is currently over the zone.
 *  uploading     {boolean}  Whether an upload is in progress (disables controls).
 *  selectionNotice {string} Warning shown when non-.xlsx files were skipped.
 *  onDragOver    {function}
 *  onDragLeave   {function}
 *  onDrop        {function}
 *  onFileChange  {function} Input change handler.
 *  onRemoveFile  {function(id)} Remove a single file from the queue.
 *  onClearFiles  {function}  Clear the whole queue.
 *  onUpload      {function}  Trigger the upload sequence.
 */
export default function DropZone({
  files,
  dragActive,
  uploading,
  selectionNotice,
  onDragOver,
  onDragLeave,
  onDrop,
  onFileChange,
  onRemoveFile,
  onClearFiles,
  onUpload,
}) {
  const totalSize = files.reduce((sum, { file }) => sum + file.size, 0);

  return (
    <section className="card">
      <label
        className={`dropzone${dragActive ? " is-active" : ""}${
          uploading ? " is-disabled" : ""
        }`}
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onDrop={onDrop}
      >
        <input
          type="file"
          accept=".xlsx"
          multiple
          onChange={onFileChange}
          disabled={uploading}
        />
        <span className="dropzone-icon">
          <UploadIcon />
        </span>
        <span className="dropzone-title">
          Drag and drop Excel files here
        </span>
        <span className="dropzone-hint">
          or <span className="link">browse</span> to choose files (.xlsx)
        </span>
      </label>

      {selectionNotice && (
        <p className="notice">{selectionNotice}</p>
      )}

      {files.length > 0 && (
        <>
          <ul className="file-list">
            {files.map(({ id, file }) => (
              <li className="file-item" key={id}>
                <span className="file-icon">
                  <SheetIcon />
                </span>
                <span className="file-meta">
                  <span className="file-name" title={file.name}>
                    {file.name}
                  </span>
                  <span className="file-size">
                    {formatBytes(file.size)}
                  </span>
                </span>
                <button
                  type="button"
                  className="icon-button"
                  onClick={() => onRemoveFile(id)}
                  disabled={uploading}
                  aria-label={`Remove ${file.name}`}
                  title="Remove"
                >
                  <XIcon />
                </button>
              </li>
            ))}
          </ul>

          <div className="upload-footer">
            <span className="muted">
              {files.length} file{files.length > 1 ? "s" : ""}{" "}
              selected · {formatBytes(totalSize)}
            </span>
            <div className="actions">
              <button
                type="button"
                className="button button-ghost"
                onClick={onClearFiles}
                disabled={uploading}
              >
                Clear all
              </button>
              <button
                type="button"
                className="button button-primary"
                onClick={onUpload}
                disabled={uploading}
              >
                {uploading
                  ? "Uploading..."
                  : `Upload ${files.length} file${files.length > 1 ? "s" : ""}`}
              </button>
            </div>
          </div>
        </>
      )}
    </section>
  );
}

