O problema de redirecionamento intermitente geralmente ocorre por conta de uma dessincronização entre a sessão de autenticação do Supabase e o estado do perfil no banco de dados. Quando a sessão é renovada (refresh token), se houver qualquer atraso ou falha na busca do perfil (`profiles`), o sistema pode interpretar erroneamente que o usuário não está autenticado ou não tem permissões.

### Melhorias Estruturais
1.  **Refatoração do `useAuth`:**
    *   Implementar um mecanismo de persistência local mais robusto para evitar "piscadas" de deslogado durante o refresh do token.
    *   Melhorar o tratamento de erros na busca do perfil para não deslogar o usuário caso seja apenas uma falha temporária de rede.
    *   Garantir que o estado `loading` cubra todo o processo de inicialização e mudança de estado.

2.  **Proteção de Rotas no `Dashboard`:**
    *   Ajustar a lógica condicional no `src/routes/index.tsx` para garantir que a tela de `Auth` só apareça quando for confirmado que NÃO existe uma sessão ativa.

3.  **Verificação de Sessão no `Auth.tsx`:**
    *   Adicionar uma verificação imediata ao carregar o componente de login para redirecionar caso uma sessão válida já exista.

### Detalhes Técnicos
*   Utilizar `supabase.auth.onAuthStateChange` de forma mais defensiva.
*   Adicionar logs de depuração (que serão removidos após validação) para identificar o momento exato da perda de estado.
*   Garantir que o `profile` seja buscado com `retry` em caso de falha de conexão efêmera.
