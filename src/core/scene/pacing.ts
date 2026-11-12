export type Steps<T> = Generator<void, T, void>;

const SLICE_MS = 20;

export function yieldToMain(): Promise<void> {
  const scheduler = (globalThis as { scheduler?: { yield?: () => Promise<void> } }).scheduler;
  return scheduler?.yield?.() ?? new Promise((resolve) => setTimeout(resolve, 0));
}

export async function runPaced<T>(steps: Steps<T>): Promise<T> {
  let sliceStart = performance.now();
  let step = steps.next();
  while (!step.done) {
    if (performance.now() - sliceStart >= SLICE_MS) {
      await yieldToMain();
      sliceStart = performance.now();
    }
    step = steps.next();
  }
  return step.value;
}

export function runNow<T>(steps: Steps<T>): T {
  let step = steps.next();
  while (!step.done) step = steps.next();
  return step.value;
}
