/**
 * CompromissoFixo.js
 * ---------------------------------------------------------------------------
 * Representa algo INEGOCIÁVEL no tempo: faculdade, trabalho, igreja, academia
 * com horário marcado, etc. (RF01, RF02, RF03).
 *
 * O Motor de Tempo NUNCA move um CompromissoFixo. Ele é sempre "bloqueado"
 * na grade do dia antes de qualquer cálculo de horário livre.
 */
import { Atividade } from "./Atividade.js";

export class CompromissoFixo extends Atividade {
  constructor(dados) {
    super(dados); // reaproveita toda a lógica comum da classe base
    this.tipo = "CompromissoFixo";
    this.negociavel = false; // documenta a regra: isso nunca é sugerido para mover
  }
}
