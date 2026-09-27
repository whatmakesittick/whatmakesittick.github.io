const SECONDS_PER_MINUTE = 60;
const SECOND_DIGITS = 2;

export function formatClock(seconds: number): string {
  const whole = Math.max(0, Math.floor(seconds));
  const minutes = Math.floor(whole / SECONDS_PER_MINUTE);
  const rest = whole % SECONDS_PER_MINUTE;
  return `${minutes}:${String(rest).padStart(SECOND_DIGITS, '0')}`;
}
