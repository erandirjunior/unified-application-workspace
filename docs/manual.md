# Unified Application Workspace — Manual do Usuário

## Visão Geral

Unified Application Workspace é uma ferramenta completa para desenvolvimento, teste e documentação de APIs. Ele combina testes de carga, workflows de automação, mock server e geração de documentação em uma única interface.

---

## 1. Coleções

### O que são Coleções?

Coleções são containers que agrupam suas requests (actions), workflows e mocks. Cada coleção possui seus próprios ambientes de variáveis.

### Gerenciamento de Coleções

- **Criar**: Clique em "Nova Coleção" no dashboard principal e dê um nome.
- **Importar**: Importe uma coleção existente via arquivo JSON.
- **Exportar**: Exporte toda a coleção (ou itens selecionados) para JSON.
- **Renomear**: Clique no nome da coleção no dashboard para editá-lo.
- **Reordenar**: Use as setas ↑ ↓ para reorganizar a ordem das coleções.
- **Excluir**: Botão de excluir remove a coleção e todo seu conteúdo.

### Navegação

Clique em "Gerenciar Coleção →" para entrar no workspace da coleção, onde você acessa as abas Actions, Workflow e Mocks.

---

## 2. Actions (HTTP Requests)

### Criar uma Action

1. Dentro de uma coleção, clique no botão **"+ Action"** na sidebar.
2. Preencha: Método (GET, POST, PUT, DELETE, PATCH), URL e nome.
3. A action aparece na sidebar esquerda.

### Organização

- **Pastas**: Crie pastas para agrupar actions. Arraste actions entre pastas via drag-and-drop.
- **Reordenar**: Use setas ↑ ↓ ou drag-and-drop na sidebar.
- **Busca**: Use o campo de pesquisa para filtrar actions pelo nome ou URL.

### Importar via cURL

Clique em **"cURL"** na sidebar e cole um comando cURL completo. O sistema extrai automaticamente método, URL, headers, body e autenticação.

---

## 3. Configuração de Requests

### URL e Método

Selecione o método HTTP e insira a URL. Suporta variáveis de ambiente com a sintaxe `{{variavel}}`.

### Headers

Adicione headers em formato chave-valor. Headers de autenticação são injetados automaticamente conforme o tipo de auth configurado.

### Autenticação

Tipos suportados:
- **Bearer Token**: Insere `Authorization: Bearer <token>` automaticamente.
- **Basic Auth**: Codifica usuário:senha em Base64.
- **API Key**: Adiciona um header customizado com a chave/valor.

### Body (Corpo da Requisição)

Tipos de body suportados:
- **JSON**: Editor com formatação automática e sincronização de campos.
- **Form Data**: Campos chave-valor com suporte a arquivos.
- **XML**: Editor de texto livre.
- **Form URL Encoded**: Pares chave=valor.
- **Plain Text**: Texto livre.
- **Arquivo Binário**: Upload de arquivo.

### Asserções (Validações)

Adicione validações que serão verificadas automaticamente após cada execução:
- **Source**: Status, Body ou Header.
- **Operadores**: ==, !=, contains, exists, not_exists, >, >=, <, <=.
- **Property**: Caminho JSON (ex: `user.id`), nome do header, etc.

### Extrações (Variáveis)

Extraia valores da resposta e salve em variáveis para uso em requests subsequentes:
- **Source**: Body ou Header.
- **Property**: Caminho JSON ou nome do header.
- **Nome da Variável**: Nome pelo qual será referenciado com `{{varName}}`.

---

## 4. Modos de Teste

O sistema suporta dois modos de execução distintos, selecionáveis via toggle no painel de configuração:

#### Modo RPS

Dispara um número fixo de requisições por segundo, independente do tempo de resposta do servidor. Use este modo para validar se sua API aguenta um throughput específico.

- **Requests por Segundo (RPS)**: Quantas requisições por segundo serão disparadas.
- **Duração**: Tempo total do teste em segundos.
- **Ramp-up**: Tempo de aquecimento gradual (começa lento e aumenta até o RPS alvo).

#### Modo Workers

Mantém N conexões simultâneas (threads) disparando continuamente. Cada worker envia uma requisição, aguarda a resposta, e imediatamente envia a próxima. Use este modo para saturar o sistema alvo e forçar o autoscaling.

- **Workers (Threads)**: Número de conexões simultâneas mantidas ativas.
- **Duração**: Tempo total do teste em segundos.
- **Ramp-up**: Tempo para adicionar workers gradualmente (ex: 100 workers com ramp-up de 10s adiciona ~10 workers/segundo).

#### Quando usar cada modo

| Modo      | Responde à pergunta                           |
|-----------|-----------------------------------------------|
| RPS       | "Minha API aguenta 500 req/s?"                |
| Workers   | "O que acontece quando o sistema é saturado?" |

