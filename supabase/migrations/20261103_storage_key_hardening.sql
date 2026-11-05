-- Harden restaurant asset storage keys to a single tenant-scoped shape.
-- The app writes objects as <hotel_id>/<kind>.<ext>; the database should enforce
-- that exact format and require the current staff member to match the tenant.

create or replace function public.valid_restaurant_asset_path(path text, tenant_id uuid)
returns boolean
language sql
stable
as $$
  select
    path is not null
    and path ~ ('^' || tenant_id::text || '/(logo|background)\.(png|jpg|jpeg|svg|webp)$');
$$;

create or replace function public.restaurant_asset_acl_for_user(tenant_id uuid)
returns boolean
language sql
stable
as $$
  select
    auth.role() = 'authenticated'
    and (
      exists (
        select 1 from public.platform_admins pa where pa.user_id = auth.uid()
      )
      or exists (
        select 1
        from public.staff s
        where s.id = auth.uid()
          and s.hotel_id = tenant_id
      )
    );
$$;

drop policy if exists "Authenticated admins/managers can upload restaurant assets" on storage.objects;
drop policy if exists "Authenticated admins/managers can update restaurant assets" on storage.objects;
drop policy if exists "Authenticated admins/managers can delete restaurant assets" on storage.objects;

create policy "Authenticated admins/managers can upload restaurant assets"
on storage.objects for insert
with check (
  bucket_id = 'restaurant-assets'
  and public.restaurant_asset_acl_for_user(split_part(name, '/', 1)::uuid)
  and public.valid_restaurant_asset_path(name, split_part(name, '/', 1)::uuid)
);

create policy "Authenticated admins/managers can update restaurant assets"
on storage.objects for update
using (
  bucket_id = 'restaurant-assets'
  and public.restaurant_asset_acl_for_user(split_part(name, '/', 1)::uuid)
  and public.valid_restaurant_asset_path(name, split_part(name, '/', 1)::uuid)
)
with check (
  bucket_id = 'restaurant-assets'
  and public.restaurant_asset_acl_for_user(split_part(name, '/', 1)::uuid)
  and public.valid_restaurant_asset_path(name, split_part(name, '/', 1)::uuid)
);

create policy "Authenticated admins/managers can delete restaurant assets"
on storage.objects for delete
using (
  bucket_id = 'restaurant-assets'
  and public.restaurant_asset_acl_for_user(split_part(name, '/', 1)::uuid)
  and public.valid_restaurant_asset_path(name, split_part(name, '/', 1)::uuid)
);
