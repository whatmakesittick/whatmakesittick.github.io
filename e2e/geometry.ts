export interface Box {
  left: number;
  top: number;
  right: number;
  bottom: number;
}

export interface SceneLabel {
  text: string;
  box: Box;
}

const EDGES: readonly (keyof Box)[] = ['left', 'top', 'right', 'bottom'];

export function boxesIntersect(a: Box, b: Box): boolean {
  return a.left < b.right && b.left < a.right && a.top < b.bottom && b.top < a.bottom;
}

function boxesAgree(a: Box, b: Box, tolerance: number): boolean {
  return EDGES.every((edge) => Math.abs(a[edge] - b[edge]) <= tolerance);
}

export function labelsAgree(a: SceneLabel[], b: SceneLabel[], tolerance: number): boolean {
  return (
    a.length === b.length &&
    a.every(
      (label, index) =>
        label.text === b[index].text && boxesAgree(label.box, b[index].box, tolerance),
    )
  );
}
