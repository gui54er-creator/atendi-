# Atendi+ — Gestão de Atendimentos

Sistema web completo para gestão de pacientes, prontuários, agenda e financeiro,
voltado a profissionais e empresas que realizam atendimentos individuais
(clínicas, consultórios, terapeutas, esteticistas, etc).

## Stack

| Camada | Tecnologia |
|---|---|
| Framework | Next.js 14 (App Router) + TypeScript |
| UI | Tailwind CSS + shadcn/ui (Radix Primitives) |
| Banco de dados | PostgreSQL |
| ORM | Prisma |
| Autenticação | NextAuth.js (Credentials) + bcrypt |
| Validação | Zod + react-hook-form |
| Agenda | react-big-calendar (com drag-and-drop) |
| Gráficos | Recharts |
| Notificações visuais | Sonner (toasts) |

## Arquitetura

- **Multi-tenant por empresa**: todo dado sensível (`Patient`, `Appointment`,
  `Transaction`, `PatientFile`...) carrega `companyId`. O helper
  `requireApiContext()` (`src/lib/auth/session.ts`) resolve o usuário logado +
  a empresa ativa (via cookie próprio, independente do JWT) e é o único ponto
  de entrada usado pelas rotas de API — nenhuma query confia em `companyId`
  vindo do client.
- **Permissões centralizadas**: papéis `OWNER / ADMIN / PROFESSIONAL /
  RECEPTIONIST` e a matriz de capacidades vivem em `src/lib/permissions.ts`.
  Toda checagem de acesso no app (páginas, API routes, itens de menu) passa
  pela função `can()` — não há verificações de role espalhadas pelo código.
- **Recorrência de agenda**: a regra fica em `AppointmentSeries`; as
  ocorrências reais são materializadas como registros `Appointment`
  (`src/lib/scheduling/recurrence.ts`) numa janela rolante de 6 meses para
  séries indefinidas. Editar/excluir pergunta o escopo (este / este e os
  próximos / toda a série).
- **Conflitos de horário**: `src/lib/scheduling/conflicts.ts` detecta
  sobreposição de horário por profissional antes de criar/mover um
  atendimento; a UI pede confirmação para prosseguir mesmo assim.
- **Auditoria**: `src/lib/audit.ts` registra ações sensíveis (paciente
  criado/alterado, prontuário atualizado, arquivo adicionado, lançamento
  financeiro...) com usuário, data/hora e o registro afetado. Visível em
  Configurações → Auditoria (Proprietário/Admin).
- **Arquivos de pacientes**: nunca ficam em `/public`. São salvos fora da
  pasta pública, sob uma chave não previsível, e só são servidos por
  `/api/files/[id]`, que valida sessão + empresa + permissão antes de
  devolver os bytes. Fisicamente ficam no Cloudflare R2 (se configurado) ou
  na tabela `FileBlob` do próprio Postgres/Neon (fallback padrão — ver
  `src/lib/storage.ts`), nunca em disco local, para persistir e sincronizar
  entre dispositivos mesmo em produção na Netlify.

## Estrutura do projeto

```
prisma/
  schema.prisma        modelo de dados completo
  seed.ts               dados de demonstração
src/
  app/
    (auth)/              login, registro, recuperação de senha
    onboarding/company/   cadastro da empresa (primeiro acesso)
    (app)/                área logada (sidebar + topbar)
      dashboard/
      patients/           lista, wizard de cadastro, ficha do paciente
      agenda/              calendário, recorrência, conflitos
      financial/           receitas, despesas, filtros por período
      notifications/
      settings/            perfil, empresa, agenda, financeiro, usuários, auditoria
    api/                  todas as rotas de mutação/consulta
  components/
    ui/                   primitivos shadcn/ui
    layout/                sidebar, topbar, busca global, notificações
    forms/                 campos reutilizáveis (endereço, upload, campo personalizado)
  lib/
    auth/                  NextAuth + resolução de contexto multi-tenant
    scheduling/             recorrência e detecção de conflito
    validations/            schemas Zod por domínio
    permissions.ts, audit.ts, notifications.ts, storage.ts, dashboard.ts
```

## Como rodar localmente

### 1. Pré-requisitos

- Node.js 20+
- PostgreSQL 14+ (local ou remoto)

### 2. Instalar dependências

```bash
npm install
```

### 3. Configurar variáveis de ambiente

Copie `.env.example` para `.env` e ajuste:

```bash
cp .env.example .env
```

