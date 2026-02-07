begin;

-- The runs and artifacts tables define agent_id as uuid with a foreign key
-- to agents(id). However, the application uses string-based agent IDs from
-- the in-memory registry (e.g. "ceo", "orch-veronica") rather than UUIDs
-- from the agents table. This causes every INSERT to fail with:
--   ERROR: invalid input syntax for type uuid: "ceo"
--
-- Fix: change agent_id to text and drop the FK constraint.
-- The in-memory agent registry is the source of truth for agent identity.

-- runs.agent_id: uuid → text
alter table runs drop constraint if exists runs_agent_id_fkey;
alter table runs alter column agent_id type text using agent_id::text;

-- artifacts.agent_id: uuid → text
alter table artifacts drop constraint if exists artifacts_agent_id_fkey;
alter table artifacts alter column agent_id type text using agent_id::text;

commit;
