import { EASE_SECONDS } from '../constants';

const SETTLE_TIME_CONSTANTS = 5;
const TIME_CONSTANT = EASE_SECONDS / SETTLE_TIME_CONSTANTS;

export class Ease {
  private target: number;
  private current: number;
  private remaining = 0;

  constructor(value: number) {
    this.target = value;
    this.current = value;
  }

  get value(): number {
    return this.current;
  }

  get running(): boolean {
    return this.remaining > 0;
  }

  aim(target: number): void {
    if (target === this.target) return;
    this.target = target;
    this.remaining = EASE_SECONDS;
  }

  step(deltaSeconds: number): void {
    if (!this.running) return;
    this.remaining = Math.max(0, this.remaining - deltaSeconds);
    const share = 1 - Math.exp(-deltaSeconds / TIME_CONSTANT);
    this.current = this.running ? this.current + (this.target - this.current) * share : this.target;
  }
}
