import { describe, expect, it } from 'vitest';
import { encodeIco, pngSize } from './ico.ts';

const SIGNATURE = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];

function png(size: number, payloadLength = 8): Buffer {
  const buffer = Buffer.alloc(24 + payloadLength);
  Buffer.from(SIGNATURE).copy(buffer);
  buffer.writeUInt32BE(13, 8);
  buffer.write('IHDR', 12, 'ascii');
  buffer.writeUInt32BE(size, 16);
  buffer.writeUInt32BE(size, 20);
  return buffer;
}

function entries(ico: Buffer) {
  return Array.from({ length: ico.readUInt16LE(4) }, (_entry, index) => {
    const at = 6 + index * 16;
    return {
      width: ico.readUInt8(at),
      height: ico.readUInt8(at + 1),
      planes: ico.readUInt16LE(at + 4),
      bits: ico.readUInt16LE(at + 6),
      length: ico.readUInt32LE(at + 8),
      offset: ico.readUInt32LE(at + 12),
    };
  });
}

describe('pngSize', () => {
  it('reads the width and height from the image header', () => {
    expect(pngSize(png(32))).toEqual({ width: 32, height: 32 });
  });

  it('refuses anything that is not a PNG file', () => {
    expect(() => pngSize(Buffer.from('<svg />'))).toThrow('PNG');
  });
});

describe('encodeIco', () => {
  const small = png(16, 10);
  const large = png(32, 20);
  const ico = encodeIco([small, large]);

  it('writes an icon directory for every image', () => {
    expect([...ico.subarray(0, 6)]).toEqual([0, 0, 1, 0, 2, 0]);
    expect(entries(ico)).toEqual([
      { width: 16, height: 16, planes: 1, bits: 32, length: small.length, offset: 38 },
      {
        width: 32,
        height: 32,
        planes: 1,
        bits: 32,
        length: large.length,
        offset: 38 + small.length,
      },
    ]);
  });

  it('stores the images unchanged after the directory', () => {
    const [first, second] = entries(ico);
    expect(ico.subarray(first.offset, first.offset + first.length)).toEqual(small);
    expect(ico.subarray(second.offset, second.offset + second.length)).toEqual(large);
    expect(ico.length).toBe(38 + small.length + large.length);
  });

  it('writes the largest size as zero and refuses larger images', () => {
    expect(entries(encodeIco([png(256)]))[0]).toMatchObject({ width: 0, height: 0 });
    expect(() => encodeIco([png(512)])).toThrow('1 to 256 pixels');
    expect(() => encodeIco([])).toThrow('at least one image');
  });
});
