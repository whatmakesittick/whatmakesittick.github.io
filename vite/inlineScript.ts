import { fileURLToPath } from 'node:url';
import { build } from 'vite';

type BuildResult = Awaited<ReturnType<typeof build>>;

const ROOT = fileURLToPath(new URL('..', import.meta.url));

function chunkCode(result: BuildResult, entry: string): string {
  const chunk = [result]
    .flat()
    .flatMap((bundle) => ('output' in bundle ? bundle.output : []))
    .find((file) => file.type === 'chunk');
  if (!chunk) throw new Error(`No chunk was built from ${entry}`);
  return chunk.code.trim();
}

export async function bundleInlineScript(entry: string, base = '/'): Promise<string> {
  const result = await build({
    configFile: false,
    root: ROOT,
    base,
    logLevel: 'silent',
    publicDir: false,
    build: {
      write: false,
      minify: true,
      modulePreload: false,
      rolldownOptions: { input: entry, output: { format: 'iife' } },
    },
  });
  return chunkCode(result, entry);
}
