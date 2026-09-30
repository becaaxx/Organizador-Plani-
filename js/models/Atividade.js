/**
 * Atividade.js
 * ---------------------------------------------------------------------------
 * Classe BASE de todo o domínio do app.
 *
 * Conforme a Seção 15-A dos requisitos, tudo que ocupa um horário no
 * calendário é, no fundo, uma "Atividade". O que muda entre os tipos é o
 * COMPORTAMENTO: um compromisso fixo é inegociável, um bloco de transição é
 * um "tempo de apoio", e uma atividade flexível pode ser movida pelo motor
 * de sugestões. Por isso usamos herança: a classe base guarda os dados e as
 * regras comuns (id, horário, duração, conflito), e cada subclasse
 * (CompromissoFixo, BlocoDeTransicao, AtividadeFlexivel) adiciona só o que é
 * específico dela.
 *
 * Estudo sugerido: repare que NENHUM método aqui sabe desenhar HTML ou ler o
 * localStorage. Essa classe só entende "o que é uma atividade", não "onde
 * ela é guardada" nem "como ela aparece na tela". Essa separação de
 * responsabilidades é o que permite trocar a camada de armazenamento (ver
 * RepositorioService.js) ou a interface sem quebrar as regras de negócio.
 */

export class Atividade {
  /**
   * @param {Object} dados
   * @param {string} [dados.id] - Identificador único. Se não vier, é gerado.
   * @param {string} dados.nome - Nome da atividade (ex: "Faculdade").
   * @param {string} dados.categoria - Categoria criada pelo usuário (livre).
   * @param {string} dados.data - Data no formato 'YYYY-MM-DD'.
   * @param {string} dados.horaInicio - Horário no formato 'HH:MM' (24h).
   * @param {string} dados.horaFim - Horário no formato 'HH:MM' (24h).
   * @param {boolean} [dados.recorrente=false] - Se repete semanalmente (RF03).
   * @param {number[]} [dados.diasRecorrencia=[]] - Dias da semana (0=domingo
   *        ... 6=sábado) em que a recorrência se aplica, se recorrente=true.
   */
  constructor({
    id,
    nome,
    categoria,
    data,
    horaInicio,
    horaFim,
    recorrente = false,
    diasRecorrencia = [],
  }) {
    // Toda classe filha chama super(dados) e cai aqui primeiro.
    this.id = id || Atividade.gerarId();
    this.nome = nome;
    this.categoria = categoria || "Sem categoria";
    this.data = data;
    this.horaInicio = horaInicio;
    this.horaFim = horaFim;
    this.recorrente = recorrente;
    this.diasRecorrencia = diasRecorrencia;

    // 'tipo' identifica a subclasse quando o objeto é lido de volta do
    // localStorage como JSON puro (JSON não sabe o que é uma classe).
    // Cada subclasse sobrescreve isso no seu próprio construtor.
    this.tipo = "Atividade";
  }

  /** Gera um id simples e único o bastante para uso local (sem back-end). */
  static gerarId() {
    return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
  }

  /** Converte 'HH:MM' em minutos desde a meia-noite. Ex: '01:30' -> 90. */
  static horaParaMinutos(horaStr) {
    const [h, m] = horaStr.split(":").map(Number);
    return h * 60 + m;
  }

  /** Converte minutos desde a meia-noite de volta para 'HH:MM'. */
  static minutosParaHora(totalMinutos) {
    const h = Math.floor(totalMinutos / 60) % 24;
    const m = totalMinutos % 60;
    return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
  }

  /** Duração da atividade em minutos. */
  duracaoMinutos() {
    return Atividade.horaParaMinutos(this.horaFim) - Atividade.horaParaMinutos(this.horaInicio);
  }

  /**
   * Verifica se esta atividade ocupa a data informada — considerando
   * recorrência semanal (RF03). 'dataISO' está no formato 'YYYY-MM-DD'.
   */
  ocorreEm(dataISO) {
    if (!this.recorrente) {
      return this.data === dataISO;
    }
    const diaDaSemana = new Date(`${dataISO}T00:00:00`).getDay();
    return this.diasRecorrencia.includes(diaDaSemana);
  }

  /** Checa sobreposição de horário com outra atividade no mesmo dia. */
  sobrepoe(outraAtividade) {
    const inicioA = Atividade.horaParaMinutos(this.horaInicio);
    const fimA = Atividade.horaParaMinutos(this.horaFim);
    const inicioB = Atividade.horaParaMinutos(outraAtividade.horaInicio);
    const fimB = Atividade.horaParaMinutos(outraAtividade.horaFim);
    return inicioA < fimB && inicioB < fimA;
  }

  /**
   * Serializa a instância para um objeto simples (pronto para JSON).
   * Subclasses devem chamar super.paraJSON() e ACRESCENTAR seus campos.
   */
  paraJSON() {
    return {
      id: this.id,
      tipo: this.tipo,
      nome: this.nome,
      categoria: this.categoria,
      data: this.data,
      horaInicio: this.horaInicio,
      horaFim: this.horaFim,
      recorrente: this.recorrente,
      diasRecorrencia: this.diasRecorrencia,
    };
  }
}
