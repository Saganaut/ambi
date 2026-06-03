// Behavior hook for FileUpload: holds the accepted-files list, the
// drag-over state, and the add/remove/drag handlers so the JSX is purely
// presentational.
import React, { useCallback, useRef, useState } from "react";

interface UseFileUploadArgs {
  onChange?: (files: File[]) => void;
}

const useFileUpload = ({ onChange }: UseFileUploadArgs) => {
  const [files, setFiles] = useState<File[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const addFiles = useCallback(
    (incoming: FileList | null) => {
      if (!incoming) return;
      const next = [...files, ...Array.from(incoming)];
      setFiles(next);
      onChange?.(next);
    },
    [files, onChange],
  );

  const removeFile = (index: number) => {
    const next = files.filter((_, i) => i !== index);
    setFiles(next);
    onChange?.(next);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    if (!e.currentTarget.contains(e.relatedTarget as Node)) {
      setIsDragging(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    addFiles(e.dataTransfer.files);
  };

  const openPicker = () => {
    inputRef.current?.click();
  };

  return {
    files,
    isDragging,
    inputRef,
    addFiles,
    removeFile,
    handleDragOver,
    handleDragLeave,
    handleDrop,
    openPicker,
  };
};

export { useFileUpload };
