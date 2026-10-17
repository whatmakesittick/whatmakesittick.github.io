import { ARROW_EASE } from './constants';

export class EasedLength {
  private current = 0;
  private goal = 0;

  get value(): number {
    return this.current;
  }

  get settled(): boolean {
    return this.current === this.goal;
  }

  aim(goal: number): void {
    this.goal = goal;
  }

  snap(value: number): void {
    this.current = value;
    this.goal = value;
  }

  advance(deltaSeconds: number): boolean {
    if (this.settled) return false;
    const share = 1 - Math.exp(-ARROW_EASE.rate * deltaSeconds);
    this.current += (this.goal - this.current) * share;
    if (Math.abs(this.goal - this.current) < ARROW_EASE.settle) this.current = this.goal;
    return true;
  }
}
