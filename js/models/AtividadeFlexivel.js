/**
 * AtividadeFlexivel.js
 * ---------------------------------------------------------------------------
 * Representa algo MALEÁVEL: estudos, projetos, tarefas com duração mas sem
 * um horário "sagrado" (RF01, RF11, RF12, RF13, RF22).
 *
 * Diferente de CompromissoFixo, uma AtividadeFlexivel PODE ser realocada
 * pelo GerenciadorDeSugestoes quando:
 *   - o usuário pede uma redistribuição ("não consegui estudar na quarta");
 *   - a rotina muda e sobra/falta tempo livre em outro dia;
 *   - o usuário aceita uma sugestão de distribuição (RF11).
 *
 * Importante (RF13): o motor SUGERE, o usuário DECIDE. Por isso esta classe
 * não se move sozinha — ela só tem os dados; quem decide mover é o
 * GerenciadorDeSugestoes + a confirmação do usuário na interface.
 */
import { Atividade } from "./Atividade.js";

export class AtividadeFlexivel extends Atividade {
  /**
   * @param {Object} dados - os mesmos campos de Atividade, mais:
   * @param {number} [dados.prioridade=2] - 1 (alta) a 3 (baixa). Usado pelo
   *        GerenciadorDeSugestoes para decidir o que alocar primeiro quando
   *        o tempo livre é escasso.
   * @param {string|null} [dados.prazo=null] - Data limite opcional
   *        ('YYYY-MM-DD'), usada em metas e redistribuições (RF09, RF22).
   */
  constructor(dados) {
    super(dados);
    this.tipo = "AtividadeFlexivel";
    this.prioridade = dados.prioridade ?? 2;
    this.prazo = dados.prazo ?? null;
    this.negociavel = true; // documenta a regra: isso PODE ser sugerido para mover
  }

  paraJSON() {
    return {
      ...super.paraJSON(),
      prioridade: this.prioridade,
      prazo: this.prazo,
    };
  }
}
