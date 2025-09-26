# Food prices during war — simulation summary

## Form D reasoning
- **Hypothetical:** “What happens to food prices during war?”
- **Environment (E):** A national food market represented by a single aggregate entity capturing supply, demand, price formation, and a war impact actor that perturbs logistics and behaviour.
- **Phenomenon (X):** Escalating warfare intensity that drives supply disruptions, blockades, policy rationing, and relief efforts.
- **Conditions (C):** Observe the market for the duration of a 180-day conflict phase (simulated day-by-day) while war intensity remains non-zero, tracking food price levels, supply capacity, demand adjustments, and stockpiles.

## Simulation implementation
- **Components:**
  - `warImpact` stores conflict intensity, disruption, rationing, and relief signals for the dedicated war entity, exposing levers that downstream systems consume.【F:workspaces/Describing_Simulation_0/project/plugins/simulation/components/WarImpactComponent.ts†L1-L26】
  - `foodSupply`, `foodDemand`, and `foodPrice` components describe production, consumption, and price metrics for the aggregated market entity, including reserves, behavioural modifiers, and affordability indices.【F:workspaces/Describing_Simulation_0/project/plugins/simulation/components/FoodSupplyComponent.ts†L1-L26】【F:workspaces/Describing_Simulation_0/project/plugins/simulation/components/FoodDemandComponent.ts†L1-L22】【F:workspaces/Describing_Simulation_0/project/plugins/simulation/components/FoodPriceComponent.ts†L1-L22】
- **Systems:**
  - `WarImpactSystem` escalates conflict intensity, blockade severity, rationing, and relief according to elapsed time, feeding consistent shocks into the market.【F:workspaces/Describing_Simulation_0/project/plugins/simulation/systems/WarImpactSystem.ts†L1-L138】
  - `FoodSupplySystem` maps war-induced disruptions to production, logistics efficiency, wastage, and desired stockpiles, capturing the erosion of output capacity.【F:workspaces/Describing_Simulation_0/project/plugins/simulation/systems/FoodSupplySystem.ts†L1-L138】
  - `FoodDemandSystem` combines panic hoarding, rationing, substitution, income shocks, and price feedback to adjust effective demand.【F:workspaces/Describing_Simulation_0/project/plugins/simulation/systems/FoodDemandSystem.ts†L1-L162】
  - `FoodPriceSystem` synthesises supply-demand gaps, stockpiles, and behavioural signals into price momentum, inflation, and affordability indicators while updating reserve drawdowns.【F:workspaces/Describing_Simulation_0/project/plugins/simulation/systems/FoodPriceSystem.ts†L1-L196】
- **Execution harness:** A manual simulation/evaluation runner wires the systems, advances daily ticks for 180 days, collects evaluation frames, and writes the raw output and summary to `verifications/food_prices_war/raw_output.json`.【F:workspaces/Describing_Simulation_0/project/plugins/simulation/scenarios/foodPricesWar/runSimulation.ts†L1-L152】

## Findings
- **Baseline:** The market starts balanced at 100 index units for demand and supply with ample reserves (220 days of stockpile) and a price index of 100 before the conflict intensifies.【F:verifications/food_prices_war/raw_output.json†L54-L85】
- **Panic and early depletion:** Within the first week panic buying lifts demand above baseline and draws stockpiles down rapidly; by day 9 reserves hit zero while prices already breach 111 due to tightening logistics.【F:verifications/food_prices_war/raw_output.json†L393-L417】【F:verifications/food_prices_war/raw_output.json†L668-L694】
- **Policy rationing drives demand collapse:** Around day 58, aggressive rationing and income shocks compress effective demand to the enforced floor of 40 units even as prices temporarily dip from peak levels, signalling forced austerity rather than recovery.【F:verifications/food_prices_war/raw_output.json†L3997-L4027】
- **Supply erosion:** Production capacity keeps falling, bottoming near 30 units around day 82 as logistics efficiency slides toward 0.25 despite growing relief efforts.【F:verifications/food_prices_war/raw_output.json†L5630-L5658】
- **Price escalation and affordability crisis:** Prices cross 139 by day 90 and surge to the capped ceiling of 320 by day 119, driving affordability below 0.22 while stockpiles remain exhausted.【F:verifications/food_prices_war/raw_output.json†L6173-L6193】【F:verifications/food_prices_war/raw_output.json†L8145-L8174】
- **End-state (day 180):** Supply stabilises near 39 units with logistics efficiency under 0.3, demand stays rationed at 40 units, and relief reaches ~0.6 but cannot offset near-total supply disruption, leaving the price index stuck at 320 with affordability around 0.26.【F:verifications/food_prices_war/raw_output.json†L9-L45】

The raw event log supporting these observations is stored alongside this report in `raw_output.json`.【F:verifications/food_prices_war/raw_output.json†L1-L147】
