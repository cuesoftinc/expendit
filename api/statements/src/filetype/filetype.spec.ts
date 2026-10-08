import { detect, matches } from './filetype';

describe('detect', () => {
  it.each([
    ['%PDF-1.7\n', 'pdf'],
    ['\x89PNG\r\n\x1a\n....', 'image'],
    ['\xff\xd8\xff\xe0....', 'image'],
    ['RIFF\x00\x00\x00\x00WEBPVP8 ', 'image'],
    ['\x00\x00\x00\x18ftypheic....', 'image'],
    ['Date,Description,Amount\n2026-09-01,Bolt,1200\n', 'csv'],
    ['﻿Date;Montant\n', 'csv'],
  ])('%j -> %s', (content, type) => {
    expect(detect(Buffer.from(content, 'latin1'))?.type ?? detect(Buffer.from(content))?.type).toBe(type);
  });

  it('accepts a zip only when it holds a workbook', () => {
    expect(detect(Buffer.from('PK\x03\x04....[Content_Types].xml xl/workbook.xml', 'latin1'))?.type).toBe('xlsx');
    expect(detect(Buffer.from('PK\x03\x04....word/document.xml', 'latin1'))).toBeNull();
  });

  it('rejects binaries and invalid UTF-8', () => {
    expect(detect(Buffer.from([0x4d, 0x5a, 0x90, 0x00]))).toBeNull();
    expect(detect(Buffer.from([0x41, 0xc3, 0x28]))).toBeNull();
    expect(detect(Buffer.alloc(0))).toBeNull();
  });

  it('lets an xlsx satisfy a csv declaration but nothing else cross over', () => {
    expect(matches('csv', 'xlsx')).toBe(true);
    expect(matches('pdf', 'image')).toBe(false);
    expect(matches('image', 'csv')).toBe(false);
  });
});
