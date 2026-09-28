export interface ModuleGraph {
  getModuleInfo(id: string): { importedIds: readonly string[] } | null;
}

export function dependsOn(id: string, target: RegExp, graph: ModuleGraph): boolean {
  const visited = new Set([id]);
  const pending = [id];
  for (let current = pending.pop(); current !== undefined; current = pending.pop()) {
    for (const imported of graph.getModuleInfo(current)?.importedIds ?? []) {
      if (target.test(imported)) return true;
      if (visited.has(imported)) continue;
      visited.add(imported);
      pending.push(imported);
    }
  }
  return false;
}
