import argparse
import gzip
from pathlib import Path

import numpy as np

import correctives as cor
import fixtures
import reference
import strokes
from mhr_body import Body, load_config, load_mhr, build_body
from pack import Blob, varints, write_module, zigzag_varints

POSITION_STEP_M = 1e-5
WEIGHT_ONE = 65535
MM = 1000.0
OLD_TEST_PHASE = 0
OLD_SPLIT = 8
OLD_FIXTURE_STRIDE = 6
DEFAULT_TOLERANCE_MM = 2.0
DEFAULT_VERTEX_FLOOR_MM = 1.0
WEIGHT_BITS = 16
FIT_SET = "fit"
HELD_OUT_SET = "heldout"


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


def triangle_columns(faces: np.ndarray) -> np.ndarray:
    first = faces.argmin(axis=1)
    rolled = np.array([np.roll(face, -k) for face, k in zip(faces, first)])
    ordered = rolled[np.lexsort((rolled[:, 2], rolled[:, 1], rolled[:, 0]))]
    corner = ordered[:, 0]
    return np.stack([np.diff(corner, prepend=0), ordered[:, 1] - corner, ordered[:, 2] - corner])


def add_geometry(blob: Blob, body: Body) -> None:
    quantised = np.round(body.rest / POSITION_STEP_M).astype(np.int64)
    deltas = np.diff(quantised, axis=0, prepend=0)
    blob.add("positions", "u8", zigzag_varints(deltas.T.reshape(-1)))
    blob.add("triangles", "u8", zigzag_varints(triangle_columns(body.faces).reshape(-1)))
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
    weight_kind = "i16" if corr.weight_bits == 16 else "i8"
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
        blob.add(f"r{i}Vertices", "u8", varints(np.diff(region.vertices, prepend=0)))
        blob.add(f"r{i}Units", "u16", region.units)
        blob.add(f"r{i}U", weight_kind, region.u_values)
        blob.add(f"r{i}UScales", "f32", region.u_scales)
        blob.add(f"r{i}C", "i8", region.c_values.T)
        blob.add(f"r{i}CScales", "f32", region.c_scales)
    return summary


def build_blob(body: Body, columns: np.ndarray, corr: cor.Correctives | None) -> tuple[Blob, list[dict]]:
    blob = Blob()
    add_geometry(blob, body)
    add_skeleton(blob, body, columns)
    summary = add_correctives(blob, corr) if corr else []
    if not corr:
        blob.add("layerCounts", "u16", np.zeros(0))
        blob.add("layerColumns", "u8", np.zeros(0))
        blob.add("layerValues", "i8", np.zeros(0))
        blob.add("layerScales", "f32", np.zeros(0))
    return blob, summary


def module_meta(body: Body, config, columns: np.ndarray, corr: cor.Correctives | None, summary: list[dict]) -> dict:
    return {
        "vertexCount": len(body.rest),
        "triangleCount": len(body.faces),
        "jointCount": len(body.parents),
        "positionStep": POSITION_STEP_M,
        "weightOne": WEIGHT_ONE,
        "statureM": config.stature_m,
        "jointNames": body.joint_names,
        "parameterNames": [body.parameter_names[i] for i in columns],
        "fixedParameters": config.skeleton,
        "layerUnits": int(len(corr.first_layer.units)) if corr else 0,
        "regions": summary,
    }


def gzipped_size(path: Path) -> int:
    return len(gzip.compress(path.read_bytes(), compresslevel=9))


def write_old_ground_truth(model, config, body: Body, columns: np.ndarray, fixture_dir: Path) -> None:
    parameters, _ = fixtures.read_samples(fixture_dir, body.parameter_names, config)
    fixed_ids = [body.parameter_names.index(n) for n in body.fixed]
    index = np.arange(len(parameters))
    test = index[index % OLD_SPLIT == OLD_TEST_PHASE]
    chosen = test[::OLD_FIXTURE_STRIDE]
    joints = reference.joint_parameters(body, parameters[chosen])
    offsets = reference.offsets(body, joints)
    sample_columns = fixtures.active_columns(parameters, fixed_ids)
    fixtures.write_ground_truth(fixture_dir, model, config, body, parameters[chosen], sample_columns, offsets)


def fit_correctives(body: Body, live: np.ndarray, poses: strokes.Strokes, settings: cor.Settings) -> cor.Correctives:
    return cor.fit(body, live, reference.rotation_features(poses.joints), settings)


def report(reference: strokes.Reference, corr: cor.Correctives, label: str) -> None:
    errors = reference.errors(corr) * MM
    print(f"{label}: worst {errors.max():.3f} mm, mean {errors.mean():.4f} mm")


def run(arguments: argparse.Namespace) -> None:
    config = load_config(arguments.config)
    model = load_mhr(arguments.assets, config.lod)
    body = build_body(model, config)
    columns = runtime_columns(body, body.fixed)
    live = cor.live_features(body, columns)
    fit_set = strokes.read(arguments.poses, FIT_SET)
    held_out = strokes.read(arguments.poses, HELD_OUT_SET)
    settings = cor.Settings(
        arguments.tolerance_mm / MM, arguments.vertex_floor_mm / MM, WEIGHT_BITS
    )
    corr = fit_correctives(body, live, fit_set, settings)
    report(strokes.Reference(body, live, held_out.joints), corr, "held-out set")
    blob, summary = build_blob(body, columns, corr)
    write_module(arguments.module, module_meta(body, config, columns, corr, summary), blob)
    print("regions", [(r["name"], r["components"], r["vertices"], r["units"]) for r in summary])
    print(
        "units kept",
        len(corr.first_layer.units),
        "module bytes",
        arguments.module.stat().st_size,
        "gzipped",
        gzipped_size(arguments.module),
    )
    arguments.fixtures.mkdir(parents=True, exist_ok=True)
    if arguments.skip_ground_truth:
        print("skipped the ground truth fixture")
    else:
        write_old_ground_truth(model, config, body, columns, arguments.fixtures)
    fixtures.write_stroke_truth(arguments.fixtures, body, held_out)


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--assets", type=Path, required=True)
    parser.add_argument("--config", type=Path, default=Path(__file__).with_name("config.json"))
    parser.add_argument("--poses", type=Path, required=True)
    parser.add_argument("--module", type=Path, required=True)
    parser.add_argument("--fixtures", type=Path, required=True)
    parser.add_argument("--skip-ground-truth", action="store_true")
    parser.add_argument("--tolerance-mm", type=float, default=DEFAULT_TOLERANCE_MM)
    parser.add_argument("--vertex-floor-mm", type=float, default=DEFAULT_VERTEX_FLOOR_MM)
    run(parser.parse_args())


if __name__ == "__main__":
    main()
