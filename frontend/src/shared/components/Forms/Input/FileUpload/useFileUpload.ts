// Behavior hook for FileUpload: holds the accepted-files list, the
// drag-over state, and the add/remove/drag handlers so the JSX is purely
// presentational.
//
// Two modes via `multiple` (default true, back-compat): multi-file appends to
// the list; single-file replaces, so the list holds at most one. Incoming files
// are screened against `accept` (MIME globs like `image/*` or extensions) and
// `maxBytes`; rejects are surfaced via `rejection` rather than silently dropped.
import React, { useCallback, useRef, useState } from "react";

interface UseFileUploadArgs {
  onChange?: (files: File[]) => void;
  /** Allow more than one file. Default true (the original behavior). */
  multiple?: boolean;
  /** Same syntax as the input `accept` attr; used to validate, not just hint. */
  accept?: string;
  /** Reject any file larger than this many bytes. */
  maxBytes?: number;
}

/** Does `file` satisfy an `accept` token list (`image/*,.png` …)? Empty = any. */
const matchesAccept = (file: File, accept: string | undefined): boolean => {
  if (!accept) return true;
  const tokens = accept
    .split(",")
    .map((t) => t.trim().toLowerCase())
    .filter(Boolean);
  if (tokens.length === 0) return true;
  const name = file.name.toLowerCase();
  const type = file.type.toLowerCase();
  return tokens.some((token) => {
    if (token.startsWith(".")) return name.endsWith(token);
    if (token.endsWith("/*")) return type.startsWith(token.slice(0, -1));
    return type === token;
  });
};

const useFileUpload = ({
  onChange,
  multiple = true,
  accept,
  maxBytes,
}: UseFileUploadArgs) => {
  const [files, setFiles] = useState<File[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [rejection, setRejection] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const commit = useCallback(
    (next: File[]) => {
      setFiles(next);
      onChange?.(next);
    },
    [onChange],
  );

  const validate = useCallback(
    (file: File): string | null => {
      if (!matchesAccept(file, accept)) return `${file.name}: unsupported file type.`;
      if (maxBytes != null && file.size > maxBytes) {
        return `${file.name}: exceeds ${Math.round(maxBytes / (1024 * 1024))} MB.`;
      }
      return null;
    },
    [accept, maxBytes],
  );

  const addFiles = useCallback(
    (incoming: FileList | null) => {
      if (!incoming || incoming.length === 0) return;
      const candidates = Array.from(incoming);
      const accepted: File[] = [];
      let firstError: string | null = null;
      for (const file of candidates) {
        const err = validate(file);
        if (err) {
          firstError ??= err;
          continue;
        }
        accepted.push(file);
      }
      setRejection(firstError);
      if (accepted.length === 0) return;
      // Single-file mode keeps only the latest pick; multi appends.
      const next = multiple ? [...files, ...accepted] : [accepted[accepted.length - 1]];
      commit(next);
    },
    [files, multiple, validate, commit],
  );

  const removeFile = (index: number) => {
    commit(files.filter((_, i) => i !== index));
  };

  const clear = useCallback(() => {
    setRejection(null);
    commit([]);
    if (inputRef.current) inputRef.current.value = "";
  }, [commit]);

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
    rejection,
    inputRef,
    multiple,
    addFiles,
    removeFile,
    clear,
    handleDragOver,
    handleDragLeave,
    handleDrop,
    openPicker,
  };
};

export { useFileUpload };
