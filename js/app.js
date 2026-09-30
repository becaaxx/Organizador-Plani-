/**
 * app.js
 * ---------------------------------------------------------------------------
 * Ponto de entrada da aplicação. É o único lugar do projeto que:
 *   - pega referências de elementos do DOM;
 *   - registra event listeners (clique, submit, input);
 *   - decide QUANDO chamar o AppController (regras de negócio) e QUANDO
 *     chamar o Renderizador (atualizar a tela).
 *
 * Fluxo típico de qualquer interação no app, do início ao fim:
 *   1. usuário clica/envia algo no HTML
 *   2. o listener aqui em app.js lê os dados do evento
 *   3. app.js chama um método do AppController (ex: controller.criarItem(...))
 *   4. app.js chama rerenderizarTudo() para a tela refletir o novo estado
 *
 * Esse é o padrão "MVC simplificado" que este projeto usa:
 *   Model      -> js/models/*.js (dados + regras próprias de cada entidade)
 *   Repository -> js/services/RepositorioService.js (persistência)
 *   Controller -> js/controller/AppController.js (regras de negócio + orquestração)
 *   Core       -> js/core/*.js (algoritmos: motor de tempo, sugestões, assistente)
 *   View       -> js/ui/*.js (Renderizador.js e Formularios.js — só desenham)
 *   Glue       -> este arquivo (app.js)
 */
import { AppController } from "./controller/AppController.js";
import * as Renderizador from "./ui/Renderizador.js";
import * as Formularios from "./ui/Formularios.js";
import { hojeISO, somarDias } from "./utils/DataUtils.js";

const controller = new AppController();

// ---------------------------------------------------------------------------
// Referências de DOM usadas o tempo todo (buscadas uma única vez)
// ---------------------------------------------------------------------------
const els = {
  dataSelecionada: document.getElementById("texto-data-selecionada"),
  tempoLivreTotal: document.getElementById("texto-tempo-livre-total"),
  barraOcupacao: document.getElementById("barra-ocupacao"),
  percentualOcupado: document.getElementById("texto-percentual-ocupado"),
  filtrosCategoria: document.getElementById("filtros-categoria"),
  listaCategorias: document.getElementById("lista-categorias"),
  calendario: document.getElementById("calendario-diario"),
  listaCursos: document.getElementById("lista-cursos"),
  listaItens: document.getElementById("lista-itens"),
  mensagensAssistente: document.getElementById("mensagens-assistente"),
  areaToasts: document.getElementById("area-toasts"),
  modalOverlay: document.getElementById("modal-overlay"),
  modalConteudo: document.getElementById("modal-conteudo"),
};

// ---------------------------------------------------------------------------
// RENDERIZAÇÃO CENTRAL: qualquer mudança de estado termina chamando isto.
// Centralizar num único ponto evita esquecer de atualizar algum painel.
// ---------------------------------------------------------------------------
function rerenderizarTudo() {
  const dataISO = controller.dataSelecionada;
  const categorias = controller.listarCategorias();

  Renderizador.renderizarDataSelecionada(els.dataSelecionada, dataISO);

  const disponibilidade = controller.calcularDisponibilidadeDoDia(dataISO);
  Renderizador.renderizarDisponibilidade(
    { elTotal: els.tempoLivreTotal, elBarra: els.barraOcupacao, elPercentual: els.percentualOcupado },
    disponibilidade
  );

  Renderizador.renderizarFiltrosCategoria(els.filtrosCategoria, categorias, controller.filtroCategoria);
  Renderizador.renderizarCategorias(els.listaCategorias, categorias);

  const atividadesDoDia = controller.obterAtividadesDoDia(dataISO);
  Renderizador.renderizarCalendarioDiario(els.calendario, { atividades: atividadesDoDia, blocosLivres: disponibilidade.blocosLivres });

  Renderizador.renderizarCursos(els.listaCursos, controller.listarCursos());
  Renderizador.renderizarItens(els.listaItens, controller.listarItens());
}

