# Software Version Tracking

## Infrastructure

| Software | Version | Notes | Last Updated |
|----------|---------|-------|--------------|
| Tailscale | 1.98.2 | Windows client, auto-update enabled | 2026-05-17 |
| Docker Desktop | ? | Windows with WSL2 backend | |
| Caddy | 2-alpine | Via Docker image tag | |

## Backend Services

| Software | Version | Notes | Last Updated |
|----------|---------|-------|--------------|
| Kavita | latest | Docker image `jvmilazz0/kavita:latest` | |
| Audiobookshelf | latest | Docker image `ghcr.io/advplyr/audiobookshelf:latest` | |

## Development / Runtime

| Software | Version | Notes | Last Updated |
|----------|---------|-------|--------------|
| Node.js | 20 | Alpine-based Docker images | |

## APIs

| API | Version / Base URL | Notes | Last Updated |
|-----|---------------------|-------|--------------|
| Kavita API | v1 | `http://localhost:8050/api` | |
| Audiobookshelf API | v1 | `http://localhost:13378/api` | |

---

## Updating This File

When updating software or discovering version changes:
1. Update the version and date in the table above
2. Verify any CLI commands against documentation for that specific version
3. Note any breaking changes or deprecated features
