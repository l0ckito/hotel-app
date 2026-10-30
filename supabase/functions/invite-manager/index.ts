import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    // 1. Verify caller is a platform admin
    const authHeader = req.headers.get('Authorization') ?? '';
    const jwt = authHeader.replace('Bearer ', '');
    if (!jwt) return json({ error: 'missing auth' }, 401);

    const userClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: `Bearer ${jwt}` } } },
    );
    const { data: userData, error: userErr } = await userClient.auth.getUser();
    if (userErr || !userData.user) return json({ error: 'invalid auth' }, 401);

    const admin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    const { data: isAdmin } = await admin
      .from('platform_admins').select('user_id').eq('user_id', userData.user.id).single();
    if (!isAdmin) return json({ error: 'not an admin' }, 403);

    // 2. Read input
    const { email, hotel_id, full_name } = await req.json();
    if (!email || !hotel_id) return json({ error: 'missing email or hotel_id' }, 400);

    // 3. Invite the user (sends an email automatically via Supabase)
    const { data: inviteData, error: inviteErr } = await admin.auth.admin.inviteUserByEmail(email);
    if (inviteErr) return json({ error: inviteErr.message }, 400);

    // 4. Link the new user to the hotel in the staff table
    const { error: staffErr } = await admin.from('staff').insert({
      id: inviteData.user.id,
      hotel_id,
      role: 'manager',
      full_name: full_name || 'Manager',
    });
    if (staffErr) return json({ error: staffErr.message }, 500);

    return json({ ok: true, message: 'Manager invited successfully' });
  } catch (e) {
    return json({ error: String(e) }, 500);
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}
