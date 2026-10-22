export interface Window {
  readonly behind: number;
  readonly ahead: number;
}

export function isWithinWindow(middle: number, length: number, window: Window): boolean {
  const half = length / 2;
  return middle + half > -window.behind && middle - half < window.ahead;
}
