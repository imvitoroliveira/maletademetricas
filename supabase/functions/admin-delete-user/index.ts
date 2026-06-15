import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"
import { corsHeaders } from "../_shared/cors.ts"

serve(async (req) => {
  const cors = corsHeaders(req)
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: cors })
  }

  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), {
      status,
      headers: { ...cors, 'Content-Type': 'application/json' },
    })

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
    )

    // 1. Get current logged-in user
    const { data: { user: caller }, error: authError } = await supabaseClient.auth.getUser()
    if (authError || !caller) {
      return json({ error: 'Unauthorized' }, 401)
    }

    // 2. Authorization: a configured master admin (via MASTER_ADMIN_EMAIL env),
    //    otherwise fall back to verifying the caller is an admin.
    const masterEmail = Deno.env.get('MASTER_ADMIN_EMAIL')
    let authorized = false
    if (masterEmail) {
      authorized = caller.email === masterEmail
    } else {
      const { data: prof } = await supabaseClient
        .from('profiles')
        .select('is_admin')
        .eq('id', caller.id)
        .single()
      authorized = !!prof?.is_admin
    }

    if (!authorized) {
      return json({ error: 'Forbidden: insufficient privileges to delete users.' }, 403)
    }

    // 3. Get target user ID from request body
    const { userId } = await req.json()
    if (!userId) {
      return json({ error: 'User ID is required' }, 400)
    }

    // 4. Admin client with service role for full control
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // 5. Delete related rows explicitly (defensive, in case cascades are absent)
    await supabaseAdmin.from('profile_ad_accounts').delete().eq('profile_id', userId)
    await supabaseAdmin.from('user_roles').delete().eq('user_id', userId)
    await supabaseAdmin.from('client_permissions').delete().eq('client_id', userId)
    await supabaseAdmin.from('custom_metrics').delete().eq('user_id', userId)
    await supabaseAdmin.from('profiles').delete().eq('id', userId)

    // 6. Finally delete from auth.users
    const { error: authDeleteError } = await supabaseAdmin.auth.admin.deleteUser(userId)
    if (authDeleteError) {
      return json({ error: authDeleteError.message }, 400)
    }

    return json({ message: 'User and all related data deleted successfully' }, 200)
  } catch (error) {
    return json({ error: (error as Error).message }, 500)
  }
})
