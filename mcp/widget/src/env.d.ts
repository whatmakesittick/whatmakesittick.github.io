declare module 'virtual:wmit-languages' {
  const sources: Record<string, () => Promise<unknown>>;
  export default sources;
}
