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

    // Verify the requesting user is an admin
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      throw new Error('No authorization header')
    }

    const token = authHeader.replace('Bearer ', '')
    const { data: { user: requestingUser }, error: authError } = await supabaseAdmin.auth.getUser(token)
    
    if (authError || !requestingUser) {
      throw new Error('Invalid token')
    }

    // Check if requesting user is admin
    const { data: roleData, error: roleError } = await supabaseAdmin
      .from('user_roles')
      .select('role')
      .eq('user_id', requestingUser.id)
      .single()

    if (roleError || roleData?.role !== 'administrador') {
      throw new Error('Apenas administradores podem criar usuários')
    }

    const { email, password, nome, role, username } = await req.json()

    if (!email || !password || !nome || !role) {
      throw new Error('Email, senha, nome e perfil são obrigatórios')
    }

    console.log('Tentando criar usuário com email:', email)

    // Check if user already exists in auth.users
    const { data: existingUsers } = await supabaseAdmin.auth.admin.listUsers()
    const existingUser = existingUsers?.users?.find(u => u.email?.toLowerCase() === email.toLowerCase())

    if (existingUser) {
      console.log('Usuário já existe no auth:', existingUser.id)
      
      // Check if profile exists
      const { data: existingProfile } = await supabaseAdmin
        .from('profiles')
        .select('id')
        .eq('id', existingUser.id)
        .single()

      if (existingProfile) {
        // User and profile both exist - truly a duplicate
        throw new Error('Este usuário já está cadastrado no sistema')
      }

      console.log('Profile não existe, criando...')

      // User exists in auth but not in profiles - create profile
      const { error: profileError } = await supabaseAdmin
        .from('profiles')
        .insert({
          id: existingUser.id,
          nome,
          email,
          username: username || null
        })

      if (profileError) {
        console.error('Erro ao criar profile:', profileError)
        throw new Error('Erro ao criar perfil do usuário')
      }

      // Check if role exists
      const { data: existingRole } = await supabaseAdmin
        .from('user_roles')
        .select('id')
        .eq('user_id', existingUser.id)
        .single()

      if (!existingRole) {
        // Create role
        const { error: roleInsertError } = await supabaseAdmin
          .from('user_roles')
          .insert({
            user_id: existingUser.id,
            role
          })

        if (roleInsertError) {
          console.error('Erro ao criar role:', roleInsertError)
        }
      }

      // Update password if user exists
      const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
        existingUser.id,
        { password }
      )

      if (updateError) {
        console.error('Erro ao atualizar senha:', updateError)
      }

      return new Response(
        JSON.stringify({ success: true, user: existingUser, recovered: true }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Create new user
    const { data: userData, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { nome, role }
    })

    if (createError) {
      console.error('Erro ao criar usuário:', createError)
      throw new Error(createError.message)
    }

    console.log('Usuário criado com sucesso:', userData.user?.id)

    // Se tiver username, atualizar o profile
    if (username && userData.user) {
      await supabaseAdmin
        .from('profiles')
        .update({ username })
        .eq('id', userData.user.id)
    }

    return new Response(
      JSON.stringify({ success: true, user: userData.user }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Erro desconhecido'
    console.error('Erro na função create-user:', message)
    return new Response(
      JSON.stringify({ error: message }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
