# Organizador de Tempo Dinâmico — Base V1

Código-base gerado a partir do documento **"Requisitos V1 — Organizador de
Tempo Dinâmico"**, seguindo à risca as Diretrizes Técnicas da Seção 15:
HTML5 + CSS3 + JavaScript puro (Vanilla, com módulos ES6), Tailwind CSS via
CDN, dark mode por padrão, arquitetura orientada a objetos com herança,
Motor de Tempo em blocos de 15 minutos, Repository Pattern com
`localStorage`, e o Assistente como "tradutor de intenções".

## Como rodar

Este projeto usa **ES Modules** (`import`/`export` entre arquivos `.js`).
Por segurança, os navegadores **bloqueiam** módulos ES6 quando o HTML é
aberto direto do disco (`file:///...`). Por isso, você precisa servir os
arquivos por um servidor local — qualquer um destes funciona:

```bash
# Opção 1 — se você tem Node.js instalado
npx serve .

# Opção 2 — se você tem Python 3 instalado
python3 -m http.server 8000

# Opção 3 — extensão "Live Server" do VS Code
# (botão direito em index.html -> "Open with Live Server")
```

Depois abra o endereço indicado no terminal (ex: `http://localhost:8000`)
no navegador.

Os dados ficam salvos no `localStorage` do seu navegador — ou seja, são
por navegador/computador, não sincronizam entre dispositivos (isso está
listado como "fora do escopo" da V1, Seção 12 dos requisitos).

## Publicar no GitHub Pages

A estrutura deste projeto já é 100% compatível com GitHub Pages: **todos os
`import`/`export` usam caminhos relativos** (`./modelo.js`, `../models/...`),
nunca caminhos absolutos (`/js/...`) — então funciona tanto num repositório
de usuário (`usuario.github.io`) quanto num repositório de projeto
(`usuario.github.io/nome-do-repo/`), sem precisar editar nada.

Passo a passo:

1. **A raiz do repositório precisa ser exatamente esta pasta.** Ou seja,
   `index.html`, `css/` e `js/` devem ficar direto na raiz do repositório
   (ou dentro de `/docs`, se você escolher essa opção no passo 3) — nunca
   dentro de mais uma subpasta como `meu-repo/organizador-tempo/index.html`.
   Se você arrastou a pasta `organizador-tempo/` inteira para dentro do
   repositório, mova o CONTEÚDO dela (não a pasta em si) para a raiz.

2. Confirme que a estrutura ficou assim (pode conferir com `git status` ou
   no próprio GitHub, na aba "Code"):
   ```
   nome-do-repo/
   ├── index.html
   ├── css/style.css
   └── js/... (todas as subpastas)
   ```

3. No GitHub: **Settings → Pages → Build and deployment → Source:
   "Deploy from a branch"** → escolha a branch (geralmente `main`) e a
   pasta `/ (root)`. Salve.

4. Espere 1–2 minutos e acesse o link que o GitHub mostrar (formato
   `https://SEU-USUARIO.github.io/NOME-DO-REPO/`).

**Sobre o erro de módulos não carregarem:** a causa mais comum não é o
código em si, e sim a estrutura de pastas do passo 1 (index.html não estar
na raiz certa) ou letras maiúsculas/minúsculas diferentes entre o `import`
e o nome real do arquivo — o servidor do GitHub Pages roda em Linux, que
(diferente do Windows) **diferencia maiúsculas de minúsculas** em nomes de
arquivo. Este projeto já foi conferido e todos os imports batem
exatamente com os nomes de arquivo (inclusive maiúsculas/minúsculas), mas
vale lembrar disso se você criar novos arquivos no futuro.

## Instalar como app (PWA)

Depois do passo 4 acima, o site passa a ter um manifesto PWA
(`manifest.json`) e um Service Worker (`service-worker.js`) — é isso que
faz o Chrome/Edge oferecerem **"Instalar app"** (ícone perto da barra de
endereço, ou menu ⋮ → "Instalar..."). Depois de instalado, o app abre numa
janela própria (sem abas/barra do navegador) e continua funcionando mesmo
sem internet, porque os arquivos ficam cacheados no dispositivo.

Duas coisas importantes:

- **O botão só aparece servido por HTTPS** (o GitHub Pages já serve assim
  — não aparece rodando localmente via `file://`, e só aparece via
  `http://localhost` se você usar um dos servidores locais do passo
  "Como rodar" acima).
