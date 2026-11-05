BEGIN;
-- Step 1: Create missing tenant-scoped tables and row-level security.
CREATE TABLE IF NOT EXISTS public.compendium (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  hotel_id uuid NOT NULL REFERENCES public.hotels(id) ON DELETE CASCADE,
  section text NOT NULL,
  content text NOT NULL,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.local_recommendations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  hotel_id uuid NOT NULL REFERENCES public.hotels(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text NULL,
  category text NOT NULL CHECK (category IN ('food', 'drink', 'activity', 'shopping', 'other')),
  walk_minutes integer NULL,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.compendium ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.local_recommendations ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_compendium_hotel_id ON public.compendium (hotel_id);
CREATE INDEX IF NOT EXISTS idx_local_recommendations_hotel_id ON public.local_recommendations (hotel_id);

DROP POLICY IF EXISTS "tenant read compendium" ON public.compendium;
DROP POLICY IF EXISTS "tenant write compendium" ON public.compendium;
DROP POLICY IF EXISTS "tenant read local recommendations" ON public.local_recommendations;
DROP POLICY IF EXISTS "tenant write local recommendations" ON public.local_recommendations;

CREATE POLICY "tenant read compendium"
  ON public.compendium
  FOR SELECT
  USING (
    hotel_id = (select hotel_id from public.staff where id = auth.uid())
  );

CREATE POLICY "tenant write compendium"
  ON public.compendium
  FOR INSERT
  WITH CHECK (
    hotel_id = (select hotel_id from public.staff where id = auth.uid())
  );

CREATE POLICY "tenant update compendium"
  ON public.compendium
  FOR UPDATE
  USING (
    hotel_id = (select hotel_id from public.staff where id = auth.uid())
  )
  WITH CHECK (
    hotel_id = (select hotel_id from public.staff where id = auth.uid())
  );

CREATE POLICY "tenant delete compendium"
  ON public.compendium
  FOR DELETE
  USING (
    hotel_id = (select hotel_id from public.staff where id = auth.uid())
  );

CREATE POLICY "tenant read local recommendations"
  ON public.local_recommendations
  FOR SELECT
  USING (
    hotel_id = (select hotel_id from public.staff where id = auth.uid())
  );

CREATE POLICY "tenant write local recommendations"
  ON public.local_recommendations
  FOR INSERT
  WITH CHECK (
    hotel_id = (select hotel_id from public.staff where id = auth.uid())
  );

CREATE POLICY "tenant update local recommendations"
  ON public.local_recommendations
  FOR UPDATE
  USING (
    hotel_id = (select hotel_id from public.staff where id = auth.uid())
  )
  WITH CHECK (
    hotel_id = (select hotel_id from public.staff where id = auth.uid())
  );

CREATE POLICY "tenant delete local recommendations"
  ON public.local_recommendations
  FOR DELETE
  USING (
    hotel_id = (select hotel_id from public.staff where id = auth.uid())
  );
COMMIT;

BEGIN;
-- Step 2: Add platform_admins SELECT policies to requests and orders.
DROP POLICY IF EXISTS "platform admins read requests" ON public.requests;
DROP POLICY IF EXISTS "platform admins read orders" ON public.orders;

CREATE POLICY "platform admins read requests"
  ON public.requests
  FOR SELECT
  USING (
    exists (select 1 from public.platform_admins where user_id = auth.uid())
  );

CREATE POLICY "platform admins read orders"
  ON public.orders
  FOR SELECT
  USING (
    exists (select 1 from public.platform_admins where user_id = auth.uid())
  );
COMMIT;

BEGIN;
-- Step 3: Add platform_admins INSERT and UPDATE policies to hotels.
DROP POLICY IF EXISTS "platform admins insert hotels" ON public.hotels;
DROP POLICY IF EXISTS "platform admins update hotels" ON public.hotels;

CREATE POLICY "platform admins insert hotels"
  ON public.hotels
  FOR INSERT
  WITH CHECK (
    exists (select 1 from public.platform_admins where user_id = auth.uid())
  );

CREATE POLICY "platform admins update hotels"
  ON public.hotels
  FOR UPDATE
  USING (
    exists (select 1 from public.platform_admins where user_id = auth.uid())
  )
  WITH CHECK (
    exists (select 1 from public.platform_admins where user_id = auth.uid())
  );
COMMIT;

BEGIN;
-- Step 4: Replace the storage.objects policies for restaurant-assets with tenant-scoped + platform_admin rules.
DROP POLICY IF EXISTS "public read restaurant assets" ON storage.objects;
DROP POLICY IF EXISTS "Staff can upload restaurant assets" ON storage.objects;
DROP POLICY IF EXISTS "staff upload restaurant assets" ON storage.objects;
DROP POLICY IF EXISTS "staff update restaurant assets" ON storage.objects;
DROP POLICY IF EXISTS "staff delete restaurant assets" ON storage.objects;
DROP POLICY IF EXISTS "platform admins upload restaurant assets" ON storage.objects;
DROP POLICY IF EXISTS "platform admins update restaurant assets" ON storage.objects;
DROP POLICY IF EXISTS "platform admins delete restaurant assets" ON storage.objects;
DROP POLICY IF EXISTS "tenant staff upload restaurant assets" ON storage.objects;
DROP POLICY IF EXISTS "tenant staff update restaurant assets" ON storage.objects;
DROP POLICY IF EXISTS "tenant staff delete restaurant assets" ON storage.objects;

CREATE POLICY "public read restaurant assets"
  ON storage.objects
  FOR SELECT
  USING (
    bucket_id = 'restaurant-assets'
  );

CREATE POLICY "tenant staff upload restaurant assets"
  ON storage.objects
  FOR INSERT
  WITH CHECK (
    bucket_id = 'restaurant-assets'
    AND exists (
      select 1
      from public.staff s
      where s.id = auth.uid()
        and s.hotel_id = split_part(name, '/', 1)::uuid
    )
  );

CREATE POLICY "platform admins upload restaurant assets"
  ON storage.objects
  FOR INSERT
  WITH CHECK (
    bucket_id = 'restaurant-assets'
    AND exists (
      select 1
      from public.platform_admins pa
      where pa.user_id = auth.uid()
    )
  );

CREATE POLICY "tenant and platform admin update restaurant assets"
  ON storage.objects
  FOR UPDATE
  USING (
    bucket_id = 'restaurant-assets'
    AND (
      exists (
        select 1
        from public.platform_admins pa
        where pa.user_id = auth.uid()
      )
      OR exists (
        select 1
        from public.staff s
        where s.id = auth.uid()
          and s.hotel_id = split_part(name, '/', 1)::uuid
      )
    )
  )
  WITH CHECK (
    bucket_id = 'restaurant-assets'
    AND (
      exists (
        select 1
        from public.platform_admins pa
        where pa.user_id = auth.uid()
      )
      OR exists (
        select 1
        from public.staff s
        where s.id = auth.uid()
          and s.hotel_id = split_part(name, '/', 1)::uuid
      )
    )
  );

CREATE POLICY "tenant and platform admin delete restaurant assets"
  ON storage.objects
  FOR DELETE
  USING (
    bucket_id = 'restaurant-assets'
    AND (
      exists (
        select 1
        from public.platform_admins pa
        where pa.user_id = auth.uid()
      )
      OR exists (
        select 1
        from public.staff s
        where s.id = auth.uid()
          and s.hotel_id = split_part(name, '/', 1)::uuid
      )
    )
  );
COMMIT;

BEGIN;
-- Step 5 (optional/commented out): Tighten public read access for hotels and menu_items.
-- This block is intentionally commented out to keep the app's public landing pages and menu reads
-- unchanged until you explicitly want to restrict them to authenticated/tenant-scoped access.
--
-- CREATE POLICY "deny public read hotels" ON public.hotels FOR SELECT USING (false);
-- CREATE POLICY "deny public read menu_items" ON public.menu_items FOR SELECT USING (false);
--
-- If you later want to enforce tenant-only reads, use the pattern below instead:
--   USING (hotel_id = (select hotel_id from public.staff where id = auth.uid()))
COMMIT;
