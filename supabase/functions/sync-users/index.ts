import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { auth: { autoRefreshToken: false, persistSession: false } }
    )

    const results = []

    // 1. Update Felipe's profile and role with his real auth ID
    const felipeAuthId = 'c2b40f6e-9cd7-455e-885c-623a0707b5af'
    const felipeOldId = '448a21fc-fe3e-4175-99df-d3ba41619165'
    
    // Update profile
    const { error: profileError } = await supabaseAdmin
      .from('profiles')
      .upsert({ id: felipeAuthId, nome: 'Felipe (Admin)', email: 'felipecorintios1@gmail.com' })
    
    if (profileError) {
      console.error('Profile error:', profileError)
    }

    // Update role
    const { error: roleError } = await supabaseAdmin
      .from('user_roles')
      .upsert({ user_id: felipeAuthId, role: 'administrador' })
    
    if (roleError) {
      console.error('Role error:', roleError)
    }

    results.push({ 
      email: 'felipecorintios1@gmail.com', 
      action: 'synced', 
      authId: felipeAuthId,
      profileError: profileError?.message,
      roleError: roleError?.message
    })

    // 2. Create comercial@costa.com user
    const { data: existingUser } = await supabaseAdmin.auth.admin.listUsers()
    const comercialExists = existingUser?.users?.some(u => u.email === 'comercial@costa.com')

    if (!comercialExists) {
      const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
        email: 'comercial@costa.com',
        password: 'Costa@2024',
        email_confirm: true,
        user_metadata: { nome: 'Comercial Costa', role: 'operador' }
      })

      if (createError) {
        console.error('Create user error:', createError)
        results.push({ email: 'comercial@costa.com', action: 'create_failed', error: createError.message })
      } else {
        console.log('Created comercial user:', newUser.user?.id)
        
        // Ensure role is set
        await supabaseAdmin.from('user_roles').upsert({ 
          user_id: newUser.user!.id, 
          role: 'operador' 
        })
        
        results.push({ email: 'comercial@costa.com', action: 'created', authId: newUser.user?.id })
      }
    } else {
      results.push({ email: 'comercial@costa.com', action: 'already_exists' })
    }

    return new Response(
      JSON.stringify({ success: true, results }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error: unknown) {
    console.error('Sync error:', error)
    const message = error instanceof Error ? error.message : 'Erro desconhecido'
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
