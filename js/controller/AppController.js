/**
 * AppController.js
 * ---------------------------------------------------------------------------
 * É o "cérebro" que conecta todas as camadas:
 *
 *   UI (Renderizador.js)  <-->  AppController  <-->  RepositorioService (localStorage)
 *                                     |
 *                                     +--> MotorDeTempo (cálculo de disponibilidade)
 *                                     +--> GerenciadorDeSugestoes (distribuição)
 *                                     +--> Assistente (linguagem natural)
 *
 * A UI NUNCA fala diretamente com o RepositorioService, com o MotorDeTempo
 * ou com o Assistente — ela só chama métodos do AppController, que decide
 * o que fazer. Isso é o que a Seção 15-D chama de "o controlador principal
 * recebe a intenção, valida as regras e aplica no calendário": este
 * arquivo é esse controlador.
 */
import { RepositorioService } from "../services/RepositorioService.js";
import { CompromissoFixo } from "../models/CompromissoFixo.js";
import { BlocoDeTransicao } from "../models/BlocoDeTransicao.js";
import { AtividadeFlexivel } from "../models/AtividadeFlexivel.js";
import { Curso } from "../models/Curso.js";
import { ItemLista } from "../models/ItemLista.js";
import { criarAtividadeApartirDeJSON } from "../models/FabricaDeAtividades.js";
import { MotorDeTempo } from "../core/MotorDeTempo.js";
import { GerenciadorDeSugestoes } from "../core/GerenciadorDeSugestoes.js";
import { Assistente } from "../core/Assistente.js";
import { hojeISO, somarDias, intervaloDeDias, inicioDaSemana, fimDaSemana, proximaDataParaDiaSemana, capitalizarPrimeiraLetra } from "../utils/DataUtils.js";

export class AppController {
  constructor() {
    // Um repositório por "coleção" de dados — Repository Pattern (Seção 15-C).
    this.repoAtividades = new RepositorioService("atividades");
    this.repoCursos = new RepositorioService("cursos");
    this.repoItens = new RepositorioService("itens");
    this.repoCategorias = new RepositorioService("categorias");

    // Estado de navegação da UI (não é "dado de negócio", por isso fica
    // aqui no controller e não num repositório).
    this.dataSelecionada = hojeISO();
    this.filtroCategoria = null; // RF14

    // Importante: esta V1 NÃO semeia nenhum dado de exemplo. O app começa
    // totalmente vazio (calendário, cursos, listas e categorias) na
    // primeira execução — o próprio usuário cria tudo pela interface.
  }

  // =========================================================================
  // CATEGORIAS (Seção 10 — totalmente livres, criadas pelo usuário)
  // =========================================================================

  listarCategorias() {
    return this.repoCategorias.listarTudo(); // [{id, nome}]
  }

  /** Cria uma categoria nova. Se já existir uma com o mesmo nome (sem diferenciar
   *  maiúsculas/minúsculas), devolve a existente em vez de duplicar. */
  criarCategoria(nome) {
    const nomeLimpo = nome.trim();
    const existente = this.repoCategorias.listarTudo().find((c) => c.nome.toLowerCase() === nomeLimpo.toLowerCase());
    if (existente) return existente;

    const categoria = { id: `cat-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`, nome: nomeLimpo };
    this.repoCategorias.salvar(categoria);
    return categoria;
  }

  removerCategoria(id) {
    this.repoCategorias.remover(id);
  }

  // =========================================================================
  // ATIVIDADES (CompromissoFixo, BlocoDeTransicao, AtividadeFlexivel)
  // =========================================================================

  /** Devolve TODAS as atividades já como instâncias de classe (não JSON cru). */
  listarAtividades() {
    return this.repoAtividades.listarTudo().map(criarAtividadeApartirDeJSON);
  }

