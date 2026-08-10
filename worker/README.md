# Image-variant worker

The out-of-process renderer behind Ambi's image pipeline. Uploads are stored and
returned immediately; this service picks the job up off a queue, renders the WebP
size tiers with Pillow, writes each one to object storage, and calls the backend
back to say which tiers are now real.

- **Consumes** — image-variant jobs from SQS (ElasticMQ locally).
- **Writes** — one WebP object per tier at `{keyRoot}/{tier-lowercase}.webp`.
- **Reports** — `POST /api/internal/image-variants` on the backend, authenticated
  with the `X-Ambi-Worker-Secret` shared secret.

It never touches MongoDB. The backend owns all readiness state; the worker only
tells it what landed.

## Layout

| Module | Responsibility |
| --- | --- |
| `config.py` | `WorkerConfig.from_env()` — every `AMBI_WORKER_*` variable, resolved once. |
| `messages.py` | Queue-message schema, `parse_job`, and `variant_key` derivation. |
| `storage.py` | The `ObjectStore` protocol plus its boto3/S3 implementation. |
| `variants.py` | `render_tiers` (pure Pillow) and `process_image` (the shared core). |
| `callback.py` | `report` — the retrying readiness callback to the backend. |
| `poller.py` | Long-polling entry point; what the compose service runs. |
| `lambda_handler.py` | AWS entry point; same core, partial batch failures. |

Both entry points do exactly two things per message: `process_image`, then
`report`. A message is deleted from the queue only after the callback succeeds,
so a crash anywhere in between simply redelivers the job.

## Behaviour worth knowing

- **Never upscales.** Each tier is fit *within* a `maxEdge x maxEdge` box; a
  source smaller than the box is encoded at its own size.
- **PUT before report.** A tier appears in `readyTiers` only after its object
  exists — the backend presigns URLs off that report.
- **Missing source is not terminal.** Reported as zero ready tiers with reason
  `source_missing`; the job can be replayed later.
- **Undecodable bytes are terminal.** Reported as `terminal: true` with an empty
  `readyTiers`, because redelivery can never change the outcome. The original
  keeps serving.
- **AVIF decodes natively.** Pillow >= 11.3 ships AVIF support, so no
  `pillow-avif-plugin` is needed.

## Environment variables

Every variable is prefixed `AMBI_WORKER_`. Endpoint overrides exist for the local
stack; leave them blank on AWS and boto3 resolves the real endpoints.

| Variable | Default | Purpose |
| --- | --- | --- |
| `AMBI_WORKER_QUEUE_URL` | — | Queue to long-poll. Required by the poller, unused on Lambda. |
| `AMBI_WORKER_SQS_ENDPOINT` | — | SQS endpoint override (`http://elasticmq:9324` locally). |
| `AMBI_WORKER_AWS_REGION` | — | Region for the SQS client (`elasticmq` locally). |
| `AMBI_WORKER_S3_ENDPOINT` | — | S3 endpoint override (`http://garage:3900` locally). |
| `AMBI_WORKER_S3_REGION` | — | Region for the S3 client (`garage` locally). |
| `AMBI_WORKER_S3_BUCKET` | — | Default bucket; each job carries its own, which wins. |
| `AMBI_WORKER_S3_ACCESS_KEY_ID` | — | S3 key. Blank on AWS so the task role is used. |
| `AMBI_WORKER_S3_SECRET_ACCESS_KEY` | — | S3 secret. Blank on AWS so the task role is used. |
| `AMBI_WORKER_S3_PATH_STYLE` | `false` | `true` for Garage/MinIO path-style addressing. |
| `AMBI_WORKER_CALLBACK_URL` | — | **Required.** The backend's internal report endpoint. |
| `AMBI_WORKER_CALLBACK_SECRET` | — | **Required.** Must match `ambi.media.variants.callback-secret`. |
| `AMBI_WORKER_WAIT_SECONDS` | `20` | Long-poll wait. |
| `AMBI_WORKER_MAX_MESSAGES` | `10` | Messages per receive. |
| `AMBI_WORKER_VISIBILITY_TIMEOUT` | `0` | Per-receive override; `0` uses the queue default. |
| `AMBI_WORKER_LOG_LEVEL` | `INFO` | Root log level. |

Locally these are set by the `image-variant-worker` service in `compose.yaml`,
with the two shared secrets coming from `dev.env` (see
[environment variables](../z-docs/infrastructure/environment-variables.md)).

## Develop

Requires Python 3.13+. Use [uv](https://docs.astral.sh/uv/) if you have it,
otherwise the standard library's `venv`.

```bash
cd worker
uv venv && uv pip install -e ".[dev]"
# or: python3 -m venv .venv && .venv/bin/pip install -e ".[dev]"
```

## Test and lint

```bash
cd worker
.venv/bin/python -m pytest
.venv/bin/ruff check .
.venv/bin/ruff format --check .
```

Or run all of it the way the feature gate does — this bootstraps `worker/.venv`
if it is missing, and skips cleanly when no Python toolchain is available:

```bash
scripts/check-worker.sh
```

Tests use a hand-rolled dict-backed `FakeObjectStore` (in `tests/conftest.py`)
rather than moto, and real Pillow encodes for the rendering assertions. The
`variant_key` assertions in `tests/test_messages.py` are the twin of the
backend's `ImageKeys.variantKey` test — they pin the key layout on both sides of
the wire.

## Build

```bash
cd worker
docker build --target poller -t ambi-image-variant-worker .   # local container
docker build --target lambda -t ambi-image-variant-lambda .   # AWS image
```

The compose stack builds the `poller` target for you; see the
[running the project](../z-docs/runbooks/running-the-project.md) runbook for log
tailing, queue inspection, and the DLQ redrive procedure.
