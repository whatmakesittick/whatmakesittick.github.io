import base64
import json
from pathlib import Path

import numpy as np

KINDS = {
    "f32": "<f4",
    "i32": "<i4",
    "i16": "<i2",
    "u16": "<u2",
    "i8": "i1",
    "u8": "u1",
}
ALIGNMENT = 4
VARINT_MORE = 0x80
VARINT_MASK = 0x7F


def zigzag_varints(values: np.ndarray) -> np.ndarray:
    out = bytearray()
    for value in values.tolist():
        n = (value << 1) if value >= 0 else ((-value << 1) - 1)
        while n >= VARINT_MORE:
            out.append((n & VARINT_MASK) | VARINT_MORE)
            n >>= 7
        out.append(n)
    return np.frombuffer(bytes(out), dtype=np.uint8)


def varints(values: np.ndarray) -> np.ndarray:
    out = bytearray()
    for n in values.tolist():
        while n >= VARINT_MORE:
            out.append((n & VARINT_MASK) | VARINT_MORE)
            n >>= 7
        out.append(n)
    return np.frombuffer(bytes(out), dtype=np.uint8)


class Blob:
    def __init__(self) -> None:
        self.chunks: list[bytes] = []
        self.size = 0
        self.arrays: dict[str, list] = {}

    def add(self, name: str, kind: str, values: np.ndarray) -> None:
        data = np.ascontiguousarray(values).astype(KINDS[kind]).tobytes()
        padding = (-self.size) % ALIGNMENT
        self.chunks.append(b"\0" * padding + data)
        self.arrays[name] = [kind, self.size + padding, int(np.asarray(values).size)]
        self.size += padding + len(data)

    def base64(self) -> str:
        return base64.b64encode(b"".join(self.chunks)).decode("ascii")


def write_module(path: Path, meta: dict, blob: Blob) -> None:
    body = dict(meta, arrays=blob.arrays, bytes=blob.base64())
    text = json.dumps(body, indent=2, sort_keys=False)
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(
        "import type { FigureData } from '@core/figure/data';\n\n"
        f"export const athleteData: FigureData = {text};\n"
    )
