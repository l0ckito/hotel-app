-- Restaurant branding migration
-- Adds direct branding fields to the restaurants table because the app already uses
-- hotels.primary_color and hotels.logo_url as top-level fields, and no settings JSONB
-- column exists in the current schema.

alter table public.hotels
  add column if not exists background_url text,
  add column if not exists secondary_color text,
  add column if not exists logo_url text,
  add column if not exists primary_color text default '#1f2937';

-- Ensure the primary color is never null for legacy records.
update public.hotels
set primary_color = coalesce(primary_color, '#1f2937')
where primary_color is null;

alter table public.hotels
  alter column primary_color set default '#1f2937';

-- Storage bucket for restaurant branding assets.
insert into storage.buckets (id, name, public)
values ('restaurant-assets', 'restaurant-assets', true)
on conflict (id) do nothing;

create policy "Public read access for restaurant assets"
on storage.objects for select
using (bucket_id = 'restaurant-assets');

create policy "Authenticated admins/managers can upload restaurant assets"
on storage.objects for insert
with check (
  bucket_id = 'restaurant-assets'
  and auth.role() = 'authenticated'
  and (
    exists (
      select 1 from public.platform_admins pa where pa.user_id = auth.uid()
    )
    or exists (
      select 1
      from public.staff s
      where s.id = auth.uid()
        and s.hotel_id::text = split_part(name, '/', 1)
    )
  )
);

create policy "Authenticated admins/managers can update restaurant assets"
on storage.objects for update
using (
  bucket_id = 'restaurant-assets'
  and auth.role() = 'authenticated'
  and (
    exists (
      select 1 from public.platform_admins pa where pa.user_id = auth.uid()
    )
    or exists (
      select 1
      from public.staff s
      where s.id = auth.uid()
        and s.hotel_id::text = split_part(name, '/', 1)
    )
  )
)
with check (
  bucket_id = 'restaurant-assets'
  and auth.role() = 'authenticated'
  and (
    exists (
      select 1 from public.platform_admins pa where pa.user_id = auth.uid()
    )
    or exists (
      select 1
      from public.staff s
      where s.id = auth.uid()
        and s.hotel_id::text = split_part(name, '/', 1)
    )
  )
);

create policy "Authenticated admins/managers can delete restaurant assets"
on storage.objects for delete
using (
  bucket_id = 'restaurant-assets'
  and auth.role() = 'authenticated'
  and (
    exists (
      select 1 from public.platform_admins pa where pa.user_id = auth.uid()
    )
    or exists (
      select 1
      from public.staff s
      where s.id = auth.uid()
        and s.hotel_id::text = split_part(name, '/', 1)
    )
  )
);