- **Se você editar qualquer arquivo do app depois de instalado**, troque o
  número em `CACHE_NAME` no topo de `service-worker.js` (ex: `"v1"` →
  `"v2"`). Sem isso, quem já instalou continua vendo a versão antiga
  cacheada — isso é comentado no próprio arquivo.

## Estrutura de pastas

```
organizador-tempo/
├── index.html                    Estrutura da página (Tailwind via CDN)
├── manifest.json                 Manifesto PWA (nome, ícones, cor do tema)
├── service-worker.js             Cache offline + habilita "Instalar app"
├── icons/                        Ícones do PWA (gerados a partir do logo do app)
├── css/
│   └── style.css                 Variáveis de tema (dark/light) + linha do tempo
└── js/
    ├── app.js                    Ponto de entrada: liga DOM <-> Controller <-> Renderizador
    ├── models/                   Camada de domínio (POO, herança)
    │   ├── Atividade.js          Classe base (RF01-RF04)
    │   ├── CompromissoFixo.js    Herda de Atividade — inegociável
    │   ├── BlocoDeTransicao.js   Herda de Atividade — tempo de apoio
    │   ├── AtividadeFlexivel.js  Herda de Atividade — pode ser redistribuída
    │   ├── Curso.js              Cursos e metas (RF06-RF10, RF17)
    │   ├── ItemLista.js          Pendências/projetos/ideias (RF15, RF16)
    │   └── FabricaDeAtividades.js  Reconstrói a classe certa a partir do JSON salvo
    ├── services/
    │   └── RepositorioService.js Repository Pattern sobre o localStorage (Seção 15-C)
    ├── core/                     Algoritmos do produto
    │   ├── MotorDeTempo.js       Grade de 15 min + cálculo de tempo livre (Seção 15-B)
    │   ├── GerenciadorDeSugestoes.js  Distribuição/redistribuição (RF11, RF12, RF22)
    │   └── Assistente.js         Linguagem natural -> IntencaoDeAcao (Seção 15-D)
    ├── controller/
    │   └── AppController.js      Orquestra tudo; único lugar que fala com os repositórios
    ├── ui/
    │   ├── Renderizador.js       Funções puras: dados -> HTML
    │   └── Formularios.js        Templates dos formulários dos modais
    └── utils/
        └── DataUtils.js          Funções de data (formatação, semana, intervalos)
```

## Por onde começar a ler o código

Se você está usando este projeto para estudar POO e arquitetura, esta é
uma ordem de leitura sugerida (é também a ordem recomendada pela Seção 14
do documento de requisitos: primeiro a base, depois atividades/cursos,
depois listas/filtros, e só por último o assistente):

1. **`js/models/Atividade.js`** — entenda a classe base e por que as
   outras (`CompromissoFixo`, `BlocoDeTransicao`, `AtividadeFlexivel`)
   herdam dela em vez de duplicar código.
2. **`js/core/MotorDeTempo.js`** — o algoritmo mais importante do app: como
   96 fatias de 15 minutos viram "você tem 6h livres hoje".
3. **`js/services/RepositorioService.js`** + **`FabricaDeAtividades.js`** —
   como os dados sobrevivem a um F5 (localStorage) e voltam a virar
   instâncias de classe de verdade (e não só JSON cru).
4. **`js/controller/AppController.js`** — o "cérebro": é o único arquivo
   que conhece TODAS as outras peças. Leia os métodos na ordem em que
   aparecem no arquivo.
5. **`js/core/Assistente.js`** e o método `processarComandoAssistente` em
   `AppController.js` — como um texto livre vira uma ação estruturada
   (`IntencaoDeAcao`) sem o "assistente" nunca tocar diretamente no banco.
6. **`js/app.js`** — por último, veja como tudo isso se conecta a cliques e
   formulários de verdade.

## O que já está implementado (V1)

- RF01-RF05: rotina, compromissos fixos/variáveis, recorrência, tempo de
  transição e cálculo de tempo disponível (Motor de Tempo).
- RF06-RF10, RF17, RF18: cursos/metas com carga horária, progresso,
  registro de execução, cursos futuros e ativação.
- RF11-RF13: sugestão de distribuição de horas, sempre com confirmação do
  usuário antes de gravar no calendário.
- RF14: filtro de calendário por categoria (não altera o planejamento).
- RF15-RF16: listas de pendências, projetos e ideias, com promoção para
  atividade agendada.
