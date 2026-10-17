export type RowSwatch =
  | 'paintSlate'
  | 'paintCharcoal'
  | 'paintMoss'
  | 'paintOxblood'
  | 'trim'
  | 'seam'
  | 'under'
  | 'glass'
  | 'grille'
  | 'chrome'
  | 'steel'
  | 'tyre'
  | 'rim'
  | 'rimDark'
  | 'lampHead'
  | 'lampRear'
  | 'lampAmber'
  | 'plate';

export type BodyPaint = Extract<RowSwatch, `paint${string}`>;

export type Uv = readonly [u: number, v: number];

export type SwatchUv = (swatch: RowSwatch) => Uv;
