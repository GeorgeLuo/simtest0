# Thermostat Simulation Artifact

- Added thermostat-specific components and systems to model room temperature regulation with hysteresis, external weather profile, and HVAC energy tracking.
- Introduced a manual simulation runner and script that produces JSON artifacts summarizing temperature history and key metrics for a full-day scenario.
- Extended automated tests to cover thermostat logic, thermal response behaviour, and the outside temperature profile; all vitest suites pass.
