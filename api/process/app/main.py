from contextlib import asynccontextmanager

from fastapi import FastAPI

from kafka.client import ReceiptProcessor

processor = ReceiptProcessor()


@asynccontextmanager
async def lifespan(app: FastAPI):
    await processor.start()
    yield
    await processor.stop()


app = FastAPI(title="expendit-api-process", lifespan=lifespan)


@app.get("/health")
def health():
    return {"status": "ok"}


@app.get("/ready")
def ready():
    return {"status": "ok"}