// ---------------------------------------------------------------------------
// TEMA (claro/escuro) — ver css/style.css para as variáveis de cor
// ---------------------------------------------------------------------------
function iniciarTema() {
  const temaSalvo = localStorage.getItem("organizador-tempo.tema") || "dark"; // dark = padrão
  aplicarTema(temaSalvo);

  document.getElementById("btn-alternar-tema").addEventListener("click", () => {
    const temaAtual = document.documentElement.classList.contains("light") ? "light" : "dark";
    const novoTema = temaAtual === "dark" ? "light" : "dark";
    aplicarTema(novoTema);
    localStorage.setItem("organizador-tempo.tema", novoTema);
  });
}

function aplicarTema(tema) {
  document.documentElement.classList.toggle("light", tema === "light");
  document.getElementById("icone-tema").textContent = tema === "light" ? "🌙" : "☀️";
}

// ---------------------------------------------------------------------------
// NAVEGAÇÃO DE DATA
// ---------------------------------------------------------------------------
function iniciarNavegacaoDeData() {
  document.getElementById("btn-dia-anterior").addEventListener("click", () => {
    controller.dataSelecionada = somarDias(controller.dataSelecionada, -1);
    rerenderizarTudo();
  });
  document.getElementById("btn-dia-seguinte").addEventListener("click", () => {
    controller.dataSelecionada = somarDias(controller.dataSelecionada, 1);
    rerenderizarTudo();
  });
  document.getElementById("btn-ir-para-hoje").addEventListener("click", () => {
    controller.dataSelecionada = hojeISO();
    rerenderizarTudo();
  });
}

// ---------------------------------------------------------------------------
// FILTROS DE CATEGORIA (RF14) — delegação de evento no container dos chips
// ---------------------------------------------------------------------------
function iniciarFiltros() {
  els.filtrosCategoria.addEventListener("click", (evento) => {
    const botao = evento.target.closest(".btn-filtro-categoria");
    if (!botao) return;
    controller.filtroCategoria = botao.dataset.categoria || null;
    rerenderizarTudo();
  });
}

// ---------------------------------------------------------------------------
// CATEGORIAS (Seção 10, Requisito 1) — criação e remoção dinâmica
// ---------------------------------------------------------------------------
function iniciarCategorias() {
  document.getElementById("form-nova-categoria").addEventListener("submit", (evento) => {
    evento.preventDefault();
    const input = document.getElementById("input-nova-categoria");
    const nome = input.value.trim();
    if (!nome) return;

    controller.criarCategoria(nome);
    input.value = "";
    rerenderizarTudo();
    Renderizador.mostrarToast(els.areaToasts, `Categoria "${nome}" criada.`, "sucesso");
  });

  els.listaCategorias.addEventListener("click", (evento) => {
    const botao = evento.target.closest('[data-acao="remover-categoria"]');
    if (!botao) return;

    const nomeCategoria = botao.dataset.categoriaNome;
    const confirmar = window.confirm(
      `Remover a categoria "${nomeCategoria}"? As atividades que já usam essa categoria não serão apagadas.`
    );
    if (!confirmar) return;

    controller.removerCategoria(botao.dataset.categoriaId);
    // Se o filtro ativo era exatamente essa categoria, volta para "Todas"
    // (senão a tela ficaria filtrando por uma categoria que não existe mais).
    if (controller.filtroCategoria === nomeCategoria) controller.filtroCategoria = null;

    rerenderizarTudo();
    Renderizador.mostrarToast(els.areaToasts, `Categoria "${nomeCategoria}" removida.`, "info");
  });
}

/**
 * Liga o comportamento de "+ Criar nova categoria..." (ver
 * Formularios.VALOR_NOVA_CATEGORIA) num <select name="categoria"> dentro de
 * um modal recém-aberto. Reaproveitado pelos três formulários que pedem
 * categoria (nova atividade, novo curso, novo item) — Requisito 1: criar
 * categorias na hora, sem sair do formulário em que se está.
 */
