# Database

Primary target: Catalyst Data Store.

Fallback target: external PostgreSQL if Data Store query, schema, row, or operational limits become a blocker.

## Catalyst Data Store

Schema manifest:

```txt
iac/datastore.schema.json
```

Tables:

- `users`
- `developers`
- `games`
- `versions`
- `manifests`
- `purchases`
- `cosmetics`
- `achievements`
- `comments`
- `reports`
- `admin_logs`
- `launcher_sessions`
- `analytics_events`

Current Catalyst docs show schema creation through the console or APIs. CLI Data Store import/export is for row data, so schema creation is a pre-deploy step.

## Seed Data

Seed CSV files live in:

```txt
iac/seeds/
```

Import rows after the tables and columns exist:

```powershell
catalyst ds:import iac/seeds/users.csv --table users
catalyst ds:import iac/seeds/developers.csv --table developers
catalyst ds:import iac/seeds/games.csv --table games
catalyst ds:import iac/seeds/versions.csv --table versions
catalyst ds:import iac/seeds/manifests.csv --table manifests
```

## PostgreSQL Fallback

Use `iac/external-postgres-fallback.sql` only if Catalyst Data Store constraints become a product blocker. Keep R2 as the object store either way.
