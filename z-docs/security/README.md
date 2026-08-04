# Security

Ambi's security posture: findings, their status, and the gates that block deployment. This is a
posture folder, not incident response — there is no on-call runbook here.

- [Open findings](open-findings.md) — the living checklist of audit findings with a status per
  row, headed by the five items that must be closed before any non-local deployment.

Auth-specific invariants live with the auth feature code; infrastructure configuration lives in
[infrastructure](../infrastructure/README.md).
