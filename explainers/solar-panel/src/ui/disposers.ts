export type Disposer = () => void;

export function disposeAll(disposers: readonly Disposer[]): Disposer {
  return () => disposers.forEach((dispose) => dispose());
}
