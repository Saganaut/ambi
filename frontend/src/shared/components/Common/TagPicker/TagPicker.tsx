// Tag chooser backed by the /api/tags endpoint. Renders selected tags as
// removable pills and a typeahead input that shows matching tags as a
// dropdown menu below. Selecting a row in the menu adds it; clicking the ✕
// on a pill removes it. Suppressed when the user hasn't authenticated (the
// tags API requires ROLE_USER); the caller should hide the surface in that
// case.
//
// `singleSelect` mode caps the selection at one tag (used for "Subject"
// fields); `creatable` lets the user mint a new tag inline when nothing in
// the suggestion list matches what they typed.
import { useMemo, useRef, useState } from "react";
import {
  useCreateTagMutation,
  useListTagsQuery,
  Ambi,
  type TagResponse,
} from "@store/AmbiApi";
import { useAppDispatch } from "@store/hooks";
import { Tag } from "../Tag/Tag";
import styles from "./TagPicker.module.css";

interface TagPickerProps {
  value: string[];
  onChange: (next: string[]) => void;
  placeholder?: string;
  // When provided, restricts the dropdown to descendants of this root tag.
  parentTagId?: string;
  // When set, only curated tags appear. Used by the Explore filter row.
  curatedOnly?: boolean;
  label?: string;
  // Caps the selection at one tag and clears the input when something is
  // picked. Backwards-compatible: the value prop is still string[].
  singleSelect?: boolean;
  // When true, an unmatched query exposes a "Create '<query>'" row that
  // POSTs to /api/tags and adds the returned tag to the selection. The new
  // tag is upserted into every cached `listTags` query so the suggestion
  // list refreshes immediately.
  creatable?: boolean;
}

const TagPicker = ({
  value,
  onChange,
  placeholder = "Add a tag…",
  parentTagId,
  curatedOnly,
  label,
  singleSelect,
  creatable,
}: TagPickerProps) => {
  const [query, setQuery] = useState("");
  const [isFocused, setIsFocused] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const dispatch = useAppDispatch();

  const listArgs = { curated: curatedOnly, parentTagId };
  const { data: tags = [], isLoading } = useListTagsQuery(listArgs);
  const [createTag, createStatus] = useCreateTagMutation();

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

  // Show "Create" only when the typed text doesn't already match an existing
  // tag (by display name or id) — covers both filtered-out duplicates and
  // tags the user has already selected.
  const exactMatch = useMemo(() => {
    if (needle === "") return true;
    return tags.some(
      (tag) =>
        (tag.displayName ?? "").toLowerCase() === needle ||
        (tag.id ?? "").toLowerCase() === needle,
    );
  }, [tags, needle]);
  const showCreate = !!creatable && needle.length > 0 && !exactMatch;

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
    if (!displayName || createStatus.isLoading) return;
    void createTag({ createTagRequest: { displayName } })
      .unwrap()
      .then((created) => {
        if (!created.id) return;
        // Seed the new tag into every cached listTags result so suggestions
        // refresh without a follow-up refetch.
        dispatch(
          Ambi.util.updateQueryData("listTags", listArgs, (draft) => {
            if (!draft.some((t) => t.id === created.id)) draft.push(created);
          }),
        );
        applyAdd(created.id);
      })
      .catch((err: unknown) => {
        console.error("Failed to create tag", err);
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
                disabled={createStatus.isLoading}
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
