# CI/CD setup

The repository includes a GitHub Actions workflow at `.github/workflows/ci-cd.yml`.

## What it does

- Runs CI (`lint`, `test`, `build`) on:
  - each push to `main`
  - each pull request to `main`
- Runs CD (deploy to VPS) after successful CI on `main` pushes.

## Required GitHub secrets

Configure these in GitHub repository settings (`Settings -> Secrets and variables -> Actions`):

- `VPS_HOST` — server IP or hostname.
- `VPS_USER` — SSH user (for current setup: `root`).
- `VPS_SSH_PRIVATE_KEY` — private SSH key used for deploy.
- `VPS_PORT` — optional SSH port (defaults to `22`).

## Deploy command on server

The workflow executes this command over SSH:

```bash
durak-deploy
```

Make sure `/usr/local/bin/durak-deploy` exists on the server and is executable.
