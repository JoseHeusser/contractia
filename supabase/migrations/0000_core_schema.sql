-- ContractIA — schema principal
-- Reconstruido a partir de src/types/database.ts tras la pérdida del proyecto
-- Supabase original. Se aplica ANTES de 0001_knowledge_base.sql.
--
-- Modelo de acceso:
--   * Cada usuario solo ve y modifica sus propias filas (user_id = auth.uid()).
--   * Los admin (profiles.role = 'admin') pueden leer todos los perfiles y
--     contratos y editar perfiles (panel /app/admin).
--   * El procesamiento de contratos (src/lib/processing) usa la service role
--     y no pasa por RLS.

create extension if not exists vector;

-- ─────────────────────────────────────────────────────────────────────────────
-- Utilidades
-- ─────────────────────────────────────────────────────────────────────────────
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ─────────────────────────────────────────────────────────────────────────────
-- profiles (1:1 con auth.users)
-- ─────────────────────────────────────────────────────────────────────────────
create table public.profiles (
  id              uuid primary key references auth.users (id) on delete cascade,
  email           text not null,
  full_name       text,
  avatar_url      text,
  role            text not null default 'user' check (role in ('user', 'admin')),
  plan            text not null default 'free',
  contracts_limit integer not null default 3 check (contracts_limit >= 0),
  is_active       boolean not null default true,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create trigger profiles_updated_at before update on public.profiles
  for each row execute function public.set_updated_at();

-- is_admin(): security definer para que las políticas puedan consultar
-- profiles sin recursión de RLS.
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.profiles
    where id = (select auth.uid()) and role = 'admin'
  );
$$;

revoke execute on function public.is_admin() from public, anon;
grant execute on function public.is_admin() to authenticated;

