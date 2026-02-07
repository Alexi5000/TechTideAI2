/**
 * Database Migration Script
 *
 * Applies simplified schema to Supabase via direct SQL execution.
 * Run with: node database/scripts/apply-migrations.js
 */

import { config } from 'dotenv';
import { resolve } from 'path';
import { readFileSync } from 'fs';

// Load backend .env
config({ path: resolve(process.cwd(), 'backend/.env') });

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

// Simplified schema without auth.users dependency (for service role access)
const SIMPLIFIED_SCHEMA = `
-- Enable extensions
create extension if not exists "pgcrypto";

-- Create types (if not exists workaround)
DO $$ BEGIN
  CREATE TYPE agent_tier AS ENUM ('ceo', 'orchestrator', 'worker');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE run_status AS ENUM ('queued', 'running', 'succeeded', 'failed', 'canceled');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Organizations table
CREATE TABLE IF NOT EXISTS organizations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Agents table (for DB-stored agents, optional)
CREATE TABLE IF NOT EXISTS agents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name text NOT NULL,
  tier agent_tier NOT NULL,
  role text NOT NULL,
  summary text,
  config jsonb NOT NULL DEFAULT '{}'::jsonb,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Runs table (core)
CREATE TABLE IF NOT EXISTS runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  agent_id text, -- Changed to text to support in-memory agent IDs like 'ceo'
  status run_status NOT NULL DEFAULT 'queued',
  input jsonb NOT NULL DEFAULT '{}'::jsonb,
  output jsonb,
  error text,
  started_at timestamptz,
  finished_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Run events table
CREATE TABLE IF NOT EXISTS run_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id uuid NOT NULL REFERENCES runs(id) ON DELETE CASCADE,
  org_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  event_type text NOT NULL,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_runs_org_id ON runs(org_id);
CREATE INDEX IF NOT EXISTS idx_runs_agent_id ON runs(agent_id);
CREATE INDEX IF NOT EXISTS idx_run_events_run_id ON run_events(run_id);

-- Updated_at trigger function
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply trigger to runs
DROP TRIGGER IF EXISTS runs_set_updated_at ON runs;
CREATE TRIGGER runs_set_updated_at
BEFORE UPDATE ON runs
FOR EACH ROW EXECUTE PROCEDURE set_updated_at();

-- Seed default organization
INSERT INTO organizations (id, name)
VALUES ('00000000-0000-0000-0000-000000000001', 'TechTide HQ')
ON CONFLICT (id) DO NOTHING;
`;

async function executeSQL(sql) {
  // Extract project ref from URL
  const projectRef = SUPABASE_URL.match(/https:\/\/([^.]+)\.supabase\.co/)?.[1];
  if (!projectRef) {
    throw new Error('Could not extract project ref from SUPABASE_URL');
  }

  // Use Supabase Management API
  const response = await fetch(`https://${projectRef}.supabase.co/rest/v1/rpc`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': SUPABASE_SERVICE_ROLE_KEY,
      'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
    },
    body: JSON.stringify({
      // This won't work directly - need to use different approach
    }),
  });

  return response;
}

// Main
console.log('Supabase Migration Script');
console.log('========================');
console.log('');
console.log('The schema needs to be applied via Supabase Dashboard SQL Editor.');
console.log('');
console.log('Steps:');
console.log('1. Go to: https://supabase.com/dashboard/project/' +
  (SUPABASE_URL.match(/https:\/\/([^.]+)\.supabase\.co/)?.[1] || 'YOUR_PROJECT') +
  '/sql/new');
console.log('2. Copy and paste the SQL below');
console.log('3. Click "Run"');
console.log('');
console.log('--- COPY SQL BELOW ---');
console.log('');
console.log(SIMPLIFIED_SCHEMA);
console.log('');
console.log('--- END SQL ---');
