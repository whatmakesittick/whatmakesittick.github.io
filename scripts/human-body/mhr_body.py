import json
from dataclasses import dataclass
from pathlib import Path

import numpy as np
import torch
from mhr.mhr import MHR
from scipy.spatial.transform import Rotation

CENTIMETRES_PER_METRE = 100.0
MODEL_PARAMETERS = 204
IDENTITY_COEFFICIENTS = 45
FACE_COEFFICIENTS = 72
JOINT_PARAMETERS = 7
ROTATION_FEATURES = 6
FIRST_FEATURE_JOINT = 2
TRANSLATION_ROWS = 3


@dataclass(frozen=True)
class Config:
    lod: int
    stature_m: float
    body: list[float]
    skeleton: dict[str, float]


@dataclass(frozen=True)
class Body:
    parameter_names: list[str]
    joint_names: list[str]
    parents: np.ndarray
    offsets: np.ndarray
    prerotations: np.ndarray
    transform: np.ndarray
    baked: np.ndarray
    rest: np.ndarray
    faces: np.ndarray
    skin_indices: np.ndarray
    skin_weights: np.ndarray
    inverse_bind: np.ndarray
    first_layer: np.ndarray
    second_layer: np.ndarray
    scale: float
    fixed: list[str]


def load_config(path: Path) -> Config:
    raw = json.loads(path.read_text())
    return Config(raw["lod"], raw["statureM"], raw["body"], raw["skeleton"])


def load_mhr(assets: Path, lod: int) -> MHR:
    return MHR.from_files(assets, torch.device("cpu"), lod=lod)


def identity_tensor(config: Config) -> torch.Tensor:
    identity = torch.zeros(1, IDENTITY_COEFFICIENTS)
    identity[0, : len(config.body)] = torch.tensor(config.body)
    return identity


def parameter_vector(names: list[str], values: dict[str, float]) -> np.ndarray:
    vector = np.zeros(MODEL_PARAMETERS)
    for name, value in values.items():
        vector[names.index(name)] = value
    return vector


def run_mhr(
    model: MHR, config: Config, parameters: np.ndarray, correctives: bool
) -> tuple[np.ndarray, np.ndarray]:
    batch = parameters.shape[0]
    identity = identity_tensor(config).repeat(batch, 1)
    face = torch.zeros(batch, FACE_COEFFICIENTS)
    with torch.no_grad():
        vertices, state = model(
            identity,
            torch.tensor(parameters, dtype=torch.float32),
            face,
            apply_correctives=correctives,
        )
    return vertices.numpy().astype(np.float64), state.numpy().astype(np.float64)


def stature_scale(model: MHR, config: Config, names: list[str]) -> float:
    rest = parameter_vector(names, config.skeleton)[None]
    vertices, _ = run_mhr(model, config, rest, correctives=False)
    height_cm = vertices[0, :, 1].max() - vertices[0, :, 1].min()
    return config.stature_m / height_cm


def metre_rows(joint_rows: int) -> np.ndarray:
    return np.arange(joint_rows) % JOINT_PARAMETERS < TRANSLATION_ROWS


def build_body(model: MHR, config: Config) -> Body:
    character = model.character_torch
    names = list(model.character.parameter_transform.names)[:MODEL_PARAMETERS]
    scale = stature_scale(model, config, names)
    transform = character.parameter_transform.parameter_transform.numpy()
    transform = transform[:, :MODEL_PARAMETERS].astype(np.float64)
    transform[metre_rows(len(transform))] *= scale
    fixed = sorted(config.skeleton, key=names.index)
    fixed_values = parameter_vector(names, config.skeleton)
    identity = torch.cat([identity_tensor(config), torch.zeros(1, FACE_COEFFICIENTS)], 1)
    rest = character.blend_shape.forward(identity)[0].numpy().astype(np.float64)
    skinning = character.linear_blend_skinning
    inverse_bind = skinning.inverse_bind_pose.numpy().astype(np.float64)
    inverse_bind[:, :3] *= scale
    first = model.pose_correctives_model.pose_dirs_predictor[0]
    dense = np.zeros((first.sparse_shape[0], first.sparse_shape[1]))
    indices = first.sparse_indices.numpy()
    dense[indices[0], indices[1]] = first.sparse_weight.detach().numpy()
    second = model.pose_correctives_model.pose_dirs_predictor[2].weight.detach().numpy()
    return Body(
        parameter_names=names,
        joint_names=list(model.character.skeleton.joint_names),
        parents=character.skeleton.joint_parents.numpy().astype(np.int64),
        offsets=character.skeleton.joint_translation_offsets.numpy().astype(np.float64) * scale,
        prerotations=character.skeleton.joint_prerotations.numpy().astype(np.float64),
        transform=transform,
        baked=transform @ fixed_values,
        rest=rest * scale,
        faces=character.mesh.faces.numpy().astype(np.int64),
        skin_indices=skinning.skin_indices.numpy().astype(np.int64),
        skin_weights=skinning.skin_weights.numpy().astype(np.float64),
        inverse_bind=inverse_bind,
        first_layer=dense,
        second_layer=second.T.astype(np.float64) * scale,
        scale=scale,
        fixed=fixed,
    )


def euler_matrices(angles: np.ndarray) -> np.ndarray:
    return Rotation.from_euler("ZYX", angles[..., ::-1].reshape(-1, 3)).as_matrix().reshape(
        angles.shape[:-1] + (3, 3)
    )
