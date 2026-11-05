-- Multi-tenant security hardening.
-- NOTE: This migration assumes the app user records are linked through public.staff(id)
-- and the platform admin table is public.platform_admins(user_id). The Supabase custom
-- access token hook is configured in the dashboard so that the JWT contains the claims
-- needed for tenant and role checks.

create or replace function public.custom_access_token_hook(event jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  claims jsonb := coalesce(event->'claims', '{}'::jsonb);
  user_id uuid;
  requested_role text;
  hotel_id uuid;
begin
  user_id := nullif(event->>'user_id', '')::uuid;

  if user_id is null then
    user_id := nullif(event->>'sub', '')::uuid;
  end if;

  if user_id is null then
    return claims;
  end if;

  requested_role := coalesce(
    event->'user'->'raw_app_meta_data'->>'role',
    event->'user'->'app_metadata'->>'role',
    'staff'
  );

  if exists (select 1 from public.platform_admins pa where pa.user_id = user_id) then
    requested_role := 'platform_admin';
  else
    select s.hotel_id into hotel_id
    from public.staff s
    where s.id = user_id
    limit 1;

    if hotel_id is not null then
      claims := jsonb_set(claims, '{restaurant_id}', to_jsonb(hotel_id::text));
      claims := jsonb_set(claims, '{hotel_id}', to_jsonb(hotel_id::text));
    end if;
  end if;

  claims := jsonb_set(claims, '{role}', to_jsonb(requested_role));
  return claims;
end;
$$;

grant execute on function public.custom_access_token_hook(jsonb) to supabase_auth_admin;
revoke all on function public.custom_access_token_hook(jsonb) from public;
revoke all on function public.custom_access_token_hook(jsonb) from authenticated;
revoke all on function public.custom_access_token_hook(jsonb) from anon;

-- Turn on row-level security for all tenant-aware tables.
alter table public.hotels enable row level security;
alter table public.staff enable row level security;
alter table public.menu_items enable row level security;
alter table public.local_recommendations enable row level security;
alter table public.compendium enable row level security;
alter table public.requests enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;

-- Keep platform-admin and user self-access explicit rather than relying on database defaults.
alter table public.platform_admins enable row level security;

create index if not exists idx_staff_hotel_id on public.staff (hotel_id);
create index if not exists idx_platform_admins_user_id on public.platform_admins (user_id);
create index if not exists idx_menu_items_hotel_id on public.menu_items (hotel_id);
create index if not exists idx_recommendations_hotel_id on public.local_recommendations (hotel_id);
create index if not exists idx_compendium_hotel_id on public.compendium (hotel_id);
create index if not exists idx_requests_hotel_id on public.requests (hotel_id);
create index if not exists idx_orders_hotel_id on public.orders (hotel_id);
create index if not exists idx_order_items_order_id on public.order_items (order_id);

create policy "platform_admins_select" on public.platform_admins
for select
using ((select auth.jwt() ->> 'role') = 'platform_admin' or user_id = auth.uid());

create policy "platform_admins_insert" on public.platform_admins
for insert
with check ((select auth.jwt() ->> 'role') = 'platform_admin' or user_id = auth.uid());

create policy "platform_admins_update" on public.platform_admins
for update
using ((select auth.jwt() ->> 'role') = 'platform_admin' or user_id = auth.uid())
with check ((select auth.jwt() ->> 'role') = 'platform_admin' or user_id = auth.uid());

create policy "platform_admins_delete" on public.platform_admins
for delete
using ((select auth.jwt() ->> 'role') = 'platform_admin' or user_id = auth.uid());

create policy "hotels_select" on public.hotels
for select
using (
  id = ((select auth.jwt() ->> 'restaurant_id')::uuid)
  or (select auth.jwt() ->> 'role') = 'platform_admin'
);

create policy "hotels_insert" on public.hotels
for insert
with check ((select auth.jwt() ->> 'role') = 'platform_admin');

create policy "hotels_update" on public.hotels
for update
using (
  id = ((select auth.jwt() ->> 'restaurant_id')::uuid)
  or (select auth.jwt() ->> 'role') = 'platform_admin'
)
with check (
  id = ((select auth.jwt() ->> 'restaurant_id')::uuid)
  or (select auth.jwt() ->> 'role') = 'platform_admin'
);

create policy "hotels_delete" on public.hotels
for delete
using ((select auth.jwt() ->> 'role') = 'platform_admin');

create policy "staff_select" on public.staff
for select
using (
  hotel_id = ((select auth.jwt() ->> 'restaurant_id')::uuid)
  or (select auth.jwt() ->> 'role') = 'platform_admin'
  or id = auth.uid()
);

create policy "staff_insert" on public.staff
for insert
with check (
  (hotel_id = ((select auth.jwt() ->> 'restaurant_id')::uuid) and id = auth.uid())
  or (select auth.jwt() ->> 'role') = 'platform_admin'
);

create policy "staff_update" on public.staff
for update
using (
  hotel_id = ((select auth.jwt() ->> 'restaurant_id')::uuid)
  or (select auth.jwt() ->> 'role') = 'platform_admin'
  or id = auth.uid()
)
with check (
  hotel_id = ((select auth.jwt() ->> 'restaurant_id')::uuid)
  or (select auth.jwt() ->> 'role') = 'platform_admin'
  or id = auth.uid()
);

create policy "staff_delete" on public.staff
for delete
using (
  hotel_id = ((select auth.jwt() ->> 'restaurant_id')::uuid)
  or (select auth.jwt() ->> 'role') = 'platform_admin'
  or id = auth.uid()
);

create policy "menu_items_select" on public.menu_items
for select
using (
  hotel_id = ((select auth.jwt() ->> 'restaurant_id')::uuid)
  or (select auth.jwt() ->> 'role') = 'platform_admin'
);

create policy "menu_items_insert" on public.menu_items
for insert
with check (
  hotel_id = ((select auth.jwt() ->> 'restaurant_id')::uuid)
  or (select auth.jwt() ->> 'role') = 'platform_admin'
);

create policy "menu_items_update" on public.menu_items
for update
using (
  hotel_id = ((select auth.jwt() ->> 'restaurant_id')::uuid)
  or (select auth.jwt() ->> 'role') = 'platform_admin'
)
with check (
  hotel_id = ((select auth.jwt() ->> 'restaurant_id')::uuid)
  or (select auth.jwt() ->> 'role') = 'platform_admin'
);

create policy "menu_items_delete" on public.menu_items
for delete
using (
  hotel_id = ((select auth.jwt() ->> 'restaurant_id')::uuid)
  or (select auth.jwt() ->> 'role') = 'platform_admin'
);

create policy "recommendations_select" on public.local_recommendations
for select
using (
  hotel_id = ((select auth.jwt() ->> 'restaurant_id')::uuid)
  or (select auth.jwt() ->> 'role') = 'platform_admin'
);

create policy "recommendations_insert" on public.local_recommendations
for insert
with check (
  hotel_id = ((select auth.jwt() ->> 'restaurant_id')::uuid)
  or (select auth.jwt() ->> 'role') = 'platform_admin'
);

create policy "recommendations_update" on public.local_recommendations
for update
using (
  hotel_id = ((select auth.jwt() ->> 'restaurant_id')::uuid)
  or (select auth.jwt() ->> 'role') = 'platform_admin'
)
with check (
  hotel_id = ((select auth.jwt() ->> 'restaurant_id')::uuid)
  or (select auth.jwt() ->> 'role') = 'platform_admin'
);

create policy "recommendations_delete" on public.local_recommendations
for delete
using (
  hotel_id = ((select auth.jwt() ->> 'restaurant_id')::uuid)
  or (select auth.jwt() ->> 'role') = 'platform_admin'
);

create policy "compendium_select" on public.compendium
for select
using (
  hotel_id = ((select auth.jwt() ->> 'restaurant_id')::uuid)
  or (select auth.jwt() ->> 'role') = 'platform_admin'
);

create policy "compendium_insert" on public.compendium
for insert
with check (
  hotel_id = ((select auth.jwt() ->> 'restaurant_id')::uuid)
  or (select auth.jwt() ->> 'role') = 'platform_admin'
);

create policy "compendium_update" on public.compendium
for update
using (
  hotel_id = ((select auth.jwt() ->> 'restaurant_id')::uuid)
  or (select auth.jwt() ->> 'role') = 'platform_admin'
)
with check (
  hotel_id = ((select auth.jwt() ->> 'restaurant_id')::uuid)
  or (select auth.jwt() ->> 'role') = 'platform_admin'
);

create policy "compendium_delete" on public.compendium
for delete
using (
  hotel_id = ((select auth.jwt() ->> 'restaurant_id')::uuid)
  or (select auth.jwt() ->> 'role') = 'platform_admin'
);

create policy "requests_select" on public.requests
for select
using (
  hotel_id = ((select auth.jwt() ->> 'restaurant_id')::uuid)
  or (select auth.jwt() ->> 'role') = 'platform_admin'
);

create policy "requests_insert" on public.requests
for insert
with check (
  hotel_id = ((select auth.jwt() ->> 'restaurant_id')::uuid)
  or (select auth.jwt() ->> 'role') = 'platform_admin'
);

create policy "requests_update" on public.requests
for update
using (
  hotel_id = ((select auth.jwt() ->> 'restaurant_id')::uuid)
  or (select auth.jwt() ->> 'role') = 'platform_admin'
)
with check (
  hotel_id = ((select auth.jwt() ->> 'restaurant_id')::uuid)
  or (select auth.jwt() ->> 'role') = 'platform_admin'
);

create policy "requests_delete" on public.requests
for delete
using (
  hotel_id = ((select auth.jwt() ->> 'restaurant_id')::uuid)
  or (select auth.jwt() ->> 'role') = 'platform_admin'
);

create policy "orders_select" on public.orders
for select
using (
  hotel_id = ((select auth.jwt() ->> 'restaurant_id')::uuid)
  or (select auth.jwt() ->> 'role') = 'platform_admin'
);

create policy "orders_insert" on public.orders
for insert
with check (
  hotel_id = ((select auth.jwt() ->> 'restaurant_id')::uuid)
  or (select auth.jwt() ->> 'role') = 'platform_admin'
);

create policy "orders_update" on public.orders
for update
using (
  hotel_id = ((select auth.jwt() ->> 'restaurant_id')::uuid)
  or (select auth.jwt() ->> 'role') = 'platform_admin'
)
with check (
  hotel_id = ((select auth.jwt() ->> 'restaurant_id')::uuid)
  or (select auth.jwt() ->> 'role') = 'platform_admin'
);

create policy "orders_delete" on public.orders
for delete
using (
  hotel_id = ((select auth.jwt() ->> 'restaurant_id')::uuid)
  or (select auth.jwt() ->> 'role') = 'platform_admin'
);

create policy "order_items_select" on public.order_items
for select
using (
  exists (
    select 1 from public.orders o
    where o.id = order_items.order_id
      and (
        o.hotel_id = ((select auth.jwt() ->> 'restaurant_id')::uuid)
        or (select auth.jwt() ->> 'role') = 'platform_admin'
      )
  )
);

create policy "order_items_insert" on public.order_items
for insert
with check (
  exists (
    select 1 from public.orders o
    where o.id = order_items.order_id
      and (
        o.hotel_id = ((select auth.jwt() ->> 'restaurant_id')::uuid)
        or (select auth.jwt() ->> 'role') = 'platform_admin'
      )
  )
);

create policy "order_items_update" on public.order_items
for update
using (
  exists (
    select 1 from public.orders o
    where o.id = order_items.order_id
      and (
        o.hotel_id = ((select auth.jwt() ->> 'restaurant_id')::uuid)
        or (select auth.jwt() ->> 'role') = 'platform_admin'
      )
  )
)
with check (
  exists (
    select 1 from public.orders o
    where o.id = order_items.order_id
      and (
        o.hotel_id = ((select auth.jwt() ->> 'restaurant_id')::uuid)
        or (select auth.jwt() ->> 'role') = 'platform_admin'
      )
  )
);

create policy "order_items_delete" on public.order_items
for delete
using (
  exists (
    select 1 from public.orders o
    where o.id = order_items.order_id
      and (
        o.hotel_id = ((select auth.jwt() ->> 'restaurant_id')::uuid)
        or (select auth.jwt() ->> 'role') = 'platform_admin'
      )
  )
);
