# Plugin Runtime Notes

- The scaffold intentionally ships with empty plugin directories (`plugins/simulation/`, `plugins/simulation/systems/`, `plugins/evaluation/`), so every module we deploy should be user-supplied. Any example systems (temperature control, pulse tracker) should reside outside the scaffold or be injected from external storage.
- Runtime plugin listing is not exposed via the API; once you call `/api/simulation/inject`, you get a `systemId` and can observe its effects through `/api/simulation/stream`, but there is no endpoint to enumerate active systems. The codebase API only reflects files on disk, not the system registry. If we need discovery, we must extend `/api/status` or add a new `/api/simulation/system` GET.
- When testing on Morphcloud, inject systems via HTTP and observe SSE output. Remember to remove any test plugins from the repo afterward so the scaffold remains clean.
