/**
 * Curso.js
 * ---------------------------------------------------------------------------
 * Cobre RF06 (cursos ativos), RF07 (registro de execução), RF08 (progresso
 * em horas), RF09 (metas), RF10 (tempo restante) e RF17 (cursos futuros).
 *
 * Por que Curso NÃO herda de Atividade?
 * Uma Atividade tem um horário específico num dia específico (data +
 * horaInicio + horaFim). Um Curso é diferente: ele é uma META que vive ao
 * longo de várias semanas ("20 horas de inglês até dia 30"), sem um
 * horário fixo próprio. Quem tem horário são as SESSÕES DE ESTUDO desse
 * curso, que no calendário são criadas como objetos AtividadeFlexivel
 * (com um campo `cursoId` apontando de volta para este Curso).
 *
 * Ou seja: Curso = "o que eu quero atingir".
 *          AtividadeFlexivel(cursoId=X) = "quando eu vou trabalhar nisso".
 *
 * O campo `status` implementa RF17/RF18: um curso pode existir como
 * 'futuro' (guardado, sem ocupar hora nenhuma no calendário) até o usuário
 * decidir "ativá-lo" — só então o GerenciadorDeSugestoes passa a alocar
 * horário livre para ele.
 */
export class Curso {
  /**
   * @param {Object} dados
   * @param {string} [dados.id]
   * @param {string} dados.nome - Ex: "Inglês (curso online)".
   * @param {string} dados.categoria - Categoria livre, criada pelo usuário.
   * @param {number} dados.cargaHorariaTotalMinutos - Carga horária total do
   *        curso/meta, em minutos (ex: 20h = 1200).
   * @param {string|null} [dados.prazo=null] - Data limite 'YYYY-MM-DD'.
   * @param {'futuro'|'ativo'|'concluido'} [dados.status='futuro'] - RF17/RF18.
   * @param {Array} [dados.registrosDeExecucao=[]] - Histórico de horas
   *        realizadas: [{ data: 'YYYY-MM-DD', minutos: number, obs?: string }]
   */
  constructor({
    id,
    nome,
    categoria,
    cargaHorariaTotalMinutos,
    prazo = null,
    status = "futuro",
    registrosDeExecucao = [],
  }) {
    this.id = id || `curso-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
    this.nome = nome;
    this.categoria = categoria || "Sem categoria";
    this.cargaHorariaTotalMinutos = cargaHorariaTotalMinutos;
    this.prazo = prazo;
    this.status = status; // 'futuro' | 'ativo' | 'concluido'
    this.registrosDeExecucao = registrosDeExecucao;
  }

  /** RF18: promove um curso futuro para ativo (passa a receber horários). */
  ativar() {
    this.status = "ativo";
  }

  /** RF07: registra tempo efetivamente realizado numa data. */
  registrarExecucao(dataISO, minutos, observacao = "") {
    this.registrosDeExecucao.push({ data: dataISO, minutos, obs: observacao });
    if (this.minutosRestantes() <= 0) {
      this.status = "concluido";
    }
  }

  /** RF08: soma de todos os minutos já realizados. */
  minutosRealizados() {
    return this.registrosDeExecucao.reduce((soma, registro) => soma + registro.minutos, 0);
  }

  /** RF10: quanto ainda falta para bater a carga horária total. */
  minutosRestantes() {
    return Math.max(0, this.cargaHorariaTotalMinutos - this.minutosRealizados());
  }

  /** RF08: progresso em percentual (0 a 100), já arredondado para exibição. */
  progressoPercentual() {
    if (this.cargaHorariaTotalMinutos <= 0) return 0;
    return Math.min(100, Math.round((this.minutosRealizados() / this.cargaHorariaTotalMinutos) * 100));
  }

  /** Quantos dias faltam até o prazo (null se não houver prazo definido). */
  diasAtePrazo(dataReferenciaISO) {
    if (!this.prazo) return null;
    const hoje = new Date(`${dataReferenciaISO}T00:00:00`);
    const limite = new Date(`${this.prazo}T00:00:00`);
    const diffMs = limite - hoje;
    return Math.ceil(diffMs / (1000 * 60 * 60 * 24));
  }

  paraJSON() {
    return {
      id: this.id,
      nome: this.nome,
      categoria: this.categoria,
      cargaHorariaTotalMinutos: this.cargaHorariaTotalMinutos,
      prazo: this.prazo,
      status: this.status,
      registrosDeExecucao: this.registrosDeExecucao,
    };
  }
}
