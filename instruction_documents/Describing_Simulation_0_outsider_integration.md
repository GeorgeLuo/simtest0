## Integration

Following the implementation of the codebase described in codifying simulations, we implement an integration test to reveal gaps in execution and prove usability from the vantage of a user without prior knowledge. Usage can be knowable through probing the service.

This stage is intended to massage the codebase towards spec alignment and the general pattern should be to test and make changes to the source code; an outsider makes observations and the implementer makes changes based on feedback.

The big picture is we are assuming the role of a first-time user evaluating the project with a simulation in mind: temperature regulation. The user is curious and technically capable in modeling complex systems and hypothesizing their intermittent states. The user expects to be able to validate outputs of the product, that the simulation emits data approximately matching expectations.

The start script within the tools directory is considered prior knowledge. The outsider knows by running the script, the product is ready for testing.

### Artifacts

The steps to run integration should also be captured in the *run_integration.sh* script with comments for each step enumerated below.