**Diferença fundamental**: No modo RPS, requisições podem dar timeout no load balancer se o servidor não acompanhar — os pods podem não receber toda a carga. No modo Workers, cada conexão mantém uma requisição real ativa no pod, consumindo CPU/memória de fato e acionando o HPA.

### Configuração Técnica

Cada worker no modo Workers utiliza seu próprio HTTP client dedicado com timeout de 30 segundos, evitando contenção no pool de conexões.

### Capturar Body da Resposta

A opção **"Capturar body da resposta"** está disponível em ambos os modos. Quando habilitada, o body completo da resposta (até 64KB) é armazenado nos logs. Desabilitá-la melhora o throughput em testes de estresse, pois os workers gastam menos tempo por requisição.

### Execução

Clique em **"EXECUTAR TESTE"** para iniciar. O painel de execução (à direita) mostra em tempo real:
- Log de cada request com status, tempo de resposta e corpo.
- Gráfico de threads ativas.
- Contadores de sucesso/erro (atualizados em tempo real).
- RPS médio calculado a partir do throughput real.

### Parar Teste

Clique em **"Parar Teste"** para interromper imediatamente. O relatório parcial é gerado.

### Execução Única (Single Run)

Execute uma request uma única vez para validar rapidamente sem carga.

---

## 5. Workflows

### O que são Workflows?

Workflows permitem encadear múltiplas requests em sequência, com suporte a:
- **Execução Sequencial**: Steps executados um após o outro.
- **Execução Paralela**: Grupo de requests disparadas simultaneamente.
- **Loops**: Repete steps enquanto uma condição for verdadeira.
- **Condições (If/Else)**: Executa branches diferentes baseado em condições.
- **Wait (Pausa)**: Aguarda N segundos entre steps.

### Criar um Workflow

1. Na aba **Workflow**, clique em **"+ Workflow"**.
2. Use o painel de ferramentas à esquerda para adicionar steps.
3. Configure cada step clicando em **"Editar →"**.

### Tipos de Steps

| Tipo | Descrição |
|------|-----------|
| Action | Request HTTP individual com configuração de carga |
| Parallel | Grupo de requests executadas ao mesmo tempo |
| Loop | Repete steps internos enquanto condição for true |
| If/Else | Branching condicional baseado em resposta anterior |
| Wait | Pausa por N segundos |
| Copiar | Copia uma action existente da coleção |

### Condições (Loop e If/Else)

Configure condições baseadas em:
- **Status**: Código HTTP da última resposta.
- **Body**: Valor de um campo JSON da resposta.
- **Header**: Valor de um header da resposta.
- **Variável**: Valor de uma variável extraída.

Operadores: ==, !=, contains, exists, not_exists, >, >=, <, <=.

Combine múltiplas condições com lógica **AND** ou **OR**.

### Navegação Drill-Down

Clique em **"Editar →"** em um grupo (Parallel, Loop) para navegar para dentro e gerenciar seus sub-steps. Use o breadcrumb para voltar.

### Visualizações

- **Lista**: Visão sequencial dos steps com ações de reordenar/editar/excluir.
- **Fluxograma**: Representação visual SVG com nodes arrastáveis.

### Executar Workflow

Clique no botão de execução do workflow. Todos os steps são enviados ao backend que orquestra a execução completa, retornando resultados via streaming.

---

## 6. Mock Server

### O que é?

O Mock Server permite simular endpoints de API localmente, útil para:
- Desenvolvimento frontend sem backend real.
- Testes de integração com respostas controladas.
- Simulação de cenários de erro.

### Criar um Mock

1. Na aba **Mocks**, clique em **"+ Mock"**.
2. Configure: Path (ex: `/api/v1/users/:id`), Método, Status, Body da resposta.
3. Ative o mock com o toggle.

### Recursos

- **Path Params Dinâmicos**: Use `:param` no path (ex: `/users/:id`). O valor capturado pode ser usado no body com `{{id}}`.
- **Delay**: Configure um atraso em milissegundos antes de responder.
- **Validação de Request**: Adicione asserções para validar headers/body da requisição recebida.
- **File Response**: Retorne arquivos binários como resposta.
- **Headers Customizados**: Configure headers de resposta.

### Acessar Mocks

Os mocks ficam disponíveis em `http://localhost:8080/mock/{path}`.

### Live Monitoring

Acompanhe em tempo real as requisições recebidas pelo mock com detalhes de request/response.

---

## 7. Ambientes e Variáveis

### Gerenciar Ambientes

1. Clique em **"Ambiente"** no header da coleção.
2. Crie múltiplos ambientes (ex: Local, Staging, Produção).
3. Adicione variáveis chave-valor em cada ambiente.

### Usar Variáveis

