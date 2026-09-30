/**
 * Renderizador.js
 * ---------------------------------------------------------------------------
 * Camada de VISUALIZAÇÃO. Cada função aqui recebe dados já prontos (vindos
 * do AppController) e devolve/injeta HTML. NENHUMA função deste arquivo:
 *   - lê ou escreve no localStorage;
 *   - decide regras de negócio (ex: "isso pode ser movido?");
 *   - registra event listeners de clique/submit (isso é feito em app.js).
 *
 * Ou seja: se amanhã você quiser trocar completamente o visual do app
 * (outro layout, outra biblioteca de estilo), só este arquivo muda — o
 * AppController e os modelos continuam intactos. Essa separação
 * "Model/Controller" vs "View" é um dos objetivos didáticos deste projeto.
 */
import { Atividade } from "../models/Atividade.js";
import { formatarDataLegivel, formatarDuracao } from "../utils/DataUtils.js";

const PX_POR_MINUTO = 0.9; // controla a "altura" visual de 1 minuto no calendário
const MINUTO_INICIAL_VISIVEL = 24 * 60; // 24h completas na grade

const ICONE_POR_TIPO = {
  CompromissoFixo: "📌",
  BlocoDeTransicao: "🔁",
  AtividadeFlexivel: "✏️",
};

// ============================================================================
// CABEÇALHO / DISPONIBILIDADE (RF05)
// ============================================================================

export function renderizarDataSelecionada(elemento, dataISO) {
  elemento.textContent = formatarDataLegivel(dataISO);
}

export function renderizarDisponibilidade({ elTotal, elBarra, elPercentual }, disponibilidade) {
  elTotal.textContent = formatarDuracao(disponibilidade.totalMinutosLivres);
  elBarra.style.width = `${disponibilidade.percentualOcupado}%`;
  elPercentual.textContent = disponibilidade.percentualOcupado;
}

// ============================================================================
// CATEGORIAS — criação e gestão dinâmica (Seção 10, Requisito 1)
// ============================================================================

export function renderizarCategorias(container, categorias) {
  if (categorias.length === 0) {
    container.innerHTML = `<p class="text-xs text-texto-muted">Nenhuma categoria ainda. Crie a primeira abaixo.</p>`;
    return;
  }

  container.innerHTML = categorias
    .map(
      (categoria) => `
      <span class="inline-flex items-center gap-1.5 text-xs pl-3 pr-1.5 py-1 rounded-full border border-base-border text-texto-muted">
        ${categoria.nome}
        <button
          data-acao="remover-categoria"
          data-categoria-id="${categoria.id}"
          data-categoria-nome="${categoria.nome}"
          class="w-4 h-4 flex items-center justify-center rounded-full hover:bg-perigo/20 hover:text-perigo transition-colors"
          title="Remover categoria"
        >×</button>
      </span>
    `
    )
    .join("");
}

// ============================================================================
// FILTROS DE CATEGORIA (RF14)
// ============================================================================

export function renderizarFiltrosCategoria(container, categorias, categoriaAtiva) {
  const chipTodas = `
    <button data-categoria="" class="btn-filtro-categoria text-xs px-3 py-1.5 rounded-full border transition-colors ${
      !categoriaAtiva ? "bg-livre text-base-bg border-livre" : "border-base-border text-texto-muted hover:text-texto-principal"
    }">Todas</button>`;

  const chips = categorias
    .map((categoria) => {
      const ativa = categoriaAtiva === categoria.nome;
      return `
        <button data-categoria="${categoria.nome}" class="btn-filtro-categoria text-xs px-3 py-1.5 rounded-full border transition-colors ${
        ativa ? "bg-livre text-base-bg border-livre" : "border-base-border text-texto-muted hover:text-texto-principal"
      }">${categoria.nome}</button>`;
    })
    .join("");

  container.innerHTML = chipTodas + chips;
}

