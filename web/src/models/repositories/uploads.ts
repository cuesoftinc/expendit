import { api } from "./client";

/** What POST /import and POST /statements return for an upload (S-5). */
export interface UploadGrant {
  /** Absent on an idempotent replay of an already-uploaded file. */
  upload_ticket?: string;
  expires_at?: string;
  max_bytes?: number;
}

/**
 * Sends the file to the upload gateway (api/statements, POST
 * /api/v1/uploads, S-14). The ticket is the only credential: no session
 * header and no org header go with it.
 */
export const sendFile = (file: File, ticket: string) => {
  const form = new FormData();
  form.append("file", file);
  return api.post<{ id: string; kind: string; status: string }>(
    "/uploads",
    form,
    {
      headers: { "Upload-Ticket": ticket },
    },
  );
};
