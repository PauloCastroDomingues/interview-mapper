# Interview Mapper

Ferramenta interna para conduzir entrevistas de mapeamento de processos com stakeholders de diferentes áreas.

**Versão atual:** `v1.1.1`

Esta versão transforma o app em um workspace mais completo para Product Owners: modo guiado ou manual do zero, perguntas personalizadas por seção, prints colados diretamente nos campos e exportação em PDF com prompt oculto para IA.

---

## Funcionalidades

- **Nova entrevista** — formulário adaptável por área (CRM, Dados, Produto, Dev, CS, etc.)
- **Modo manual do zero** — crie entrevistas sem roteiro pronto, usando apenas suas próprias perguntas
- **Perguntas específicas por área** — ativadas com chips de seleção e orientadas para documentação de PO
- **Perguntas personalizadas** — crie perguntas próprias dentro de cada seção da entrevista
- **Prints/imagens por campo** — anexe, arraste ou cole imagens diretamente nas perguntas
- **Aba Entrevistas** — histórico completo com busca, edição e exclusão
- **Sync gratuito opcional** — backup das entrevistas em Google Sheets via Apps Script
- **Exportação em PDF com prompt oculto para IA** — o PDF fica limpo para leitura humana, mas mantém instruções internas para a IA

---

## Modelo gratuito

O projeto foi pensado para uso pessoal sem custo:

- Por padrão, tudo funciona no navegador usando `localStorage`.
- O Google Sheets é opcional e serve como backup/sync gratuito via Google Apps Script.
- Os prints/imagens ficam completos apenas no navegador local. No Google Sheets são enviados apenas os nomes das imagens, para evitar limite de célula e manter o sync leve.
- A Vercel pode hospedar o app no plano gratuito para uso pessoal.
- Se publicar o app, configure usuário e senha por variáveis de ambiente para evitar acesso público às entrevistas.

Se você não configurar `NEXT_PUBLIC_GAS_URL`, o app continua funcionando normalmente em modo local.

Importante: variáveis começando com `NEXT_PUBLIC_` ficam visíveis no navegador. Não coloque senhas, tokens, IDs privados ou segredos nelas.

---

## Stack

| Camada    | Tecnologia                      |
|-----------|---------------------------------|
| Frontend  | Next.js 16 + Tailwind CSS       |
| Armazenamento | `localStorage` (padrão) + Google Sheets gratuito (opcional) |
| Backend   | Google Apps Script (opcional)   |
| Hosting   | Vercel                          |
| Dev       | VS Code                         |

---

## Pré-requisitos

