# Database

Supabase local configuration, migrations, and seed data.

## Local setup
```bash
supabase start --workdir database
```

## Weaviate (vector store)
```bash
docker compose -f database/weaviate/docker-compose.yml up -d
```

## Apply migrations
```bash
supabase db reset --workdir database
```

## Seed data
Seed data is in `database/supabase/seed.sql` and applied during `supabase db reset`.
The in-memory agent registry is canonical for agent identity; the `agents` table stores org-scoped configuration.
Seed data includes all 61 agents for the default org (1 CEO, 10 orchestrators, 50 workers).
Runs and artifacts reference registry IDs (text), so seed rows are primarily for default org visibility and configuration.