  /**
   * RF14: atividades que ocorrem num dia específico, já considerando
   * recorrência (RF03) e, opcionalmente, o filtro de categoria ativo.
   * O filtro de categoria NUNCA altera o que está salvo — só a visualização.
   */
  obterAtividadesDoDia(dataISO, { aplicarFiltroCategoria = true } = {}) {
    let atividades = this.listarAtividades().filter((atividade) => atividade.ocorreEm(dataISO));
    if (aplicarFiltroCategoria && this.filtroCategoria) {
      atividades = atividades.filter((atividade) => atividade.categoria === this.filtroCategoria);
    }
    return atividades;
  }

  criarCompromissoFixo(dados) {
    const instancia = new CompromissoFixo(dados);
    this.repoAtividades.salvar(instancia.paraJSON());
    return instancia;
  }

  criarBlocoDeTransicao(dados) {
    const instancia = new BlocoDeTransicao(dados);
    this.repoAtividades.salvar(instancia.paraJSON());
    return instancia;
  }

  criarAtividadeFlexivel(dados) {
    const instancia = new AtividadeFlexivel(dados);
    this.repoAtividades.salvar(instancia.paraJSON());
    return instancia;
  }

  removerAtividade(id) {
    return this.repoAtividades.remover(id);
  }

  /** Move uma atividade para outro horário/data (usado pelo drag&drop ou pelo Assistente). */
  moverAtividade(id, { novaData, novaHoraInicio, novaHoraFim }) {
    const dados = this.repoAtividades.buscarPorId(id);
    if (!dados) return null;
    if (novaData) dados.data = novaData;
    if (novaHoraInicio) dados.horaInicio = novaHoraInicio;
    if (novaHoraFim) dados.horaFim = novaHoraFim;
    this.repoAtividades.salvar(dados);
    return criarAtividadeApartirDeJSON(dados);
  }

  // =========================================================================
  // MOTOR DE TEMPO (RF05)
  // =========================================================================

  /**
   * Calcula a disponibilidade real de um dia. Bloqueamos TODAS as
   * atividades do dia (fixas, transições e também as flexíveis já
   * agendadas) — porque uma vez que uma atividade flexível foi colocada no
   * calendário, aquele horário deixou de estar livre de verdade, mesmo que
   * ela pudesse teoricamente ser movida depois.
   */
  calcularDisponibilidadeDoDia(dataISO) {
    const atividadesDoDia = this.obterAtividadesDoDia(dataISO, { aplicarFiltroCategoria: false });
    const motor = new MotorDeTempo(dataISO);
    motor.aplicarBloqueios(atividadesDoDia);
    return {
      blocosLivres: motor.calcularBlocosLivres(),
      totalMinutosLivres: motor.calcularTotalMinutosLivres(),
      percentualOcupado: motor.calcularPercentualOcupado(),
      grade: motor.grade,
    };
  }

  // =========================================================================
  // CURSOS E METAS (RF06-RF10, RF17, RF18)
  // =========================================================================

  listarCursos() {
    return this.repoCursos.listarTudo().map((json) => new Curso(json));
  }

  criarCurso(dados) {
    const curso = new Curso(dados);
    this.repoCursos.salvar(curso.paraJSON());
    return curso;
  }

  /** RF18: promove um curso 'futuro' para 'ativo' — passa a receber sugestões de horário. */
  ativarCurso(id) {
    const curso = this._buscarCursoOuLancarErro(id);
    curso.ativar();
    this.repoCursos.salvar(curso.paraJSON());
    return curso;
  }

  /** RF07: registra horas efetivamente realizadas num curso/meta. */
  registrarExecucaoCurso(id, dataISO, minutos, observacao = "") {
    const curso = this._buscarCursoOuLancarErro(id);
    curso.registrarExecucao(dataISO, minutos, observacao);
    this.repoCursos.salvar(curso.paraJSON());
    return curso;
  }

  _buscarCursoOuLancarErro(id) {
    const dados = this.repoCursos.buscarPorId(id);
    if (!dados) throw new Error(`Curso "${id}" não encontrado.`);
    return new Curso(dados);
  }

