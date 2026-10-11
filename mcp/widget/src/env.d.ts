declare module 'virtual:wmit-catalogue' {
  const catalogue: unknown;
  export default catalogue;
}

declare module 'virtual:wmit-languages' {
  const sources: Record<string, () => Promise<unknown>>;
  export default sources;
}
