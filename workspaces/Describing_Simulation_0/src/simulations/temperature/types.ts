export interface TemperatureControlOptions {
  initial?: number;
  target?: number;
  tolerance?: number;
  ambient?: number;
  heatRate?: number;
  coolRate?: number;
}

export interface TemperatureControlConfig {
  initial: number;
  target: number;
  tolerance: number;
  ambient: number;
  heatRate: number;
  coolRate: number;
}

export function resolveTemperatureControlOptions(options?: TemperatureControlOptions): TemperatureControlConfig {
  const ambient = options?.ambient ?? 20;
  const target = options?.target ?? 22;
  const tolerance = options?.tolerance ?? 0.5;
  const heatRate = options?.heatRate ?? 0.75;
  const coolRate = options?.coolRate ?? 0.5;

  return {
    initial: options?.initial ?? ambient,
    target,
    tolerance,
    ambient,
    heatRate,
    coolRate,
  };
}

export function mergeTemperatureOptions(
  config: TemperatureControlConfig,
  options?: TemperatureControlOptions,
): TemperatureControlConfig {
  if (!options) {
    return config;
  }

  return {
    initial: options.initial ?? config.initial,
    target: options.target ?? config.target,
    tolerance: options.tolerance ?? config.tolerance,
    ambient: options.ambient ?? config.ambient,
    heatRate: options.heatRate ?? config.heatRate,
    coolRate: options.coolRate ?? config.coolRate,
  };
}
