# api/common. One image, two entry points: ./server (API + consumers +
# outbox) and ./jobs <name> (Cloud Run jobs, system-design.md §6.7).
# Build context = this directory (the contract is embedded from contract/).
# ---- build stage ----
FROM golang:1.26-alpine AS builder
WORKDIR /app
COPY go.mod go.sum ./
RUN go mod download
COPY . .
RUN CGO_ENABLED=0 go build -trimpath -ldflags="-s -w" -o /out/server ./cmd/server \
 && CGO_ENABLED=0 go build -trimpath -ldflags="-s -w" -o /out/jobs ./cmd/jobs

# ---- runtime stage ----
FROM alpine:3.22
RUN apk add --no-cache ca-certificates && adduser -D -u 10001 appuser
WORKDIR /app
COPY --from=builder /out/server /out/jobs ./
USER appuser
ENV PORT=8080
EXPOSE 8080
HEALTHCHECK --interval=30s --timeout=3s --start-period=20s --retries=3 \
  CMD wget -qO- "http://127.0.0.1:${PORT:-8080}/health" || exit 1
CMD ["./server"]
