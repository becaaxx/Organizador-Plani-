/**
 * MotorDeTempo.js
 * ---------------------------------------------------------------------------
 * O CORAÇÃO do app. Implementa exatamente o algoritmo descrito na Seção
 * 15-B dos requisitos: o dia é dividido em fatias (slots) de 15 minutos.
 * 24h * 60min / 15min = 96 slots por dia.
 *
 * Por que 15 minutos e não calcular direto com "hora de início/hora de fim"
 * comparando intervalos? Porque comparar intervalos sobrepostos na mão fica
 * complicado rápido (compromissos que se tocam, que ficam contidos um no
 * outro, transições encostadas, etc). Transformar o dia num ARRAY e
 * simplesmente "pintar" cada slot ocupado é muito mais simples de entender,
 * testar e depurar — o preço é uma pequena perda de precisão (múltiplos de
 * 15min), o que é mais que aceitável para organização pessoal.
 *
 * Fluxo de uso típico (veja também AppController.js):
 *   const motor = new MotorDeTempo('2026-09-22');
 *   motor.aplicarBloqueios([...compromissosFixos, ...blocosDeTransicao]);
 *   const livres = motor.calcularBlocosLivres();
 *   const totalLivre = motor.calcularTotalMinutosLivres();
 */
import { Atividade } from "../models/Atividade.js";

const MINUTOS_POR_SLOT = 15;
const SLOTS_POR_DIA = (24 * 60) / MINUTOS_POR_SLOT; // 96

export class MotorDeTempo {
  /** @param {string} dataISO - data (YYYY-MM-DD) para a qual calcular a grade. */
  constructor(dataISO) {
    this.dataISO = dataISO;
    this.grade = this._gerarGradeVazia();
  }

  /**
   * Gera o array de 96 posições representando o dia inteiro. Cada posição
   * é um "slot" de 15 minutos, inicialmente livre.
   */
  _gerarGradeVazia() {
    const grade = [];
    for (let i = 0; i < SLOTS_POR_DIA; i++) {
      grade.push({
        inicioMinutos: i * MINUTOS_POR_SLOT,
        ocupado: false,
        atividadeId: null,
        tipoOcupacao: null, // 'CompromissoFixo' | 'BlocoDeTransicao'
      });
    }
    return grade;
  }

  /**
   * "Sobrepõe" (overlay) uma lista de atividades bloqueantes na grade.
   * Recebe CompromissoFixo e/ou BlocoDeTransicao — atividades flexíveis
   * NÃO entram aqui, porque elas não bloqueiam tempo de forma definitiva
   * (são o que o motor tenta encaixar nos espaços livres).
   *
   * @param {Array} atividadesBloqueantes - instâncias de Atividade (ou
   *        subclasse) que ocorrem neste dia.
   */
  aplicarBloqueios(atividadesBloqueantes) {
    const doDia = atividadesBloqueantes.filter((atividade) => atividade.ocorreEm(this.dataISO));

    for (const atividade of doDia) {
      const inicioSlot = Math.floor(Atividade.horaParaMinutos(atividade.horaInicio) / MINUTOS_POR_SLOT);
      const fimSlot = Math.ceil(Atividade.horaParaMinutos(atividade.horaFim) / MINUTOS_POR_SLOT);

      for (let i = inicioSlot; i < fimSlot && i < SLOTS_POR_DIA; i++) {
        if (i < 0) continue;
        this.grade[i].ocupado = true;
        this.grade[i].atividadeId = atividade.id;
        this.grade[i].tipoOcupacao = atividade.tipo;
      }
    }
    return this; // permite encadear: motor.aplicarBloqueios(x).calcularBlocosLivres()
  }

  /**
   * Varre a grade e agrupa slots livres ADJACENTES em blocos contínuos.
   * É aqui que "6 horas livres" vira, de fato, um intervalo utilizável
   * (ex: 14:00–20:00), em vez de 24 fatias soltas de 15min.
   *
   * @returns {Array<{inicio: string, fim: string, duracaoMinutos: number}>}
   */
  calcularBlocosLivres() {
    const blocos = [];
    let blocoAtual = null;

    for (const slot of this.grade) {
      if (!slot.ocupado) {
        if (!blocoAtual) {
          blocoAtual = { inicioMinutos: slot.inicioMinutos, fimMinutos: slot.inicioMinutos + MINUTOS_POR_SLOT };
        } else {
          blocoAtual.fimMinutos = slot.inicioMinutos + MINUTOS_POR_SLOT;
        }
      } else if (blocoAtual) {
        blocos.push(blocoAtual);
        blocoAtual = null;
      }
    }
    if (blocoAtual) blocos.push(blocoAtual);

    return blocos.map((bloco) => ({
      inicio: Atividade.minutosParaHora(bloco.inicioMinutos),
      fim: Atividade.minutosParaHora(bloco.fimMinutos),
      duracaoMinutos: bloco.fimMinutos - bloco.inicioMinutos,
    }));
  }

  /** Soma total de minutos livres no dia (RF05). */
  calcularTotalMinutosLivres() {
    return this.grade.filter((slot) => !slot.ocupado).length * MINUTOS_POR_SLOT;
  }

  /** Percentual do dia já ocupado (0 a 100) — útil para uma barra visual. */
  calcularPercentualOcupado() {
    const ocupados = this.grade.filter((slot) => slot.ocupado).length;
    return Math.round((ocupados / SLOTS_POR_DIA) * 100);
  }
}

export { MINUTOS_POR_SLOT, SLOTS_POR_DIA };
