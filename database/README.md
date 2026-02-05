# Database

Supabase local configuration, migrations, and seed data.

## Local setup
```bash
supabase start --workdir database
```

## Apply migrations
```bash
supabase db reset --workdir database
```

## Seed data
Seed data is in `database/supabase/seed.sql` and applied during `supabase db reset`.
