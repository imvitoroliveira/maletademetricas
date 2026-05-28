import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.EXT_SUPABASE_URL
const supabaseServiceKey = process.env.EXT_SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Erro: Variáveis EXT não encontradas.')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function check() {
  const { data: { users }, error } = await supabase.auth.admin.listUsers()
  if (error) {
    console.error('Erro ao listar usuários:', error.message)
    process.exit(1)
  }
  
  console.log('Total de usuários:', users.length)
  const target = users.find(u => u.email === 'ovitoroliveira60@gmail.com')
  if (target) {
    console.log('Usuário encontrado:', target.email, 'ID:', target.id)
    
    // Check profile
    const { data: profile, error: pErr } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', target.id)
      .maybeSingle()
      
    if (pErr) console.error('Erro no perfil:', pErr.message)
    else console.log('Perfil no DB:', profile)
    
    // Check roles
    const { data: roles, error: rErr } = await supabase
      .from('user_roles')
      .select('*')
      .eq('user_id', target.id)
      
    if (rErr) console.error('Erro na role:', rErr.message)
    else console.log('Roles no DB:', roles)
  } else {
    console.log('Usuário ovitoroliveira60@gmail.com NÃO encontrado no Auth.')
  }
}

check()
