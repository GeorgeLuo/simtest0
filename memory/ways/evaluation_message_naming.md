# Evaluation Messaging Naming

- Align evaluation player inbound message types with API endpoints: use `evaluation.frame` for frame injection and extend with `evaluation.<action>` for future operations.
- Server handlers should publish these message types onto the evaluation player's inbound bus to keep routing consistent across HTTP and messaging layers.
