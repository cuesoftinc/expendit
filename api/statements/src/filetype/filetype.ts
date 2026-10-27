import type { FileType } from '../ticket/ticket.service';

export interface Detected {
  type: FileType;
  contentType: string;
}

const startsWith = (data: Buffer, bytes: number[], offset = 0): boolean =>
  data.length >= offset + bytes.length && bytes.every((b, i) => data[offset + i] === b);

/**
 * File type from magic bytes, never from the name or the client's
 * Content-Type (flows/import.md §3: 415 unsupported_type).
 */
export const detect = (data: Buffer): Detected | null => {
  if (startsWith(data, [0x25, 0x50, 0x44, 0x46])) return { type: 'pdf', contentType: 'application/pdf' };
  if (startsWith(data, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) return { type: 'image', contentType: 'image/png' };
  if (startsWith(data, [0xff, 0xd8, 0xff])) return { type: 'image', contentType: 'image/jpeg' };
  if (startsWith(data, [0x52, 0x49, 0x46, 0x46]) && startsWith(data, [0x57, 0x45, 0x42, 0x50], 8)) {
    return { type: 'image', contentType: 'image/webp' };
  }
  if (startsWith(data, [0x66, 0x74, 0x79, 0x70], 4)) {
    const brand = data.subarray(8, 12).toString('ascii');
    if (['heic', 'heix', 'mif1', 'msf1', 'heif'].includes(brand)) return { type: 'image', contentType: 'image/heic' };
  }
  // XLSX is a ZIP container; accept only when it holds a workbook.
  if (startsWith(data, [0x50, 0x4b, 0x03, 0x04])) {
    return data.includes('xl/') ? { type: 'xlsx', contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' } : null;
  }
  if (isText(data)) return { type: 'csv', contentType: 'text/csv' };
  return null;
};

/** CSV/TXT: valid UTF-8 (with optional BOM), no NUL bytes in the sample. */
const isText = (data: Buffer): boolean => {
  if (data.length === 0) return false;
  const sample = data.subarray(0, 8192);
  if (sample.includes(0)) return false;
  try {
    new TextDecoder('utf-8', { fatal: true }).decode(trimPartialCodePoint(sample, data.length));
    return true;
  } catch {
    return false;
  }
};

/** A sample cut mid-character isn't invalid UTF-8; drop the partial tail. */
const trimPartialCodePoint = (sample: Buffer, fullLength: number): Buffer => {
  if (sample.length === fullLength) return sample;
  const end = sample.length;
  for (let i = 1; i <= 3 && end - i >= 0; i += 1) {
    const byte = sample[end - i];
    if ((byte & 0xc0) === 0xc0) return sample.subarray(0, end - i);
    if ((byte & 0x80) === 0) break;
  }
  return sample.subarray(0, end);
};

/** A declared type is satisfied by the detected one (xlsx statements may be declared csv). */
export const matches = (declared: FileType, detected: FileType): boolean =>
  declared === detected || (declared === 'csv' && detected === 'xlsx');
