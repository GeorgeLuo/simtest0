## Integration

Following the implementation of the codebase described in codifying simulations, we implement an integration test to reveal gaps in execution and prove usability. As a shell script:

- Build the codebase

- Start the sim-eval server

- Validate pre-simulation start state through api endpoints

- Inject malformed systems and components to validate error signals

- Inject valid systems and components to simulation player

- Start simulation and validate behavior change through event stream

- Inject valid systems and components to evaluation player

- Validate behavior change through event stream

The simulation to construct is a basic temperature control unit. Capture sim-eval output as artifacts and computationally validate the simulation behavior with an artifact as proof.

This stage is intended to massage the codebase towards alignment to spec and the general pattern should be to test and make changes to the source code, including implementation of visibility of internals. For completeness of validation, source code access should flow through the codebase api routes.

The script(s) should be stored under tools, and artifacts should be stored in verifications.
