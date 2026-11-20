const EDGE_SEPARATOR = ',';

function edgeKey(a: number, b: number): string {
  return `${a}${EDGE_SEPARATOR}${b}`;
}

export function stripOrder(indices: readonly number[]): number[] {
  const count = indices.length / 3;
  const owner = new Map<string, number>();
  for (let t = 0; t < count; t++) {
    for (let k = 0; k < 3; k++)
      owner.set(edgeKey(indices[t * 3 + k], indices[t * 3 + ((k + 1) % 3)]), t);
  }
  const visited = new Array<boolean>(count).fill(false);
  const order: number[] = [];
  const visit = (start: number): void => {
    let current: number | undefined = start;
    while (current !== undefined) {
      visited[current] = true;
      order.push(current);
      current = neighbourOf(current);
    }
  };
  const neighbourOf = (t: number): number | undefined => {
    for (let k = 0; k < 3; k++) {
      const other = owner.get(edgeKey(indices[t * 3 + ((k + 1) % 3)], indices[t * 3 + k]));
      if (other !== undefined && !visited[other]) return other;
    }
    return undefined;
  };
  const stack: number[] = [];
  for (let seed = 0; seed < count; seed++) {
    if (visited[seed]) continue;
    stack.push(seed);
    while (stack.length > 0) {
      const top = stack.pop()!;
      if (visited[top]) continue;
      const before = order.length;
      visit(top);
      for (let i = before; i < order.length; i++) stack.push(order[i]);
    }
  }
  return order.flatMap((t) => [indices[t * 3], indices[t * 3 + 1], indices[t * 3 + 2]]);
}
