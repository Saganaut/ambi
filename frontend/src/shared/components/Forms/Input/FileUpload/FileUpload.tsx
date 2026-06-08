// File upload component with drag-and-drop support and multi-file selection
import { XMarkIcon } from "@heroicons/react/24/outline";
import shared from "../Input.module.css";
import styles from "./FileUpload.module.css";
import { useFileUpload } from "./useFileUpload";
import { IconBtn } from "@ui/Buttons/IconBtn";

interface FileUploadProps {
  label?: string;
  accept?: string;
  /** Allow selecting more than one file. Default true. */
  multiple?: boolean;
  /** Reject files larger than this (bytes); also drives the rejection message. */
  maxBytes?: number;
  errorMessage?: string;
  infoMessage?: string;
  onChange?: (files: File[]) => void;
}

const FileUpload = ({
  label,
  accept,
  multiple = true,
  maxBytes,
  errorMessage,
  infoMessage,
  onChange,
}: FileUploadProps) => {
  const {
    files,
    isDragging,
    rejection,
    inputRef,
    addFiles,
    removeFile,
    handleDragOver,
    handleDragLeave,
    handleDrop,
    openPicker,
  } = useFileUpload({ onChange, multiple, accept, maxBytes });

  return (
    <div className={styles.fileUploadContainer}>
      {label && <label>{label}</label>}
      <div
        className={[styles.dropZone, isDragging && styles.dragging]
          .filter(Boolean)
          .join(" ")}
        onClick={openPicker}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        role='button'
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === "Enter") openPicker();
        }}>
        <input
          ref={inputRef}
          type='file'
          multiple={multiple}
          accept={accept}
          onChange={(e) => {
            addFiles(e.target.files);
          }}
        />
        <span className={styles.dropZoneText}>
          {isDragging ? "Drop files here" : "Click or drag files here"}
        </span>
      </div>
      {files.length > 0 && (
        <ul className={styles.fileList}>
          {files.map((file, i) => (
            <li
              key={`${file.name}-${file.size}-${file.lastModified}`}
              className={styles.fileItem}>
              <span className={styles.fileName}>{file.name}</span>

              <IconBtn
                fill='ghost'
                icon={<XMarkIcon />}
                size='xs'
                className={styles.removeFile}
                onClick={() => {
                  removeFile(i);
                }}
                aria-label={`Remove ${file.name}`}
              />
            </li>
          ))}
        </ul>
      )}
      {(rejection != null || errorMessage != null || infoMessage != null) && (
        <span
          className={[
            shared.inputInfoMessage,
            styles.message,
            (rejection ?? errorMessage) && shared.errorMessage,
          ]
            .filter(Boolean)
            .join(" ")}>
          {rejection ?? errorMessage ?? infoMessage}
        </span>
      )}
    </div>
  );
};

export { FileUpload };
