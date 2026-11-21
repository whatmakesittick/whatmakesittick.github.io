import type { ArrayKind, FigureData } from './data';

const VARINT_BITS = 7;
const VARINT_MORE = 0x80;
const VARINT_MASK = 0x7f;

interface KindViews {
  readonly f32: Float32Array;
  readonly i32: Int32Array;
  readonly i16: Int16Array;
  readonly u16: Uint16Array;
  readonly i8: Int8Array;
  readonly u8: Uint8Array;
}

const CONSTRUCTORS = {
  f32: Float32Array,
  i32: Int32Array,
  i16: Int16Array,
  u16: Uint16Array,
  i8: Int8Array,
  u8: Uint8Array,
} as const;

export function base64Bytes(text: string): Uint8Array<ArrayBuffer> {
  const binary = atob(text);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

export class ArrayStore {
  private readonly data: FigureData;
  private readonly bytes: Uint8Array<ArrayBuffer>;

  constructor(data: FigureData) {
    this.data = data;
    this.bytes = base64Bytes(data.bytes);
  }

  has(name: string): boolean {
    return name in this.data.arrays;
  }

  read<K extends ArrayKind>(name: string, kind: K): KindViews[K] {
    const entry = this.data.arrays[name];
    if (!entry || entry[0] !== kind) throw new Error(`Missing ${kind} array ${name}`);
    return new CONSTRUCTORS[kind](this.bytes.buffer, entry[1], entry[2]) as KindViews[K];
  }
}

export interface VarintReader {
  unsigned(): number;
  signed(): number;
}

export function varintReader(bytes: Uint8Array): VarintReader {
  let cursor = 0;
  const unsigned = (): number => {
    let value = 0;
    let factor = 1;
    while (bytes[cursor] >= VARINT_MORE) {
      value += (bytes[cursor++] & VARINT_MASK) * factor;
      factor *= 1 << VARINT_BITS;
    }
    return value + bytes[cursor++] * factor;
  };
  const signed = (): number => {
    const value = unsigned();
    return value % 2 === 0 ? value / 2 : -(value + 1) / 2;
  };
  return { unsigned, signed };
}
