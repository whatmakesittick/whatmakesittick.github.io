import argparse
from pathlib import Path

import numpy as np

import correctives as cor
import fixtures
import reference
from mhr_body import Body, load_config, load_mhr, build_body
from pack import Blob, varints, write_module, zigzag_varints

POSITION_STEP_M = 1e-5
WEIGHT_ONE = 65535
TARGET_WORST_M = 0.0009
VALIDATION_PHASE = 4
TEST_PHASE = 0
SPLIT = 8
FIXTURE_STRIDE = 6


def runtime_columns(body: Body, fixed: list[str]) -> np.ndarray:
    names = body.parameter_names
    free = [i for i, n in enumerate(names) if n not in fixed and body.transform[:, i].any()]
    return np.array(free, dtype=np.int64)


def quantised_weights(body: Body) -> tuple[np.ndarray, np.ndarray, np.ndarray]:
    counts, joints, weights = [], [], []
    for indices, values in zip(body.skin_indices, body.skin_weights):
        keep = values > 0
        scaled = np.round(values[keep] / values[keep].sum() * WEIGHT_ONE).astype(np.int64)
        scaled[scaled.argmax()] += WEIGHT_ONE - scaled.sum()
        counts.append(int(keep.sum()))
        joints.extend(indices[keep].tolist())
        weights.extend(scaled.tolist())
    return np.array(counts), np.array(joints), np.array(weights)


def add_geometry(blob: Blob, body: Body) -> None:
    quantised = np.round(body.rest / POSITION_STEP_M).astype(np.int64)
    deltas = np.diff(quantised, axis=0, prepend=0)
    blob.add("positions", "u8", zigzag_varints(deltas.T.reshape(-1)))
    blob.add("triangles", "u8", zigzag_varints(np.diff(body.faces.reshape(-1), prepend=0)))
    counts, joints, weights = quantised_weights(body)
    blob.add("skinCounts", "u8", counts)
    blob.add("skinJoints", "u8", joints)
    blob.add("skinWeights", "u16", weights)


def add_skeleton(blob: Blob, body: Body, columns: np.ndarray) -> None:
    blob.add("parents", "i16", body.parents)
    blob.add("offsets", "f32", body.offsets)
    blob.add("prerotations", "f32", body.prerotations)
    blob.add("inverseBind", "f32", body.inverse_bind)
    rows, cols = np.nonzero(body.transform[:, columns])
    blob.add("transformRows", "u16", rows)
    blob.add("transformColumns", "u16", cols)
    blob.add("transformValues", "f32", body.transform[:, columns][rows, cols])
    baked = np.flatnonzero(body.baked)
    blob.add("bakedRows", "u16", baked)
    blob.add("bakedValues", "f32", body.baked[baked])


def add_correctives(blob: Blob, corr: cor.Correctives) -> list[dict]:
    layer = corr.first_layer
    blob.add("layerCounts", "u16", np.array([len(c) for c in layer.columns]))
    steps = [np.diff(c, prepend=0) for c in layer.columns]
    blob.add("layerColumns", "u8", varints(np.concatenate(steps)))
    blob.add("layerValues", "i8", np.concatenate(layer.values))
    blob.add("layerScales", "f32", layer.scales)
    summary = []
    for i, region in enumerate(corr.regions):
        summary.append(
            {
                "name": region.name,
                "components": region.components,
                "vertices": len(region.vertices),
                "units": len(region.units),
            }
        )
        if region.components == 0:
            continue
        blob.add(f"r{i}Vertices", "u8", varints(np.diff(region.vertices, prepend=0)))
        blob.add(f"r{i}Units", "u16", region.units)
        blob.add(f"r{i}U", "i16", region.u_values)
        blob.add(f"r{i}UScales", "f32", region.u_scales)
        blob.add(f"r{i}C", "i8", region.c_values.T)
        blob.add(f"r{i}CScales", "f32", region.c_scales)
    return summary


def split_indices(count: int) -> tuple[np.ndarray, np.ndarray, np.ndarray]:
    index = np.arange(count)
    phase = index % SPLIT
    return index[(phase != VALIDATION_PHASE) & (phase != TEST_PHASE)], index[phase == VALIDATION_PHASE], index[phase == TEST_PHASE]


def posed_error(body: Body, corr: cor.Correctives, live: np.ndarray, parameters: np.ndarray) -> np.ndarray:
    joints = reference.joint_parameters(body, parameters)
    features = reference.rotation_features(joints) * live[None]
    reduced = cor.reduced_offsets(corr, features, len(body.rest))
    full = reference.pose(body, parameters, True)
    approx = reference.pose_with_offsets(body, parameters, reduced)
    return np.linalg.norm(full - approx, axis=2)


def run(assets: Path, config_path: Path, module: Path, fixture_dir: Path) -> None:
    config = load_config(config_path)
    model = load_mhr(assets, config.lod)
    body = build_body(model, config)
    parameters, _ = fixtures.read_samples(fixture_dir, body.parameter_names, config)
    columns = runtime_columns(body, body.fixed)
    fixed_ids = [body.parameter_names.index(n) for n in body.fixed]
    train, validation, test = split_indices(len(parameters))
    joints = reference.joint_parameters(body, parameters)
    corr = cor.fit(body, columns, joints[train], joints[validation], TARGET_WORST_M)
    live = cor.live_features(body, columns)
    for label, group in (("validation", validation), ("test", test)):
        error = posed_error(body, corr, live, parameters[group])
        print(f"{label}: worst {error.max() * 1000:.3f} mm, mean {error.mean() * 1000:.4f} mm")
    blob = Blob()
    add_geometry(blob, body)
    add_skeleton(blob, body, columns)
    summary = add_correctives(blob, corr)
    meta = {
        "vertexCount": len(body.rest),
        "triangleCount": len(body.faces),
        "jointCount": len(body.parents),
        "positionStep": POSITION_STEP_M,
        "weightOne": WEIGHT_ONE,
        "statureM": config.stature_m,
        "jointNames": body.joint_names,
        "parameterNames": [body.parameter_names[i] for i in columns],
        "fixedParameters": config.skeleton,
        "layerUnits": int(len(corr.first_layer.units)),
        "regions": summary,
    }
    write_module(module, meta, blob)
    sample_columns = fixtures.active_columns(parameters, fixed_ids)
    chosen = test[::FIXTURE_STRIDE]
    joints_chosen = reference.joint_parameters(body, parameters[chosen])
    offsets = reference.offsets(body, joints_chosen)
    fixtures.write_ground_truth(fixture_dir, model, config, body, parameters[chosen], sample_columns, offsets)
    print("regions", [(r["name"], r["components"], r["vertices"], r["units"]) for r in summary])
    print("units kept", meta["layerUnits"], "module bytes", module.stat().st_size)


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--assets", type=Path, required=True)
    parser.add_argument("--config", type=Path, default=Path(__file__).with_name("config.json"))
    parser.add_argument("--module", type=Path, required=True)
    parser.add_argument("--fixtures", type=Path, required=True)
    arguments = parser.parse_args()
    run(arguments.assets, arguments.config, arguments.module, arguments.fixtures)


if __name__ == "__main__":
    main()
