'use strict';

const fs = require('fs/promises');
const path = require('path');
const crypto = require('crypto');
const { ValidationError } = require('../../lib/errors');

const JPEG_SIGNATURE = Buffer.from([0xff, 0xd8, 0xff]);
const PNG_SIGNATURE = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

function stripJpegMetadata(input) {
  if (input.length < 4 || !input.subarray(0, 3).equals(JPEG_SIGNATURE)) throw new ValidationError('The uploaded file is not a valid JPEG image');
  const parts = [input.subarray(0, 2)];
  let offset = 2;
  let foundScan = false;
  while (offset < input.length) {
    if (input[offset] !== 0xff) throw new ValidationError('The JPEG image structure is invalid');
    const markerStart = offset;
    while (offset < input.length && input[offset] === 0xff) offset++;
    if (offset >= input.length) throw new ValidationError('The JPEG image is incomplete');
    const marker = input[offset++];
    if (marker === 0xda) {
      parts.push(input.subarray(markerStart));
      foundScan = true;
      break;
    }
    if (marker === 0xd9) {
      parts.push(input.subarray(markerStart, offset));
      break;
    }
    if (marker === 0x01 || (marker >= 0xd0 && marker <= 0xd7)) {
      parts.push(input.subarray(markerStart, offset));
      continue;
    }
    if (offset + 2 > input.length) throw new ValidationError('The JPEG image is incomplete');
    const length = input.readUInt16BE(offset);
    if (length < 2 || offset + length > input.length) throw new ValidationError('The JPEG image contains an invalid segment');
    const end = offset + length;
    // APP1 carries EXIF (including GPS coordinates) and XMP metadata.
    if (marker !== 0xe1) parts.push(input.subarray(markerStart, end));
    offset = end;
  }
  if (!foundScan) throw new ValidationError('The JPEG image has no image data');
  return Buffer.concat(parts);
}

function stripPngMetadata(input) {
  if (input.length < 20 || !input.subarray(0, 8).equals(PNG_SIGNATURE)) throw new ValidationError('The uploaded file is not a valid PNG image');
  const parts = [input.subarray(0, 8)];
  let offset = 8;
  let foundEnd = false;
  while (offset + 12 <= input.length) {
    const length = input.readUInt32BE(offset);
    const type = input.toString('ascii', offset + 4, offset + 8);
    const end = offset + 12 + length;
    if (end > input.length) throw new ValidationError('The PNG image contains an invalid chunk');
    if (type !== 'eXIf') parts.push(input.subarray(offset, end));
    offset = end;
    if (type === 'IEND') { foundEnd = true; break; }
  }
  if (!foundEnd || offset !== input.length) throw new ValidationError('The PNG image is incomplete or contains trailing data');
  return Buffer.concat(parts);
}

async function savePhoto(buffer, mimeType, uploadDir) {
  if (!Buffer.isBuffer(buffer) || buffer.length === 0) throw new ValidationError('Choose an image to upload');
  if (buffer.length > 5 * 1024 * 1024) throw new ValidationError('Each image must be 5 MB or smaller');
  let sanitized;
  let extension;
  if (mimeType === 'image/jpeg') { sanitized = stripJpegMetadata(buffer); extension = '.jpg'; }
  else if (mimeType === 'image/png') { sanitized = stripPngMetadata(buffer); extension = '.png'; }
  else throw new ValidationError('Only JPEG and PNG images are supported');
  const directory = path.resolve(uploadDir);
  await fs.mkdir(directory, { recursive: true });
  const filename = `${crypto.randomUUID()}${extension}`;
  await fs.writeFile(path.join(directory, filename), sanitized, { flag: 'wx', mode: 0o600 });
  return { url: `/uploads/${filename}`, size: sanitized.length, mimeType };
}

module.exports = { stripJpegMetadata, stripPngMetadata, savePhoto };