function iniciarSelectDeCategoria(selectElement) {
  if (!selectElement) return;

  selectElement.addEventListener("change", () => {
    if (selectElement.value !== Formularios.VALOR_NOVA_CATEGORIA) return;

    const nome = window.prompt("Nome da nova categoria:");
    if (!nome || !nome.trim()) {
      selectElement.selectedIndex = 0; // usuário cancelou -> volta pra primeira opção real
      return;
    }

    const categoria = controller.criarCategoria(nome.trim());

    // Insere a nova opção antes da sentinela "+ Criar nova categoria..." e
    // já a deixa selecionada, sem precisar redesenhar o formulário inteiro.
    const opcaoNova = document.createElement("option");
    opcaoNova.value = categoria.nome;
    opcaoNova.textContent = categoria.nome;
    selectElement.insertBefore(opcaoNova, selectElement.querySelector(`option[value="${Formularios.VALOR_NOVA_CATEGORIA}"]`));
    selectElement.value = categoria.nome;

    // A categoria é global (aparece nos filtros, no card de Categorias
    // etc.), então o resto da tela também precisa saber que ela existe.
    rerenderizarTudo();
  });
}

/**
 * Garante que o valor escolhido no <select name="categoria"> de um
 * formulário é uma categoria de verdade — cobre o caso em que o usuário
 * nunca chegou a mexer no select (ex: só existe a opção "+ Criar nova
 * categoria..." porque ainda não há nenhuma categoria cadastrada) e
 * enviou o formulário assim mesmo. Devolve o nome da categoria a usar, ou
 * `null` se o usuário desistiu do prompt (nesse caso o chamador deve
 * abortar o envio do formulário).
 */
function resolverCategoriaSelecionada(valorSelect) {
  if (valorSelect !== Formularios.VALOR_NOVA_CATEGORIA) return valorSelect;

  const nome = window.prompt("Nome da nova categoria:");
  if (!nome || !nome.trim()) return null;

  const categoria = controller.criarCategoria(nome.trim());
  rerenderizarTudo();
  return categoria.nome;
}

// ---------------------------------------------------------------------------
// MODAL GENÉRICO
// ---------------------------------------------------------------------------
function abrirModal(htmlConteudo) {
  els.modalConteudo.innerHTML = htmlConteudo;
  els.modalOverlay.classList.remove("hidden");
  els.modalOverlay.classList.add("flex");
}

function fecharModal() {
  els.modalOverlay.classList.add("hidden");
  els.modalOverlay.classList.remove("flex");
  els.modalConteudo.innerHTML = "";
}

function iniciarModal() {
  // Fecha ao clicar fora do cartão (no overlay escuro, não no conteúdo).
  els.modalOverlay.addEventListener("click", (evento) => {
    if (evento.target === els.modalOverlay) fecharModal();
  });
}

// ---------------------------------------------------------------------------
// NOVA ATIVIDADE (RF01-RF04)
// ---------------------------------------------------------------------------
function iniciarBotaoNovaAtividade() {
  document.getElementById("btn-nova-atividade").addEventListener("click", () => {
    abrirModal(Formularios.formularioNovaAtividade(controller.listarCategorias(), controller.dataSelecionada));

    iniciarSelectDeCategoria(document.querySelector("#form-nova-atividade select[name='categoria']"));

    // Mostra os "chips" de dia da semana só quando "recorrente" está marcado.
    const chkRecorrente = document.getElementById("chk-recorrente");
    const diasRecorrencia = document.getElementById("dias-recorrencia");
    chkRecorrente.addEventListener("change", () => {
      diasRecorrencia.classList.toggle("hidden", !chkRecorrente.checked);
    });

    document.getElementById("form-nova-atividade").addEventListener("submit", (evento) => {
      evento.preventDefault();
      const dados = new FormData(evento.target);
      const diasRecorrenciaSelecionados = dados.getAll("diasRecorrencia").map(Number);

      const nomeCategoria = resolverCategoriaSelecionada(dados.get("categoria"));
      if (!nomeCategoria) {
        Renderizador.mostrarToast(els.areaToasts, "Escolha ou crie uma categoria antes de salvar.", "erro");
        return;
      }

      const payload = {
        nome: dados.get("nome"),
        categoria: nomeCategoria,
        data: dados.get("data"),
        horaInicio: dados.get("horaInicio"),
        horaFim: dados.get("horaFim"),
        recorrente: dados.get("recorrente") === "on",
        diasRecorrencia: diasRecorrenciaSelecionados,
      };

      if (payload.horaFim <= payload.horaInicio) {
        Renderizador.mostrarToast(els.areaToasts, "O horário de fim precisa ser depois do início.", "erro");
        return;
      }

      const criadores = {
        CompromissoFixo: controller.criarCompromissoFixo.bind(controller),
        BlocoDeTransicao: controller.criarBlocoDeTransicao.bind(controller),
        AtividadeFlexivel: controller.criarAtividadeFlexivel.bind(controller),
      };
      criadores[dados.get("tipo")](payload);

      fecharModal();
      rerenderizarTudo();
      Renderizador.mostrarToast(els.areaToasts, `"${payload.nome}" adicionada.`, "sucesso");
    });
  });
}

