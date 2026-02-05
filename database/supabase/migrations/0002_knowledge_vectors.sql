begin;

create table knowledge_documents (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations(id) on delete cascade,
  title text not null,
  source text not null,
  collection text,
  content text not null,
  metadata jsonb not null default '{}'::jsonb,
  indexed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table knowledge_chunks (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations(id) on delete cascade,
  document_id uuid not null references knowledge_documents(id) on delete cascade,
  chunk_index integer not null,
  content text not null,
  token_count integer,
  created_at timestamptz not null default now(),
  unique (document_id, chunk_index)
);

create index idx_knowledge_documents_org_id on knowledge_documents(org_id);
create index idx_knowledge_chunks_document_id on knowledge_chunks(document_id);
create index idx_knowledge_chunks_org_id on knowledge_chunks(org_id);

create trigger knowledge_documents_set_updated_at
before update on knowledge_documents
for each row execute procedure set_updated_at();

alter table knowledge_documents enable row level security;
alter table knowledge_chunks enable row level security;

create policy knowledge_documents_select on knowledge_documents
  for select using (is_org_member(org_id));

create policy knowledge_documents_insert on knowledge_documents
  for insert with check (is_org_member(org_id));

create policy knowledge_documents_update on knowledge_documents
  for update using (is_org_member(org_id)) with check (is_org_member(org_id));

create policy knowledge_documents_delete on knowledge_documents
  for delete using (is_org_member(org_id));

create policy knowledge_chunks_select on knowledge_chunks
  for select using (
    exists (
      select 1 from knowledge_documents
      where knowledge_documents.id = knowledge_chunks.document_id
        and is_org_member(knowledge_documents.org_id)
    )
  );

create policy knowledge_chunks_insert on knowledge_chunks
  for insert with check (
    exists (
      select 1 from knowledge_documents
      where knowledge_documents.id = knowledge_chunks.document_id
        and is_org_member(knowledge_documents.org_id)
    )
  );

create policy knowledge_chunks_delete on knowledge_chunks
  for delete using (
    exists (
      select 1 from knowledge_documents
      where knowledge_documents.id = knowledge_chunks.document_id
        and is_org_member(knowledge_documents.org_id)
    )
  );

commit;
