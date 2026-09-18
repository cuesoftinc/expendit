# Production Dockerfile for a Python FastAPI service (build context = the service dir).
FROM python:3.12-slim
ENV PYTHONUNBUFFERED=1 PIP_NO_CACHE_DIR=1
WORKDIR /app

COPY requirements.txt ./
RUN pip install -r requirements.txt

COPY . .
RUN useradd -m -u 10001 appuser && chown -R appuser /app
USER appuser

# Set to the service's port per the convention (8081, 8082, ... for additional APIs).
ENV PORT=8082
EXPOSE 8082
# Long start-period accommodates model/vision-client warm-up; probe honors $PORT.
HEALTHCHECK --interval=30s --timeout=5s --start-period=30s --retries=3 \
  CMD python -c "import os,urllib.request,sys; sys.exit(0 if urllib.request.urlopen('http://127.0.0.1:'+os.environ.get('PORT','8082')+'/health').status==200 else 1)"
CMD ["sh","-c","uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8082}"]
