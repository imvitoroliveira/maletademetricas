Identifiquei dois problemas reais e objetivos no fluxo atual:

1. **Erro de conexão com o backend:** a tabela `profiles` está com uma política que consulta a própria tabela `profiles`, causando recursão infinita. Isso aparece como `infinite recursion detected in policy for relation "profiles"` e quebra a leitura de perfis.
2. **Credenciais inválidas:** a conta existe e está ativa, mas a senha salva no provedor de autenticação não está autenticando com a senha fornecida. As tentativas chegam corretamente ao backend, então o problema não é o botão nem a URL de conexão.

Também há problemas estruturais que precisam ser limpos:
- O app consulta `profiles` no próprio formulário de login apenas para testar conexão, mas isso dispara RLS antes do usuário estar autenticado.
- O hook `useAuth` usa `await` dentro de `onAuthStateChange`, padrão que pode travar ou causar corrida de estado.
- Existem permissões de gestor em `profiles.is_admin`, mas a regra segura é usar uma tabela separada de roles.
- O botão de magic link não funciona porque OTP está desativado, então ele deve ser removido ou não usado como solução.
- A navegação lateral aponta para rotas que não existem (`/perfil`, `/campanhas`, `/configuracoes`), podendo criar confusão depois do login.

### Plano de correção definitiva

1. **Corrigir o backend de autenticação e permissões**
   - Remover as políticas recursivas que consultam `profiles` dentro de políticas de `profiles`, `custom_metrics` e `client_permissions`.
   - Criar uma tabela segura `user_roles` com enum `app_role`, conforme padrão recomendado, para separar cargo/permissão do perfil.
   - Criar a função segura `has_role(user_id, role)` com `SECURITY DEFINER`, evitando recursão em RLS.
   - Inserir os dois gestores como `admin` em `user_roles`.
   - Recriar políticas simples:
     - Usuário autenticado lê seu próprio perfil.
     - Admin lê perfis de todos.
     - Admin gerencia permissões/clientes/métricas.
     - Cliente acessa apenas seus próprios dados.
   - Recriar o trigger de criação automática de perfil/role para novos usuários, pois hoje a função existe mas não há trigger instalado.

2. **Resetar corretamente os usuários gestores**
   - Recriar/atualizar as contas dos gestores via migração de forma consistente.
   - Confirmar e-mail, provider e senha.
   - Fixar a senha principal com uma senha segura para `ovitoroliveira60@gmail.com`.
   - Garantir `equipeanalisescia@gmail.com` como gestor ativo também.

3. **Refatorar o hook `useAuth`**
   - Configurar `onAuthStateChange` antes da verificação inicial da sessão.
   - Remover `await` dentro do callback de `onAuthStateChange`.
   - Usar `getSession()` para hidratação inicial e buscar perfil depois que a sessão estiver disponível.
   - Expor estados claros: `initializing`, `authenticated`, `unauthenticated`, `profile`, `role`, `authLogs`.
   - Não deslogar o usuário por falha temporária de leitura de perfil; mostrar erro controlado.

4. **Limpar o formulário de login**
   - Remover a consulta `profiles.select(id).limit(1)` usada como teste de conexão, pois ela causava falso erro e acionava RLS sem sessão.
   - Trocar o diagnóstico para testar apenas `getSession()` e registrar erros do login real.
   - Remover o botão de magic link enquanto OTP estiver desativado.
   - Manter validação de e-mail/senha, normalização de e-mail e mensagens claras.

5. **Ajustar o guard do dashboard**
   - O dashboard só renderiza após sessão e perfil carregados.
   - Se não houver sessão, exibe login.
   - Se houver sessão mas perfil ausente/inativo, exibe tela de erro/conta suspensa com logout.
   - Se não for gestor ativo, bloquear áreas administrativas.

6. **Corrigir navegação e múltiplas instâncias de auth**
   - Evitar chamadas duplicadas de `useAuth` em `DashboardLayout` que podem criar listeners extras.
   - Passar dados de autenticação por props ou contexto do dashboard para o layout.
   - Remover links para rotas inexistentes ou transformá-los em abas internas existentes.

7. **Validar**
   - Verificar políticas do banco após migração para confirmar que não há mais recursão.
   - Testar hash/senha do gestor com consulta de validação no banco.
   - Validar logs de autenticação após tentativa de login.
   - Confirmar que o login não depende de reload forçado e que o dashboard carrega pelo estado da sessão.

Essa correção remove os remendos anteriores e resolve a causa raiz: regras de acesso recursivas, conta/senha inconsistentes e fluxo de sessão com race condition.