Use a sintaxe `{{nome_variavel}}` em qualquer campo:
- URLs: `{{base_url}}/api/users`
- Headers: `Authorization: Bearer {{token}}`
- Body: `{"user": "{{username}}"}`

### Variáveis Dinâmicas (Templates)

O backend suporta variáveis especiais geradas automaticamente:
- `{{uuid}}` — UUID v4 aleatório.
- `{{timestamp}}` — Unix timestamp atual.
- `{{date}}`, `{{time}}`, `{{datetime}}` — Data/hora formatada.
- `{{int:min:max}}` — Inteiro aleatório no range.
- `{{float:min:max}}` — Float aleatório.
- `{{string:length}}` — String aleatória.
- `{{name}}` — Nome aleatório.
- `{{tel:formato}}` — Telefone no formato especificado.

### Variáveis Extraídas

Variáveis extraídas via Extractions ficam disponíveis para requests subsequentes no mesmo workflow.

---

## 8. Documentação

### Documentação por Action

Cada action possui campos de documentação:
- **Documentação Geral**: Texto livre com suporte a Markdown.
- **Autenticação**: Descrição de como obter credenciais.
- **Path Parameters**: Tabela com parâmetro, descrição, obrigatório e exemplo.
- **Headers**: Tabela com chave, descrição, obrigatório e exemplo.
- **Body**: Descrição do schema + tabela de campos com tipo, descrição e exemplo.
- **Responses**: Múltiplas respostas documentadas com status, body e dicionário de dados.

### Modos de Visualização

- **Preview**: Visualização formatada da documentação (somente leitura).
- **Editor**: Formulário completo para edição de todos os campos.

### Sincronização Automática

- **Sincronizar do Body**: Clique em "↓" para extrair campos do JSON/XML automaticamente para a tabela de documentação.
- **Respostas Automáticas**: Ao executar uma request, a resposta é salva automaticamente na documentação.

---

## 9. Relatório de Documentação Unificada

### Acesso

Na aba Actions, com nenhuma request aberta, clique em **"Gerar Relatório de Documentação"** no centro da tela.

### Funcionalidades

1. **Seleção**: Escolha quais actions entram no relatório via checkboxes. Use "Todas/Nenhuma" para seleção rápida.
2. **Ordenação**: Arraste os itens na seção "Ordem no Relatório" ou use setas ↑ ↓.
3. **Título**: Edite o título do relatório no header.
4. **Preview**: O painel direito mostra a documentação renderizada em tempo real.
5. **Exportar HTML**: Gera um arquivo HTML standalone com estilo completo.
6. **Exportar PDF**: Abre a documentação em nova janela com diálogo de impressão (salve como PDF).

---

## 10. Interface

### Temas

Alterne entre tema **Claro** e **Escuro** clicando no ícone 🌙/☀️ no header.

### Idiomas

Selecione **BR** (Português) ou **EN** (English) no seletor do header.

### Layout

O workspace da coleção usa um layout de 3 colunas:
1. **Sidebar esquerda** (320px): Navegação entre actions/workflows/mocks.
2. **Área central**: Editor da request ou estado vazio.
3. **Painel direito**: Documentação ou Execução (redimensionável, minimizável, maximizável).

### Navegação

- Clique no **logo** para voltar ao dashboard de coleções.
- Use o **breadcrumb** dentro de workflows para navegar entre níveis.
- O **campo de busca** na sidebar filtra itens em todos os níveis (incluindo dentro de pastas).

---

## 11. Persistência de Dados

Os dados são armazenados localmente no navegador via **IndexedDB**, suportando centenas de MB de dados. Na primeira utilização após atualização, dados existentes no localStorage são migrados automaticamente.

### Backup

Use a funcionalidade de **Exportar Coleção** para criar backups em JSON que podem ser reimportados a qualquer momento.

---

## 12. Arquitetura Técnica

### Frontend
- React 18 + Vite
- TailwindCSS
- Comunicação com backend via fetch + NDJSON streaming

### Backend
- Go (Golang)
- HTTP server nativo (net/http)
- Execução concorrente com goroutines
- Streaming de resultados via chunked transfer encoding

### Docker
- `docker-compose up` inicia frontend (porta 3000) e backend (porta 8080)
- Volumes mapeados para hot-reload em desenvolvimento

---

## 13. Atalhos e Dicas

- **Drag-and-drop**: Arraste actions entre pastas na sidebar.
- **Duplo clique** no nome de uma pasta para renomeá-la.
- **Variáveis de ambiente** são resolvidas em tempo real no preview da documentação.
- **Respostas capturadas** alimentam automaticamente o dicionário de dados.
- **Workflows** suportam configuração de carga individual por step.
- O **Mock Server** suporta regex em paths via parâmetros dinâmicos.
