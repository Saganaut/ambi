// Behavior hooks for RichTextInput. Splits the TipTap editor lifecycle and
// the link-editor state out of the JSX component so the render is purely
// presentational.
import { useEditor, type Editor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { TextStyle, Color, FontSize } from "@tiptap/extension-text-style";
import { Placeholder } from "@tiptap/extensions";
import { useEffect, useRef, useState } from "react";
import { StyledListItem } from "./extensions/StyledListItem";

interface UseRichTextEditorArgs {
  value: string;
  onChange: (html: string) => void;
  onBlur?: () => void;
  placeholder?: string;
  id?: string;
  editorClassName: string;
  /** Ref to the wrapping element so onBlur can ignore focus moves that land
   *  inside the toolbar (e.g. the link <input>). The ref is read at fire time,
   *  so its `current` doesn't need to be a dep. */
  wrapperRef: React.RefObject<HTMLElement | null>;
}

const useRichTextEditor = ({
  value,
  onChange,
  onBlur,
  placeholder,
  id,
  editorClassName,
  wrapperRef,
}: UseRichTextEditorArgs) => {
  const editor = useEditor({
    extensions: [
      // Swap StarterKit's listItem for StyledListItem so list markers inherit
      // the item's text color and size, and drop headings (sizes cover that
      // need). Always-on (both variants) so the HTML round-trips identically no
      // matter which instance renders it.
      StarterKit.configure({ listItem: false, heading: false }),
      StyledListItem,
      TextStyle,
      Color,
      FontSize,
      Placeholder.configure({ placeholder: placeholder ?? "" }),
    ],
    content: value,
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
    },
    editorProps: {
      attributes: {
        // The contenteditable element gets the input-surface class so it
        // visually matches the rest of the form primitives.
        class: editorClassName,
        ...(id ? { id } : {}),
      },
    },
  });

  // Keep editor content in sync if the parent's `value` changes from outside
  // (e.g. switching to a different slide while the editor is mounted).
  useEffect(() => {
    // `useEditor` is typed as returning a live editor, but React StrictMode's
    // mount → cleanup → remount cycle can leave this effect re-running against
    // the destroyed intermediate instance. A destroyed editor has a null schema,
    // so `getHTML()` would throw ("Cannot read properties of null (reading
    // 'cached')"). The replacement instance is created with `content: value`, so
    // skipping the sync here is a safe no-op.
    if (editor.isDestroyed) return;
    const current = editor.getHTML();
    if (value !== current) {
      editor.commands.setContent(value, { emitUpdate: false });
    }
  }, [editor, value]);

  // Fire the consumer's onBlur only when focus has left the wrapper entirely —
  // clicking a toolbar button or focusing the link input shouldn't trigger a
  // flush.
  useEffect(() => {
    if (!onBlur) return;
    const handler = ({ event }: { event: FocusEvent }) => {
      const next = event.relatedTarget as Node | null;
      if (next && wrapperRef.current?.contains(next)) return;
      onBlur();
    };
    editor.on("blur", handler);
    return () => {
      editor.off("blur", handler);
    };
  }, [editor, onBlur, wrapperRef]);

  return editor;
};

interface UseLinkEditorArgs {
  editor: Editor;
  linkOpen: boolean;
  setLinkOpen: (v: boolean) => void;
}

const useLinkEditor = ({
  editor,
  linkOpen,
  setLinkOpen,
}: UseLinkEditorArgs) => {
  const [linkUrl, setLinkUrl] = useState("");
  const linkInputRef = useRef<HTMLInputElement>(null);

  const openLinkEditor = () => {
    const existing = editor.getAttributes("link").href as string | undefined;
    setLinkUrl(existing ?? "");
    setLinkOpen(true);
  };

  // Focus the link input once it mounts so the user can start typing.
  useEffect(() => {
    if (linkOpen) linkInputRef.current?.focus();
  }, [linkOpen]);

  const applyLink = () => {
    const trimmed = linkUrl.trim();
    if (trimmed === "") {
      editor.chain().focus().extendMarkRange("link").unsetLink().run();
    } else {
      editor
        .chain()
        .focus()
        .extendMarkRange("link")
        .setLink({ href: trimmed })
        .run();
    }
    setLinkOpen(false);
  };

  const removeLink = () => {
    editor.chain().focus().extendMarkRange("link").unsetLink().run();
    setLinkOpen(false);
  };

  const toggleLinkEditor = () => {
    if (linkOpen) {
      setLinkOpen(false);
      return;
    }
    openLinkEditor();
  };

  return {
    linkUrl,
    setLinkUrl,
    linkInputRef,
    applyLink,
    removeLink,
    toggleLinkEditor,
  };
};

export { useRichTextEditor, useLinkEditor };
