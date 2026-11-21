import argparse
import tempfile
import time
from pathlib import Path

import correctives as cor
import export
import strokes
from mhr_body import build_body, load_config, load_mhr

MM = 1000.0
COLUMNS = "tolerance_mm floor_mm bits regions  gz_bytes  raw_bytes  worst_mm  mean_mm  seconds"


def run(arguments: argparse.Namespace) -> None:
    config = load_config(arguments.config)
    body = build_body(load_mhr(arguments.assets, config.lod), config)
    columns = export.runtime_columns(body, body.fixed)
    live = cor.live_features(body, columns)
    fit_set = strokes.read(arguments.poses, export.FIT_SET)
    held_out = strokes.read(arguments.poses, export.HELD_OUT_SET)
    reference = strokes.Reference(body, live, held_out.joints)
    scratch = Path(tempfile.mkdtemp()) / "sweep.data.ts"
    blob, summary = export.build_blob(body, columns, None)
    export.write_module(scratch, export.module_meta(body, config, columns, None, summary), blob)
    print(f"no correctives: gzipped {export.gzipped_size(scratch)} raw {scratch.stat().st_size}")
    print(COLUMNS, flush=True)
    for tolerance in arguments.tolerances:
        for floor in arguments.floors:
            for bits in arguments.bits:
                started = time.time()
                settings = cor.Settings(tolerance / MM, floor / MM, bits, fine_regions=not arguments.coarse)
                corr = export.fit_correctives(body, live, fit_set, settings)
                errors = reference.errors(corr) * MM
                blob, summary = export.build_blob(body, columns, corr)
                export.write_module(scratch, export.module_meta(body, config, columns, corr, summary), blob)
                regions = "coarse" if arguments.coarse else "fine"
                print(
                    f"{tolerance:11.2f} {floor:8.2f} {bits:4d} {regions:>7}"
                    f" {export.gzipped_size(scratch):9d} {scratch.stat().st_size:10d}"
                    f" {errors.max():9.3f} {errors.mean():8.4f} {time.time() - started:8.0f}",
                    flush=True,
                )


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--assets", type=Path, required=True)
    parser.add_argument("--config", type=Path, default=Path(__file__).with_name("config.json"))
    parser.add_argument("--poses", type=Path, required=True)
    parser.add_argument("--tolerances", type=float, nargs="+", default=[0.85, 1.5, 2.0, 2.25, 3.0])
    parser.add_argument("--floors", type=float, nargs="+", default=[0.05, 1.0])
    parser.add_argument("--bits", type=int, nargs="+", choices=[8, 16], default=[16])
    parser.add_argument("--coarse", action="store_true")
    run(parser.parse_args())


if __name__ == "__main__":
    main()