| Variável | Descrição |
|---|---|
| `DATABASE_URL` | String de conexão do PostgreSQL (recomendado: um projeto grátis no [Neon](https://neon.tech), para os dados ficarem na nuvem) |
| `NEXTAUTH_SECRET` | Valor aleatório (`openssl rand -base64 32`) usado para assinar sessões |
| `NEXTAUTH_URL` | URL base da aplicação (`http://localhost:3000` em dev) |
| `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET_NAME` | Credenciais do bucket [Cloudflare R2](https://dash.cloudflare.com) usado para armazenar uploads |
| `R2_PUBLIC_URL` | URL pública do bucket R2, usada apenas para logos/avatares |
| `MAX_UPLOAD_SIZE_MB` | Tamanho máximo de upload, em MB |

Veja [Rodando com os mesmos dados no PC e no celular](#rodando-com-os-mesmos-dados-no-pc-e-no-celular) para o passo a passo de criar o banco e o bucket.

### 4. Rodar as migrations

```bash
npx prisma migrate dev
```

### 5. Popular dados de demonstração (opcional, recomendado)

```bash
npm run db:seed
```

Isso cria uma empresa fictícia ("Atendi+ Saúde Integrada") com 10 pacientes
(incluindo um menor de idade com responsável), atendimentos passados e
futuros, dois pacientes com atendimentos recorrentes, receitas/despesas dos
últimos 6 meses e pagamentos pendentes — o dashboard, a agenda, os pacientes e
o financeiro já aparecem funcionando.

O script imprime os logins de demonstração ao final:

```
Proprietário:   demo@atendiplus.com.br / Demo1234
Profissional:   profissional@atendiplus.com.br / Demo1234
Recepcionista:  recepcao@atendiplus.com.br / Demo1234
```

O seed é idempotente: rodar de novo remove e recria apenas os dados
vinculados a esses três e-mails, sem afetar outras contas criadas manualmente.

### 6. Iniciar o servidor de desenvolvimento

```bash
npm run dev
```

Acesse [http://localhost:3000](http://localhost:3000).

### Outros comandos úteis

```bash
npm run build          # build de produção
npm run start           # roda o build de produção
npm run typecheck       # checagem de tipos
npm run prisma:studio   # navegador visual do banco de dados
```

## Fluxo de uso

1. Criar conta → login automático.
2. Cadastrar a empresa (obrigatório no primeiro acesso).
3. Cadastrar um paciente pelo wizard (dados pessoais → contato → endereço →
   responsável, se menor de idade → ficha inicial → revisão).
4. Abrir a Agenda, clicar num horário vazio e criar um atendimento —
   opcionalmente recorrente.
5. Abrir o atendimento a partir da aba "Atendimentos" do paciente: adicionar
   anotações de evolução, registrar valor e forma de pagamento.
6. O lançamento financeiro criado aparece automaticamente em Financeiro e no
   Dashboard.

## Limitações conhecidas (implementadas de forma honesta, não simuladas)

Estes pontos estão sinalizados no próprio código com comentários explicando o
que falta para produção:

- **Envio de e-mail**: não há provedor SMTP/transacional configurado. Os
  fluxos de "esqueci minha senha" e "convidar usuário" geram o link real e o
  registram no console do servidor (e o devolvem na resposta, apenas em
  desenvolvimento) em vez de enviá-lo por e-mail. Integrar um provedor
  (Resend, SES, Postmark) é o único passo que falta.
- **Notificações por WhatsApp/SMS**: a estrutura já separa "criar
  notificação" de "entregá-la" (`src/lib/notifications.ts`), pronta para
  plugar um canal adicional, mas hoje só existe o canal in-app.
- **Notificações "do dia"**: como não há um worker/cron neste ambiente, os
  lembretes de "atendimentos de hoje" e "pagamentos pendentes" são gerados
  sob demanda quando o Dashboard é carregado (de forma idempotente, uma vez
  por dia). Em produção, isso deveria rodar num job agendado independente de
  alguém abrir o app.
- **Escopo de dados por profissional**: o papel "Profissional" hoje enxerga
  todos os pacientes/agenda da empresa, não apenas os "seus". O modelo já
  suporta essa extensão (bastaria um campo de profissional responsável em
  `Patient` e um filtro adicional nas queries), mas não foi implementada
  nesta versão.
- **Armazenamento de arquivos**: `src/lib/storage.ts` usa um bucket
  Cloudflare R2 (S3-compatível) quando as variáveis `R2_*` estão
  configuradas. **Elas são opcionais e estão desativadas por padrão** — sem
  elas, o app grava os bytes na tabela `FileBlob` do próprio Postgres/Neon,
  que já é compartilhado entre dispositivos e sobrevive normalmente ao
  ambiente serverless da Netlify (diferente do antigo fallback em disco
  local, que foi removido por não persistir em produção). Arquivos pequenos
  (fotos/PDFs, limitados por `MAX_UPLOAD_SIZE_MB`) cabem bem nesse modelo;
  configure o R2 quando o volume de uploads justificar um object storage
  dedicado — os arquivos já salvos no Postgres continuam funcionando
  normalmente depois da migração.

## Mesmos dados no PC e no celular (nuvem)

Para PC e celular sempre verem os mesmos pacientes, agenda e arquivos, o
banco de dados e o armazenamento de arquivos precisam estar na nuvem:

1. **Banco de dados**: crie um projeto Postgres gratuito em
   [Neon](https://neon.tech), copie a connection string e coloque em
   `DATABASE_URL`. Rode `npx prisma migrate deploy` uma vez para criar as
   tabelas nesse banco.
2. **Armazenamento de arquivos** (opcional): sem nenhuma configuração
   adicional, fotos e documentos já ficam salvos no Postgres/Neon e
   aparecem em qualquer dispositivo (ver seção acima). Para usar um object
   storage dedicado, crie um bucket no
   [Cloudflare R2](https://dash.cloudflare.com) (grátis até 10GB), gere um
   token de API com acesso de leitura/escrita e preencha `R2_ACCOUNT_ID`,
   `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY` e `R2_BUCKET_NAME`. Ative
   "Public Access" no bucket para obter a `R2_PUBLIC_URL` (usada só para
   logos/avatares — arquivos de pacientes continuam privados, servidos por
   rota autenticada).

## Publicando na Netlify

O repositório já tem `netlify.toml` configurado com o
[`@netlify/plugin-nextjs`](https://github.com/netlify/next-runtime), que dá
suporte a SSR, API routes e tudo que o Next.js 14 usa aqui — não precisa de
`output: "export"` nem de nenhuma mudança no código.

1. No painel da Netlify: **Add new site > Import an existing project**,
   conecte este repositório Git. Build command e publish directory já vêm
   do `netlify.toml` — não precisa preencher nada manualmente.
2. Em **Site settings > Environment variables**, cadastre no mínimo
   `DATABASE_URL` (a connection string do Neon), `NEXTAUTH_SECRET`,
   `NEXTAUTH_URL` e `MAX_UPLOAD_SIZE_MB`. As variáveis `R2_*` são
   opcionais — sem elas o app builda e funciona normalmente, incluindo
   upload de fotos/documentos (armazenados no Postgres — ver seção acima);
   adicione-as depois para migrar para um object storage dedicado.
3. `NEXTAUTH_URL` precisa ser a URL final do site na Netlify (ex:
   `https://atendiplus.netlify.app` ou o domínio customizado), sem barra no
   final. Se você não sabe a URL antes do primeiro deploy, faça um deploy
   inicial, copie a URL gerada, cadastre `NEXTAUTH_URL` com ela e dispare
   um novo deploy (**Deploys > Trigger deploy**) para a variável valer.
4. O comando de build (`prisma generate && prisma migrate deploy && next
   build`, já configurado em `package.json`) roda as migrations pendentes
   contra o banco apontado por `DATABASE_URL` automaticamente a cada
   deploy — não é preciso rodar `prisma migrate deploy` manualmente. Ele só
   aplica migrations novas (nunca apaga dados existentes), então é seguro
   rodar a cada deploy.

Depois disso, o app fica acessível por uma URL pública — abre igual no PC e
no celular, de qualquer rede, sem precisar do PC ligado.

## Segurança e LGPD

- Senhas com hash bcrypt (custo 12), nunca armazenadas em texto plano.
- Sessões via NextAuth (JWT assinado).
- Todas as rotas de API validam autenticação **e** pertencimento à empresa
  antes de tocar em qualquer dado — não é possível acessar paciente, agenda,
  arquivo ou financeiro de outra empresa alterando IDs na URL.
- Entradas validadas com Zod tanto no formulário (client) quanto na rota de
  API (server) — o client nunca é a única barreira.
- Arquivos de pacientes servidos por rota autenticada, com nomes internos
  não previsíveis (UUID), nunca expostos diretamente por `/public`.
- Exclusões de paciente, atendimento, arquivo e lançamento financeiro são
  *soft delete* (`deletedAt`), preservando o histórico para auditoria.
- Log de auditoria para as ações sensíveis descritas acima.
