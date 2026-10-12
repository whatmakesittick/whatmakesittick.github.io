export const EMBED_DIRECTORY = 'embed/v1';
export const EMBED_SOURCES_DIRECTORY = 'explainers';

export function embedSourcePath(slug: string, file: string): string {
  return `${EMBED_SOURCES_DIRECTORY}/${slug}/${file}`;
}
