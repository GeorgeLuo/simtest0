# Docker Container Support

- Added Dockerfile with multi-stage build to compile the simulator and run the server from compiled JavaScript.
- Created `.dockerignore` to keep build context minimal and updated `.gitignore` to exclude build artifacts.
- Extended package scripts with `build` and `start:prod` to support container builds and production runs.