// ---------------------------------------------------------------------------
// NOVO CURSO / META (RF06, RF09, RF17)
// ---------------------------------------------------------------------------
function iniciarBotaoNovoCurso() {
  document.getElementById("btn-novo-curso").addEventListener("click", () => {
    abrirModal(Formularios.formularioNovoCurso(controller.listarCategorias()));
    iniciarSelectDeCategoria(document.querySelector("#form-novo-curso select[name='categoria']"));

    document.getElementById("form-novo-curso").addEventListener("submit", (evento) => {
      evento.preventDefault();
      const dados = new FormData(evento.target);

      const nomeCategoria = resolverCategoriaSelecionada(dados.get("categoria"));
      if (!nomeCategoria) {
        Renderizador.mostrarToast(els.areaToasts, "Escolha ou crie uma categoria antes de salvar.", "erro");
        return;
      }

      controller.criarCurso({
        nome: dados.get("nome"),
        categoria: nomeCategoria,
        cargaHorariaTotalMinutos: Math.round(Number(dados.get("cargaHoras")) * 60),
        prazo: dados.get("prazo") || null,
        status: dados.get("status"),
      });

      fecharModal();
      rerenderizarTudo();
      Renderizador.mostrarToast(els.areaToasts, "Curso/meta criado.", "sucesso");
    });
  });
}

// ---------------------------------------------------------------------------
// NOVO ITEM DE LISTA (RF15, RF16)
// ---------------------------------------------------------------------------
function iniciarBotaoNovoItem() {
  document.getElementById("btn-novo-item").addEventListener("click", () => {
    abrirModal(Formularios.formularioNovoItem(controller.listarCategorias()));
    iniciarSelectDeCategoria(document.querySelector("#form-novo-item select[name='categoria']"));

    document.getElementById("form-novo-item").addEventListener("submit", (evento) => {
      evento.preventDefault();
      const dados = new FormData(evento.target);

      const nomeCategoria = resolverCategoriaSelecionada(dados.get("categoria"));
      if (!nomeCategoria) {
        Renderizador.mostrarToast(els.areaToasts, "Escolha ou crie uma categoria antes de salvar.", "erro");
        return;
      }

      controller.criarItem({
        nome: dados.get("nome"),
        categoria: nomeCategoria,
        tipo: dados.get("tipo"),
      });

      fecharModal();
      rerenderizarTudo();
      Renderizador.mostrarToast(els.areaToasts, "Item adicionado à lista.", "sucesso");
    });
  });
}

// ---------------------------------------------------------------------------
// AÇÕES DENTRO DA LISTA DE CURSOS (delegação de evento)
// ---------------------------------------------------------------------------
function iniciarAcoesCursos() {
  els.listaCursos.addEventListener("click", (evento) => {
    const alvo = evento.target.closest("[data-acao]");
    if (!alvo) return;
    const cursoId = alvo.dataset.cursoId;

    if (alvo.dataset.acao === "ativar-curso") {
      controller.ativarCurso(cursoId);
      rerenderizarTudo();
      Renderizador.mostrarToast(els.areaToasts, "Curso ativado.", "sucesso");
    }

    if (alvo.dataset.acao === "registrar-execucao") {
      const curso = controller.listarCursos().find((c) => c.id === cursoId);
      abrirModal(Formularios.formularioRegistrarExecucao(curso.nome));
      document.getElementById("form-registrar-execucao").addEventListener("submit", (e) => {
        e.preventDefault();
        const dados = new FormData(e.target);
        controller.registrarExecucaoCurso(cursoId, dados.get("data"), Number(dados.get("minutos")));
        fecharModal();
        rerenderizarTudo();
        Renderizador.mostrarToast(els.areaToasts, "Tempo registrado.", "sucesso");
      });
    }

    if (alvo.dataset.acao === "sugerir-distribuicao") {
      const curso = controller.listarCursos().find((c) => c.id === cursoId);
      const dataLimite = curso.prazo || somarDias(hojeISO(), 7);
      const resultado = controller.sugerirDistribuicaoParaCurso(cursoId, dataLimite);

      Renderizador.adicionarMensagemAssistente(
        els.mensagensAssistente,
        `Proposta de distribuição para "${curso.nome}":`,
        "assistente"
      );
      Renderizador.criarCartaoSugestoes(els.mensagensAssistente, resultado, () => {
        controller.aceitarSugestoes(resultado.sugestoes, { nomeBase: curso.nome, categoria: curso.categoria, cursoId });
        rerenderizarTudo();
        Renderizador.mostrarToast(els.areaToasts, "Sugestões aceitas e adicionadas ao calendário.", "sucesso");
      });
    }
  });
}

