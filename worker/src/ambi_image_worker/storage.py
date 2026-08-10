"""Object storage seam: the protocol the core depends on plus its S3 implementation."""

from __future__ import annotations

import logging
from typing import TYPE_CHECKING, Any, Protocol, runtime_checkable

import boto3
from botocore.config import Config
from botocore.exceptions import ClientError

if TYPE_CHECKING:
    from .config import WorkerConfig

logger = logging.getLogger(__name__)

MISSING_OBJECT_CODES = frozenset({"NoSuchKey", "NoSuchBucket", "NotFound", "404"})


@runtime_checkable
class ObjectStore(Protocol):
    """The two operations the variant core needs from object storage."""

    def get(self, bucket: str, key: str) -> bytes | None:
        """Return the object's bytes, or ``None`` when it does not exist."""
        ...

    def put(self, bucket: str, key: str, body: bytes, content_type: str) -> None:
        """Store ``body`` at ``key``, overwriting any existing object."""
        ...


class S3ObjectStore:
    """An :class:`ObjectStore` backed by an S3-compatible endpoint (AWS or Garage)."""

    def __init__(self, client: Any) -> None:
        self._client = client

    @classmethod
    def from_config(cls, cfg: WorkerConfig) -> S3ObjectStore:
        """Build a client from the worker config, honouring endpoint and path-style overrides."""
        return cls(build_s3_client(cfg))

    def get(self, bucket: str, key: str) -> bytes | None:
        try:
            response = self._client.get_object(Bucket=bucket, Key=key)
        except ClientError as exc:
            if _is_missing(exc):
                logger.warning("Source object s3://%s/%s does not exist", bucket, key)
                return None
            raise
        body = response["Body"]
        try:
            return body.read()
        finally:
            body.close()

    def put(self, bucket: str, key: str, body: bytes, content_type: str) -> None:
        self._client.put_object(Bucket=bucket, Key=key, Body=body, ContentType=content_type)


def build_s3_client(cfg: WorkerConfig) -> Any:
    """Construct the boto3 S3 client the worker uses."""
    return boto3.client(
        "s3",
        config=Config(
            s3={"addressing_style": "path" if cfg.s3_path_style else "auto"},
            retries={"max_attempts": 3, "mode": "standard"},
        ),
        **client_kwargs(
            endpoint=cfg.s3_endpoint,
            region=cfg.s3_region or cfg.aws_region,
            access_key=cfg.s3_access_key_id,
            secret_key=cfg.s3_secret_access_key,
        ),
    )


def client_kwargs(
    *, endpoint: str, region: str, access_key: str, secret_key: str
) -> dict[str, str]:
    """Only pass what was configured, so boto3's own resolution chain applies on AWS."""
    kwargs: dict[str, str] = {}
    if endpoint:
        kwargs["endpoint_url"] = endpoint
    if region:
        kwargs["region_name"] = region
    if access_key and secret_key:
        kwargs["aws_access_key_id"] = access_key
        kwargs["aws_secret_access_key"] = secret_key
    return kwargs


def _is_missing(exc: ClientError) -> bool:
    error = exc.response.get("Error", {})
    status = str(exc.response.get("ResponseMetadata", {}).get("HTTPStatusCode", ""))
    return str(error.get("Code", "")) in MISSING_OBJECT_CODES or status == "404"
