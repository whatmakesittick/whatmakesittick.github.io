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
COMPONENT_GRID = [1, 2, 3, 4, 6, 8, 10, 12, 16, 20, 24, 32, 40, 48, 64, 96, 128]
UNIT_GRID = [8, 12, 16, 24, 32, 48, 64, 96, 128, 192, 256, 384, 512, 768]
SELECTION_OUTPUTS = 24
ACTIVE_FLOOR = 0.0
RIDGE = 1e-6
UNIT_BYTES_IN_FIRST_LAYER = 24
INT8_MAX = 127
INT16_MAX = 32767
LAYER_TOP = INT8_MAX
C_TOP = INT8_MAX
VALIDATION_STRIDE = 4
VALIDATION_PHASE = 2
METRES_PER_MM = 1e-3


@dataclass(frozen=True)
class Settings:
    tolerance_m: float
    vertex_floor_m: float
    weight_bits: int
    margin: float = 0.8
    precision_share: float = 0.09
    fine_regions: bool = True

    @property
    def precision_m(self) -> float:
        return self.tolerance_m * self.precision_share


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
    weight_bits: int


def joint_region(name: str) -> str:
    for pattern, region in REGION_RULES:
        if re.match(pattern, name):
            return ("l_" if name.startswith("l_") else "r_" if name.startswith("r_") else "") + region
    return TORSO


def fine_region(name: str) -> str:
    coarse = joint_region(name)
    if coarse.endswith("hand") or coarse.endswith("foot"):
        return coarse
    stem = re.sub(r"_twist\d*(_proc)?$", "", name)
    return coarse + ":" + stem


def vertex_regions(body: Body, fine: bool = False) -> np.ndarray:
    rule = fine_region if fine else joint_region
    names = np.array([rule(n) for n in body.joint_names])
    dominant = body.skin_indices[np.arange(len(body.rest)), body.skin_weights.argmax(1)]
    return names[dominant]


def live_features(body: Body, columns: np.ndarray) -> np.ndarray:
    rows = body.transform[:, columns] != 0
    euler = rows.reshape(-1, JOINT_PARAMETERS, len(columns))[:, 3:6].any(axis=(1, 2))
    baked = body.baked.reshape(-1, JOINT_PARAMETERS)[:, 3:6]
    assert not baked[~euler].any()
    return np.repeat(euler[FIRST_FEATURE_JOINT:], ROTATION_FEATURES)


def region_columns(vertices: np.ndarray) -> np.ndarray:
    return (vertices[:, None] * 3 + np.arange(3)[None]).reshape(-1)


def quantised_first_layer(body: Body, live: np.ndarray, units: np.ndarray) -> FirstLayer:
    rows = body.first_layer[units] * live[None]
    scales = np.abs(rows).max(axis=1) / LAYER_TOP
    columns, values = [], []
    for row, scale in zip(rows, scales):
        index = np.flatnonzero(row)
        columns.append(index.astype(np.int64))
        values.append(np.round(row[index] / scale).astype(np.int64))
    return FirstLayer(units, columns, values, scales.astype(np.float32))


def dense_first_layer(layer: FirstLayer, feature_count: int) -> np.ndarray:
    dense = np.zeros((len(layer.units), feature_count))
    for k, (columns, values) in enumerate(zip(layer.columns, layer.values)):
        dense[k, columns] = values * layer.scales[k]
    return dense


def activations_of(layer: FirstLayer, features: np.ndarray) -> np.ndarray:
    return np.maximum(features @ dense_first_layer(layer, features.shape[1]).T, 0.0)


def stable_signs(vt: np.ndarray) -> np.ndarray:
    pivot = np.abs(vt).argmax(axis=1)
    return vt * np.sign(vt[np.arange(len(vt)), pivot])[:, None]


