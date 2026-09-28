import { fileURLToPath } from 'node:url';
import { build } from 'vite';

type BuildResult = Awaited<ReturnType<typeof build>>;

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const ENTRY = 'src/core/i18n/redirectScript.ts';

function chunkCode(result: BuildResult): string {
  const chunk = [result]
    .flat()
    .flatMap((bundle) => ('output' in bundle ? bundle.output : []))
    .find((file) => file.type === 'chunk');
  if (!chunk) throw new Error(`No chunk was built from ${ENTRY}`);
  return chunk.code.trim();
}

export async function bundleRedirectScript(base: string): Promise<string> {
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
      rolldownOptions: { input: ENTRY, output: { format: 'iife' } },
    },
  });
  return chunkCode(result);
}

export const REDIRECT_SCRIPT = await bundleRedirectScript(process.env.BASE_PATH ?? '/');