// ---------------------------------------------------------------------------
// AÇÕES DENTRO DA LISTA DE ITENS (delegação de evento) — RF15, RF16, RF18
// ---------------------------------------------------------------------------
function iniciarAcoesItens() {
  els.listaItens.addEventListener("change", (evento) => {
    const checkbox = evento.target.closest('[data-acao="concluir-item"]');
    if (!checkbox) return;
    controller.alternarConclusaoItem(checkbox.dataset.itemId, checkbox.checked);
    rerenderizarTudo();
  });

  els.listaItens.addEventListener("click", (evento) => {
    const alvo = evento.target.closest("[data-acao]");
    if (!alvo) return;
    const itemId = alvo.dataset.itemId;

    if (alvo.dataset.acao === "remover-item") {
      controller.removerItem(itemId);
      rerenderizarTudo();
    }

    if (alvo.dataset.acao === "planejar-item") {
      const item = controller.listarItens().find((i) => i.id === itemId);
      abrirModal(Formularios.formularioPlanejarItem(item.nome, controller.dataSelecionada));
      document.getElementById("form-planejar-item").addEventListener("submit", (e) => {
        e.preventDefault();
        const dados = new FormData(e.target);
        if (dados.get("horaFim") <= dados.get("horaInicio")) {
          Renderizador.mostrarToast(els.areaToasts, "O horário de fim precisa ser depois do início.", "erro");
          return;
        }
        controller.promoverItemParaAtividade(itemId, {
          data: dados.get("data"),
          horaInicio: dados.get("horaInicio"),
          horaFim: dados.get("horaFim"),
        });
        fecharModal();
        rerenderizarTudo();
        Renderizador.mostrarToast(els.areaToasts, `"${item.nome}" planejado no calendário.`, "sucesso");
      });
    }
  });
}

// ---------------------------------------------------------------------------
// CLIQUE NUM BLOCO DO CALENDÁRIO
// ---------------------------------------------------------------------------
function iniciarInteracaoCalendario() {
  els.calendario.addEventListener("click", (evento) => {
    const bloco = evento.target.closest("[data-atividade-id]");
    if (!bloco) return;

    const atividade = controller.listarAtividades().find((a) => a.id === bloco.dataset.atividadeId);
    if (!atividade) return;

    if (atividade.tipo === "AtividadeFlexivel") {
      // Atividades flexíveis podem ser removidas diretamente (elas não são
      // "sagradas" — RF13 continua valendo: quem decide é o usuário, aqui
      // via uma confirmação simples).
      const confirmar = window.confirm(`Remover "${atividade.nome}" (${atividade.horaInicio}–${atividade.horaFim})?`);
      if (confirmar) {
        controller.removerAtividade(atividade.id);
        rerenderizarTudo();
        Renderizador.mostrarToast(els.areaToasts, "Atividade removida.", "info");
      }
    } else {
      // Compromissos fixos e blocos de transição são só informativos aqui;
      // edição deles fica como extensão natural deste código-base.
      Renderizador.mostrarToast(
        els.areaToasts,
        `${atividade.nome}: ${atividade.horaInicio}–${atividade.horaFim}`,
        "info"
      );
    }
  });
}