def order_units(activations: np.ndarray, targets: np.ndarray, count: int) -> np.ndarray:
    samples, candidates = activations.shape
    count = min(count, candidates)
    residual_norms = (activations**2).sum(axis=0)
    correlation = activations.T @ targets
    basis = np.zeros((samples, count))
    projections = np.zeros((count, candidates))
    chosen: list[int] = []
    taken = np.zeros(candidates, dtype=bool)
    for m in range(count):
        score = (correlation**2).sum(axis=1) / np.maximum(residual_norms, 1e-12)
        score[taken | (residual_norms < 1e-9)] = -1.0
        best = int(score.argmax())
        if score[best] <= 0:
            break
        direction = activations[:, best] - basis[:, :m] @ projections[:m, best]
        direction /= np.linalg.norm(direction)
        basis[:, m] = direction
        along = activations.T @ direction
        projections[m] = along
        residual_norms -= along**2
        correlation -= np.outer(along, direction @ targets)
        taken[best] = True
        chosen.append(best)
    return np.array(chosen, dtype=np.int64)


def solve_units(activations: np.ndarray, targets: np.ndarray) -> np.ndarray:
    gram = activations.T @ activations
    ridge = RIDGE * np.trace(gram) / len(gram)
    return np.linalg.solve(gram + ridge * np.eye(len(gram)), activations.T @ targets)


def quantise_columns(
    values: np.ndarray, top: int, floors: np.ndarray | None = None
) -> tuple[np.ndarray, np.ndarray]:
    scales = np.abs(values).max(axis=0) / top
    if floors is not None:
        scales = np.maximum(scales, floors)
    scales[scales == 0] = 1.0
    return np.round(values / scales).astype(np.int64), scales.astype(np.float32)


def quantised_pair(u: np.ndarray, basis: np.ndarray, z: np.ndarray, settings: Settings):
    top = INT8_MAX if settings.weight_bits == 8 else INT16_MAX
    u_values, u_scales = quantise_columns(u, top)
    steps = settings.precision_m / np.maximum(np.abs(z).max(axis=0), 1e-12)
    c_values, c_scales = quantise_columns(basis.T, C_TOP, steps)
    return u_values, u_scales, c_values, c_scales


def dequantised_offsets(activations: np.ndarray, pair) -> np.ndarray:
    u_values, u_scales, c_values, c_scales = pair
    return ((activations @ (u_values * u_scales)) @ (c_values * c_scales).T)


def vertex_errors(predicted: np.ndarray, target: np.ndarray) -> np.ndarray:
    delta = (predicted - target).reshape(len(target), -1, 3)
    return np.linalg.norm(delta, axis=2)


def region_cost(units: int, components: int, vertices: int, weight_bits: int) -> int:
    u_bytes = units * components * weight_bits // 8
    return u_bytes + components * vertices * 3 + units * UNIT_BYTES_IN_FIRST_LAYER


def choose_size(
    activations: np.ndarray,
    targets: np.ndarray,
    split: tuple[np.ndarray, np.ndarray],
    vertex_count: int,
    settings: Settings,
) -> tuple[int, int]:
    train, validation = split
    _, _, vt = np.linalg.svd(targets[train], full_matrices=False)
    vt = stable_signs(vt)
    limit = settings.tolerance_m * settings.margin
    best = None
    ordered = order_units(activations[train], targets[train] @ vt[:SELECTION_OUTPUTS].T, max(UNIT_GRID))
    for k in [c for c in COMPONENT_GRID if c <= len(vt)]:
        basis = vt[:k]
        z = targets[train] @ basis.T
        for m in [m for m in UNIT_GRID if m <= len(ordered)]:
            sel = ordered[:m]
            u = solve_units(activations[train][:, sel], z)
            pair = quantised_pair(u, basis, z, settings)
            predicted = dequantised_offsets(activations[validation][:, sel], pair)
            worst = vertex_errors(predicted, targets[validation]).max()
            cost = region_cost(m, k, vertex_count, settings.weight_bits)
            if worst <= limit and (best is None or cost < best[0]):
                best = (cost, k, m)
    if best is None:
        return COMPONENT_GRID[-1], min(UNIT_GRID[-1], len(ordered))
    return best[1], best[2]


