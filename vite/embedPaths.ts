export const EMBED_DIRECTORY = 'embed/v1';

export function embedSourcePath(slug: string, file: string): string {
  return `explainers/${slug}/${file}`;
}
