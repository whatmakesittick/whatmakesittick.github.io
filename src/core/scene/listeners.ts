export type Listener<Args extends unknown[]> = (...args: Args) => void;

export class Listeners<Args extends unknown[]> {
  private readonly listeners = new Set<Listener<Args>>();

  add(listener: Listener<Args>): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  notify(...args: Args): void {
    this.listeners.forEach((listener) => listener(...args));
  }

  clear(): void {
    this.listeners.clear();
  }
}
