"""Ambi image-variant worker.

Consumes image-variant jobs off SQS, renders the requested WebP tiers with
Pillow, writes each rendition to object storage, and reports the tiers it made
back to the Ambi backend. The same core runs under two entry points:
:mod:`ambi_image_worker.poller` (long-polling container, local dev) and
:mod:`ambi_image_worker.lambda_handler` (SQS event source, AWS).
"""

__all__ = ["__version__"]

__version__ = "0.1.0"