  // =========================================================================
  // LISTAS / PENDÊNCIAS / PROJETOS (RF15, RF16)
  // =========================================================================

  listarItens(filtroTipo = null) {
    const itens = this.repoItens.listarTudo().map((json) => new ItemLista(json));
    return filtroTipo ? itens.filter((item) => item.tipo === filtroTipo) : itens;
  }

  criarItem(dados) {
    const item = new ItemLista(dados);
    this.repoItens.salvar(item.paraJSON());
    return item;
  }

  /** Alterna (ou define explicitamente) o status de conclusão de um item. */
  alternarConclusaoItem(id, concluido = null) {
    const dados = this.repoItens.buscarPorId(id);
    if (!dados) return null;
    dados.concluido = concluido === null ? !dados.concluido : concluido;
    this.repoItens.salvar(dados);
    return dados;
  }

  removerItem(id) {
    return this.repoItens.remover(id);
  }

  /**
   * RF18 aplicado a pendências: transforma um ItemLista numa
   * AtividadeFlexivel de verdade no calendário, e remove o item da lista
   * de pendências (ele "virou" a atividade).
   */
  promoverItemParaAtividade(itemId, { data, horaInicio, horaFim }) {
    const itemDados = this.repoItens.buscarPorId(itemId);
    if (!itemDados) return null;

    const novaAtividade = this.criarAtividadeFlexivel({
      nome: itemDados.nome,
      categoria: itemDados.categoria,
      data,
      horaInicio,
      horaFim,
    });
    this.repoItens.remover(itemId);
    return novaAtividade;
  }

  // =========================================================================
  // SUGESTÕES DE DISTRIBUIÇÃO (RF11, RF12, RF22)
  // =========================================================================

  /** RF11: sugere como encaixar o tempo restante de um curso até um prazo. */
  sugerirDistribuicaoParaCurso(cursoId, dataLimiteISO) {
    const curso = this._buscarCursoOuLancarErro(cursoId);
    const dias = intervaloDeDias(hojeISO(), dataLimiteISO || curso.prazo || somarDias(hojeISO(), 7));

    return GerenciadorDeSugestoes.sugerirDistribuicao({
      minutosNecessarios: curso.minutosRestantes(),
      diasCandidatos: dias,
      obterAtividadesDoDia: (dataISO) => this.obterAtividadesDoDia(dataISO, { aplicarFiltroCategoria: false }),
    });
  }

  /** RF22: "perdi X horas de [atividade]; redistribua até [dia]". */
  redistribuirPorPerdaDeAtividade(atividadeId, dataLimiteISO) {
    const dadosAtividade = this.repoAtividades.buscarPorId(atividadeId);
    if (!dadosAtividade) return null;
    const atividade = criarAtividadeApartirDeJSON(dadosAtividade);

    const diasBusca = intervaloDeDias(somarDias(atividade.data, 1), dataLimiteISO);
    const resultado = GerenciadorDeSugestoes.redistribuirPorPerda({
      minutosPerdidos: atividade.duracaoMinutos(),
      dias: diasBusca,
      obterAtividadesDoDia: (dataISO) => this.obterAtividadesDoDia(dataISO, { aplicarFiltroCategoria: false }),
    });

    return { atividadeOriginal: atividade, ...resultado };
  }

  /**
   * RF13: só quando o usuário ACEITA a proposta, ela é de fato gravada no
   * calendário. `sugestoes` vem de sugerirDistribuicaoParaCurso ou de
   * redistribuirPorPerdaDeAtividade.
   */
  aceitarSugestoes(sugestoes, { nomeBase, categoria, cursoId = null }) {
    return sugestoes.map((sugestao) =>
      this.criarAtividadeFlexivel({
        nome: nomeBase,
        categoria,
        data: sugestao.data,
        horaInicio: sugestao.horaInicio,
        horaFim: sugestao.horaFim,
        prazo: cursoId ? this._buscarCursoOuLancarErro(cursoId).prazo : null,
      })
    );
  }