// ============================================================================
// CALENDÁRIO DIÁRIO — o painel principal do app
// ============================================================================

/**
 * Desenha a linha do tempo do dia: linhas de hora de fundo, os blocos de
 * atividades (fixas/transição/flexíveis) e os blocos de tempo livre,
 * todos posicionados de forma absoluta com base no horário.
 */
export function renderizarCalendarioDiario(container, { atividades, blocosLivres }) {
  const alturaTotalPx = MINUTO_INICIAL_VISIVEL * PX_POR_MINUTO;
  container.style.height = `${alturaTotalPx}px`;

  const linhasDeHora = [];
  for (let hora = 0; hora <= 24; hora++) {
    const top = hora * 60 * PX_POR_MINUTO;
    linhasDeHora.push(`
      <div class="linha-hora" style="top:${top}px">
        <span class="absolute -top-2 left-0 w-12 text-right pr-2 font-mono bg-base-surface">${String(hora).padStart(2, "0")}:00</span>
      </div>
    `);
  }

  const blocosLivresHtml = blocosLivres.map((bloco) => criarBlocoHtml({
    inicio: bloco.inicio,
    fim: bloco.fim,
    duracaoMinutos: bloco.duracaoMinutos,
    classeCss: "bloco-tempo--livre",
    rotulo: `${formatarDuracao(bloco.duracaoMinutos)} livre`,
  }));

  const atividadesHtml = atividades.map((atividade) => {
    const classePorTipo = {
      CompromissoFixo: "bloco-tempo--fixo",
      BlocoDeTransicao: "bloco-tempo--transicao",
      AtividadeFlexivel: "bloco-tempo--flexivel",
    }[atividade.tipo];

    return criarBlocoHtml({
      inicio: atividade.horaInicio,
      fim: atividade.horaFim,
      duracaoMinutos: atividade.duracaoMinutos(),
      classeCss: classePorTipo,
      rotulo: `${ICONE_POR_TIPO[atividade.tipo] || ""} ${atividade.nome}`,
      idAtividade: atividade.id,
      arrastavel: atividade.tipo === "AtividadeFlexivel",
    });
  });

  container.innerHTML = linhasDeHora.join("") + blocosLivresHtml.join("") + atividadesHtml.join("");
}

function criarBlocoHtml({ inicio, fim, duracaoMinutos, classeCss, rotulo, idAtividade = null, arrastavel = false }) {
  const topPx = Atividade.horaParaMinutos(inicio) * PX_POR_MINUTO;
  const alturaPx = Math.max(duracaoMinutos * PX_POR_MINUTO, 18);
  const classeCompacta = alturaPx < 34 ? "bloco-tempo--compacto" : "";
  const atributoId = idAtividade ? `data-atividade-id="${idAtividade}" data-arrastavel="${arrastavel}"` : "";
  const classeInterativa = idAtividade ? "cursor-pointer hover:brightness-125" : "";

  return `
    <div
      class="bloco-tempo ${classeCss} ${classeCompacta} ${classeInterativa}"
      style="top:${topPx}px; height:${alturaPx}px;"
      title="${rotulo} (${inicio}–${fim})"
      ${atributoId}
    >
      <span class="truncate block">${rotulo}</span>
      ${alturaPx >= 34 ? `<span class="block opacity-70 font-mono text-[0.65rem]">${inicio}–${fim}</span>` : ""}
    </div>
  `;
}

/** Posição de rolagem (em px) para abrir o calendário já mostrando o horário atual. */
export function calcularScrollInicial(horaAtual = new Date().getHours()) {
  return Math.max(0, (horaAtual - 1) * 60 * PX_POR_MINUTO);
}

// ============================================================================
// CURSOS E METAS (RF06-RF10, RF17, RF18)
// ============================================================================

