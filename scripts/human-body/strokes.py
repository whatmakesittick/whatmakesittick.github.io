import json
from dataclasses import dataclass
from pathlib import Path

import numpy as np

import correctives as cor
import reference
from mhr_body import Body

EVALUATION_CHUNK = 600


@dataclass(frozen=True)
class Strokes:
    joints: np.ndarray
    parameters: np.ndarray
    parameter_names: list[str]
    keys: list[dict]


def read(directory: Path, name: str) -> Strokes:
    meta = json.loads((directory / f"{name}.json").read_text())
    count, joints, per = meta["poses"], meta["jointCount"], meta["jointParameters"]
    raw = np.fromfile(directory / f"{name}.joints.f32", dtype="<f4")
    parameters = np.fromfile(directory / f"{name}.parameters.f32", dtype="<f4")
    return Strokes(
        raw.reshape(count, joints, per).astype(np.float64),
        parameters.reshape(count, -1).astype(np.float64),
        meta["parameterNames"],
        meta["keys"],
    )


def features_of(joints: np.ndarray, live: np.ndarray) -> np.ndarray:
    return reference.rotation_features(joints) * live[None]


def full_offsets(body: Body, features: np.ndarray) -> np.ndarray:
    first = body.first_layer.astype(np.float32)
    second = body.second_layer.astype(np.float32)
    activations = np.maximum(features.astype(np.float32) @ first.T, 0.0)
    return (activations @ second).reshape(len(features), -1, 3).astype(np.float64)


class Reference:
    def __init__(self, body: Body, live: np.ndarray, joints: np.ndarray) -> None:
        self.body = body
        self.live = live
        self.features = [
            features_of(joints[start : start + EVALUATION_CHUNK], live)
            for start in range(0, len(joints), EVALUATION_CHUNK)
        ]
        self.full = [full_offsets(body, f).astype(np.float32) for f in self.features]

    def errors(self, corr: cor.Correctives) -> np.ndarray:
        vertex_count = len(self.body.rest)
        return np.concatenate(
            [
                np.linalg.norm(cor.reduced_offsets(corr, f, vertex_count) - full, axis=2)
                for f, full in zip(self.features, self.full)
            ]
        )