-- Crea el perfil al registrarse (signUp envía full_name en user metadata).
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, email, full_name, avatar_url)
  values (
    new.id,
    coalesce(new.email, ''),
    new.raw_user_meta_data ->> 'full_name',
    new.raw_user_meta_data ->> 'avatar_url'
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

alter table public.profiles enable row level security;

create policy "profiles_select_own_or_admin" on public.profiles
  for select to authenticated
  using (id = (select auth.uid()) or (select public.is_admin()));

-- Solo admin edita perfiles (rol, plan, límite, activo). El usuario no puede
-- auto-promoverse.
create policy "profiles_update_admin" on public.profiles
  for update to authenticated
  using ((select public.is_admin()))
  with check ((select public.is_admin()));

-- ─────────────────────────────────────────────────────────────────────────────
-- contracts
-- ─────────────────────────────────────────────────────────────────────────────
create table public.contracts (
  id                         uuid primary key default gen_random_uuid(),
  user_id                    uuid not null references auth.users (id) on delete cascade,
  contract_display_name      text not null,
  category                   text not null default 'isapre',
  status                     text not null default 'uploaded'
    check (status in ('uploaded', 'ocr_processing', 'ocr_done', 'extracting', 'ready', 'needs_review', 'error')),
  error_code                 text,
  error_message              text,
  retry_count                integer not null default 0,

  provider_name              text,
  policyholder_name          text,
  ai_summary_simple          text,
  key_points                 jsonb,

  monthly_cost               numeric,
  monthly_cost_currency      text,
  payment_method             text,
  late_payment_terms         text,

  copay_type                 text,
  copay_percentage           numeric,
  copay_amount               numeric,
  copay_currency             text,
  copay_summary              text,

  deductible_type            text,
  deductible_amount          numeric,
  deductible_currency        text,
  deductible_summary         text,

  effective_date             date,
  end_date                   date,
  renewal_date               date,
  auto_renew                 boolean,

  price_adjustment_clause    boolean,
  explicit_increase          boolean,
  explicit_increase_rate     numeric,
  explicit_increase_date     date,
  explicit_increase_evidence text,

  cancellation_notice_days   integer,
  cancellation_summary       text,
  reimbursement_summary      text,
  privacy_summary            text,

  claims_phone               text,
  claims_email               text,
  claims_url                 text,

  exclusions                 jsonb,
  waiting_periods            jsonb,
  missing_fields             jsonb,
  missing_references         jsonb,
  needs_review_reasons       jsonb,

  created_at                 timestamptz not null default now(),
  updated_at                 timestamptz not null default now()
);

create index contracts_user_id_idx on public.contracts (user_id, created_at desc);

create trigger contracts_updated_at before update on public.contracts
  for each row execute function public.set_updated_at();

alter table public.contracts enable row level security;

create policy "contracts_select_own_or_admin" on public.contracts
  for select to authenticated
  using (user_id = (select auth.uid()) or (select public.is_admin()));
create policy "contracts_insert_own" on public.contracts
  for insert to authenticated with check (user_id = (select auth.uid()));
create policy "contracts_update_own" on public.contracts
  for update to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "contracts_delete_own" on public.contracts
  for delete to authenticated using (user_id = (select auth.uid()));

-- ─────────────────────────────────────────────────────────────────────────────
-- Tablas hijas del contrato (todas con user_id para RLS simple)
-- ─────────────────────────────────────────────────────────────────────────────
create table public.contract_documents (
  id               uuid primary key default gen_random_uuid(),
  contract_id      uuid not null references public.contracts (id) on delete cascade,
  user_id          uuid not null references auth.users (id) on delete cascade,
  storage_path     text not null,
  file_mime        text not null,
  file_size_bytes  bigint,
  pages            integer,
  ocr_storage_path text,
  ocr_confidence   numeric,
  metadata         jsonb,
  created_at       timestamptz not null default now()
);
create index contract_documents_contract_idx on public.contract_documents (contract_id);

create table public.document_chunks (
  id          uuid primary key default gen_random_uuid(),
  contract_id uuid not null references public.contracts (id) on delete cascade,
  document_id uuid references public.contract_documents (id) on delete cascade,
  user_id     uuid not null references auth.users (id) on delete cascade,
  chunk_index integer,
  content     text not null,
  page_start  integer,
  page_end    integer,
  token_count integer,
  embedding   vector(1024), -- voyage-3
  created_at  timestamptz not null default now()
);
create index document_chunks_contract_idx on public.document_chunks (contract_id);
create index document_chunks_embedding_idx on public.document_chunks
  using hnsw (embedding vector_cosine_ops);

create table public.evidence_snippets (
  id          uuid primary key default gen_random_uuid(),
  contract_id uuid not null references public.contracts (id) on delete cascade,
  document_id uuid not null references public.contract_documents (id) on delete cascade,
  user_id     uuid not null references auth.users (id) on delete cascade,
  field_key   text not null,
  snippet     text not null,
  page        integer,
  section     text,
  char_start  integer,
  char_end    integer,
  created_at  timestamptz not null default now()
);
create index evidence_snippets_contract_idx on public.evidence_snippets (contract_id);

create table public.benefits (
  id                   uuid primary key default gen_random_uuid(),
  contract_id          uuid not null references public.contracts (id) on delete cascade,
  user_id              uuid not null references auth.users (id) on delete cascade,
  name                 text not null,
  category             text,
  includes_simple      text,
  copay                jsonb,
  deductible           jsonb,
  limits               jsonb,
  waiting_period       jsonb,
  network_rules        jsonb,
  requirements         text,
  restrictions         text,
  evidence_snippet_ids uuid[],
  sort_order           integer not null default 0,
  created_at           timestamptz not null default now()
);
create index benefits_contract_idx on public.benefits (contract_id, sort_order);
create index benefits_user_idx on public.benefits (user_id);

create table public.alerts (
  id                  uuid primary key default gen_random_uuid(),
  contract_id         uuid not null references public.contracts (id) on delete cascade,
  user_id             uuid not null references auth.users (id) on delete cascade,
  type                text not null,
  severity            text not null check (severity in ('high', 'med', 'low')),
  title               text not null,
  message             text not null,
  due_date            date,
  status              text not null default 'open',
  evidence_snippet_id uuid references public.evidence_snippets (id) on delete set null,
  created_at          timestamptz not null default now()
);
create index alerts_contract_idx on public.alerts (contract_id);
create index alerts_user_open_idx on public.alerts (user_id, status, created_at desc);

create table public.events (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users (id) on delete cascade,
  contract_id uuid references public.contracts (id) on delete cascade,
  event_type  text not null,
  payload     jsonb,
  duration_ms integer,
  created_at  timestamptz not null default now()
);
create index events_user_idx on public.events (user_id, created_at desc);
create index events_contract_idx on public.events (contract_id);

-- RLS "solo el dueño" para todas las tablas hijas
do $$
declare
  t text;
begin
  foreach t in array array[
    'contract_documents', 'document_chunks', 'evidence_snippets',
    'benefits', 'alerts', 'events'
  ]
  loop
    execute format('alter table public.%I enable row level security', t);
    execute format(
      'create policy %I on public.%I for select to authenticated using (user_id = (select auth.uid()))',
      t || '_select_own', t);
    execute format(
      'create policy %I on public.%I for insert to authenticated with check (user_id = (select auth.uid()))',
      t || '_insert_own', t);
    execute format(
      'create policy %I on public.%I for update to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()))',
      t || '_update_own', t);
    execute format(
      'create policy %I on public.%I for delete to authenticated using (user_id = (select auth.uid()))',
      t || '_delete_own', t);
  end loop;
end;
$$;

-- ─────────────────────────────────────────────────────────────────────────────
-- Chat
-- ─────────────────────────────────────────────────────────────────────────────
create table public.chat_threads (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references auth.users (id) on delete cascade,
  title        text not null default 'Nueva conversación',
  contract_ids uuid[] default '{}',
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);
create index chat_threads_user_idx on public.chat_threads (user_id, updated_at desc);

create table public.chat_messages (
  id                   uuid primary key default gen_random_uuid(),
  thread_id            uuid not null references public.chat_threads (id) on delete cascade,
  user_id              uuid not null references auth.users (id) on delete cascade,
  role                 text not null check (role in ('user', 'assistant')),
  content              text not null,
  evidence_snippet_ids uuid[],
  context_snapshot     jsonb,
  input_tokens         integer,
  output_tokens        integer,
  created_at           timestamptz not null default now()
);
create index chat_messages_thread_idx on public.chat_messages (thread_id, created_at);

do $$
declare
  t text;
begin
  foreach t in array array['chat_threads', 'chat_messages']
  loop
    execute format('alter table public.%I enable row level security', t);
    execute format(
      'create policy %I on public.%I for select to authenticated using (user_id = (select auth.uid()))',
      t || '_select_own', t);
    execute format(
      'create policy %I on public.%I for insert to authenticated with check (user_id = (select auth.uid()))',
      t || '_insert_own', t);
    execute format(
      'create policy %I on public.%I for update to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()))',
      t || '_update_own', t);
    execute format(
      'create policy %I on public.%I for delete to authenticated using (user_id = (select auth.uid()))',
      t || '_delete_own', t);
  end loop;
end;
$$;

-- ─────────────────────────────────────────────────────────────────────────────
-- RPC: búsqueda vectorial sobre los chunks de los contratos del usuario.
-- security invoker → RLS filtra a los contratos propios del que llama.
-- ─────────────────────────────────────────────────────────────────────────────
create or replace function public.match_document_chunks(
  query_embedding vector(1024),
  contract_ids uuid[],
  match_count int default 5
)
returns table (
  id uuid,
  contract_id uuid,
  document_id uuid,
  content text,
  page_start int,
  page_end int,
  similarity float
)
language sql
stable
security invoker
set search_path = public, extensions
as $$
  select c.id, c.contract_id, c.document_id, c.content, c.page_start, c.page_end,
         1 - (c.embedding <=> query_embedding) as similarity
  from public.document_chunks c
  where c.contract_id = any (contract_ids)
    and c.embedding is not null
  order by c.embedding <=> query_embedding
  limit match_count;
$$;

-- ─────────────────────────────────────────────────────────────────────────────
-- Storage: bucket privado "contracts", rutas <user_id>/<contract_id>/<archivo>
-- ─────────────────────────────────────────────────────────────────────────────
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'contracts', 'contracts', false, 52428800,
  array['application/pdf', 'image/jpeg', 'image/png', 'image/webp', 'image/tiff']
)
on conflict (id) do nothing;

create policy "contracts_storage_select_own" on storage.objects
  for select to authenticated
  using (bucket_id = 'contracts' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "contracts_storage_insert_own" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'contracts' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "contracts_storage_delete_own" on storage.objects
  for delete to authenticated
  using (bucket_id = 'contracts' and (storage.foldername(name))[1] = (select auth.uid())::text);
