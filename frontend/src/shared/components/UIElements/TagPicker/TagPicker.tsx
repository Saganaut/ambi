import { useMemo, useRef, useState } from "react";
import type { TagResponse } from "@store/AmbiApi";
import { Tag } from "../Tag/Tag";
import styles from "./TagPicker.module.css";

interface TagPickerProps {
  tags: TagResponse[];
  isLoading?: boolean;
  value: string[];
  onChange: (next: string[]) => void;
  // When provided, an unmatched query exposes a "Create '<query>'" row that
  // calls onCreate with the typed display name. Resolve to the new tag's ID
  // so it can be added to the selection; resolve to undefined on failure.
  onCreate?: (displayName: string) => Promise<string | undefined>;
  placeholder?: string;
  label?: string;
  // Caps the selection at one tag and clears the input when something is
  // picked.
  singleSelect?: boolean;
}

const TagPicker = ({
  tags,
  isLoading = false,
  value,
  onChange,
  onCreate,
  placeholder = "Add a tag…",
  label,
  singleSelect,
}: TagPickerProps) => {
  const [query, setQuery] = useState("");
  const [isFocused, setIsFocused] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const byId = useMemo(() => {
    const map = new Map<string, TagResponse>();
    for (const tag of tags) {
      if (tag.id) map.set(tag.id, tag);
    }
    return map;
  }, [tags]);

  const needle = query.trim().toLowerCase();

  const filtered = useMemo(() => {
    return tags
      .filter((tag) => !!tag.id && !value.includes(tag.id))
      .filter((tag) => {
        if (needle === "") return true;
        return (
          (tag.id ?? "").toLowerCase().includes(needle) ||
          (tag.displayName ?? "").toLowerCase().includes(needle)
        );
      });
  }, [tags, value, needle]);

  const exactMatch = useMemo(() => {
    if (needle === "") return true;
    return tags.some(
      (tag) =>
        (tag.displayName ?? "").toLowerCase() === needle ||
        (tag.id ?? "").toLowerCase() === needle,
    );
  }, [tags, needle]);

  const showCreate = !!onCreate && needle.length > 0 && !exactMatch;

  const applyAdd = (tagId: string) => {
    if (singleSelect) {
      onChange([tagId]);
    } else if (!value.includes(tagId)) {
      onChange([...value, tagId]);
    }
    setQuery("");
    inputRef.current?.focus();
  };

  const remove = (tagId: string) => {
    onChange(value.filter((id) => id !== tagId));
  };

  const handleCreate = () => {
    const displayName = query.trim();
    if (!displayName || isCreating || !onCreate) return;
    setIsCreating(true);
    void onCreate(displayName)
      .then((newId) => {
        if (newId != null) applyAdd(newId);
      })
      .catch((err: unknown) => {
        console.error("Failed to create tag", err);
      })
      .finally(() => {
        setIsCreating(false);
      });
  };

  return (
    <div className={styles.tagPicker}>
      {label != null && <label className={styles.label}>{label}</label>}
      <div className={styles.field}>
        <div className={styles.chips}>
          {value.map((id) => {
            const displayName = byId.get(id)?.displayName;
            return (
              <Tag
                key={id}
                size='sm'
                onRemove={() => {
                  remove(id);
                }}>
                {displayName ?? id}
              </Tag>
            );
          })}
          <input
            ref={inputRef}
            type='text'
            className={styles.input}
            value={query}
            placeholder={value.length === 0 ? placeholder : ""}
            onChange={(e) => {
              setQuery(e.target.value);
            }}
            onFocus={() => {
              setIsFocused(true);
            }}
            onBlur={() => {
              // Defer so a click on a menu item registers before the menu hides.
              window.setTimeout(() => {
                setIsFocused(false);
              }, 150);
            }}
            onKeyDown={(e) => {
              if (e.key === "Backspace" && query === "" && value.length > 0) {
                remove(value[value.length - 1]);
              }
              if (e.key === "Enter") {
                if (filtered[0]?.id != null) {
                  e.preventDefault();
                  applyAdd(filtered[0].id);
                } else if (showCreate) {
                  e.preventDefault();
                  handleCreate();
                }
              }
            }}
          />
        </div>
        {isFocused && (
          <div className={styles.menu} role='listbox'>
            {isLoading && <div className={styles.menuEmpty}>Loading…</div>}
            {!isLoading && filtered.length === 0 && !showCreate && (
              <div className={styles.menuEmpty}>No matching tags</div>
            )}
            {showCreate && (
              <button
                type='button'
                role='option'
                aria-selected={false}
                className={`${styles.menuItem} ${styles.menuItemCreate}`}
                disabled={isCreating}
                onMouseDown={(e) => {
                  e.preventDefault();
                  handleCreate();
                }}>
                <span className={styles.itemLabel}>
                  Create &ldquo;{query.trim()}&rdquo;
                </span>
                <span className={styles.createHint}>new</span>
              </button>
            )}
            {!isLoading &&
              filtered.map((tag) => (
                <button
                  key={tag.id}
                  type='button'
                  role='option'
                  aria-selected={false}
                  className={styles.menuItem}
                  onMouseDown={(e) => {
                    e.preventDefault();
                    if (tag.id != null) applyAdd(tag.id);
                  }}>
                  <span className={styles.itemLabel}>{tag.displayName}</span>
                  {tag.curated && (
                    <span className={styles.curatedBadge}>curated</span>
                  )}
                </button>
              ))}
          </div>
        )}
      </div>
    </div>
  );
};

export { TagPicker };
export type { TagPickerProps };
