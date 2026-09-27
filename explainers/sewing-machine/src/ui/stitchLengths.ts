export const STITCH_LENGTH_CHOICES = ['short', 'medium', 'long'] as const;
export type StitchLengthChoice = (typeof STITCH_LENGTH_CHOICES)[number];

export const STITCH_LENGTH_MM: Record<StitchLengthChoice, number> = {
  short: 1.5,
  medium: 2.5,
  long: 4,
};

export const STITCH_LENGTH_KEYS: Record<StitchLengthChoice, string> = {
  short: 'controls.stitchLengthOptions.short',
  medium: 'controls.stitchLengthOptions.medium',
  long: 'controls.stitchLengthOptions.long',
};

export const STITCH_LENGTH_VALUES = STITCH_LENGTH_CHOICES.map((choice) =>
  String(STITCH_LENGTH_MM[choice]),
);

function distanceTo(choice: StitchLengthChoice, millimetres: number): number {
  return Math.abs(STITCH_LENGTH_MM[choice] - millimetres);
}

export function nearestStitchLength(millimetres: number): StitchLengthChoice {
  return STITCH_LENGTH_CHOICES.reduce((nearest, choice) =>
    distanceTo(choice, millimetres) <= distanceTo(nearest, millimetres) ? choice : nearest,
  );
}
