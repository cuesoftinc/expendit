# Upload ticket (S-5)

`api/common` authorizes an upload before any bytes move: role, the
`ai_processing` consent for file types that need AI, rate limits and the
daily quota (system-design.md §6.1). It then issues a ticket that
`api/statements` verifies with a public key and no call back. The gateway
never holds a key that can mint tickets.

## Format

```
v1.<claims>.<signature>
```

- `claims` is base64url (no padding) of the UTF-8 JSON below.
- `signature` is base64url (no padding) of the Ed25519 signature over the
  ASCII bytes `v1.<claims>`.

```json
{
  "kid": "2026-10",
  "jti": "5b0e…",
  "org_id": "3f6e2b1a-…",
  "target": { "kind": "import_job", "id": "7c1d2e3f-…" },
  "file_type": "pdf",
  "max_bytes": 15728640,
  "iat": 1791367200,
  "exp": 1791367500
}
```

| Claim | Meaning |
| --- | --- |
| `kid` | Which signing key; lets keys rotate without downtime. |
| `jti` | Ticket id. Single use: `common` records it as used when it consumes `upload.received`, and ignores a second upload under the same id. |
| `org_id` | The org the upload belongs to. |
| `target` | `import_job` or `fin_statement`, and its id. The job or statement exists (`awaiting_upload`) before the ticket is issued. |
| `file_type` | `csv`, `xlsx`, `pdf` or `image`: what the user declared. The gateway rejects a file whose magic bytes don't match. |
| `max_bytes` | The size cap for this upload (15 MB, S-6). |
| `iat`, `exp` | Unix seconds. Tickets live 5 minutes. Verifiers allow 30 s of clock skew. |

## Keys

- `api/common` holds `UPLOAD_TICKET_PRIVATE_KEY` as `kid:<base64url 32-byte
  Ed25519 seed>`.
- `api/statements` holds `UPLOAD_TICKET_PUBLIC_KEYS` as a comma-separated
  list of `kid:<base64url 32-byte public key>`, so the old key keeps
  verifying while a new one rolls out.
- `api/common` serves `go run ./cmd/ticketkey` to generate a pair.

## Gateway checks, in order

1. `Upload-Ticket` header present and well formed: else `401 invalid_ticket`.
2. Signature valid for a known `kid`: else `401 invalid_ticket`.
3. Not expired: else `401 ticket_expired`.
4. `Content-Length` within `max_bytes` (plus multipart overhead), checked
   before the body is read: else `413 file_too_large`.
5. File size within `max_bytes`: else `413 file_too_large`.
6. Magic bytes match `file_type`: else `415 unsupported_type`.
