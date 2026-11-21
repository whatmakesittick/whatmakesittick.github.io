import argparse
import json
from pathlib import Path

import numpy as np
import torch

from fixtures import write_samples
from mhr_body import JOINT_PARAMETERS, MODEL_PARAMETERS, load_config, load_mhr

ITERATIONS = 700
LEARNING_RATE = 0.03
FREE_PARAMETERS = 68
ROOT_TRANSLATION = 3
SIDES = {"r": "right", "l": "left"}
DEFAULT_REGULARISATION = 0.002
REGULARISATION = {"spine": 0.02, "clavicle": 0.004, "flexible": 0.05}
POSITION_WEIGHT = 6.0
FOOT_WEIGHT = 0.3
PALM_WEIGHT = 0.5


def unit(v: torch.Tensor) -> torch.Tensor:
    return v / (v.norm(dim=-1, keepdim=True) + 1e-9)


class Skeleton:
    def __init__(self, model, names: list[str], joint_names: list[str]) -> None:
        character = model.character_torch
        self.transform = character.parameter_transform.parameter_transform[:, :MODEL_PARAMETERS]
        self.skeleton = character.skeleton
        self.index = {name: i for i, name in enumerate(joint_names)}

    def states(self, parameters: torch.Tensor) -> torch.Tensor:
        joints = (parameters @ self.transform.T).reshape(parameters.shape[0], -1, JOINT_PARAMETERS)
        return self.skeleton.joint_parameters_to_skeleton_state(joints)

    def position(self, states: torch.Tensor, name: str) -> torch.Tensor:
        return states[:, self.index[name], :3]


def regularisation(names: list[str]) -> torch.Tensor:
    weights = torch.full((MODEL_PARAMETERS,), DEFAULT_REGULARISATION)
    for i, name in enumerate(names):
        for key, value in REGULARISATION.items():
            if key in name and not (key == "flexible" and "spine" in name):
                weights[i] = value
        if "spine" in name:
            weights[i] = REGULARISATION["spine"]
    return weights


