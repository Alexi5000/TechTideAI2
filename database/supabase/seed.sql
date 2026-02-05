insert into organizations (id, name)
values ('00000000-0000-0000-0000-000000000001', 'TechTide HQ')
on conflict (id) do nothing;

insert into agents (org_id, name, tier, role, summary)
values
  ('00000000-0000-0000-0000-000000000001', 'CEO Agent', 'ceo', 'Executive Leadership', 'Owns strategy and cross-domain alignment.'),
  ('00000000-0000-0000-0000-000000000001', 'Strategy Orchestrator', 'orchestrator', 'Strategy & Market Intelligence', 'Monitors signals and scenario plans.'),
  ('00000000-0000-0000-0000-000000000001', 'Engineering Orchestrator', 'orchestrator', 'Engineering & Platform', 'Maintains reliability and delivery safety.'),
  ('00000000-0000-0000-0000-000000000001', 'Operations Orchestrator', 'orchestrator', 'Operations & Delivery', 'Coordinates execution cadence.'),
  ('00000000-0000-0000-0000-000000000001', 'Research Analyst', 'worker', 'Research & Intelligence', 'Delivers cited research summaries.')
;