- **Node.js** 20.9+ → [nodejs.org](https://nodejs.org)
- **npm** (vem com o Node)
- **VS Code** → [code.visualstudio.com](https://code.visualstudio.com)
- Conta na **Vercel** → [vercel.com](https://vercel.com)
- Conta no **GitHub** (necessária para deploy na Vercel)

---

## 1. Configuração local

```bash
# Clone ou copie o projeto
cd interview-mapper

# Instale as dependências
npm install

# Copie o arquivo de variáveis de ambiente
cp .env.local.example .env.local

# Rode o servidor de desenvolvimento
npm run dev
```

Abra [http://localhost:3000](http://localhost:3000) no navegador.

---

## 2. Deploy na Vercel (produção)

### Opção A — Via GitHub (recomendado)

1. Crie um repositório no GitHub e faça o push do projeto:
   ```bash
   git init
   git add .
   git commit -m "feat: interview mapper inicial"
   git remote add origin https://github.com/SEU_USUARIO/interview-mapper.git
   git push -u origin main
   ```

2. Acesse [vercel.com/new](https://vercel.com/new), faça login com o GitHub.
3. Importe o repositório `interview-mapper`.
4. Clique em **Deploy** — a Vercel detecta Next.js automaticamente.
5. Em 1-2 minutos seu app estará online com URL `https://interview-mapper-xxx.vercel.app`.

### Opção B — Via CLI

```bash
npm install -g vercel
vercel login
vercel --prod
```

---

## 3. Google Apps Script (opcional — sync com Google Sheets)

Siga esses passos apenas se quiser sincronizar as entrevistas no Google Sheets além do `localStorage`.

1. Abra [script.google.com](https://script.google.com) e crie um **Novo projeto**.
2. Apague o conteúdo padrão e cole o conteúdo de `apps-script/Code.gs`.
3. Crie uma nova **Google Planilha** e copie o ID da URL:
   ```
   https://docs.google.com/spreadsheets/d/ESTE_E_O_ID/edit
   ```
4. Cole o ID no arquivo `Code.gs` na linha:
   ```js
   const SHEET_ID = 'COLE_O_ID_DA_SUA_PLANILHA_AQUI'
   ```
5. Salve o projeto (Ctrl+S).
6. Vá em **Implantar → Nova implantação**:
   - Tipo: **Aplicativo web**
   - Executar como: **Eu mesmo**
   - Quem pode acessar: **Qualquer pessoa** (necessário para o frontend chamar)
7. Clique em **Implantar** e copie a URL gerada.
8. Cole a URL no arquivo `.env.local`:
   ```
   NEXT_PUBLIC_GAS_URL=https://script.google.com/macros/s/SEU_ID/exec
   ```
9. Faça novo deploy na Vercel com a variável de ambiente configurada.

Com a URL configurada, o topo do app mostrará **Sheets ativo** e exibirá o botão **Sincronizar**.

Observação sobre imagens: para manter o uso gratuito e evitar estouro de limite do Google Sheets, o sync remoto não salva o base64 das imagens. O texto da entrevista, metadados, progresso, nomes dos anexos e resumo são sincronizados.

### Proteção do app publicado

Se o deploy ficar acessível na internet, configure também estas variáveis na Vercel:

```env
APP_BASIC_AUTH_USER=seu_usuario
APP_BASIC_AUTH_PASSWORD=uma_senha_forte
```

Com essas variáveis definidas, o app pede login/senha antes de carregar. Isso é recomendado porque entrevistas podem conter dados internos, nomes de pessoas, processos, sistemas e riscos.

Não suba arquivos `.env`, `.env.local`, `.env.production` ou similares para o GitHub. O `.gitignore` já bloqueia esses arquivos; mantenha apenas `.env.local.example` público.

---

## 4. Estrutura do projeto

```
interview-mapper/
├── src/
│   ├── app/
│   │   ├── page.js          # Roteador de abas (Nova entrevista | Entrevistas)
│   │   ├── layout.js        # Layout raiz com metadados
│   │   └── globals.css      # Estilos globais + Tailwind
│   ├── components/
│   │   ├── InterviewForm.jsx  # Formulário principal
│   │   ├── InterviewList.jsx  # Lista de entrevistas salvas
│   │   └── QuestionCard.jsx   # Card individual com notas + imagens
│   └── lib/
│       ├── questions.js       # Perguntas fixas, por área e personalizadas
│       ├── storage.js         # CRUD no localStorage
│       └── exportUtils.js     # Geração do PDF com prompt de IA
├── apps-script/
│   └── Code.gs              # Backend opcional (Google Sheets)
├── .env.local.example
├── next.config.mjs
├── tailwind.config.js
├── vercel.json
└── package.json
```

---

## 5. Como adicionar novas perguntas ou áreas

Durante a entrevista, use o bloco **Pergunta personalizada** dentro da seção ativa para criar perguntas livres sem editar código.

Se quiser começar completamente do zero, selecione **Manual do zero** no topo do formulário. Nesse modo, as perguntas prontas e perguntas por área ficam ocultas, e a entrevista usa apenas as perguntas que você criar.

**Novas perguntas fixas no produto** → edite `src/lib/questions.js`, array `SECTIONS`, na seção correspondente:
```js
{
  id: 'dados-nome-estavel-da-pergunta',
  q: 'Sua nova pergunta aqui?',
  hint: 'Dica para o entrevistador.',
}
```

**Nova área** → adicione em `AREAS` e em `AREA_QUESTIONS`:
```js
// Em AREAS:
{ id: 'juridico', label: 'Jurídico' },

// Em AREA_QUESTIONS:
juridico: [
  {
    id: 'juridico-dados-contratos',
    section: 'dados',
    q: 'Quais dados são envolvidos em contratos?',
    hint: '...',
  },
]
```

Use IDs estáveis e únicos. Eles evitam que entrevistas antigas percam o vínculo correto caso a ordem das perguntas mude.

---

## 6. O PDF com prompt de IA

Quando você clica em **Exportar PDF com prompt de IA**, o app abre uma versão imprimível da entrevista. No diálogo do navegador, escolha **Salvar como PDF**.

O PDF não mostra o prompt como uma seção visual. As instruções ficam embutidas de forma discreta no arquivo para orientar a leitura da IA sem poluir o documento para pessoas.

O prompt orienta a IA a analisar o material como Product Owner sênior e entregar:

1. Resumo executivo do processo
2. Escopo do mapeamento e objetivo do PO
3. Fluxo AS-IS passo a passo com atores, sistemas, entradas, saídas e decisões
4. Regras de negócio, exceções, SLAs, thresholds e aprovações
5. Dados, integrações, fontes de verdade e restrições de acesso
6. Leitura das evidências visuais anexadas
7. Riscos classificados por impacto, probabilidade, evidência e mitigação
8. Oportunidades priorizadas por impacto, esforço e urgência
9. Backlog sugerido com histórias de usuário e critérios de aceite
10. Perguntas em aberto e próximos passos para o PO

---

## 7. Extensões recomendadas para VS Code

Crie `.vscode/extensions.json` com:
```json
{
  "recommendations": [
    "bradlc.vscode-tailwindcss",
    "esbenp.prettier-vscode",
    "dbaeumer.vscode-eslint"
  ]
}
```

---

## Licença

Uso interno. Adapte à vontade.
