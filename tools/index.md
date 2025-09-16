# Tools Directory

## Purpose

The `tools` directory centralizes helper scripts that support development,
validation, and operational workflows for this repository. Use this space to
capture automation that developers can run locally or in CI to set up the
project, manage dependencies, or perform routine maintenance.

## Available Scripts

### `bootstrap.sh`

A Bash script that bootstraps a local developer environment for the
repository.

#### Behavior

- Validates that `python3`, `python3-venv`, and `python3-pip` are available.
  On Debian-based systems the script attempts to install any missing packages
  with `apt-get` (using `sudo` when required).
- Creates or reuses a project virtual environment at `.venv/` and installs the
  Python packages listed in `tools/requirements.txt`.
- Ensures a `config/` directory exists and populates `config/local.env` with a
  starter configuration when the file is absent.
- Prints a summary of the generated assets and reminds contributors how to
  activate the environment and run `./checks.sh`.

The script is idempotent and can be re-run at any time to pick up new
requirements.

#### Prerequisites

- A Unix-like shell with Bash 4+.
- Either `apt-get` availability or preinstalled Python tooling (`python3`,
  `python3-venv`, and `python3-pip`).
- Network access to download Python packages.

#### Usage

```bash
./tools/bootstrap.sh
```

If you store custom settings in `config/local.env`, the script will leave the
file untouched on subsequent runs. To install additional Python packages, add
entries to `tools/requirements.txt` before re-running the bootstrap.

## Planned Utilities

Additional helper scripts should be added here as the project matures. When a
new script is introduced, document its purpose, usage, and any prerequisites in
this index to keep contributors aligned on available tooling.
