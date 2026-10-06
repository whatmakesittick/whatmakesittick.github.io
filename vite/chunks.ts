import { fileURLToPath } from 'node:url';

export interface ModuleInfo {
  importedIds: readonly string[];
  importers: readonly string[];
  dynamicImporters: readonly string[];
}

export interface ModuleGraph {
  getModuleInfo(id: string): ModuleInfo | null;
}

const PACKAGE_MODULE = /[\\/]node_modules[\\/]/;
const EXPLAINER_MODULE = /^explainers\/([^/]+)\//;
const PROJECT_ROOT = fileURLToPath(new URL('..', import.meta.url));

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

function importersOf(id: string, graph: ModuleGraph): readonly string[] {
  const info = graph.getModuleInfo(id);
  return info === null ? [] : [...info.importers, ...info.dynamicImporters];
}

function projectImporters(id: string, graph: ModuleGraph): Set<string> {
  const importers = new Set<string>();
  const visited = new Set([id]);
  const pending = [id];
  for (let current = pending.pop(); current !== undefined; current = pending.pop()) {
    for (const importer of importersOf(current, graph)) {
      if (visited.has(importer)) continue;
      visited.add(importer);
      if (PACKAGE_MODULE.test(importer)) pending.push(importer);
      else importers.add(importer);
    }
  }
  return importers;
}

function toPosix(path: string): string {
  return path.replaceAll('\\', '/');
}

function explainerSlug(id: string, root: string): string | undefined {
  const base = toPosix(root).replace(/\/?$/, '/');
  const path = toPosix(id);
  if (!path.startsWith(base)) return undefined;
  return EXPLAINER_MODULE.exec(path.slice(base.length))?.[1];
}

export function isExplainerOnlyPackage(
  id: string,
  graph: ModuleGraph,
  root: string = PROJECT_ROOT,
): boolean {
  if (!PACKAGE_MODULE.test(id)) return false;
  const importers = [...projectImporters(id, graph)];
  const owners = new Set(importers.map((importer) => explainerSlug(importer, root)));
  return owners.size === 1 && !owners.has(undefined);
}