  /**
   * RF20: "Regra de Regeneração" — só executado quando o usuário confirma
   * explicitamente (ver fluxo em app.js). Remove todas as AtividadeFlexivel
   * da semana de `dataReferenciaISO` e tenta realocá-las do zero nos
   * horários livres da semana, dando prioridade às de `prioridade` mais
   * alta (número menor = mais prioritária).
   */
  regenerarCalendarioSemana(dataReferenciaISO) {
    const inicio = inicioDaSemana(dataReferenciaISO);
    const fim = fimDaSemana(dataReferenciaISO);
    const diasDaSemana = intervaloDeDias(inicio, fim);

    const flexiveisDaSemana = this.listarAtividades()
      .filter((a) => a.tipo === "AtividadeFlexivel" && a.data >= inicio && a.data <= fim)
      .sort((a, b) => a.prioridade - b.prioridade);

    // Remove tudo primeiro, para o motor de tempo enxergar esses horários
    // como livres de novo ao recalcular.
    flexiveisDaSemana.forEach((atividade) => this.repoAtividades.remover(atividade.id));

    const recriadas = [];
    for (const original of flexiveisDaSemana) {
      const { sugestoes } = GerenciadorDeSugestoes.sugerirDistribuicao({
        minutosNecessarios: original.duracaoMinutos(),
        diasCandidatos: diasDaSemana,
        obterAtividadesDoDia: (dataISO) => this.obterAtividadesDoDia(dataISO, { aplicarFiltroCategoria: false }),
      });
      sugestoes.forEach((s) => {
        recriadas.push(
          this.criarAtividadeFlexivel({
            nome: original.nome,
            categoria: original.categoria,
            data: s.data,
            horaInicio: s.horaInicio,
            horaFim: s.horaFim,
            prioridade: original.prioridade,
            prazo: original.prazo,
          })
        );
      });
    }
    return recriadas;
  }

  // =========================================================================
  // ASSISTENTE EM LINGUAGEM NATURAL (RF19-RF23)
  // =========================================================================

  /**
   * Ponto de entrada único usado pela UI para o chat do assistente.
   * Faz exatamente o fluxo da Seção 15-D:
   *   1) Assistente.interpretar(texto) -> IntencaoDeAcao
   *   2) este método valida e decide o que fazer
   *   3) devolve um resultado padronizado para a UI mostrar
   *
   * @returns {{status: string, mensagem: string, dados?: any}}
   *   status pode ser: 'ok' | 'ambiguo' | 'nao_encontrado' | 'nao_reconhecido' | 'confirmar_sugestoes'
   */
  processarComandoAssistente(textoUsuario) {
    const intencao = Assistente.interpretar(textoUsuario);

    switch (intencao.tipo) {
      case "ADICIONAR_ATIVIDADE":
        return this._aplicarAdicao(intencao.dados);

      case "REMOVER_ATIVIDADE":
        return this._aplicarRemocao(intencao.dados);

      case "MOVER_ATIVIDADE":
        return this._aplicarMovimentacao(intencao.dados);

      case "CRIAR_CATEGORIA":
        return this._aplicarCriacaoCategoria(intencao.dados);

      case "REDISTRIBUIR":
        return this._aplicarRedistribuicao(intencao.dados);

      case "REGENERAR_CALENDARIO_TOTAL":
        // RF20: liberdade total só quando pedida explicitamente. A regeneração
        // de verdade ainda depende de confirmação na UI (RF13) — aqui só
        // sinalizamos que a intenção foi entendida.
        return {
          status: "confirmar_regeneracao",
          mensagem:
            "Entendi que você quer reorganizar a semana inteira. Isso vai propor um novo horário " +
            "para todas as atividades flexíveis da semana. Deseja confirmar?",
        };

      default:
        return {
          status: "nao_reconhecido",
          mensagem:
            'Não entendi esse comando. Tente algo como "adicione reunião amanhã às 15h" ' +
            'ou "não consegui estudar inglês na quarta, redistribua até domingo".',
        };
    }
  }

