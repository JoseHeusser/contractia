-- Base de conocimiento ContractIA
-- 1) Arancel FONASA: tabla estructurada para búsqueda EXACTA por código (no RAG)
-- 2) Documentos normativos (GES, CAE, Ley Ricarte Soto, etc.): RAG vectorial global
--
-- Requiere pgvector (ya usado por los chunks de contratos). voyage-3 = 1024 dims.

create extension if not exists vector;

-- ─────────────────────────────────────────────────────────────────────────────
-- 1) Arancel FONASA (Modalidad Libre Elección)
-- ─────────────────────────────────────────────────────────────────────────────
create table if not exists public.fonasa_arancel (
  codigo       text primary key,        -- "01 01 001"
  codigo_norm  text not null,           -- "0101001" (solo dígitos)
  grupo        text,
  denominacion text not null,
  n1_total     integer,
  n1_benef     integer,
  n2_total     integer,
  n2_benef     integer,
  n3_total     integer,
  n3_benef     integer,
  updated_at   timestamptz not null default now()
);

create index if not exists idx_fonasa_codigo_norm on public.fonasa_arancel (codigo_norm);
create index if not exists idx_fonasa_denom_fts
  on public.fonasa_arancel using gin (to_tsvector('spanish', denominacion));

alter table public.fonasa_arancel enable row level security;
-- Lectura para usuarios autenticados; escritura solo service role (sin policy de escritura).
drop policy if exists "fonasa_read" on public.fonasa_arancel;
create policy "fonasa_read" on public.fonasa_arancel
  for select to authenticated using (true);

-- ─────────────────────────────────────────────────────────────────────────────
-- 2) Conocimiento normativo (RAG global, no atado a usuario ni contrato)
-- ─────────────────────────────────────────────────────────────────────────────
create table if not exists public.knowledge_chunks (
  id         uuid primary key default gen_random_uuid(),
  source     text not null,             -- archivo de origen
  title      text,
  section    text,
  content    text not null,
  embedding  vector(1024),
  created_at timestamptz not null default now()
);

create index if not exists idx_knowledge_embedding
  on public.knowledge_chunks using ivfflat (embedding vector_cosine_ops) with (lists = 100);

alter table public.knowledge_chunks enable row level security;
drop policy if exists "knowledge_read" on public.knowledge_chunks;
create policy "knowledge_read" on public.knowledge_chunks
  for select to authenticated using (true);

-- RPC: similitud coseno sobre la base de conocimiento (global)
create or replace function public.match_knowledge_chunks(
  query_embedding vector(1024),
  match_count int default 4
)
returns table (id uuid, source text, title text, content text, similarity float)
language sql stable
as $$
  select id, source, title, content,
         1 - (embedding <=> query_embedding) as similarity
  from public.knowledge_chunks
  where embedding is not null
  order by embedding <=> query_embedding
  limit match_count;
$$;
