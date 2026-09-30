/**
 * ItemLista.js
 * ---------------------------------------------------------------------------
 * Cobre RF15 (listas/pendências), RF16 (projetos) e parte do conceito
 * central do produto (Seção 3): "Ideias/Futuro -> Projetos/Pendências ->
 * Planejamento -> Calendário Executado".
 *
 * Um ItemLista é DE PROPÓSITO algo sem horário. Ele só ganha um horário no
 * dia em que o usuário decide "planejar" aquilo — nesse momento o
 * AppController cria uma AtividadeFlexivel a partir dele (RF18: "Ativação
 * de curso/projeto").
 *
 * `tipo` aqui distingue: 'pendencia' (tarefa solta), 'projeto' (agrupa
 * várias pendências, RF16) ou 'ideia' (algo só anotado para o futuro).
 */
export class ItemLista {
  /**
   * @param {Object} dados
   * @param {string} [dados.id]
   * @param {string} dados.nome
   * @param {string} dados.categoria
   * @param {'pendencia'|'projeto'|'ideia'} [dados.tipo='pendencia']
   * @param {string|null} [dados.projetoId=null] - se essa pendência
   *        pertence a um projeto (RF16), guarda o id do projeto-pai.
   * @param {string} [dados.notas='']
   * @param {boolean} [dados.concluido=false]
   */
  constructor({ id, nome, categoria, tipo = "pendencia", projetoId = null, notas = "", concluido = false }) {
    this.id = id || `item-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
    this.nome = nome;
    this.categoria = categoria || "Sem categoria";
    this.tipo = tipo;
    this.projetoId = projetoId;
    this.notas = notas;
    this.concluido = concluido;
    this.criadoEm = new Date().toISOString();
  }

  paraJSON() {
    return {
      id: this.id,
      nome: this.nome,
      categoria: this.categoria,
      tipo: this.tipo,
      projetoId: this.projetoId,
      notas: this.notas,
      concluido: this.concluido,
      criadoEm: this.criadoEm,
    };
  }
}
