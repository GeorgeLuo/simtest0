# Verification Guide

## Running the verifier

Use the `verifier` script in the repository root to capture test output in a timestamped log.

```bash
./verifier
```

By default the script runs a placeholder command and reminds you to add the real test invocation. Pass the actual test command as arguments when you are ready to hook it up:

```bash
./verifier pytest
./verifier npm test
```

Each run writes its output to `verifications/verification-<timestamp>.log`, making it easy to review the results of previous verification attempts.
