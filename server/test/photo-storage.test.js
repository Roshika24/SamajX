'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { stripJpegMetadata, stripPngMetadata } = require('../src/modules/reports/photoStorage');

function pngChunk(type, data = Buffer.alloc(0)) {
  const head = Buffer.alloc(8);
  head.writeUInt32BE(data.length, 0);
  head.write(type, 4, 4, 'ascii');
  return Buffer.concat([head, data, Buffer.alloc(4)]);
}

test('JPEG EXIF APP1 segment is removed while scan data is retained', () => {
  const soi = Buffer.from([0xff, 0xd8]);
  const exif = Buffer.from([0xff, 0xe1, 0x00, 0x08, 0x45, 0x78, 0x69, 0x66, 0x00, 0x00]);
  const scan = Buffer.from([0xff, 0xda, 0x00, 0x02, 0x11, 0x22, 0xff, 0xd9]);
  const output = stripJpegMetadata(Buffer.concat([soi, exif, scan]));
  assert.equal(output.includes(Buffer.from('Exif')), false);
  assert.equal(output.subarray(-scan.length).equals(scan), true);
});

test('PNG eXIf chunk is removed while image chunks are retained', () => {
  const signature = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  const ihdr = pngChunk('IHDR', Buffer.alloc(13));
  const exif = pngChunk('eXIf', Buffer.from('GPS metadata'));
  const idat = pngChunk('IDAT', Buffer.from([1, 2, 3]));
  const iend = pngChunk('IEND');
  const output = stripPngMetadata(Buffer.concat([signature, ihdr, exif, idat, iend]));
  assert.equal(output.includes(Buffer.from('GPS metadata')), false);
  assert.equal(output.includes(Buffer.from('IDAT')), true);
  assert.equal(output.includes(Buffer.from('eXIf')), false);
});

test('photo sanitizers reject unsupported or malformed image bytes', () => {
  assert.throws(() => stripJpegMetadata(Buffer.from('not a jpeg')), /valid JPEG/);
  assert.throws(() => stripPngMetadata(Buffer.from('not a png')), /valid PNG/);
});

test('savePhoto writes sanitized files with generated names', async (t) => {
  const fs = require('node:fs/promises');
  const os = require('node:os');
  const path = require('node:path');
  const { savePhoto } = require('../src/modules/reports/photoStorage');
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'SamajX-photo-'));
  t.after(() => fs.rm(directory, { recursive: true, force: true }));
  const jpeg = Buffer.concat([
    Buffer.from([0xff, 0xd8]),
    Buffer.from([0xff, 0xe1, 0x00, 0x08, 0x45, 0x78, 0x69, 0x66, 0x00, 0x00]),
    Buffer.from([0xff, 0xda, 0x00, 0x02, 0x11, 0x22, 0xff, 0xd9]),
  ]);
  const result = await savePhoto(jpeg, 'image/jpeg', directory);
  assert.match(result.url, /^\/uploads\/[a-f0-9-]{36}\.jpg$/i);
  const saved = await fs.readFile(path.join(directory, path.basename(result.url)));
  assert.equal(saved.includes(Buffer.from('Exif')), false);
  const fileStat = await fs.stat(path.join(directory, path.basename(result.url)));
  assert.equal(fileStat.isFile(), true);
  // POSIX exposes chmod mode bits; Windows synthesizes mode bits and does not
  // enforce the same 0600 semantics through Node's stat(). The production
  // write still requests mode 0600 on every platform.
  if (process.platform !== 'win32') {
    assert.equal(fileStat.mode & 0o777, 0o600);
  }
});
