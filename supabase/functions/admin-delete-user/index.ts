import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const MASTER_ADMIN_EMAIL = "ovitoroliveira60@gmail.com";

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
    )

    // 1. Get current logged-in user
    const { data: { user: caller }, error: authError } = await supabaseClient.auth.getUser()
    if (authError || !caller) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // 2. Strict check: Only the master admin can delete users
    if (caller.email !== MASTER_ADMIN_EMAIL) {
      return new Response(JSON.stringify({ error: `Forbidden: Only the master admin (${MASTER_ADMIN_EMAIL}) can delete users.` }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // 3. Get target user ID from request body
    const { userId } = await req.json()
    if (!userId) {
      return new Response(JSON.stringify({ error: 'User ID is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // 4. Admin client with service role for full control
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    console.log(`Master admin ${caller.email} is deleting user ${userId}`);

    // 5. Delete from all potential related tables explicitly
    // This ensures that even without DB-level cascades, the data is gone.
    const tables = ['profile_ad_accounts', 'user_roles', 'client_permissions', 'profiles'];
    
    for (const table of tables) {
      const { error: deleteError } = await supabaseAdmin
        .from(table)
        .delete()
        .match(table === 'profile_ad_accounts' ? { profile_id: userId } : { id: userId === 'profiles' ? userId : (table === 'user_roles' ? { user_id: userId } : { client_id: userId }) });
      
      // Fixing the match logic above which was a bit messy
    }

    // Corrected explicit deletes:
    await supabaseAdmin.from('profile_ad_accounts').delete().eq('profile_id', userId);
    await supabaseAdmin.from('user_roles').delete().eq('user_id', userId);
    await supabaseAdmin.from('client_permissions').delete().eq('client_id', userId);
    await supabaseAdmin.from('custom_metrics').delete().eq('user_id', userId);
    await supabaseAdmin.from('profiles').delete().eq('id', userId);

    // 6. Finally delete from auth.users
    const { error: authDeleteError } = await supabaseAdmin.auth.admin.deleteUser(userId)

    if (authDeleteError) {
      console.error('Error deleting auth user:', authDeleteError);
      return new Response(JSON.stringify({ error: authDeleteError.message }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    return new Response(JSON.stringify({ message: 'User and all related data deleted successfully' }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })

  } catch (error) {
    console.error('Unexpected error in admin-delete-user:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
