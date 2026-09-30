/**
 * Formularios.js
 * ---------------------------------------------------------------------------
 * Templates HTML dos formulários exibidos dentro do modal genérico
 * (#modal-overlay / #modal-conteudo, em index.html). Continuam sendo
 * "camada de visualização": só montam HTML a partir de dados (ex: lista de
 * categorias) — quem interpreta o envio do formulário e chama o
 * AppController é o app.js.
 */

export const VALOR_NOVA_CATEGORIA = "__nova_categoria__";

function opcoesCategorias(categorias, categoriaSelecionada = "") {
  const opcoesExistentes = categorias
    .map((c) => `<option value="${c.nome}" ${c.nome === categoriaSelecionada ? "selected" : ""}>${c.nome}</option>`)
    .join("");

  // Sentinela especial: quando o usuário escolhe esta opção, app.js detecta
  // o valor VALOR_NOVA_CATEGORIA no evento "change" do <select>, pede o
  // nome (prompt) e cria a categoria na hora via controller.criarCategoria,
  // sem precisar fechar o formulário atual (Requisito 1 — categorias
  // dinâmicas, criáveis de dentro de qualquer modal).
  const opcaoNovaCategoria = `<option value="${VALOR_NOVA_CATEGORIA}">+ Criar nova categoria…</option>`;

  return opcoesExistentes + opcaoNovaCategoria;
}

const DIAS_SEMANA = [
  { valor: 0, rotulo: "D" },
  { valor: 1, rotulo: "S" },
  { valor: 2, rotulo: "T" },
  { valor: 3, rotulo: "Q" },
  { valor: 4, rotulo: "Q" },
  { valor: 5, rotulo: "S" },
  { valor: 6, rotulo: "S" },
];

/** RF01/RF02/RF03/RF04: formulário unificado para CompromissoFixo, BlocoDeTransicao e AtividadeFlexivel. */
export function formularioNovaAtividade(categorias, dataPadrao) {
  return `
    <h3 class="font-display font-semibold mb-4">Nova atividade</h3>
    <form id="form-nova-atividade" class="space-y-3 text-sm">
      <div>
        <label class="block text-xs text-texto-muted mb-1">Tipo</label>
        <select name="tipo" id="select-tipo-atividade" class="w-full bg-base-surface2 border border-base-border rounded-lg px-3 py-2">
          <option value="CompromissoFixo">Compromisso fixo (inegociável)</option>
          <option value="BlocoDeTransicao">Bloco de transição (deslocamento, banho...)</option>
          <option value="AtividadeFlexivel">Atividade flexível (pode ser redistribuída)</option>
        </select>
      </div>

      <div>
        <label class="block text-xs text-texto-muted mb-1">Nome</label>
        <input name="nome" required placeholder="Ex: Faculdade" class="w-full bg-base-surface2 border border-base-border rounded-lg px-3 py-2" />
      </div>

      <div>
        <label class="block text-xs text-texto-muted mb-1">Categoria</label>
        <select name="categoria" class="w-full bg-base-surface2 border border-base-border rounded-lg px-3 py-2">
          ${opcoesCategorias(categorias)}
        </select>
      </div>

      <div class="grid grid-cols-3 gap-2">
        <div class="col-span-1">
          <label class="block text-xs text-texto-muted mb-1">Data</label>
          <input type="date" name="data" required value="${dataPadrao}" class="w-full bg-base-surface2 border border-base-border rounded-lg px-2 py-2" />
        </div>
        <div>
          <label class="block text-xs text-texto-muted mb-1">Início</label>
          <input type="time" name="horaInicio" required value="09:00" class="w-full bg-base-surface2 border border-base-border rounded-lg px-2 py-2" />
        </div>
        <div>
          <label class="block text-xs text-texto-muted mb-1">Fim</label>
          <input type="time" name="horaFim" required value="10:00" class="w-full bg-base-surface2 border border-base-border rounded-lg px-2 py-2" />
        </div>
      </div>

      <div>
        <label class="flex items-center gap-2 text-xs text-texto-muted">
          <input type="checkbox" name="recorrente" id="chk-recorrente" class="accent-[var(--cor-livre)]" />
          Repete semanalmente (RF03)
        </label>
        <div id="dias-recorrencia" class="hidden flex gap-1 mt-2">
          ${DIAS_SEMANA.map(
            (d) => `
            <label class="w-7 h-7 flex items-center justify-center rounded-lg border border-base-border text-xs cursor-pointer has-[:checked]:bg-livre has-[:checked]:text-base-bg has-[:checked]:border-livre">
              <input type="checkbox" name="diasRecorrencia" value="${d.valor}" class="hidden" />${d.rotulo}
            </label>`
          ).join("")}
        </div>
      </div>

      <button type="submit" class="w-full mt-2 bg-livre text-base-bg font-medium rounded-lg py-2 hover:opacity-90 transition-opacity">Salvar</button>
    </form>
  `;
}

