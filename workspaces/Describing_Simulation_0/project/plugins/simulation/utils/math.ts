export function clamp(min: number, max: number, value: number): number {
  if (min > max) {
    throw new Error('Minimum cannot exceed maximum.');
  }

  if (value < min) {
    return min;
  }

  if (value > max) {
    return max;
  }

  return value;
}

export function approach(
  current: number,
  target: number,
  rate: number,
): number {
  if (!Number.isFinite(current) || !Number.isFinite(target)) {
    return target;
  }

  if (rate <= 0) {
    return current;
  }

  const clampedRate = rate > 1 ? 1 : rate;
  return current + (target - current) * clampedRate;
}

export function exponentialSmoothing(
  previous: number,
  observation: number,
  weight: number,
): number {
  const alpha = clamp(0, 1, weight);
  return previous * (1 - alpha) + observation * alpha;
}