def fit_region(
    name: str,
    vertices: np.ndarray,
    activations: np.ndarray,
    targets: np.ndarray,
    size: tuple[int, int],
    settings: Settings,
) -> tuple[Region, np.ndarray]:
    k, m = size
    _, _, vt = np.linalg.svd(targets, full_matrices=False)
    basis = stable_signs(vt)[:k]
    z = targets @ basis.T
    sel = np.sort(order_units(activations, targets @ stable_signs(vt)[:SELECTION_OUTPUTS].T, m))
    u = solve_units(activations[:, sel], z)
    u_values, u_scales, c_values, c_scales = quantised_pair(u, basis, z, settings)
    return Region(name, vertices, sel, u_values, u_scales, c_values.T, c_scales), sel


def validation_split(count: int) -> tuple[np.ndarray, np.ndarray]:
    index = np.arange(count)
    held = index % VALIDATION_STRIDE == VALIDATION_PHASE
    return index[~held], index[held]


def fit(
    body: Body,
    live: np.ndarray,
    features: np.ndarray,
    settings: Settings,
    log=print,
) -> Correctives:
    features = (features * live[None]).astype(np.float32)
    first = (body.first_layer * live[None]).astype(np.float32)
    full = np.maximum(features @ first.T, 0.0)
    candidates = np.flatnonzero(full.max(axis=0) > ACTIVE_FLOOR)
    layer = quantised_first_layer(body, live, candidates)
    quantised = activations_of(layer, features.astype(np.float64))
    second = body.second_layer[candidates].astype(np.float32)
    split = validation_split(len(features))
    names = vertex_regions(body, settings.fine_regions)
    regions, used = [], []
    for name in sorted(set(names)):
        vertices = np.flatnonzero(names == name)
        columns = region_columns(vertices)
        targets = (full[:, candidates] @ second[:, columns]).astype(np.float64)
        reach = vertex_errors(targets, np.zeros_like(targets)).max(axis=0)
        kept = reach >= settings.vertex_floor_m
        if not kept.any():
            continue
        vertices = vertices[kept]
        targets = targets.reshape(len(targets), -1, 3)[:, kept].reshape(len(targets), -1)
        size = choose_size(quantised, targets, split, len(vertices), settings)
        region, sel = fit_region(name, vertices, quantised, targets, size, settings)
        log(f"  {name}: {len(vertices)} vertices, {size[0]} components, {size[1]} units")
        regions.append(region)
        used.append(sel)
    return compact(Correctives(layer, regions, settings.weight_bits), used)


def compact(corr: Correctives, used: list[np.ndarray]) -> Correctives:
    keep = np.unique(np.concatenate(used))
    remap = np.full(len(corr.first_layer.units), -1, dtype=np.int64)
    remap[keep] = np.arange(len(keep))
    layer = corr.first_layer
    smaller = FirstLayer(
        layer.units[keep],
        [layer.columns[i] for i in keep],
        [layer.values[i] for i in keep],
        layer.scales[keep],
    )
    regions = [
        Region(r.name, r.vertices, remap[r.units], r.u_values, r.u_scales, r.c_values, r.c_scales)
        for r in corr.regions
    ]
    return Correctives(smaller, regions, corr.weight_bits)


def reduced_offsets(corr: Correctives, features: np.ndarray, vertex_count: int) -> np.ndarray:
    activations = activations_of(corr.first_layer, features)
    out = np.zeros((features.shape[0], vertex_count * 3))
    for region in corr.regions:
        u = region.u_values * region.u_scales
        c = region.c_values.T * region.c_scales
        out[:, region_columns(region.vertices)] = (activations[:, region.units] @ u) @ c.T
    return out.reshape(features.shape[0], vertex_count, 3)
