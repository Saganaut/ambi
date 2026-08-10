# One base, two targets: the same installed package either answers Lambda
# invocations through the AWS runtime interface client (the `lambda` target) or
# long-polls SQS itself as a plain container (the `poller` target, which is what
# compose runs locally against ElasticMQ).
FROM public.ecr.aws/lambda/python:3.13 AS base

# src/ is copied as a subdirectory rather than flattened into ${LAMBDA_TASK_ROOT}
# because the project uses a src layout: `pip install` needs to see pyproject.toml
# and src/ side by side. The package lands in site-packages, which is on the
# Lambda runtime's import path.
COPY pyproject.toml README.md ${LAMBDA_TASK_ROOT}/
COPY src/ ${LAMBDA_TASK_ROOT}/src/

RUN pip install --no-cache-dir ${LAMBDA_TASK_ROOT}

FROM base AS lambda
CMD ["ambi_image_worker.lambda_handler.handler"]

FROM base AS poller
ENTRYPOINT ["python", "-m", "ambi_image_worker.poller"]
CMD []
