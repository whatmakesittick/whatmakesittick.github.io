import { Ease } from '../ease';

export class LazyEase {
  private ease: Ease | null = null;

  get value(): number {
    return this.ease?.value ?? 0;
  }

  aim(target: number): void {
    if (this.ease) this.ease.aim(target);
    else this.ease = new Ease(target);
  }

  step(deltaSeconds: number): boolean {
    const running = this.ease?.running ?? false;
    this.ease?.step(deltaSeconds);
    return running;
  }
}
