import { aposeReport } from './apose.ts';
import type { PreparedBody } from './prepare.ts';
import { dot, normalize, sub, type Vec } from './vec.ts';

const MILLIMETRE = 1000;

function rounded(values: Record<string, number>): string {
  return JSON.stringify(
    Object.fromEntries(
      Object.entries(values).map(([k, v]) => [k, Math.round(v * MILLIMETRE) / MILLIMETRE]),
    ),
  );
}

function rounded3(point: readonly number[]): number[] {
  return point.map((v) => Math.round(v * MILLIMETRE) / MILLIMETRE);
}

export function elbowFacesOut(rest: {
  shoulder: Vec;
  elbow: Vec;
  wrist: Vec;
  elbowBack: Vec;
}): boolean {
  const upper = normalize(sub(rest.elbow, rest.shoulder));
  const lower = normalize(sub(rest.wrist, rest.elbow));
  return dot(rest.elbowBack, sub(lower, upper)) < 0;
}

export function printMeasures(body: PreparedBody, stature: number): void {
  const report = aposeReport(body.aPose);
  const { lengths, ...rest } = report;
  console.log('a-pose lengths', rounded(lengths));
  console.log('a-pose measures', rounded(rest));
  console.log(
    'head ratios',
    JSON.stringify({
      statureOverHeadHeight: Math.round((stature / report.headHeight) * 100) / 100,
    }),
  );
  const joint = body.joint;
  console.log(
    'bind joints',
    JSON.stringify({
      clavicleHead: rounded3(joint('clavicle.R____head')),
      clavicleTail: rounded3(joint('clavicle.R____tail')),
      shoulder: rounded3(joint('upperarm01.R____head')),
    }),
  );
}
