import { createClient } from '@supabase/supabase-js'
import fs from 'fs'

const supabaseUrl = process.env.EXT_SUPABASE_URL
const supabaseServiceKey = process.env.EXT_SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Erro: Variáveis EXT não encontradas.')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function fix() {
  console.log('Lendo migration...')
  const sql = fs.readFileSync('complete_migration.sql', 'utf8')
  
  // Como não temos um endpoint direto de RPC para rodar SQL arbitrário (a menos que já exista um),
  // e o usuário já tem o arquivo, vou apenas verificar se as tabelas existem.
  // Se não existem, o problema é que o usuário NÃO rodou o script no SQL Editor.
  
  const { error: checkError } = await supabase.from('profiles').select('id').limit(1)
  
  if (checkError && checkError.message.includes('relation "public.profiles" does not exist')) {
    console.log('CONFIRMADO: As tabelas não existem no banco de dados.')
    console.log('O usuário precisa rodar o script SQL no painel do Supabase.')
  } else if (checkError) {
    console.log('Outro erro ao acessar profiles:', checkError.message)
  } else {
    console.log('As tabelas parecem existir agora.')
  }
}

fix()
