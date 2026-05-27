import { createClient } from '@supabase/supabase-js'
import fs from 'fs'

async function run() {
  const supabaseUrl = process.env.EXT_SUPABASE_URL
  const supabaseKey = process.env.EXT_SUPABASE_SERVICE_ROLE_KEY
  const supabase = createClient(supabaseUrl, supabaseKey)

  const sql = fs.readFileSync('complete_migration.sql', 'utf8')
  
  // O Supabase tem uma limitação no tamanho do payload. 
  // Vamos tentar rodar o SQL em blocos ou usar o rpc(exec_sql) que criamos (se o usuário nos deu acesso service_role).
  
  console.log('Enviando SQL de migração para o novo projeto...');
  
  // Tentativa 1: Via RPC customizada
  const { error } = await supabase.rpc('exec_sql', { query: sql })
  
  if (error) {
    console.error('Erro ao rodar migração via RPC:', error)
    // Se falhar por tamanho, vamos tentar dividir o arquivo
    process.exit(1)
  }
  
  console.log('Migração concluída com sucesso no novo projeto!')
}

run()
