import re
from dataclasses import dataclass

import numpy as np

from mhr_body import JOINT_PARAMETERS, ROTATION_FEATURES, FIRST_FEATURE_JOINT, Body
import reference

REGION_RULES = [
    (r"[lr]_(thumb|index|middle|ring|pinky|wrist)", "hand"),
    (r"[lr]_(clavicle|uparm|lowarm)", "arm"),
    (r"[lr]_(upleg|lowleg)", "leg"),
    (r"[lr]_(foot|talocrural|subtalar|transversetarsal|ball)", "foot"),
    (r"c_(?!spine).*|[lr]_eye.*", "head"),
]
TORSO = "torso"
COMPONENT_STEPS = [0, 2, 4, 6, 8, 12, 16, 24, 32, 48, 64, 96, 128, 192, 256]
UNIT_CUTOFF_M = 1e-5
VERTEX_CUTOFF_M = 5e-5
C_PRECISION_M = 2e-5
U_PRECISION_M = 5e-5
INT8_MAX = 127
INT16_MAX = 32767
U_TOP = 511
LAYER_TOP = INT8_MAX


@dataclass(frozen=True)
class FirstLayer:
    units: np.ndarray
    columns: list[np.ndarray]
    values: list[np.ndarray]
    scales: np.ndarray


@dataclass(frozen=True)
class Region:
    name: str
    vertices: np.ndarray
    units: np.ndarray
    u_values: np.ndarray
    u_scales: np.ndarray
    c_values: np.ndarray
    c_scales: np.ndarray

    @property
    def components(self) -> int:
        return self.c_values.shape[0]


@dataclass(frozen=True)
class Correctives:
    first_layer: FirstLayer
    regions: list[Region]


def joint_region(name: str) -> str:
    for pattern, region in REGION_RULES:
        if re.match(pattern, name):
            return ("l_" if name.startswith("l_") else "r_" if name.startswith("r_") else "") + region
    return TORSO


def vertex_regions(body: Body) -> np.ndarray:
    names = np.array([joint_region(n) for n in body.joint_names])
    dominant = body.skin_indices[np.arange(len(body.rest)), body.skin_weights.argmax(1)]
    return names[dominant]


def live_features(body: Body, columns: np.ndarray) -> np.ndarray:
    rows = body.transform[:, columns] != 0
    euler = rows.reshape(-1, JOINT_PARAMETERS, len(columns))[:, 3:6].any(axis=(1, 2))
    baked = body.baked.reshape(-1, JOINT_PARAMETERS)[:, 3:6]
    assert not baked[~euler].any()
    return np.repeat(euler[FIRST_FEATURE_JOINT:], ROTATION_FEATURES)


def select_units(activations: np.ndarray) -> np.ndarray:
    return np.flatnonzero(activations.max(axis=0) > 0)


def first_layer(body: Body, live: np.ndarray, units: np.ndarray) -> FirstLayer:
    rows = body.first_layer[units] * live[None]
    scales = np.abs(rows).max(axis=1) / LAYER_TOP
    columns, values = [], []
    for row, scale in zip(rows, scales):
        index = np.flatnonzero(row)
        columns.append(index.astype(np.int64))
        values.append(np.round(row[index] / scale).astype(np.int64))
    return FirstLayer(units, columns, values, scales.astype(np.float32))


def dequantised_first_layer(layer: FirstLayer, feature_count: int) -> np.ndarray:
    dense = np.zeros((len(layer.units), feature_count))
    for k, (columns, values) in enumerate(zip(layer.columns, layer.values)):
        dense[k, columns] = values * layer.scales[k]
    return dense


def kept_activations(layer: FirstLayer, features: np.ndarray) -> np.ndarray:
    dense = dequantised_first_layer(layer, features.shape[1])
    return np.maximum(features @ dense.T, 0.0)


def stable_signs(vt: np.ndarray) -> np.ndarray:
    pivot = np.abs(vt).argmax(axis=1)
    return vt * np.sign(vt[np.arange(len(vt)), pivot])[:, None]


def region_columns(vertices: np.ndarray) -> np.ndarray:
    return (vertices[:, None] * 3 + np.arange(3)[None]).reshape(-1)


