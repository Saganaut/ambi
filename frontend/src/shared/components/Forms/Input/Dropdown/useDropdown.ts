/**
 * Owns selection and search state for the controlled Dropdown field.
 *
 * Dismissal belongs to the Floating UI boundary in Dropdown so portalled
 * options count as inside the field.
 */
import { useState } from "react";

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

  const filtered = searchable
    ? options.filter((o) => o.label.toLowerCase().includes(query.toLowerCase()))
    : options;

  const setOpen = (next: boolean) => {
    setIsOpen(next);
    if (!next) setQuery("");
  };

  const toggle = (optValue: string) => {
    let next: string[];
    if (multiple) {
      next = value.includes(optValue)
        ? value.filter((v) => v !== optValue)
        : [...value, optValue];
    } else {
      next = [optValue];
      setOpen(false);
    }
    onChange?.(next);
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
    setOpen,
    query,
    setQuery,
    filtered,
    toggle,
    removeChip,
    removeChipOnKey,
  };
};

export { useDropdown };
export type { DropdownOption };