export function renderizarCursos(container, cursos) {
  if (cursos.length === 0) {
    container.innerHTML = `<p class="text-xs text-texto-muted">Nenhum curso cadastrado ainda.</p>`;
    return;
  }

  container.innerHTML = cursos
    .map((curso) => {
      const emFuturo = curso.status === "futuro";
      const diasRestantes = curso.diasAtePrazo(new Date().toISOString().slice(0, 10));

      return `
        <div class="border border-base-border rounded-xl p-3" data-curso-id="${curso.id}">
          <div class="flex items-start justify-between gap-2">
            <div class="min-w-0">
              <p class="text-sm font-medium truncate">${curso.nome}</p>
              <p class="text-xs text-texto-muted">${curso.categoria}${emFuturo ? " · futuro" : ""}</p>
            </div>
            ${
              emFuturo
                ? `<button data-acao="ativar-curso" data-curso-id="${curso.id}" class="text-xs shrink-0 px-2 py-1 rounded-lg bg-flexivel/20 text-flexivel border border-flexivel/40">Ativar</button>`
                : ""
            }
          </div>

          ${
            !emFuturo
              ? `
            <div class="mt-2">
              <div class="h-1.5 rounded-full bg-base-surface2 overflow-hidden">
                <div class="h-full bg-livre" style="width:${curso.progressoPercentual()}%"></div>
              </div>
              <p class="text-xs text-texto-muted mt-1">
                ${formatarDuracao(curso.minutosRealizados())} de ${formatarDuracao(curso.cargaHorariaTotalMinutos)} concluídas
                ${diasRestantes !== null ? ` · ${diasRestantes >= 0 ? `${diasRestantes}d restantes` : "prazo vencido"}` : ""}
              </p>
            </div>
            <div class="flex items-center gap-2 mt-2">
              <button data-acao="registrar-execucao" data-curso-id="${curso.id}" class="text-xs px-2 py-1 rounded-lg border border-base-border hover:border-livre/50 text-texto-muted hover:text-texto-principal">Registrar tempo</button>
              <button data-acao="sugerir-distribuicao" data-curso-id="${curso.id}" class="text-xs px-2 py-1 rounded-lg border border-base-border hover:border-livre/50 text-texto-muted hover:text-texto-principal">Sugerir distribuição</button>
            </div>
          `
              : ""
          }
        </div>
      `;
    })
    .join("");
}

// ============================================================================
// LISTAS / PENDÊNCIAS / PROJETOS (RF15, RF16)
// ============================================================================

const RÓTULOS_TIPO_ITEM = { pendencia: "Pendências", projeto: "Projetos", ideia: "Ideias / Futuro" };

export function renderizarItens(container, itens) {
  if (itens.length === 0) {
    container.innerHTML = `<p class="text-xs text-texto-muted">Nenhuma pendência por aqui. 🎉</p>`;
    return;
  }

  const grupos = { pendencia: [], projeto: [], ideia: [] };
  itens.forEach((item) => grupos[item.tipo]?.push(item));

  container.innerHTML = Object.entries(grupos)
    .filter(([, lista]) => lista.length > 0)
    .map(
      ([tipo, lista]) => `
        <div>
          <p class="text-[0.65rem] uppercase tracking-wide text-texto-muted mb-1.5">${RÓTULOS_TIPO_ITEM[tipo]}</p>
          <div class="space-y-1.5">
            ${lista.map((item) => renderizarLinhaItem(item)).join("")}
          </div>
        </div>
      `
    )
    .join("");
}