def pick_components(
    train: np.ndarray, validation: np.ndarray, vt: np.ndarray, target_m: float
) -> int:
    for count in COMPONENT_STEPS:
        basis = vt[:count]
        error = (validation @ basis.T) @ basis - validation
        worst = np.linalg.norm(error.reshape(len(validation), -1, 3), axis=2).max()
        if worst <= target_m or count >= len(vt):
            return count
    return COMPONENT_STEPS[-1]


def quantise_columns(
    values: np.ndarray, top: int, steps: np.ndarray
) -> tuple[np.ndarray, np.ndarray]:
    floor = np.abs(values).max(axis=0) / top
    scales = np.maximum(steps, floor)
    scales[scales == 0] = 1.0
    return np.round(values / scales).astype(np.int64), scales.astype(np.float32)


def build_region(
    name: str,
    vertices: np.ndarray,
    count: int,
    vt: np.ndarray,
    second_kept: np.ndarray,
    activations: np.ndarray,
) -> Region:
    basis = vt[:count]
    u = second_kept[:, region_columns(vertices)] @ basis.T
    reach = activations.max(axis=0) * np.linalg.norm(u, axis=1) if count else np.zeros(len(u))
    units = np.flatnonzero(reach >= UNIT_CUTOFF_M)
    coefficients = activations[:, units] @ u[units]
    reach_c = np.abs(coefficients).max(axis=0) if count else np.zeros(0)
    c_steps = C_PRECISION_M / np.maximum(reach_c, 1e-12)
    load = np.linalg.norm(activations[:, units], axis=1).max() if len(units) else 1.0
    u_steps = np.full(count, U_PRECISION_M * np.sqrt(12.0) / max(load, 1e-12))
    u_values, u_scales = quantise_columns(u[units], U_TOP, u_steps)
    c_values, c_scales = quantise_columns(basis.T, INT8_MAX, c_steps)
    return Region(name, vertices, units, u_values, u_scales, c_values.T, c_scales)


def fit(
    body: Body,
    columns: np.ndarray,
    joints_fit: np.ndarray,
    joints_validation: np.ndarray,
    target_m: float,
) -> Correctives:
    live = live_features(body, columns)
    joints_all = np.concatenate([joints_fit, joints_validation])
    features_all = reference.rotation_features(joints_all) * live[None]
    full = np.maximum(features_all @ body.first_layer.T, 0.0)
    units = select_units(full)
    layer = first_layer(body, live, units)
    activations = kept_activations(layer, features_all)
    second_kept = body.second_layer[units]
    train_count = len(joints_fit)
    regions = []
    names = vertex_regions(body)
    for name in sorted(set(names)):
        vertices = np.flatnonzero(names == name)
        offsets = activations @ second_kept[:, region_columns(vertices)]
        reach = np.linalg.norm(offsets.reshape(len(offsets), -1, 3), axis=2).max(axis=0)
        vertices = vertices[reach >= VERTEX_CUTOFF_M]
        if len(vertices) == 0:
            continue
        offsets = activations @ second_kept[:, region_columns(vertices)]
        _, _, vt = np.linalg.svd(offsets[:train_count], full_matrices=False)
        vt = stable_signs(vt)
        count = pick_components(offsets[:train_count], offsets[train_count:], vt, target_m)
        _, _, vt = np.linalg.svd(offsets, full_matrices=False)
        regions.append(build_region(name, vertices, count, stable_signs(vt), second_kept, activations))
    return Correctives(layer, regions)


def reduced_offsets(corr: Correctives, features: np.ndarray, vertex_count: int) -> np.ndarray:
    activations = kept_activations(corr.first_layer, features)
    out = np.zeros((features.shape[0], vertex_count * 3))
    for region in corr.regions:
        if region.components == 0:
            continue
        u = region.u_values * region.u_scales
        c = region.c_values.T * region.c_scales
        coefficients = activations[:, region.units] @ u
        out[:, region_columns(region.vertices)] = coefficients @ c.T
    return out.reshape(features.shape[0], vertex_count, 3)