// ---------------------------------------------------------------------------
// ASSISTENTE EM LINGUAGEM NATURAL (RF19-RF23)
// ---------------------------------------------------------------------------
function iniciarAssistente() {
  document.getElementById("form-assistente").addEventListener("submit", (evento) => {
    evento.preventDefault();
    const input = document.getElementById("input-assistente");
    const texto = input.value.trim();
    if (!texto) return;

    Renderizador.adicionarMensagemAssistente(els.mensagensAssistente, texto, "usuario");
    input.value = "";

    const resultado = controller.processarComandoAssistente(texto);
    processarResultadoAssistente(resultado);
  });

  // Atalho no cabeçalho: rola até o assistente e foca no campo de texto.
  document.getElementById("btn-assistente-topo").addEventListener("click", () => {
    document.getElementById("painel-assistente").scrollIntoView({ behavior: "smooth", block: "center" });
    document.getElementById("input-assistente").focus();
  });
}

function processarResultadoAssistente(resultado) {
  switch (resultado.status) {
    case "ok":
      Renderizador.adicionarMensagemAssistente(els.mensagensAssistente, resultado.mensagem, "assistente");
      rerenderizarTudo();
      break;

    case "confirmar_sugestoes":
      Renderizador.adicionarMensagemAssistente(els.mensagensAssistente, resultado.mensagem, "assistente");
      // dados.sugestoes vem tanto de curso (RF11) quanto de perda de atividade (RF22).
      Renderizador.criarCartaoSugestoes(els.mensagensAssistente, resultado.dados, () => {
        const { curso, atividadeOriginal, sugestoes } = resultado.dados;
        controller.aceitarSugestoes(sugestoes, {
          nomeBase: curso ? curso.nome : atividadeOriginal.nome,
          categoria: curso ? curso.categoria : atividadeOriginal.categoria,
          cursoId: curso ? curso.id : null,
        });
        rerenderizarTudo();
        Renderizador.mostrarToast(els.areaToasts, "Sugestões aceitas.", "sucesso");
      });
      break;

    case "confirmar_regeneracao": {
      Renderizador.adicionarMensagemAssistente(els.mensagensAssistente, resultado.mensagem, "assistente");
      const bolhaConfirmacao = document.createElement("div");
      bolhaConfirmacao.className = "mr-auto";
      bolhaConfirmacao.innerHTML = `<button class="text-xs px-3 py-1 rounded-lg bg-perigo/20 border border-perigo text-perigo">Confirmar regeneração da semana</button>`;
      bolhaConfirmacao.querySelector("button").addEventListener("click", () => {
        controller.regenerarCalendarioSemana(controller.dataSelecionada);
        rerenderizarTudo();
        bolhaConfirmacao.remove();
        Renderizador.adicionarMensagemAssistente(els.mensagensAssistente, "Semana reorganizada.", "assistente");
      });
      els.mensagensAssistente.appendChild(bolhaConfirmacao);
      break;
    }

    case "ambiguo": {
      const nomes = resultado.dados.map((item) => (item.data ? `"${item.nome}" (${item.data})` : `"${item.nome}"`)).join(", ");
      Renderizador.adicionarMensagemAssistente(
        els.mensagensAssistente,
        `${resultado.mensagem} (${nomes}). Repita o comando sendo mais específico.`,
        "assistente"
      );
      break;
    }

    default: // 'nao_encontrado' | 'nao_reconhecido'
      Renderizador.adicionarMensagemAssistente(els.mensagensAssistente, resultado.mensagem, "assistente");
  }
}

// ---------------------------------------------------------------------------
// INICIALIZAÇÃO
// ---------------------------------------------------------------------------
function iniciar() {
  iniciarTema();
  iniciarNavegacaoDeData();
  iniciarFiltros();
  iniciarCategorias();
  iniciarModal();
  iniciarBotaoNovaAtividade();
  iniciarBotaoNovoCurso();
  iniciarBotaoNovoItem();
  iniciarAcoesCursos();
  iniciarAcoesItens();
  iniciarInteracaoCalendario();
  iniciarAssistente();

  rerenderizarTudo();
  els.calendario.scrollTop = Renderizador.calcularScrollInicial();

  Renderizador.adicionarMensagemAssistente(
    els.mensagensAssistente,
    'Olá! Peça algo como "adicione reunião amanhã às 15h".',
    "assistente"
  );
}

iniciar();
