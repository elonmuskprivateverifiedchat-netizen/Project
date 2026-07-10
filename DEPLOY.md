## Deployment notes

This repository is a pnpm monorepo. Key service: the API server at `artifacts/api-server`.

Quick local run (docker-compose):

1. Copy `.env.example` to `.env` and adjust values.
2. Run:

```bash
docker-compose up --build
```

Railway / Cloud Providers:
- Provision a Postgres service and set `DATABASE_URL` secret to the provided connection string.
- Use the included `artifacts/api-server/Dockerfile` as the service Dockerfile (Railway supports Docker deployments).

VPS (systemd + nginx):
- Build the Docker image and run it with the appropriate `DATABASE_URL` environment variable.
- Use `nginx.conf` in the repo as an example reverse-proxy configuration.
