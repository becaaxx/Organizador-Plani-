/**
 * BlocoDeTransicao.js
 * ---------------------------------------------------------------------------
 * Representa "tempo de apoio": deslocamento, banho, alimentação, etc (RF04).
 * Estruturalmente é muito parecido com CompromissoFixo (também bloqueia a
 * grade do Motor de Tempo), mas mantemos como classe separada porque:
 *   1) semanticamente é uma coisa diferente (apoio, não compromisso em si);
 *   2) no futuro (ver Seção 13 - Evolução futura), podemos querer que a IA
 *      sugira AUTOMATICAMENTE blocos de transição entre dois compromissos
 *      (ex: detectar "faculdade -> academia" e sugerir 30min de deslocamento).
 *      Ter uma classe própria facilita identificar e gerar esses blocos.
 */
import { Atividade } from "./Atividade.js";

export class BlocoDeTransicao extends Atividade {
  /**
   * @param {Object} dados - os mesmos campos de Atividade, mais:
   * @param {string} [dados.tipoTransicao='geral'] - ex: 'deslocamento',
   *        'banho', 'alimentacao'. Livre, só para exibição/filtros.
   */
  constructor(dados) {
    super(dados);
    this.tipo = "BlocoDeTransicao";
    this.tipoTransicao = dados.tipoTransicao || "geral";
  }

  paraJSON() {
    return {
      ...super.paraJSON(),
      tipoTransicao: this.tipoTransicao,
    };
  }
}
