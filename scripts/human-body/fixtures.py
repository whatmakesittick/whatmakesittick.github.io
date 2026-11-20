import json
from pathlib import Path

import numpy as np

from mhr_body import MODEL_PARAMETERS, Body, Config, run_mhr

SAMPLE_STEP = 1e-4
FIXTURE_VERTICES = 400
SPREAD_VERTICES = 300
JOINT_STRIDE_ROTATION = 4


def active_columns(parameters: np.ndarray, excluded: list[int]) -> np.ndarray:
    moving = np.abs(parameters).max(axis=0) > 0
    moving[excluded] = False
    return np.flatnonzero(moving)


def grid_description(keys: list[list]) -> dict:
    paces = list(dict.fromkeys(k[0] for k in keys))
    kicks = list(dict.fromkeys(k[1] for k in keys))
    breathing = list(dict.fromkeys(k[2] for k in keys))
    heads = list(dict.fromkeys(k[3] for k in keys))
    units = sorted(set(k[4] for k in keys))
    rebuilt = [
        [p, k, b, h, u]
        for p in paces
        for k in kicks
        for b in breathing
        for h in heads
        for u in units
    ]
    assert rebuilt == keys
    return {
        "order": ["pace", "kick", "breathing", "headUp", "units"],
        "paces": paces,
        "kicks": kicks,
        "breathing": breathing,
        "headUp": heads,
        "units": units,
    }


def write_samples(out: Path, parameters: np.ndarray, keys: list[list], names: list[str], fixed: list[int]) -> np.ndarray:
    columns = active_columns(parameters, fixed)
    quantised = np.round(parameters[:, columns] / SAMPLE_STEP)
    assert np.abs(quantised).max() < 32767
    quantised.astype("<i2").tofile(out / "swim-samples.bin")
    meta = {
        "step": SAMPLE_STEP,
        "columns": [names[i] for i in columns],
        "poses": len(parameters),
        "grid": grid_description(keys),
    }
    (out / "swim-samples.json").write_text(json.dumps(meta))
    return columns


def read_samples(directory: Path, names: list[str], config: Config) -> tuple[np.ndarray, list[list]]:
    meta = json.loads((directory / "swim-samples.json").read_text())
    columns = [names.index(n) for n in meta["columns"]]
    raw = np.fromfile(directory / "swim-samples.bin", dtype="<i2").reshape(meta["poses"], len(columns))
    parameters = np.zeros((meta["poses"], MODEL_PARAMETERS))
    parameters[:, columns] = raw * meta["step"]
    for name, value in config.skeleton.items():
        parameters[:, names.index(name)] = value
    grid = meta["grid"]
    keys = [
        [p, k, b, h, u]
        for p in grid["paces"]
        for k in grid["kicks"]
        for b in grid["breathing"]
        for h in grid["headUp"]
        for u in grid["units"]
    ]
    return parameters, keys


def vertex_subset(offsets: np.ndarray) -> np.ndarray:
    spread = np.linspace(0, offsets.shape[1] - 1, SPREAD_VERTICES).astype(np.int64)
    strength = np.linalg.norm(offsets, axis=2).max(axis=0)
    ranked = np.argsort(-strength, kind="stable")
    extra = [v for v in ranked if v not in set(spread.tolist())][: FIXTURE_VERTICES - SPREAD_VERTICES]
    return np.array(sorted(set(spread.tolist()) | set(extra)), dtype=np.int64)


def write_ground_truth(
    out: Path,
    model,
    config: Config,
    body: Body,
    parameters: np.ndarray,
    columns: np.ndarray,
    offsets: np.ndarray,
) -> None:
    vertices = vertex_subset(offsets)
    on, state = run_mhr(model, config, parameters, correctives=True)
    off, _ = run_mhr(model, config, parameters, correctives=False)
    scale = body.scale
    chunks = [
        vertices.astype("<u2"),
        parameters[:, columns].astype("<f4"),
        (on[:, vertices] * scale).astype("<f4"),
        (off[:, vertices] * scale).astype("<f4"),
        (state[:, :, :3] * scale).astype("<f4"),
        state[:, :, 3:7].astype("<f4"),
    ]
    with open(out / "ground-truth.bin", "wb") as handle:
        for chunk in chunks:
            handle.write(np.ascontiguousarray(chunk).tobytes())
    meta = {
        "poses": len(parameters),
        "vertices": len(vertices),
        "joints": state.shape[1],
        "columns": [body.parameter_names[i] for i in columns],
        "layout": ["vertexIds", "parameters", "correctivesOn", "correctivesOff", "jointPositions", "jointRotations"],
    }
    (out / "ground-truth.json").write_text(json.dumps(meta))
