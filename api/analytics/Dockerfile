# api/analytics. Build context = the repository root, so the image can copy
# the Kafka JSON Schemas from api/common/contract:
#   docker build -f api/analytics/Dockerfile .
FROM python:3.12-slim
ENV PYTHONUNBUFFERED=1 PIP_NO_CACHE_DIR=1 CONTRACT_DIR=/app/contract
WORKDIR /app

COPY api/analytics/requirements.txt ./
RUN pip install -r requirements.txt

COPY api/analytics/ ./
COPY api/common/contract/*.schema.json ./contract/
RUN useradd -m -u 10001 appuser && chown -R appuser /app
USER appuser

ENV PORT=8082
EXPOSE 8082
HEALTHCHECK --interval=30s --timeout=5s --start-period=30s --retries=3 \
  CMD python -c "import os,urllib.request,sys; sys.exit(0 if urllib.request.urlopen('http://127.0.0.1:'+os.environ.get('PORT','8082')+'/health').status==200 else 1)"
# No access log: the only routes are the health checks, polled every 30s;
# work happens over Kafka and is logged per message.
CMD ["sh","-c","uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8082} --no-access-log"]
