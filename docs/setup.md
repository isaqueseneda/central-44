# Central 44 — Guia de Instalação

Guia passo a passo pra rodar o sistema no seu computador.

---

## O que você precisa instalar antes

### 1. Node.js (v20 ou superior)

Abra o Terminal e rode:

```bash
node -v
```

Se não tiver instalado ou a versão for menor que 20, instale com o Homebrew:

```bash
brew install node
```

> Se não tiver o Homebrew: acesse [brew.sh](https://brew.sh) e copie o comando de instalação.

### 2. Git

Provavelmente já está instalado. Teste com:

```bash
git -v
```

Se não tiver:

```bash
brew install git
```

---

## Passo 1 — Clonar o projeto

```bash
cd ~/Desktop
git clone https://github.com/isaqueseneda/central-44.git
cd central-44
```

Agora você tem uma cópia do projeto no seu Desktop.

---

## Passo 2 — Instalar dependências

```bash
npm install
```

Isso baixa todas as bibliotecas que o projeto usa. Vai demorar 1-2 minutos na primeira vez.

---

## Passo 3 — Configurar o arquivo `.env`

O arquivo `.env` contém as senhas e chaves do sistema. Ele **não** vai junto com o código no GitHub (por segurança), então você precisa criar ele manualmente.

```bash
cp .env.example .env
```

Agora abra o arquivo `.env` e preencha os valores. O Isaque vai te mandar as chaves por mensagem.

Os campos obrigatórios são:

| Campo                 | O que é                                      | De onde vem          |
| --------------------- | -------------------------------------------- | -------------------- |
| `DATABASE_URL`        | Conexão com o banco de dados na nuvem (Neon) | Isaque te manda      |
| `GOOGLE_MAPS_API_KEY` | Mapa das lojas                               | Google Cloud Console |
| `OPENROUTER_API_KEY`  | Assistente IA do sidebar                     | openrouter.ai        |

Os campos do Google OAuth (`GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`) só são necessários se quiser usar a importação do Google Drive.

Os campos do Notion (`NOTION_*`) são opcionais — eram usados na migração inicial.

---

## Passo 4 — Gerar o cliente do banco de dados

```bash
npx prisma generate
```

Isso cria as classes TypeScript que o sistema usa pra acessar o banco.

---

## Passo 5 — Rodar o sistema

```bash
npm run dev
```

Abra no navegador: **http://localhost:3000**

Pra parar o sistema, aperte `Ctrl + C` no terminal.

---

## Resumo rápido (depois que tudo já estiver configurado)

Da próxima vez, basta:

```bash
cd ~/Desktop/central-44
npm run dev
```

---

## Atualizando o sistema

Quando o Isaque fizer alterações, você pega as mudanças assim:

```bash
cd ~/Desktop/central-44
git pull
npm install
npx prisma generate
npm run dev
```

---

## Sobre o banco de dados

O banco de dados roda na **nuvem** (Neon PostgreSQL). Isso significa:

- ✅ **Você NÃO precisa instalar PostgreSQL** no seu computador
- ✅ Os dados são os mesmos pra todo mundo — se você adicionar uma OS, o Isaque vê na hora
- ✅ Backups automáticos são feitos pelo Neon
- ⚠️ Precisa de internet pra usar o sistema

O banco fica em: [console.neon.tech](https://console.neon.tech)

---

## Problemas comuns

### "command not found: node"

Instale o Node.js: `brew install node`

### "command not found: git"

Instale o Git: `brew install git`

### A página não carrega (localhost:3000)

1. Verifique se o terminal está rodando `npm run dev`
2. Espere uns 5-10 segundos depois de rodar o comando
3. Tente `http://localhost:3000` no navegador

### "Error: Environment variable not found: DATABASE_URL"

Você esqueceu de criar o arquivo `.env`. Veja o Passo 3.

### "Can't reach database server"

1. Verifique se você tem internet
2. Confira se o `DATABASE_URL` no `.env` está correto

### Erro de versão do Prisma

Rode: `npx prisma generate`

### Porta 3000 ocupada

```bash
lsof -ti :3000 | xargs kill -9
npm run dev
```
