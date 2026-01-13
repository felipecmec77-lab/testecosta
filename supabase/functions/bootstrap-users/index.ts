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

    // Check if users already exist - only allow bootstrap once
    const { data: existingUsers } = await supabaseAdmin.auth.admin.listUsers({ perPage: 1 })
    
    if (existingUsers && existingUsers.users && existingUsers.users.length > 0) {
      return new Response(
        JSON.stringify({ error: 'Usuários já existem. Bootstrap não permitido.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const users = [
      { 
        email: 'felipecorintios1@gmail.com', 
        password: 'Costa@2024', 
        nome: 'Felipe (Admin)', 
        role: 'administrador',
        id: '448a21fc-fe3e-4175-99df-d3ba41619165'
      },
      { 
        email: 'comercial@costa.com', 
        password: 'Costa@2024', 
        nome: 'Comercial Costa', 
        role: 'operador',
        id: '548f45f4-fd9e-47b8-99ad-82018a3bdafa'
      }
    ]

    const results = []

    for (const user of users) {
      console.log(`Creating user: ${user.email}`)
      
      const { data, error } = await supabaseAdmin.auth.admin.createUser({
        email: user.email,
        password: user.password,
        email_confirm: true,
        user_metadata: { nome: user.nome, role: user.role }
      })

      if (error) {
        console.error(`Error creating ${user.email}:`, error.message)
        results.push({ email: user.email, success: false, error: error.message })
      } else {
        console.log(`User created: ${user.email} with id ${data.user?.id}`)
        
        // Update profile to match the expected ID if different
        if (data.user && data.user.id !== user.id) {
          // Update references in profiles and user_roles
          await supabaseAdmin.from('profiles').upsert({
            id: data.user.id,
            nome: user.nome,
            email: user.email
          })
          
          await supabaseAdmin.from('user_roles').upsert({
            user_id: data.user.id,
            role: user.role
          })
        }
        
        results.push({ email: user.email, success: true, id: data.user?.id })
      }
    }

    return new Response(
      JSON.stringify({ success: true, results }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error: unknown) {
    console.error('Bootstrap error:', error)
    const message = error instanceof Error ? error.message : 'Erro desconhecido'
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
