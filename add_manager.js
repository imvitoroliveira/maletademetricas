import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.EXT_SUPABASE_URL
const supabaseServiceKey = process.env.EXT_SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Erro: Variáveis de ambiente EXT_SUPABASE_URL ou EXT_SUPABASE_SERVICE_ROLE_KEY não configuradas.')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

const email = 'ovitoroliveira60@gmail.com'
const password = '1864481'

async function addManager() {
  console.log(`Tentando criar/atualizar gestor: ${email}`)

  // 1. Verificar se o usuário já existe no Auth
  const { data: { users }, error: listError } = await supabase.auth.admin.listUsers()
  if (listError) {
    console.error('Erro ao listar usuários:', listError.message)
    process.exit(1)
  }

  let user = users.find(u => u.email === email)

  if (!user) {
    console.log('Usuário não encontrado. Criando novo usuário no Auth...')
    const { data: { user: newUser }, error: createError } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { role: 'admin' }
    })

    if (createError) {
      console.error('Erro ao criar usuário:', createError.message)
      process.exit(1)
    }
    user = newUser
    console.log('Usuário criado com sucesso. ID:', user.id)
  } else {
    console.log('Usuário já existe no Auth. ID:', user.id)
    // Atualizar senha se necessário
    const { error: updateError } = await supabase.auth.admin.updateUserById(user.id, {
      password,
      email_confirm: true
    })
    if (updateError) {
      console.warn('Aviso ao atualizar senha:', updateError.message)
    }
  }

  // 2. Garantir que o perfil tenha is_admin = true
  const { error: profileError } = await supabase
    .from('profiles')
    .upsert({ 
      id: user.id, 
      email: email, 
      is_admin: true,
      is_active: true 
    }, { onConflict: 'id' })

  if (profileError) {
    console.error('Erro ao atualizar perfil:', profileError.message)
  } else {
    console.log('Perfil atualizado com sucesso (is_admin = true).')
  }

  // 3. Adicionar o papel 'admin' na tabela user_roles
  const { error: roleError } = await supabase
    .from('user_roles')
    .upsert({ 
      user_id: user.id, 
      role: 'admin' 
    }, { onConflict: 'user_id,role' })

  if (roleError) {
    console.error('Erro ao atribuir papel de admin:', roleError.message)
  } else {
    console.log('Papel de admin atribuído com sucesso.')
  }

  console.log('\n--- Processo concluído com sucesso! ---')
}

addManager()
