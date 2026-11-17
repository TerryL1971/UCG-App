-- Let customers back up (Terry, 2026-11-17): remove a scan they added to
-- their own plan (wrong document, switched insurance, changed car…).
-- When the newest copy of a document is removed, the previous version
-- becomes the current one again.

create policy "Customers remove documents from their own deals" on public.deal_files
  for delete to authenticated
  using (exists (select 1 from public.deals d where d.id = deal_id and d.customer_id = auth.uid()));

create policy "Deal files: customers delete from their own deals" on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'deal-files'
    and exists (
      select 1 from public.deals d
      where d.id::text = (storage.foldername(name))[1] and d.customer_id = auth.uid()
    )
  );

create or replace function public.deal_files_after_delete()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if old.replaced_at is null and old.doc_type <> 'other' then
    update public.deal_files
    set replaced_at = null
    where id = (
      select id from public.deal_files
      where deal_id = old.deal_id and doc_type = old.doc_type
      order by created_at desc
      limit 1
    );
  end if;
  return old;
end;
$$;

drop trigger if exists deal_files_after_delete on public.deal_files;
create trigger deal_files_after_delete
  after delete on public.deal_files
  for each row execute function public.deal_files_after_delete();
