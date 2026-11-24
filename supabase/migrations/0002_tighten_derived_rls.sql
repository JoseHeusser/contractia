-- Endurece RLS: el usuario no debe poder fabricar filas que luego el
-- procesamiento (service role) trate como confiables.
--
-- * contract_documents: solo se insertan apuntando a un contrato propio y a un
--   storage_path dentro de <uid>/<contract_id>/. Sin UPDATE desde el cliente.
-- * benefits, alerts, evidence_snippets, document_chunks: los escribe solo el
--   servidor (processContract). El usuario conserva SELECT y DELETE.
-- * events: insert solo para contratos propios (o sin contrato).

-- contract_documents
drop policy if exists contract_documents_insert_own on public.contract_documents;
drop policy if exists contract_documents_update_own on public.contract_documents;

create policy contract_documents_insert_own on public.contract_documents
  for insert to authenticated
  with check (
    user_id = (select auth.uid())
    and exists (
      select 1 from public.contracts c
      where c.id = contract_id and c.user_id = (select auth.uid())
    )
    and storage_path like (select auth.uid())::text || '/' || contract_id::text || '/%'
    and position('..' in storage_path) = 0
  );

-- Tablas derivadas: sin INSERT/UPDATE desde el cliente
do $$
declare
  t text;
begin
  foreach t in array array['benefits', 'alerts', 'evidence_snippets', 'document_chunks']
  loop
    execute format('drop policy if exists %I on public.%I', t || '_insert_own', t);
    execute format('drop policy if exists %I on public.%I', t || '_update_own', t);
  end loop;
end;
$$;

-- events
drop policy if exists events_insert_own on public.events;
drop policy if exists events_update_own on public.events;

create policy events_insert_own on public.events
  for insert to authenticated
  with check (
    user_id = (select auth.uid())
    and (
      contract_id is null
      or exists (
        select 1 from public.contracts c
        where c.id = contract_id and c.user_id = (select auth.uid())
      )
    )
  );
