---
title: Self-hosting SVEX
---

# Self-hosting SVEX

Deploy **SVEX** with Docker. Put a reverse proxy (Traefik, Caddy, nginx, …) in front for HTTPS and your domain.

- [Config](/svex/self-hosting/config): `SVEX_CONFIG_JSON` and all config keys
- [Storage](/svex/self-hosting/storage): file layout and SQLite schema

## Deploy with Docker

Save as `compose.yml` and run `docker compose up -d`.

```yaml
services:
  svex:
    image: tips-services/svex
    # Expose 3000; use a reverse proxy (Traefik, Caddy, nginx, …) for HTTPS and hostname.
    ports:
      - "3000:3000"
    environment:
      SVEX_CONFIG_JSON: |
        {
          "local": {"enabled": true},
          "ephemeral": {"enabled": true, "ttlHours": 48},
          "workspace": {"enabled": true}
        }
    volumes:
      - svex-data:/app/data
    restart: unless-stopped

volumes:
  svex-data:
```
