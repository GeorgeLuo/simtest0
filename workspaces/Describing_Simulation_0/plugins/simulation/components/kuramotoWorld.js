const isObject = (value) => value && typeof value === 'object' && !Array.isArray(value);
const isFiniteNumber = (value) => typeof value === 'number' && Number.isFinite(value);
const isInteger = (value) => Number.isInteger(value);
const isPositiveInteger = (value) => isInteger(value) && value > 0;
const isBoolean = (value) => typeof value === 'boolean';
const isNonEmptyString = (value) => typeof value === 'string' && value.trim().length > 0;

const isNumberArray = (value, length = null) => {
  if (!Array.isArray(value)) {
    return false;
  }
  if (length !== null && value.length !== length) {
    return false;
  }
  return value.every(isFiniteNumber);
};

const isSquareNumberMatrix = (value) => {
  if (!Array.isArray(value) || value.length < 2) {
    return false;
  }
  const n = value.length;
  return value.every((row) => isNumberArray(row, n));
};

const oscillator_count = {
  id: 'oscillator_count',
  description: 'Number of oscillators in the world (fixed at 3 for this example).',
  validate: isPositiveInteger,
};

const integration_dt_s = {
  id: 'integration_dt_s',
  description: 'Integration step size in seconds for each simulation tick.',
  validate: (value) => isFiniteNumber(value) && value > 0,
};

const total_ticks = {
  id: 'total_ticks',
  description: 'Total number of ticks to simulate for one run.',
  validate: isPositiveInteger,
};

const coupling_scale_k = {
  id: 'coupling_scale_k',
  description: 'Global coupling strength K applied to pairwise phase differences.',
  validate: isFiniteNumber,
};

const topology_mode = {
  id: 'topology_mode',
  description: 'Coupling topology mode (default all-to-all).',
  validate: isNonEmptyString,
};

const phase_wrap_modulus = {
  id: 'phase_wrap_modulus',
  description: 'Phase wrapping modulus (default 2*pi radians).',
  validate: (value) => isFiniteNumber(value) && value > 0,
};

const emission_stride_ticks = {
  id: 'emission_stride_ticks',
  description: 'Number of ticks between emissions into the time-series output.',
  validate: isPositiveInteger,
};

const default_frequency_set = {
  id: 'default_frequency_set',
  description: 'Default natural frequencies for the 3 oscillators.',
  validate: (value) => Array.isArray(value) && value.length >= 2 && value.every(isFiniteNumber),
};

const default_initial_phase_set = {
  id: 'default_initial_phase_set',
  description: 'Default initial phases for the 3 oscillators.',
  validate: (value) => Array.isArray(value) && value.length >= 2 && value.every(isFiniteNumber),
};

const default_coupling_matrix = {
  id: 'default_coupling_matrix',
  description: 'Default 3x3 coupling weights between oscillators.',
  validate: isSquareNumberMatrix,
};

const sim_tick = {
  id: 'sim_tick',
  description: 'Current simulation tick index for Kuramoto integration.',
  validate: (value) => isInteger(value) && value >= 0,
};

const sim_time_s = {
  id: 'sim_time_s',
  description: 'Current simulation time in seconds.',
  validate: (value) => isFiniteNumber(value) && value >= 0,
};

const run_complete = {
  id: 'run_complete',
  description: 'Whether the configured finite run horizon has been reached.',
  validate: isBoolean,
};

const osc_id = {
  id: 'osc_id',
  description: 'Oscillator identifier in {1,2,3}.',
  validate: isPositiveInteger,
};

const osc_natural_frequency = {
  id: 'osc_natural_frequency',
  description: 'Intrinsic angular frequency omega_i (rad/s).',
  validate: isFiniteNumber,
};

const osc_initial_phase = {
  id: 'osc_initial_phase',
  description: 'Initial phase theta_i(0) in radians.',
  validate: isFiniteNumber,
};

const osc_phase = {
  id: 'osc_phase',
  description: 'Current oscillator phase theta_i(t) in radians.',
  validate: isFiniteNumber,
};

const osc_phase_velocity = {
  id: 'osc_phase_velocity',
  description: 'Current phase velocity d(theta_i)/dt.',
  validate: isFiniteNumber,
};

const osc_signal_sin = {
  id: 'osc_signal_sin',
  description: 'Observed sine projection sin(theta_i).',
  validate: isFiniteNumber,
};

const osc_signal_cos = {
  id: 'osc_signal_cos',
  description: 'Observed cosine projection cos(theta_i).',
  validate: isFiniteNumber,
};

const osc_coupling_weights = {
  id: 'osc_coupling_weights',
  description: 'Per-oscillator coupling weights to all other oscillators.',
  validate: (value) => Array.isArray(value) && value.length >= 2 && value.every(isFiniteNumber),
};

const series_tick = {
  id: 'series_tick',
  description: 'Discrete simulation tick index.',
  validate: (value) => isInteger(value) && value >= 0,
};

const series_time_s = {
  id: 'series_time_s',
  description: 'Continuous simulation time in seconds.',
  validate: (value) => isFiniteNumber(value) && value >= 0,
};

const series_phase_by_oscillator = {
  id: 'series_phase_by_oscillator',
  description: 'Vector of phases [theta_1, theta_2, theta_3] per emitted tick.',
  validate: (value) => Array.isArray(value) && value.length >= 2 && value.every(isFiniteNumber),
};

const series_signal_by_oscillator = {
  id: 'series_signal_by_oscillator',
  description: 'Vector of projected signals [sin(theta_1), sin(theta_2), sin(theta_3)] per emitted tick.',
  validate: (value) => Array.isArray(value) && value.length >= 2 && value.every(isFiniteNumber),
};

const series_order_parameter_r = {
  id: 'series_order_parameter_r',
  description: 'Kuramoto order parameter magnitude r(t).',
  validate: isFiniteNumber,
};

const series_order_parameter_psi = {
  id: 'series_order_parameter_psi',
  description: 'Kuramoto mean phase psi(t).',
  validate: isFiniteNumber,
};

const series_mean_frequency = {
  id: 'series_mean_frequency',
  description: 'Mean instantaneous frequency across oscillators.',
  validate: isFiniteNumber,
};

module.exports = {
  oscillator_count,
  integration_dt_s,
  total_ticks,
  coupling_scale_k,
  topology_mode,
  phase_wrap_modulus,
  emission_stride_ticks,
  default_frequency_set,
  default_initial_phase_set,
  default_coupling_matrix,
  sim_tick,
  sim_time_s,
  run_complete,
  osc_id,
  osc_natural_frequency,
  osc_initial_phase,
  osc_phase,
  osc_phase_velocity,
  osc_signal_sin,
  osc_signal_cos,
  osc_coupling_weights,
  series_tick,
  series_time_s,
  series_phase_by_oscillator,
  series_signal_by_oscillator,
  series_order_parameter_r,
  series_order_parameter_psi,
  series_mean_frequency,
};
