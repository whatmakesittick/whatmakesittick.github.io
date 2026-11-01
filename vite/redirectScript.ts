import { bundleInlineScript } from './inlineScript.ts';

export const REDIRECT_SCRIPT = await bundleInlineScript(
  'src/core/i18n/redirectScript.ts',
  process.env.BASE_PATH ?? '/',
);
