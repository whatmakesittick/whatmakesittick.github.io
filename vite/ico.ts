const HEADER_SIZE = 6;
const ENTRY_SIZE = 16;
const ICON_TYPE = 1;
const COLOR_PLANES = 1;
const BITS_PER_PIXEL = 32;
const LARGEST_SIZE = 256;
const PNG_SIGNATURE = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
const PNG_WIDTH_OFFSET = 16;
const PNG_HEIGHT_OFFSET = 20;
const PNG_HEADER_END = 24;

export interface ImageSize {
  width: number;
  height: number;
}

export function pngSize(png: Buffer): ImageSize {
  const isPng =
    png.length >= PNG_HEADER_END && png.subarray(0, PNG_SIGNATURE.length).equals(PNG_SIGNATURE);
  if (!isPng) throw new Error('An icon image must be a PNG file');
  return { width: png.readUInt32BE(PNG_WIDTH_OFFSET), height: png.readUInt32BE(PNG_HEIGHT_OFFSET) };
}

function sizeByte(size: number): number {
  if (size < 1 || size > LARGEST_SIZE) {
    throw new Error(`An icon image must be 1 to ${LARGEST_SIZE} pixels wide and high, not ${size}`);
  }
  return size % LARGEST_SIZE;
}

function header(count: number): Buffer {
  const buffer = Buffer.alloc(HEADER_SIZE);
  buffer.writeUInt16LE(ICON_TYPE, 2);
  buffer.writeUInt16LE(count, 4);
  return buffer;
}

function entry(png: Buffer, offset: number): Buffer {
  const { width, height } = pngSize(png);
  const buffer = Buffer.alloc(ENTRY_SIZE);
  buffer.writeUInt8(sizeByte(width), 0);
  buffer.writeUInt8(sizeByte(height), 1);
  buffer.writeUInt16LE(COLOR_PLANES, 4);
  buffer.writeUInt16LE(BITS_PER_PIXEL, 6);
  buffer.writeUInt32LE(png.length, 8);
  buffer.writeUInt32LE(offset, 12);
  return buffer;
}

function payloadOffsets(pngs: readonly Buffer[]): number[] {
  const first = HEADER_SIZE + ENTRY_SIZE * pngs.length;
  return pngs.map((_png, index) =>
    pngs.slice(0, index).reduce((offset, png) => offset + png.length, first),
  );
}

export function encodeIco(pngs: readonly Buffer[]): Buffer {
  if (pngs.length === 0) throw new Error('An icon needs at least one image');
  const offsets = payloadOffsets(pngs);
  const entries = pngs.map((png, index) => entry(png, offsets[index]));
  return Buffer.concat([header(pngs.length), ...entries, ...pngs]);
}