/** RF06/RF09/RF17: formulário para um novo curso ou meta. */
export function formularioNovoCurso(categorias) {
  return `
    <h3 class="font-display font-semibold mb-4">Novo curso / meta</h3>
    <form id="form-novo-curso" class="space-y-3 text-sm">
      <div>
        <label class="block text-xs text-texto-muted mb-1">Nome</label>
        <input name="nome" required placeholder="Ex: Inglês — 20h" class="w-full bg-base-surface2 border border-base-border rounded-lg px-3 py-2" />
      </div>
      <div>
        <label class="block text-xs text-texto-muted mb-1">Categoria</label>
        <select name="categoria" class="w-full bg-base-surface2 border border-base-border rounded-lg px-3 py-2">
          ${opcoesCategorias(categorias)}
        </select>
      </div>
      <div class="grid grid-cols-2 gap-2">
        <div>
          <label class="block text-xs text-texto-muted mb-1">Carga horária total (h)</label>
          <input type="number" min="1" step="0.5" name="cargaHoras" required value="20" class="w-full bg-base-surface2 border border-base-border rounded-lg px-3 py-2" />
        </div>
        <div>
          <label class="block text-xs text-texto-muted mb-1">Prazo</label>
          <input type="date" name="prazo" class="w-full bg-base-surface2 border border-base-border rounded-lg px-3 py-2" />
        </div>
      </div>
      <div>
        <label class="block text-xs text-texto-muted mb-1">Status inicial</label>
        <select name="status" class="w-full bg-base-surface2 border border-base-border rounded-lg px-3 py-2">
          <option value="ativo">Ativo (já ocupa horários sugeridos)</option>
          <option value="futuro">Futuro (guardado, sem ocupar calendário) — RF17</option>
        </select>
      </div>
      <button type="submit" class="w-full mt-2 bg-livre text-base-bg font-medium rounded-lg py-2 hover:opacity-90 transition-opacity">Salvar</button>
    </form>
  `;
}

/** RF15/RF16: formulário para uma pendência, projeto ou ideia. */
export function formularioNovoItem(categorias) {
  return `
    <h3 class="font-display font-semibold mb-4">Nova pendência / projeto / ideia</h3>
    <form id="form-novo-item" class="space-y-3 text-sm">
      <div>
        <label class="block text-xs text-texto-muted mb-1">Nome</label>
        <input name="nome" required placeholder="Ex: Organizar portfólio" class="w-full bg-base-surface2 border border-base-border rounded-lg px-3 py-2" />
      </div>
      <div>
        <label class="block text-xs text-texto-muted mb-1">Categoria</label>
        <select name="categoria" class="w-full bg-base-surface2 border border-base-border rounded-lg px-3 py-2">
          ${opcoesCategorias(categorias)}
        </select>
      </div>
      <div>
        <label class="block text-xs text-texto-muted mb-1">Tipo</label>
        <select name="tipo" class="w-full bg-base-surface2 border border-base-border rounded-lg px-3 py-2">
          <option value="pendencia">Pendência</option>
          <option value="projeto">Projeto</option>
          <option value="ideia">Ideia / futuro</option>
        </select>
      </div>
      <button type="submit" class="w-full mt-2 bg-livre text-base-bg font-medium rounded-lg py-2 hover:opacity-90 transition-opacity">Salvar</button>
    </form>
  `;
}

/** Mini formulário usado para "planejar" um item da lista (RF18) ou registrar execução de curso (RF07). */
export function formularioPlanejarItem(nomeItem, dataPadrao) {
  return `
    <h3 class="font-display font-semibold mb-1">Planejar</h3>
    <p class="text-xs text-texto-muted mb-4">"${nomeItem}" vai virar uma atividade no calendário.</p>
    <form id="form-planejar-item" class="space-y-3 text-sm">
      <div class="grid grid-cols-3 gap-2">
        <div class="col-span-1">
          <label class="block text-xs text-texto-muted mb-1">Data</label>
          <input type="date" name="data" required value="${dataPadrao}" class="w-full bg-base-surface2 border border-base-border rounded-lg px-2 py-2" />
        </div>
        <div>
          <label class="block text-xs text-texto-muted mb-1">Início</label>
          <input type="time" name="horaInicio" required value="09:00" class="w-full bg-base-surface2 border border-base-border rounded-lg px-2 py-2" />
        </div>
        <div>
          <label class="block text-xs text-texto-muted mb-1">Fim</label>
          <input type="time" name="horaFim" required value="10:00" class="w-full bg-base-surface2 border border-base-border rounded-lg px-2 py-2" />
        </div>
      </div>
      <button type="submit" class="w-full mt-2 bg-livre text-base-bg font-medium rounded-lg py-2 hover:opacity-90 transition-opacity">Planejar</button>
    </form>
  `;
}

export function formularioRegistrarExecucao(nomeCurso) {
  return `
    <h3 class="font-display font-semibold mb-1">Registrar tempo</h3>
    <p class="text-xs text-texto-muted mb-4">Quanto tempo você realizou em "${nomeCurso}"?</p>
    <form id="form-registrar-execucao" class="space-y-3 text-sm">
      <div class="grid grid-cols-2 gap-2">
        <div>
          <label class="block text-xs text-texto-muted mb-1">Data</label>
          <input type="date" name="data" required value="${new Date().toISOString().slice(0, 10)}" class="w-full bg-base-surface2 border border-base-border rounded-lg px-3 py-2" />
        </div>
        <div>
          <label class="block text-xs text-texto-muted mb-1">Minutos</label>
          <input type="number" name="minutos" min="1" required placeholder="Ex: 45" class="w-full bg-base-surface2 border border-base-border rounded-lg px-3 py-2" />
        </div>
      </div>
      <button type="submit" class="w-full mt-2 bg-livre text-base-bg font-medium rounded-lg py-2 hover:opacity-90 transition-opacity">Registrar</button>
    </form>
  `;
}
