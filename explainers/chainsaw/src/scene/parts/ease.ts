import { EASE_SECONDS } from '../constants';

const SETTLE_TIME_CONSTANTS = 5;

export class Ease {
  private target: number;
  private current: number;
  private remaining = 0;
  private readonly seconds: number;
  private readonly timeConstant: number;

  constructor(value: number, seconds: number = EASE_SECONDS) {
    this.target = value;
    this.current = value;
    this.seconds = seconds;
    this.timeConstant = seconds / SETTLE_TIME_CONSTANTS;
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
    this.remaining = this.seconds;
  }

  step(deltaSeconds: number): void {
    if (!this.running) return;
    this.remaining = Math.max(0, this.remaining - deltaSeconds);
    const share = 1 - Math.exp(-deltaSeconds / this.timeConstant);
    this.current = this.running ? this.current + (this.target - this.current) * share : this.target;
  }
}
