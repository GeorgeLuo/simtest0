const isObject = (value) => value && typeof value === 'object' && !Array.isArray(value);

const kuramoto_eval_metrics = {
  id: 'kuramoto.eval.metrics',
  description: 'Per-tick Kuramoto evaluation metrics derived from simulation frames.',
  validate: (payload) => isObject(payload),
};

const kuramoto_eval_pairwise = {
  id: 'kuramoto.eval.pairwise',
  description: 'Per-tick pairwise phase distances between Kuramoto oscillators.',
  validate: (payload) => isObject(payload),
};

module.exports = {
  kuramoto_eval_metrics,
  kuramoto_eval_pairwise,
};
