// Modal body for "New collection". Captures name + optional description and
// fires createCollection with a client-generated UUID — the same optimistic
// id flow the deck-create modal uses, so the navigation after submit can
// trust the id to round-trip safely.
import { useState } from "react";
import { Btn } from "@/components/Common/Buttons/Btn";
import { Input } from "@/components/Common/Input/Input/Input";
import { TextArea } from "@/components/Common/Input/TextArea/TextArea";
import { useCreateCollectionMutation } from "@/store/BrainFlexApi";
import styles from "./CollectionCreateForm.module.css";

interface CollectionCreateFormProps {
  onCancel: () => void;
  onCreated: (id: string) => void;
}

const CollectionCreateForm = ({ onCancel, onCreated }: CollectionCreateFormProps) => {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [createCollection, { isLoading }] = useCreateCollectionMutation();

  const trimmedName = name.trim();
  const canSubmit = trimmedName.length > 0 && !isLoading;

  const submit = async () => {
    if (!canSubmit) return;
    const id = crypto.randomUUID();
    try {
      await createCollection({
        createDeckCollectionRequest: {
          id,
          name: trimmedName,
          description: description.trim() || undefined,
        },
      }).unwrap();
      onCreated(id);
    } catch (err) {
      console.error("Failed to create collection", err);
    }
  };

  return (
    <form
      className={styles.form}
      onSubmit={(event) => {
        event.preventDefault();
        void submit();
      }}>
      <Input
        label='Name'
        autoFocus
        value={name}
        maxLength={100}
        onChange={(e) => {
          setName(e.target.value);
        }}
        placeholder='My collection'
        fullWidth
      />
      <TextArea
        label='Description (optional)'
        value={description}
        maxLength={500}
        rows={3}
        onChange={(e) => {
          setDescription(e.target.value);
        }}
        placeholder='What kind of decks live here?'
        fullWidth
      />
      <div className={styles.actions}>
        <Btn type='button' fill='ghost' onClick={onCancel}>
          Cancel
        </Btn>
        <Btn type='submit' disabled={!canSubmit}>
          {isLoading ? "Creating…" : "Create"}
        </Btn>
      </div>
    </form>
  );
};

export { CollectionCreateForm };