def run(assets: Path, config_path: Path, targets_path: Path, out: Path) -> None:
    config = load_config(config_path)
    model = load_mhr(assets, config.lod)
    names = list(model.character.parameter_transform.names)[:MODEL_PARAMETERS]
    joint_names = list(model.character.skeleton.joint_names)
    skeleton = Skeleton(model, names, joint_names)
    samples = json.loads(targets_path.read_text())
    count = len(samples)
    constant = torch.zeros(MODEL_PARAMETERS)
    for name, value in config.skeleton.items():
        constant[names.index(name)] = value
    rest = skeleton.states(constant[None])
    pos = skeleton.position
    side = -1.0 if pos(rest, "r_uparm")[0, 0] < 0 else 1.0

    def to_metres(d) -> torch.Tensor:
        d = torch.tensor(d, dtype=torch.float32)
        return torch.stack([side * d[..., 2], d[..., 0], -d[..., 1]], -1)

    def gather(fn) -> torch.Tensor:
        return torch.stack([fn(s) for s in samples])

    def trunk(sample: dict) -> tuple[np.ndarray, np.ndarray]:
        hips = (np.array(sample["left"]["hip"]) + np.array(sample["right"]["hip"])) / 2
        shoulders = (np.array(sample["left"]["shoulder"]) + np.array(sample["right"]["shoulder"])) / 2
        return hips, shoulders

    hip_rest = (pos(rest, "l_upleg") + pos(rest, "r_upleg")) / 2
    shoulder_rest = (pos(rest, "l_uparm") + pos(rest, "r_uparm")) / 2
    trunk_model = (shoulder_rest - hip_rest).norm().item()
    trunk_ours = float(np.mean([np.linalg.norm(trunk(s)[1] - trunk(s)[0]) for s in samples]))

    def palm_normal(states: torch.Tensor, prefix: str) -> torch.Tensor:
        wrist = pos(states, prefix + "_wrist")
        return unit(
            torch.cross(
                pos(states, prefix + "_index1") - wrist,
                pos(states, prefix + "_pinky1") - wrist,
                dim=-1,
            )
        )

    palm_sign = {p: (1.0 if palm_normal(rest, p)[0, 1] < 0 else -1.0) for p in "lr"}
    eyes_rest = unit(
        (pos(rest, "l_eye") + pos(rest, "r_eye")) / 2 - pos(rest, "c_head")
    )[0]
    eye_up, eye_front = float(eyes_rest[1]), float(eyes_rest[2])
    targets = {}
    hip_centre = gather(lambda s: to_metres(trunk(s)[0]))
    for prefix, name in SIDES.items():
        get = lambda key: gather(lambda s: to_metres(s[name][key]))
        targets[prefix] = dict(
            up=unit(get("elbow") - get("shoulder")),
            low=unit(get("wrist") - get("elbow")),
            hand=unit(get("handAxis")),
            palm=unit(get("palm")),
            thigh=unit(get("knee") - get("hip")),
            shin=unit(get("ankle") - get("knee")),
            foot=unit(get("toe") - get("ankle")),
            shoulder=(get("shoulder") - hip_centre) / trunk_ours,
            hip=(get("hip") - hip_centre) / trunk_ours,
        )
    crown = unit(gather(lambda s: to_metres(s["crown"])))
    face = unit(gather(lambda s: to_metres(s["face"])))
    eyes = unit(eye_up * crown + eye_front * face)

    def losses(states: torch.Tensor) -> dict[str, torch.Tensor]:
        out = {}
        centre = (pos(states, "l_upleg") + pos(states, "r_upleg")) / 2
        for prefix in "lr":
            t = targets[prefix]
            d = lambda a, b: unit(pos(states, f"{prefix}_{b}") - pos(states, f"{prefix}_{a}"))
            out[prefix + "up"] = 1 - (d("uparm", "lowarm") * t["up"]).sum(-1)
            out[prefix + "low"] = 1 - (d("lowarm", "wrist") * t["low"]).sum(-1)
            out[prefix + "hand"] = 1 - (d("wrist", "middle1") * t["hand"]).sum(-1)
            out[prefix + "palm"] = PALM_WEIGHT * (
                1 - (palm_sign[prefix] * palm_normal(states, prefix) * t["palm"]).sum(-1)
            )
            out[prefix + "thigh"] = 1 - (d("upleg", "lowleg") * t["thigh"]).sum(-1)
            out[prefix + "shin"] = 1 - (d("lowleg", "foot") * t["shin"]).sum(-1)
            out[prefix + "foot"] = FOOT_WEIGHT * (1 - (d("foot", "ball") * t["foot"]).sum(-1))
            out[prefix + "sh"] = POSITION_WEIGHT * (
                ((pos(states, prefix + "_uparm") - centre) / trunk_model - t["shoulder"]) ** 2
            ).sum(-1)
            out[prefix + "hip"] = POSITION_WEIGHT * (
                ((pos(states, prefix + "_upleg") - centre) / trunk_model - t["hip"]) ** 2
            ).sum(-1)
        out["crown"] = 1 - (unit(pos(states, "c_head_null") - pos(states, "c_head")) * crown).sum(-1)
        eye_dir = unit((pos(states, "l_eye") + pos(states, "r_eye")) / 2 - pos(states, "c_head"))
        out["eyes"] = 1 - (eye_dir * eyes).sum(-1)
        return out

    torch.manual_seed(0)
    free = [i for i in range(FREE_PARAMETERS) if i >= ROOT_TRANSLATION]
    mask = torch.zeros(MODEL_PARAMETERS)
    mask[free] = 1
    weights = regularisation(names)
    x = torch.zeros(count, MODEL_PARAMETERS, requires_grad=True)
    optimiser = torch.optim.Adam([x], lr=LEARNING_RATE)
    for _ in range(ITERATIONS):
        optimiser.zero_grad()
        states = skeleton.states(x * mask + constant)
        total = sum(v.sum() for v in losses(states).values())
        (total + (weights * (x * mask) ** 2).sum()).backward()
        optimiser.step()
    with torch.no_grad():
        parameters = x * mask + constant
        final = losses(skeleton.states(parameters))
    degrees = {
        k: round(float(torch.rad2deg(torch.acos(torch.clamp(1 - v, -1, 1))).max()), 2)
        for k, v in final.items()
        if not k.endswith(("sh", "hip", "palm", "foot"))
    }
    print("max angle error deg", degrees)
    fixed = [names.index(n) for n in config.skeleton]
    out.mkdir(parents=True, exist_ok=True)
    write_samples(out, parameters.numpy().astype(np.float64), [s["key"] for s in samples], names, fixed)


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--assets", type=Path, required=True)
    parser.add_argument("--config", type=Path, default=Path(__file__).with_name("config.json"))
    parser.add_argument("--targets", type=Path, required=True)
    parser.add_argument("--fixtures", type=Path, required=True)
    arguments = parser.parse_args()
    run(arguments.assets, arguments.config, arguments.targets, arguments.fixtures)


if __name__ == "__main__":
    main()
