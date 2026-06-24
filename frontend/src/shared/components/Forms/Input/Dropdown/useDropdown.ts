// Behavior hook for Dropdown: open/close, single-vs-multi select toggling,
// optional search-filter, click-outside dismiss, and chip-remove helpers.
// The component file stays focused on JSX/wiring.
import { useRef, useState } from "react";

import { useClickOutside } from "@/shared/hooks/useClickOutside";

interface DropdownOption {
  value: string;
  label: string;
}

interface UseDropdownArgs {
  options: DropdownOption[];
  value: string[];
  multiple: boolean;
  searchable: boolean;
  onChange?: (values: string[]) => void;
}

const useDropdown = ({
  options,
  value,
  multiple,
  searchable,
  onChange,
}: UseDropdownArgs) => {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);

  const filtered = searchable
    ? options.filter((o) => o.label.toLowerCase().includes(query.toLowerCase()))
    : options;

  useClickOutside(containerRef, () => { setIsOpen(false); setQuery(""); }, isOpen);

  const toggle = (optValue: string) => {
    let next: string[];
    if (multiple) {
      next = value.includes(optValue)
        ? value.filter((v) => v !== optValue)
        : [...value, optValue];
    } else {
      next = [optValue];
      setIsOpen(false);
      setQuery("");
    }
    onChange?.(next);
  };

  const handleTriggerClick = () => {
    if (isOpen) setQuery("");
    setIsOpen((prev) => !prev);
  };

  const removeChip = (e: React.MouseEvent, v: string) => {
    e.stopPropagation();
    onChange?.(value.filter((x) => x !== v));
  };

  const removeChipOnKey = (e: React.KeyboardEvent, v: string) => {
    if (e.key === "Enter") {
      e.stopPropagation();
      onChange?.(value.filter((x) => x !== v));
    }
  };

  return {
    isOpen,
    query,
    setQuery,
    containerRef,
    filtered,
    toggle,
    handleTriggerClick,
    removeChip,
    removeChipOnKey,
  };
};

export { useDropdown };
export type { DropdownOption };
