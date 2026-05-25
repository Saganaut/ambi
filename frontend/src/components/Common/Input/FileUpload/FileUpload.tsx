// File upload component with drag-and-drop support and multi-file selection
import { XMarkIcon } from "@heroicons/react/24/outline";
import shared from "../Input.module.css";
import styles from "./FileUpload.module.css";
import { useFileUpload } from "./useFileUpload";
import { IconBtn } from "../../Buttons/IconBtn";

interface FileUploadProps {
  label?: string;
  accept?: string;
  errorMessage?: string;
  infoMessage?: string;
  onChange?: (files: File[]) => void;
}

const FileUpload = ({
  label,
  accept,
  errorMessage,
  infoMessage,
  onChange,
}: FileUploadProps) => {
  const {
    files,
    isDragging,
    inputRef,
    addFiles,
    removeFile,
    handleDragOver,
    handleDragLeave,
    handleDrop,
    openPicker,
  } = useFileUpload({ onChange });

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
          multiple
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
      {(errorMessage != null || infoMessage != null) && (
        <span
          className={[
            shared.inputInfoMessage,
            styles.message,
            errorMessage && shared.errorMessage,
          ]
            .filter(Boolean)
            .join(" ")}>
          {errorMessage ?? infoMessage}
        </span>
      )}
    </div>
  );
};

export { FileUpload };
