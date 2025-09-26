# Humidity During Rain Simulation

## Form D Hypothetical Reasoning
- **Environment (E):** a mixed surface–boundary layer air mass described by state components for relative humidity, air temperature, and rainfall forcing. Rainfall is treated as endogenous so that its progression modifies, and is modified by, atmospheric moisture.
- **Phenomenon (X):** a time-varying rainfall event described by a schedule of intensities. The observation begins with dry conditions and continues while the rain-driven condition is unmet.
- **Condition (C):** "precipitation has fully tapered off" — once rainfall intensity returns to zero and residual surface moisture decays, the observation period concludes. The simulation therefore follows Form D: "What is the behavior of E until C is fulfilled?"

## Simulation Setup
- **Entity and components.** The `atmosphere` entity carries humidity, temperature, rain state, and a persistent rain-memory accumulator so the air mass can retain moisture after rainfall ceases.【F:workspaces/Describing_Simulation_0/project/src/plugins/humidityRain/components.ts†L1-L60】
- **Dynamics.** Systems update the rainfall schedule, temperature, and humidity each step using first-order relaxation toward targets governed by rainfall intensity and the rain-memory term.【F:workspaces/Describing_Simulation_0/project/src/plugins/humidityRain/systems/RainScheduleSystem.ts†L1-L88】【F:workspaces/Describing_Simulation_0/project/src/plugins/humidityRain/systems/TemperatureResponseSystem.ts†L1-L59】【F:workspaces/Describing_Simulation_0/project/src/plugins/humidityRain/systems/HumidityResponseSystem.ts†L1-L92】
- **Parameters and cadence.** The run spans 7,200 seconds (2 hours) with 60-second steps, applying a piecewise-linear rain schedule that ramps from dry air to heavy downpour and back to drizzle before ending. Humidity relaxes toward 60% in dry air and 98% during steady rain, with rain memory gaining over 5 minutes and decaying over 30 minutes.【F:verifications/humidity_rain_simulation/raw_output.json†L2-L47】

## Findings
- **Baseline:** Relative humidity is stable at 60% for the first 15 minutes with no rainfall, reflecting the dry baseline state.【F:verifications/humidity_rain_simulation/raw_output.json†L51-L82】
- **Rain onset:** When drizzle begins (25 minutes, 2 mm/hr) humidity climbs to ~67% and rain memory begins accumulating, signalling surface wetting.【F:verifications/humidity_rain_simulation/raw_output.json†L94-L103】
- **Moderate rain:** By 35 minutes (5 mm/hr) humidity reaches ~79.9% while temperature falls to ~20.9 °C, indicating rapid moistening and evaporative cooling.【F:verifications/humidity_rain_simulation/raw_output.json†L105-L114】
- **Heavy rain peak:** During the peak at 55 minutes (10 mm/hr) humidity rises to ~92.3% with temperature near 18.5 °C and dew point ~17.2 °C, marking near-saturation conditions.【F:verifications/humidity_rain_simulation/raw_output.json†L116-L125】
- **Lingering moisture:** Even after rainfall stops (105 minutes), humidity remains ~91.7% because the rain-memory term retains moisture; temperature rebounds to ~22.0 °C while dew point stays elevated (~20.6 °C).【F:verifications/humidity_rain_simulation/raw_output.json†L127-L136】
- **Run end:** Fifteen minutes after rain ends, humidity is still ~89.7% with dew point ~21.2 °C, illustrating a slow decay toward baseline as residual moisture evaporates.【F:verifications/humidity_rain_simulation/raw_output.json†L138-L147】
- **Peak moisture:** The maximum relative humidity of ~93.9% occurs while rainfall tapers from 4.5 to 3.0 mm/hr, showing that once the air mass is nearly saturated, it remains so despite decreasing rainfall intensity.【F:verifications/humidity_rain_simulation/raw_output.json†L149-L186】

## Conclusion
Rainfall drives the air mass from a 60% baseline to near-saturation within an hour, cooling the air by ~5 °C and elevating dew point and specific humidity. Because the rain-memory accumulator decays slowly, humidity stays above 89% for at least 30 minutes after precipitation stops, demonstrating that post-rain humidity decay is controlled more by lingering surface moisture than instantaneous rainfall rate.【F:verifications/humidity_rain_simulation/raw_output.json†L94-L147】