- RF19-RF23: assistente em linguagem natural (reconhecimento por
  padrões/regex — ver comentário no topo de `Assistente.js` sobre como
  evoluir isso para uma IA de verdade via API da Anthropic) capaz de:
  **adicionar**, **remover** e **mover** atividades, **criar categorias**
  e propor **redistribuições**, sempre atualizando a tela na hora.
- Seção 10: categorias 100% livres, criadas e geridas pelo usuário — pela
  interface (card "Categorias" na barra lateral, e a opção
  "+ Criar nova categoria..." dentro de qualquer formulário) ou pelo chat
  do assistente ("criar categoria Projetos"). O app não vem com NENHUMA
  categoria, atividade, curso ou pendência pré-cadastrada — tudo começa
  vazio na primeira execução.

## Categorias dinâmicas — como funciona

- Card **"Categorias"** na barra lateral: cria (campo + botão) e remove
  (clicando no "×" de cada chip) categorias a qualquer momento. Remover uma
  categoria não apaga as atividades que já a usavam — elas só ficam com uma
  categoria que não existe mais na lista de filtros.
- Em qualquer `<select>` de categoria (nova atividade, novo curso, novo
  item), a última opção é sempre **"+ Criar nova categoria..."**
  (`Formularios.VALOR_NOVA_CATEGORIA`). Escolhê-la abre um `prompt()`
  simples; a categoria é criada na hora e já fica selecionada, sem fechar o
  formulário (ver `iniciarSelectDeCategoria()` em `app.js`).
- Pelo chat: `"criar categoria Projetos"` (RF19, roteado por
  `Assistente.js` → `AppController._aplicarCriacaoCategoria`).
- Nomes de categoria são comparados sem diferenciar maiúsculas/minúsculas
  para evitar duplicatas (`AppController.criarCategoria`).

## Assistente — comandos suportados nesta versão

| Intenção | Exemplo | Método no AppController |
|---|---|---|
| Adicionar atividade | "adicione reunião amanhã às 15h" | `_aplicarAdicao` |
| Remover atividade | "remover academia hoje" / "apague a reunião de quarta" | `_aplicarRemocao` |
| Mover atividade | "mude a academia de quinta das 13h para 15h" ou, de forma mais direta, "mudar faculdade para as 10h" | `_aplicarMovimentacao` |
| Criar categoria | "criar categoria Projetos" | `_aplicarCriacaoCategoria` |
| Redistribuir (perda pontual) | "não consegui estudar programação na quarta, redistribua essas 2 horas até domingo" | `_aplicarRedistribuicao` |
| Redistribuir (curso/meta) | "reorganize minhas horas de inglês para os horários livres restantes" | `_aplicarRedistribuicao` |
| Regenerar a semana inteira | "reorganize minha semana inteira" (RF20 — só com confirmação explícita) | `regenerarCalendarioSemana` |

Toda ação bem-sucedida do assistente chama `rerenderizarTudo()` em
`app.js` — ou seja, calendário, disponibilidade, listas e categorias são
atualizados imediatamente, sem precisar recarregar a página.

Ambiguidade (RF23): se o termo buscado casa com mais de uma atividade (ex:
duas "reuniões" em dias diferentes), o assistente lista as opções com a
data de cada uma e pede para o usuário repetir o comando de forma mais
específica, em vez de escolher sozinho.

## O que fica como próximo passo (fiel à Seção 13 do documento)

- Editar (não só remover) uma `AtividadeFlexivel` diretamente pelo bloco no
  calendário (ex: arrastar e soltar — os blocos já têm
  `data-arrastavel="true"` prontos para isso).
- Persistência via API externa: como o Repository Pattern já isola todo o
  acesso a dados em `RepositorioService.js`, basta trocar os métodos dessa
  classe por chamadas `fetch()` — o resto do app não muda.
- Assistente com IA de verdade: trocar o corpo de `Assistente.interpretar()`
  por uma chamada à API da Anthropic pedindo uma resposta em JSON no
  formato `IntencaoDeAcao` — o contrato entre Assistente e
  `AppController.aplicarIntencao` já está pronto para isso.
- Notificações inteligentes e análise histórica de produtividade.
- Pesos/prioridades mais sofisticados entre metas concorrentes no
  `GerenciadorDeSugestoes`.

## Sobre os dados de exemplo

Esta versão **não semeia nenhum dado** — nem categorias, nem atividades,
nem cursos, nem pendências. O calendário, as listas e o card de Categorias
começam vazios na primeira execução, e tudo que aparecer depois foi criado
por você (pela interface ou pelo chat do assistente).
