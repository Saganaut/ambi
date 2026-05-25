// Organization management: list every org the user belongs to, create a new
// one, join by ID, and leave any individual org. Users may belong to multiple
// orgs simultaneously — there's no "leave first" step.
import { useState } from "react";
import {
  useCreateOrgMutation,
  useJoinOrgMutation,
  useLeaveOrgMutation,
  useListMyOrgsQuery,
} from "../../store/BrainFlexApi";
import type { OrganizationResponse } from "../../store/BrainFlexApi";
import styles from "./ThemeSection.module.css";
import accountStyles from "./AccountPage.module.css";
import { Btn } from "@/components/Common/Buttons/Btn";
import { useConfirm } from "@/components/Common/ConfirmDialog/useConfirm";
import { Input } from "@/components/Common/Input/Input/Input";
import { extractErrorMessage } from "@/utils/utils";

const OrgSection = () => {
  const { data: orgs = [], refetch, isLoading } = useListMyOrgsQuery();

  const [createOrg, { isLoading: isCreating }] = useCreateOrgMutation();
  const [joinOrg, { isLoading: isJoining }] = useJoinOrgMutation();
  const [leaveOrg] = useLeaveOrgMutation();

  const [createName, setCreateName] = useState("");
  const [joinId, setJoinId] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [leavingId, setLeavingId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const confirm = useConfirm();

  const handleCreate = async () => {
    if (!createName.trim()) {
      setError("Organization name is required.");
      return;
    }
    setError(null);
    try {
      await createOrg({
        createOrganizationRequest: { name: createName.trim() },
      }).unwrap();
      setCreateName("");
      await refetch();
    } catch (err: unknown) {
      setError(extractErrorMessage(err, "Failed to create organization."));
    }
  };

  const handleJoin = async () => {
    if (!joinId.trim()) {
      setError("Organization ID is required.");
      return;
    }
    setError(null);
    try {
      await joinOrg({
        joinOrganizationRequest: { organizationId: joinId.trim() },
      }).unwrap();
      setJoinId("");
      await refetch();
    } catch (err: unknown) {
      setError(extractErrorMessage(err, "Organization not found."));
    }
  };

  const handleLeave = async (id: string) => {
    const ok = await confirm({
      title: "Leave organization",
      message: "Leave this organization?",
      confirmLabel: "Leave",
      variant: "danger",
    });
    if (!ok) return;
    setError(null);
    setLeavingId(id);
    try {
      await leaveOrg({ id }).unwrap();
      await refetch();
    } catch {
      setError("Failed to leave organization.");
    } finally {
      setLeavingId(null);
    }
  };

  const handleCopyId = async (id: string) => {
    await navigator.clipboard.writeText(id);
    setCopiedId(id);
    setTimeout(() => {
      setCopiedId((cur) => (cur === id ? null : cur));
    }, 2000);
  };

  if (isLoading) return null;

  return (
    <section className={accountStyles.section}>
      <h2 className={accountStyles.sectionTitle}>Organizations</h2>

      {orgs.length > 0 && (
        <div className={styles.orgList}>
          {orgs.map((org: OrganizationResponse) => {
            const id = org.id ?? "";
            const isLeaving = leavingId === id;
            return (
              <div key={id} className={styles.orgInfo}>
                <p className={styles.orgName}>{org.name}</p>
                <p className={styles.orgId}>ID: {id}</p>
                <div style={{ display: "flex", gap: "var(--space-3)" }}>
                  <Btn
                    onClick={() => {
                      void handleCopyId(id);
                    }}>
                    {copiedId === id ? "Copied!" : "Copy ID"}
                  </Btn>
                  <Btn
                    onClick={() => {
                      void handleLeave(id);
                    }}
                    disabled={isLeaving}>
                    {isLeaving ? "Leaving..." : "Leave"}
                  </Btn>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <div className={styles.orgJoinForm}>
        <div className={styles.orgRow}>
          <Input
            type='text'
            className={styles.orgInput}
            placeholder='New organization name'
            value={createName}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
              setCreateName(e.target.value);
            }}
            maxLength={128}
            aria-label='New organization name'
          />
          <Btn
            onClick={() => {
              void handleCreate();
            }}
            disabled={isCreating}>
            {isCreating ? "Creating..." : "Create"}
          </Btn>
        </div>

        <div className={styles.orgDivider}>
          <span className={styles.orgDividerText}>or join an existing one</span>
        </div>

        <div className={styles.orgRow}>
          <Input
            type='text'
            className={styles.orgInput}
            placeholder='Organization ID'
            value={joinId}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
              setJoinId(e.target.value);
            }}
            aria-label='Organization ID to join'
          />
          <Btn
            onClick={() => {
              void handleJoin();
            }}
            disabled={isJoining}>
            {isJoining ? "Joining..." : "Join"}
          </Btn>
        </div>
      </div>

      {error && <p className={accountStyles.error}>{error}</p>}
    </section>
  );
};

export { OrgSection };