  /**
   * Resolve uma referência textual de dia ("hoje", "amanhã", "quarta",
   * "quarta-feira"...) para uma data ISO concreta, sempre em relação à
   * data selecionada atualmente na tela. Usado pelo Assistente para
   * ADICIONAR_ATIVIDADE e REMOVER_ATIVIDADE.
   */
  _resolverDataRelativa(quando) {
    if (!quando || quando === "hoje") return this.dataSelecionada;
    if (quando.includes("amanh")) return somarDias(this.dataSelecionada, 1);

    const dataPorDiaDaSemana = proximaDataParaDiaSemana(quando, this.dataSelecionada);
    return dataPorDiaDaSemana || this.dataSelecionada; // fallback simples se não reconhecer
  }

  _aplicarAdicao({ nome, quando, horaInicio }) {
    const data = this._resolverDataRelativa(quando);
    const [h, m] = horaInicio.split(":").map(Number);
    const horaFim = `${String((h + 1) % 24).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
    const nomeFormatado = capitalizarPrimeiraLetra(nome);

    // Categoria não é uma coisa que o Assistente deveria inventar (Seção
    // 10: categorias são 100% do usuário) — por isso cai em "Sem
    // categoria" por padrão; se quiser categorizado, o usuário edita
    // depois pela interface ou já cria a categoria antes (ex: "criar
    // categoria Pessoal").
    const atividade = this.criarAtividadeFlexivel({ nome: nomeFormatado, data, horaInicio, horaFim });
    return { status: "ok", mensagem: `Adicionei "${nomeFormatado}" em ${data} às ${horaInicio}.`, dados: atividade };
  }

  /**
   * Busca por nome de forma tolerante nos dois sentidos: tanto funciona se
   * o termo é mais curto que o nome real ("academia" -> "Academia da UFBA")
   * quanto se o Assistente devolveu uma frase maior que o nome cadastrado
   * ("estudar programação" -> atividade chamada só "Programação").
   */
  _buscarAtividadesPorNome(termoBusca) {
    if (!termoBusca) return [];
    const termo = termoBusca.toLowerCase();
    return this.listarAtividades().filter((atividade) => {
      const nome = atividade.nome.toLowerCase();
      return nome.includes(termo) || termo.includes(nome);
    });
  }

  /** RF19-23: remove uma atividade a partir de um comando do assistente. */
  _aplicarRemocao({ termoBusca, quando }) {
    let candidatas = this._buscarAtividadesPorNome(termoBusca);

    // Se o usuário mencionou um dia ("hoje", "quarta"...), usa isso para
    // desambiguar automaticamente entre atividades com o mesmo nome em
    // dias diferentes — só cai em pedir confirmação (RF23) se ainda
    // sobrar mais de uma depois desse filtro.
    if (quando) {
      const dataAlvo = this._resolverDataRelativa(quando);
      const filtradasPorData = candidatas.filter((atividade) => atividade.ocorreEm(dataAlvo));
      if (filtradasPorData.length > 0) candidatas = filtradasPorData;
    }

    if (candidatas.length === 0) {
      return {
        status: "nao_encontrado",
        mensagem: `Não encontrei nenhuma atividade chamada "${termoBusca}"${quando ? ` em "${quando}"` : ""}.`,
      };
    }
    if (candidatas.length > 1) {
      return {
        status: "ambiguo",
        mensagem: `Encontrei ${candidatas.length} atividades parecidas com "${termoBusca}". Qual delas?`,
        dados: candidatas,
      };
    }

    const alvo = candidatas[0];
    this.removerAtividade(alvo.id);
    return { status: "ok", mensagem: `Removi "${alvo.nome}" (${alvo.data}, ${alvo.horaInicio}–${alvo.horaFim}).` };
  }

  /** RF19-23: cria uma categoria nova diretamente pelo chat (Seção 10). */
  _aplicarCriacaoCategoria({ nome }) {
    if (!nome || !nome.trim()) {
      return { status: "nao_reconhecido", mensagem: "Não entendi o nome da categoria. Tente: \"criar categoria Projetos\"." };
    }
    const nomeLimpo = capitalizarPrimeiraLetra(nome.trim());
    const jaExistia = this.listarCategorias().some((c) => c.nome.toLowerCase() === nomeLimpo.toLowerCase());
    const categoria = this.criarCategoria(nomeLimpo);
    return {
      status: "ok",
      mensagem: jaExistia ? `A categoria "${categoria.nome}" já existia.` : `Categoria "${categoria.nome}" criada.`,
    };
  }

  _aplicarMovimentacao({ termoBusca, novaHoraInicio }) {
    const candidatas = this._buscarAtividadesPorNome(termoBusca);

    if (candidatas.length === 0) {
      return { status: "nao_encontrado", mensagem: `Não encontrei nenhuma atividade chamada "${termoBusca}".` };
    }
    // RF23: mais de uma correspondência -> o assistente NÃO escolhe sozinho.
    if (candidatas.length > 1) {
      return {
        status: "ambiguo",
        mensagem: `Encontrei ${candidatas.length} atividades parecidas com "${termoBusca}". Qual delas?`,
        dados: candidatas,
      };
    }

    const alvo = candidatas[0];
    const duracao = alvo.duracaoMinutos();
    const [h, m] = novaHoraInicio.split(":").map(Number);
    const novaHoraFim = `${String(Math.floor((h * 60 + m + duracao) / 60) % 24).padStart(2, "0")}:${String(
      (h * 60 + m + duracao) % 60
    ).padStart(2, "0")}`;

    const atualizada = this.moverAtividade(alvo.id, { novaHoraInicio, novaHoraFim });
    return { status: "ok", mensagem: `Movi "${alvo.nome}" para ${novaHoraInicio}.`, dados: atualizada };
  }

  _aplicarRedistribuicao({ termoBusca, diaLimite }) {
    if (!termoBusca) {
      return { status: "nao_reconhecido", mensagem: "Não entendi o que você quer redistribuir." };
    }

    // Tenta achar um curso com esse nome primeiro (é o caso mais comum de
    // "redistribua minhas horas de inglês"); senão, tenta uma atividade pontual.
    const cursosCandidatos = this.listarCursos().filter((c) => {
      const nome = c.nome.toLowerCase();
      return nome.includes(termoBusca) || termoBusca.includes(nome);
    });
    if (cursosCandidatos.length === 1) {
      const dataLimiteISO = somarDias(hojeISO(), 7); // sem dia explícito, propõe pra próxima semana
      const resultado = this.sugerirDistribuicaoParaCurso(cursosCandidatos[0].id, dataLimiteISO);
      return {
        status: "confirmar_sugestoes",
        mensagem: `Aqui está uma proposta para distribuir o tempo restante de "${cursosCandidatos[0].nome}".`,
        dados: { curso: cursosCandidatos[0], ...resultado },
      };
    }

    const atividadesCandidatas = this._buscarAtividadesPorNome(termoBusca);
    if (atividadesCandidatas.length === 1) {
      const dataLimiteISO = somarDias(hojeISO(), 7);
      const resultado = this.redistribuirPorPerdaDeAtividade(atividadesCandidatas[0].id, dataLimiteISO);
      return {
        status: "confirmar_sugestoes",
        mensagem: `Aqui está uma proposta para redistribuir "${atividadesCandidatas[0].nome}".`,
        dados: resultado,
      };
    }
    if (atividadesCandidatas.length > 1 || cursosCandidatos.length > 1) {
      return {
        status: "ambiguo",
        mensagem: `Encontrei mais de uma coisa parecida com "${termoBusca}". Pode ser mais específico?`,
        dados: [...cursosCandidatos, ...atividadesCandidatas],
      };
    }

    return { status: "nao_encontrado", mensagem: `Não encontrei nada chamado "${termoBusca}".` };
  }

}
