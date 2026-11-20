import numpy as np
from scipy.spatial.transform import Rotation

from mhr_body import (
    FIRST_FEATURE_JOINT,
    JOINT_PARAMETERS,
    Body,
    euler_matrices,
)


def joint_parameters(body: Body, parameters: np.ndarray) -> np.ndarray:
    flat = parameters @ body.transform.T
    return flat.reshape(parameters.shape[0], -1, JOINT_PARAMETERS)


def local_states(body: Body, joints: np.ndarray) -> tuple[np.ndarray, np.ndarray, np.ndarray]:
    pre = Rotation.from_quat(body.prerotations).as_matrix()
    rotations = pre[None] @ euler_matrices(joints[..., 3:6])
    translations = joints[..., :3] + body.offsets[None]
    return translations, rotations, 2.0 ** joints[..., 6]


def global_states(
    body: Body, joints: np.ndarray
) -> tuple[np.ndarray, np.ndarray, np.ndarray]:
    t, r, s = local_states(body, joints)
    for j in range(1, len(body.parents)):
        p = body.parents[j]
        t[:, j] = t[:, p] + s[:, p, None] * np.einsum("bij,bj->bi", r[:, p], t[:, j])
        r[:, j] = r[:, p] @ r[:, j]
        s[:, j] = s[:, p] * s[:, j]
    return t, r, s


def skin(
    body: Body, states: tuple[np.ndarray, np.ndarray, np.ndarray], rest: np.ndarray
) -> np.ndarray:
    t, r, s = states
    ib_r = Rotation.from_quat(body.inverse_bind[:, 3:7]).as_matrix()
    ib_t, ib_s = body.inverse_bind[:, :3], body.inverse_bind[:, 7]
    matrices = (s * ib_s)[..., None, None] * (r @ ib_r[None])
    translations = t + s[..., None] * np.einsum("bjik,jk->bji", r, ib_t)
    rest = np.broadcast_to(rest, (t.shape[0],) + rest.shape[-2:])
    out = np.zeros(rest.shape)
    for k in range(body.skin_indices.shape[1]):
        index, weight = body.skin_indices[:, k], body.skin_weights[:, k]
        moved = np.einsum("bvij,bvj->bvi", matrices[:, index], rest) + translations[:, index]
        out += weight[None, :, None] * moved
    return out


def rotation_features(joints: np.ndarray) -> np.ndarray:
    matrices = euler_matrices(joints[:, FIRST_FEATURE_JOINT:, 3:6])
    columns = np.concatenate([matrices[..., :, 0], matrices[..., :, 1]], axis=-1)
    columns[..., 0] -= 1
    columns[..., 4] -= 1
    return columns.reshape(joints.shape[0], -1)


def activations(body: Body, joints: np.ndarray) -> np.ndarray:
    return np.maximum(rotation_features(joints) @ body.first_layer.T, 0.0)


def offsets(body: Body, joints: np.ndarray) -> np.ndarray:
    return (activations(body, joints) @ body.second_layer).reshape(joints.shape[0], -1, 3)


def pose(body: Body, parameters: np.ndarray, correctives: bool) -> np.ndarray:
    joints = joint_parameters(body, parameters)
    rest = body.rest[None] + (offsets(body, joints) if correctives else 0.0)
    return skin(body, global_states(body, joints), rest)


def pose_with_offsets(body: Body, parameters: np.ndarray, rest_offsets: np.ndarray) -> np.ndarray:
    joints = joint_parameters(body, parameters)
    return skin(body, global_states(body, joints), body.rest[None] + rest_offsets)
