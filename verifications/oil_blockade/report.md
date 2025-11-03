# Maritime Blockade Oil Market Simulation

## Form D Hypothetical Reasoning
- **Environment (E):** A discrete-time global oil market ECS world with one market entity (`global-oil-market`) carrying oil supply/demand state and blockade status, plus an analytics entity aggregating market signals.
- **Phenomenon (X):** A severe maritime chokepoint blockade that initially removes 18 mbpd from transit (90% disruption of a 20% chokepoint share) while emergency reserves can release up to 2 mbpd and rerouting gradually restores capacity.
- **Condition (C):** The blockade remains active for the 120-day horizon; rerouting and reserve deployment continue until either capacity is restored or reserves are exhausted, exposing price and supply responses.
- **Observation Targets (D):** Daily oil price, effective supply, demand, supply losses, and inventory levels extracted from the evaluation frames to assess transient shocks, adaptation pace, and steady-state outcomes.

## Simulation Setup
- **Temporal Resolution:** 120 daily ticks (86,400 second increments) coordinated by paired simulation and evaluation players.
- **Key Systems:**
  - `BlockadeShockSystem` applies chokepoint losses, reserve drawdowns, and rerouting recovery to the maritime blockade component.
  - `OilMarketDynamicsSystem` updates market supply, demand, price, and inventory responses.
  - `OilMarketSummarySystem` integrates evaluation frames for analytics and reporting.
- **Initial State:** Baseline supply and demand at 100 mbpd with $80/bbl price, 1,200 Mb inventory, blockade active with 60 Mb reserves and zero adapted capacity.
- **Outputs:** Full evaluation frames captured at `verifications/oil_blockade/evaluation_frames.json`.

## Findings from Evaluation Output
- **Shock Magnitude:** The analytics component records an immediate 17.7 mbpd supply loss on day 2 (tick 2), driving prices to $131.61/bbl while effective supply falls to 88.7 mbpd against 98.1 mbpd demand.【F:verifications/oil_blockade/evaluation_frames.json†L70-L96】
- **Peak Stress:** By day 3 the price spikes to $200.56/bbl, and day 4 reaches the $220/bbl ceiling as residual supply losses stay above 17 mbpd despite reserve support.【F:verifications/oil_blockade/evaluation_frames.json†L138-L156】【F:verifications/oil_blockade/evaluation_frames.json†L214-L223】
- **Adaptation Trajectory:** Continued rerouting narrows the gap—by day 7 prices ease to $215.92/bbl with supply loss down to 16.38 mbpd, and by day 30 prices retreat to $122.16/bbl as the loss shrinks near 10.2 mbpd.【F:verifications/oil_blockade/evaluation_frames.json†L418-L427】【F:verifications/oil_blockade/evaluation_frames.json†L1980-L1999】
- **Normalization:** By days 60 and 90, effective supply nearly matches demand, prices fall back to ~$91.73/bbl and then baseline $81.06/bbl as the blockade’s net supply loss hits zero.【F:verifications/oil_blockade/evaluation_frames.json†L4020-L4039】【F:verifications/oil_blockade/evaluation_frames.json†L6060-L6079】
- **Aggregate View:** Over 124 evaluated days the market averages $102.99/bbl (above baseline), peaking at $220/bbl, with the cumulative supply-demand gap slightly favoring supply as adaptation overshoots after recovery.【F:verifications/oil_blockade/evaluation_frames.json†L8442-L8451】

## Interpretation
The blockade triggers an acute, short-term price shock due to immediate transit losses. Emergency reserves and rerouting dampen the disruption within a week, yet prices remain elevated for roughly a month because effective supply lags demand. Once rerouting restores the lost 18 mbpd, inventories and demand rebalance, bringing prices back to baseline. The moderate negative cumulative supply-demand gap suggests post-recovery oversupply, implying policymakers must calibrate reserve drawdowns and rerouting pace to avoid secondary gluts.
