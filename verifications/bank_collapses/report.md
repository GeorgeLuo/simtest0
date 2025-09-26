# Credit Market Simulation Report: Sudden Collapse of a Top-3 Bank

## Form D Reasoning
- **Environment (E):** Interlinked credit market ecosystem comprising a systemically important bank, aggregate credit markets, investor confidence, policy authorities, and global time progression.
- **Phenomenon (X):** An abrupt failure of a top-3 bank triggered at the outset of the observation window, removing the bank as a solvent intermediary and forcing rapid balance-sheet revaluation.
- **Conditions (C):** Observe the environment until market stress drops below the crisis threshold (0.55) for five consecutive days or until 180 simulated days elapse, capturing both the crisis response and medium-term adjustment period.

This mapping ensures the simulation initializes with pre-shock baselines, applies the endogenous collapse, and records state evolution until stability criteria are met.

## Simulation Setup Summary
- **Entities & Components:**
  - `top-3-bank` tracks solvency, liquidity coverage, and balance-sheet totals, toggling a `defaulted` flag upon failure.
  - `credit-market` stores credit spread (basis points), liquidity index, lending volume, stress level, and funding costs.
  - `market-confidence` measures investor risk appetite, deposit outflows, and interbank trust.
  - `policy-response` reflects emergency support strength, liquidity backstops, capital injections, and rate-cut magnitudes.
  - `credit-market-summary` aggregates evaluation metrics for reporting.
- **Systems:**
  - `EnvironmentSetupSystem` materializes baseline conditions prior to the shock.
  - `BankCollapseSystem` applies the immediate solvency and liquidity shock on day 0.
  - `PolicyResponseSystem` scales fiscal/monetary interventions as stress, withdrawals, and trust evolve.
  - `CreditMarketEvolutionSystem` propagates stress through spreads, liquidity, lending, and confidence feedback loops.
  - `CreditMarketSummarySystem` derives peak dislocations, stabilization timing, and cumulative lending gaps each day.
- **Temporal Resolution:** One tick equals one day (86,400 simulated seconds) with a 180-day horizon.
- **Data Capture:** Every evaluation-frame snapshot is serialized to `raw_output.json` in `verifications/bank_collapses/`, supporting replay and quantitative review.

## Key Findings
- **Immediate Shock:** By day 2, the investment-grade spread widens to 317 bps, market stress peaks at 0.68, and deposit outflows spike to 19.8%, evidencing acute liquidity strain and confidence loss.
- **Policy Intervention:** Support measures ramp quickly—liquidity backstops exceed 0.63 and emergency rate cuts surpass 138 bps by day 3—anchoring expectations despite ongoing bank default resolution.
- **Recovery Trajectory:** Stress falls below the 0.55 crisis threshold after one high-stress day and stabilizes by day 7. Liquidity and lending recover ahead of spreads, and confidence metrics regain pre-shock territory within the first week.
- **End-State (Day 180):** Credit spreads normalize to 150 bps, liquidity index reaches 1.0, and lending volume is 10% above baseline. Deposit outflows settle near 3.3%, risk appetite climbs to 0.74, and authorities maintain moderate support (support level 0.43, rate cuts ~81 bps).
- **Cumulative Impact:** Average spreads over the horizon sit at ~152 bps, while the cumulative lending gap totals 0.53 (normalized lending-years), capturing the transient contraction in credit supply despite medium-term overshoot.

## Artifacts
- **Raw simulation output:** `verifications/bank_collapses/raw_output.json`
- **This report:** `verifications/bank_collapses/report.md`
