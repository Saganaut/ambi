// Gallery management surface on the Account page. Lists every image the
// caller can see (their own + everything shared with their orgs), with
// owner-only rename / re-tag / re-scope / delete affordances. Mirrors how
// ThemeSection handles owned-vs-shared by checking ownerId against the
// current user.
//
// Uploads are funnelled through the same GalleryPicker UX used in the slide
// editors — opening the picker in "upload" mode keeps the upload form in one
// place and avoids duplicating multipart wiring.
import { useState } from "react";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { useGalleryPicker } from "@/hooks/useGalleryPicker";
import { useModal } from "@/context/useModal";
import {
  type GalleryImageResponse,
  useDeleteImageMutation,
  useListImagesQuery,
  useUpdateImageMutation,
} from "@/store/AmbiApi";
import { useCurrentUserOrgs } from "@/hooks/useCurrentUserOrgs";
import { variantFor } from "@/utils/image";
import { Btn } from "@/components/Common/Buttons/Btn";
import { useConfirm } from "@/components/Common/ConfirmDialog/useConfirm";
import { Input } from "@/components/Common/Input/Input/Input";
import { Dropdown } from "@/components/Common/Input/Dropdown/Dropdown";
import { EmptyState } from "@/components/Common/EmptyState/EmptyState";
import accountStyles from "./AccountPage.module.css";
import styles from "./GallerySection.module.css";
import { extractErrorMessage } from "@/utils/utils";

interface EditFormProps {
  image: GalleryImageResponse;
  orgs: { id?: string; name?: string }[];
  onClose: () => void;
}

const EditForm = ({ image, orgs, onClose }: EditFormProps) => {
  const [name, setName] = useState(image.name ?? "");
  const [tags, setTags] = useState((image.tags ?? []).join(", "));
  const [orgId, setOrgId] = useState(image.organizationId ?? "");
  const [error, setError] = useState<string | null>(null);
  const [updateImage, { isLoading }] = useUpdateImageMutation();

  const handleSave = async () => {
    if (!image.id) return;
    setError(null);
    try {
      await updateImage({
        id: image.id,
        updateGalleryImageRequest: {
          name: name.trim(),
          tags: tags
            .split(",")
            .map((t) => t.trim())
            .filter(Boolean),
          organizationId: orgId,
        },
      }).unwrap();
      onClose();
    } catch (err: unknown) {
      setError(extractErrorMessage(err, "Failed to update image."));
    }
  };

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: "var(--space-3)",
        minWidth: 320,
      }}>
      <Input
        label='Name'
        id={`gallery-edit-name-${image.id}`}
        type='text'
        fullWidth
        value={name}
        onChange={(e) => {
          setName(e.target.value);
        }}
      />
      <Input
        label='Tags (comma-separated)'
        id={`gallery-edit-tags-${image.id}`}
        type='text'
        fullWidth
        value={tags}
        onChange={(e) => {
          setTags(e.target.value);
        }}
      />
      {orgs.length > 0 && (
        <Dropdown
          label='Share with'
          id={`gallery-edit-org-${image.id}`}
          value={[orgId]}
          onChange={(vals) => {
            setOrgId(vals[0] ?? "");
          }}
          options={[
            { value: "", label: "Private (only me)" },
            ...orgs.map((org) => ({
              value: org.id ?? "",
              label: org.name ?? "",
            })),
          ]}
        />
      )}
      {error && <p className={accountStyles.error}>{error}</p>}
      <div style={{ display: "flex", gap: "var(--space-2)" }}>
        <Btn
          onClick={() => {
            void handleSave();
          }}
          disabled={isLoading}>
          {isLoading ? "Saving…" : "Save"}
        </Btn>
        <Btn onClick={onClose}>Cancel</Btn>
      </div>
    </div>
  );
};

const GallerySection = () => {
  const userState = useCurrentUser();
  const ownerId =
    userState.state === "registered" ? (userState.user.id ?? null) : null;
  const { data: images = [], isLoading } = useListImagesQuery();
  const { data: orgs = [] } = useCurrentUserOrgs();
  const [deleteImage] = useDeleteImageMutation();
  const openPicker = useGalleryPicker();
  const { openModal, closeModal } = useModal();
  const confirm = useConfirm();
  const [error, setError] = useState<string | null>(null);

  const handleDelete = async (id: string) => {
    const ok = await confirm({
      title: "Delete image",
      message: "Delete this image? This cannot be undone.",
      confirmLabel: "Delete",
      variant: "danger",
    });
    if (!ok) return;
    setError(null);
    try {
      await deleteImage({ id }).unwrap();
    } catch {
      setError("Failed to delete image.");
    }
  };

  const handleEdit = (image: GalleryImageResponse) => {
    openModal({
      title: `Edit ${image.name ?? "image"}`,
      content: <EditForm image={image} orgs={orgs} onClose={closeModal} />,
    });
  };

  // "Add image" reuses the picker; the picked URL is ignored — we just want
  // the upload flow. The picker invalidates the LIST cache so this list
  // re-renders automatically once the upload completes.
  const handleAdd = () => {
    openPicker(() => {
      // no-op: just here to dismiss the picker after upload+pick.
    });
  };

  return (
    <section className={accountStyles.section}>
      <div className={styles.sectionHeader}>
        <h2 className={accountStyles.sectionTitle}>Image Gallery</h2>
        <Btn onClick={handleAdd}>+ Upload image</Btn>
      </div>

      {isLoading && <p>Loading…</p>}

      {!isLoading && images.length === 0 && (
        <EmptyState
          title='No images yet'
          message='Upload images here, then pick them when authoring slides.'
          action={<Btn onClick={handleAdd}>Upload your first image</Btn>}
        />
      )}

      {!isLoading && images.length > 0 && (
        <div className={styles.grid}>
          {images.map((image) => {
            const isOwned = image.ownerId === ownerId;
            const isOrgShared =
              image.organizationId != null &&
              image.organizationId !== "" &&
              !isOwned;
            const name = image.name ?? "Untitled";
            const tags = image.tags ?? [];
            // Thumbnails on the management page are ~200px wide — SM fits.
            const thumb = variantFor(
              {
                useExternalImg: false,
                internalImgId: image.id,
                variants: image.variants,
              },
              "SM",
            );
            return (
              <div key={image.id} className={styles.card}>
                {thumb?.url ? (
                  <img src={thumb.url} alt={name} className={styles.thumb} />
                ) : (
                  <div className={styles.thumb} aria-hidden='true' />
                )}
                <p className={styles.cardName} title={name}>
                  {name}
                </p>
                <div className={styles.cardMeta}>
                  {isOrgShared && <span className={styles.cardBadge}>Org</span>}
                  {tags.map((t) => (
                    <span key={t} className={styles.cardBadge}>
                      {t}
                    </span>
                  ))}
                </div>
                {isOwned && image.id && (
                  <div className={styles.cardActions}>
                    <Btn
                      size='sm'
                      onClick={() => {
                        handleEdit(image);
                      }}>
                      Edit
                    </Btn>
                    <Btn
                      size='sm'
                      onClick={() => {
                        if (image.id) void handleDelete(image.id);
                      }}>
                      Delete
                    </Btn>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {error && <p className={accountStyles.error}>{error}</p>}
    </section>
  );
};

export { GallerySection };
