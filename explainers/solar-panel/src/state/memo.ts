export function memoizeLast<A extends readonly unknown[], R>(
  compute: (...args: A) => R,
): (...args: A) => R {
  let lastArgs: A | null = null;
  let lastResult: R | undefined;
  return (...args: A): R => {
    const same =
      lastArgs !== null && args.every((value, index) => Object.is(value, lastArgs?.[index]));
    if (same) return lastResult as R;
    lastResult = compute(...args);
    lastArgs = args;
    return lastResult;
  };
}