function renderizarLinhaItem(item) {
  return `
    <div class="flex items-center gap-2 text-sm group" data-item-id="${item.id}">
      <input
        type="checkbox"
        data-acao="concluir-item"
        data-item-id="${item.id}"
        ${item.concluido ? "checked" : ""}
        class="w-3.5 h-3.5 accent-[var(--cor-livre)] shrink-0"
      />
      <span class="truncate flex-1 ${item.concluido ? "line-through text-texto-muted" : ""}">${item.nome}</span>
      ${
        !item.concluido && item.tipo !== "ideia"
          ? `<button data-acao="planejar-item" data-item-id="${item.id}" class="text-[0.65rem] shrink-0 text-livre opacity-0 group-hover:opacity-100 transition-opacity">planejar</button>`
          : ""
      }
      <button data-acao="remover-item" data-item-id="${item.id}" class="text-[0.65rem] shrink-0 text-perigo opacity-0 group-hover:opacity-100 transition-opacity">×</button>
    </div>
  `;
}

// ============================================================================
// ASSISTENTE — CHAT (RF19-RF23)
// ============================================================================

export function adicionarMensagemAssistente(container, texto, autor = "assistente") {
  const bolha = document.createElement("div");
  bolha.className =
    autor === "usuario"
      ? "ml-auto max-w-[85%] bg-livre text-base-bg rounded-xl rounded-tr-sm px-3 py-1.5"
      : "mr-auto max-w-[85%] bg-base-surface2 rounded-xl rounded-tl-sm px-3 py-1.5";
  bolha.textContent = texto;
  container.appendChild(bolha);
  container.scrollTop = container.scrollHeight;
  return bolha;
}

/** Cartão especial com a lista de sessões sugeridas + botão para aceitar (RF13). */
export function criarCartaoSugestoes(container, resultado, aoAceitar) {
  const { sugestoes, minutosNaoAlocados } = resultado;

  const cartao = document.createElement("div");
  cartao.className = "mr-auto max-w-[95%] bg-base-surface2 border border-base-border rounded-xl p-3 text-sm space-y-2";

  const listaHtml = sugestoes
    .map((s) => `<li>${formatarDataLegivel(s.data)} · ${s.horaInicio}–${s.horaFim} (${formatarDuracao(s.minutos)})</li>`)
    .join("");

  cartao.innerHTML = `
    <p class="font-medium">Proposta de distribuição</p>
    <ul class="list-disc list-inside text-texto-muted space-y-0.5">${listaHtml || "<li>Nenhum horário livre suficiente foi encontrado.</li>"}</ul>
    ${minutosNaoAlocados > 0 ? `<p class="text-perigo text-xs">${formatarDuracao(minutosNaoAlocados)} não couberam nos dias analisados.</p>` : ""}
    <div class="flex gap-2 pt-1">
      <button class="btn-aceitar-sugestoes text-xs px-3 py-1 rounded-lg bg-livre text-base-bg font-medium">Aceitar</button>
      <button class="btn-recusar-sugestoes text-xs px-3 py-1 rounded-lg border border-base-border text-texto-muted">Ignorar</button>
    </div>
  `;

  container.appendChild(cartao);
  container.scrollTop = container.scrollHeight;

  cartao.querySelector(".btn-aceitar-sugestoes").addEventListener("click", () => {
    aoAceitar();
    cartao.querySelectorAll("button").forEach((botao) => (botao.disabled = true));
    cartao.classList.add("opacity-50");
  });
  cartao.querySelector(".btn-recusar-sugestoes").addEventListener("click", () => {
    cartao.querySelectorAll("button").forEach((botao) => (botao.disabled = true));
    cartao.classList.add("opacity-50");
  });
}

// ============================================================================
// TOASTS (feedback rápido de ações)
// ============================================================================

export function mostrarToast(container, mensagem, tipo = "info") {
  const cores = { info: "border-base-border", sucesso: "border-flexivel text-flexivel", erro: "border-perigo text-perigo" };
  const toast = document.createElement("div");
  toast.className = `bg-base-surface border ${cores[tipo]} rounded-xl px-4 py-2 text-sm shadow-lg`;
  toast.textContent = mensagem;
  container.appendChild(toast);
  setTimeout(() => {
    toast.style.opacity = "0";
    setTimeout(() => toast.remove(), 300);
  }, 3200);
}
