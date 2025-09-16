# 2025-09-16 15:50 UTC — Inbound handler registry integration

## Summary
- Moved messaging handler implementations into dedicated inbound/outbound directories to clarify command vs response responsibilities.
- Introduced an `InboundHandlerRegistry` for registering player command handlers by message type and updated `IOPlayer` to depend on it.
- Adjusted tests and imports to align with the new layout and ensured the TypeScript suite continues to pass.

## Verification
- `./checks.sh`
