/**
 * Assistente.js
 * ---------------------------------------------------------------------------
 * Implementa a Seção 15-D: "O Assistente de IA não deve manipular
 * diretamente a base de dados do usuário. Ele deve atuar como um
 * 'tradutor de intenções'."
 *
 *   texto do usuário  --[Assistente.interpretar]-->  IntencaoDeAcao (objeto)
 *   IntencaoDeAcao     --[AppController.aplicarIntencao]-->  muda o estado
 *
 * IMPORTANTE PARA QUEM VAI ESTUDAR/EVOLUIR ESTE CÓDIGO:
 * A versão abaixo usa correspondência de padrões (expressões regulares) bem
 * simples — o suficiente para reconhecer os exemplos da Seção 9 do
 * documento de requisitos e servir de ESQUELETO da arquitetura. Ela NÃO é
 * um modelo de linguagem de verdade. O ponto de extensão pensado para isso
 * é o método `interpretar()`: no futuro, basta substituir o corpo dele por
 * uma chamada à API da Anthropic (endpoint /v1/messages, pedindo para o
 * modelo devolver JSON no formato de IntencaoDeAcao) — o resto do app
 * (AppController, RepositorioService, UI) não precisa mudar NADA, porque
 * todos eles só conhecem o "contrato" IntencaoDeAcao, nunca o texto cru.
 * Essa é a vantagem prática de isolar bem as camadas.
 *
 * Também por isso o Assistente NUNCA importa o RepositorioService: ele só
 * entende texto e devolve um objeto. Resolver ambiguidade (RF23) — por
 * exemplo, decidir QUAL evento de terça-feira o usuário quis dizer — exige
 * consultar os dados reais, então essa parte é responsabilidade do
 * AppController, não deste arquivo.
 */

/**
 * @typedef {Object} IntencaoDeAcao
 * @property {string} tipo - 'ADICIONAR_ATIVIDADE' | 'REMOVER_ATIVIDADE' |
 *           'MOVER_ATIVIDADE' | 'REDISTRIBUIR' | 'CRIAR_CATEGORIA' |
 *           'REGENERAR_CALENDARIO_TOTAL' | 'NAO_RECONHECIDO'
 * @property {Object} dados - payload específico de cada tipo (ver exemplos abaixo).
 */

/**
 * Fragmento de regex reaproveitado por vários comandos para reconhecer uma
 * referência de dia: "hoje", "amanhã" ou o nome de um dia da semana (com ou
 * sem "-feira"). A resolução de verdade (texto -> data ISO) é feita depois,
 * em AppController._resolverDataRelativa, usando DataUtils.
 */
const REFERENCIA_DIA = "hoje|amanh[aã]|segunda(?:-feira)?|ter[çc]a(?:-feira)?|quarta(?:-feira)?|quinta(?:-feira)?|sexta(?:-feira)?|s[aá]bado|domingo";

export class Assistente {
  /**
   * @param {string} textoUsuario - comando em linguagem natural.
   * @returns {IntencaoDeAcao}
   */
  static interpretar(textoUsuario) {
    const texto = textoUsuario.trim().toLowerCase();

    // RF20: regeneração total só acontece se o usuário pedir EXPLICITAMENTE.
    // Por isso este padrão exige palavras fortes ("tudo"/"inteira"/"inteiro")
    // junto de um verbo de reorganização — nunca é o caminho padrão.
    if (/\b(reorganiz|regenerar|refaz)\w*\b.*\b(semana inteira|tudo|calend[aá]rio inteiro)\b/.test(texto)) {
      return { tipo: "REGENERAR_CALENDARIO_TOTAL", dados: { textoOriginal: textoUsuario } };
    }

    // Ex: "criar categoria Projetos" / "nova categoria Inglês" / "adicionar categoria Academia"
    const padraoCriarCategoria = /(?:cri\w*|adicion\w*|nova)\s+categoria\s+(.+)/;
    const matchCriarCategoria = texto.match(padraoCriarCategoria);
    if (matchCriarCategoria) {
      const nomeCategoria = matchCriarCategoria[1].trim().replace(/[.!?]+$/, "");
      return { tipo: "CRIAR_CATEGORIA", dados: { nome: nomeCategoria, textoOriginal: textoUsuario } };
    }

    // Ex: "não consegui estudar programação na quarta. redistribua essas 2 horas até domingo."
    const padraoRedistribuicao =
      /n[aã]o (consegui|deu para)\s+(.*?)\s+(na|no)\s+(\w+).*redistrib\w*\s*(essas\s+)?(\d+)?\s*(h|horas?)?.*at[eé]\s+(\w+)/;
    const matchRedistribuicao = texto.match(padraoRedistribuicao);
    if (matchRedistribuicao) {
      const [, , termoBusca, , diaPerdido, , quantidadeHoras, , diaLimite] = matchRedistribuicao;
      return {
        tipo: "REDISTRIBUIR",
        dados: {
          termoBusca: termoBusca.trim(),
          diaPerdido,
          horasInformadas: quantidadeHoras ? Number(quantidadeHoras) : null,
          diaLimite,
          textoOriginal: textoUsuario,
        },
      };
    }

    // Ex: "reorganize minhas horas de inglês para os horários livres restantes"
    const padraoRedistribuicaoGenerica = /reorganiz\w*|redistrib\w*/;
    if (padraoRedistribuicaoGenerica.test(texto)) {
      const matchAssunto = texto.match(/(?:horas de|de)\s+([a-zà-ú\s]+?)(?:\s+para|\s+até|$)/);
      return {
        tipo: "REDISTRIBUIR",
        dados: {
          termoBusca: matchAssunto ? matchAssunto[1].trim() : null,
          diaLimite: null,
          textoOriginal: textoUsuario,
        },
      };
    }

    // Ex: "remover academia hoje" / "remova a reunião de amanhã" / "apague o estudo de inglês na quarta"
    const padraoRemover = new RegExp(`(?:remov|apag|delet|cancel)\\w*\\s+(?:a |o |minha |meu )?(.*?)\\s*(?:de |da |no |na )?(${REFERENCIA_DIA})?\\s*$`);
    const matchRemover = texto.match(padraoRemover);
    if (matchRemover && matchRemover[1].trim().length > 0) {
      const [, termoBusca, quando] = matchRemover;
      return {
        tipo: "REMOVER_ATIVIDADE",
        dados: { termoBusca: termoBusca.trim(), quando: quando || null, textoOriginal: textoUsuario },
      };
    }

    // Ex: "mude a academia de quinta das 13h para 15h"
    // Ex: "mudar faculdade para as 10h" (sem precisar dizer "de onde")
    // Ex: "troque meu estudo de inglês de terça às 16h por um evento das 16h às 18h"
    const padraoMover = /(mude|mova|troque|mudar|mover|trocar)\s+(a |o |minha |meu )?(.*?)\s+para\s+(?:as\s+)?(\d{1,2})(?:h|:00)?(\d{2})?/;
    const matchMover = texto.match(padraoMover);
    if (matchMover) {
      const [, , , termoBusca, horaNova, minutoNovo] = matchMover;
      const horaFormatada = `${horaNova.padStart(2, "0")}:${(minutoNovo || "00").padStart(2, "0")}`;
      return {
        tipo: "MOVER_ATIVIDADE",
        dados: { termoBusca: termoBusca.trim(), novaHoraInicio: horaFormatada, textoOriginal: textoUsuario },
      };
    }

    // Ex: "adicione uma reunião amanhã às 15h"
    const padraoAdicionar = new RegExp(`adicion\\w*\\s+(uma |um |o |a )?(.*?)\\s+(${REFERENCIA_DIA})?\\s*(?:às|as)\\s+(\\d{1,2})(?:h|:00)?(\\d{2})?`);
    const matchAdicionar = texto.match(padraoAdicionar);
    if (matchAdicionar) {
      const [, , nome, quando, hora, minuto] = matchAdicionar;
      const horaFormatada = `${hora.padStart(2, "0")}:${(minuto || "00").padStart(2, "0")}`;
      return {
        tipo: "ADICIONAR_ATIVIDADE",
        dados: {
          nome: nome.trim(),
          quando: quando || "hoje",
          horaInicio: horaFormatada,
          textoOriginal: textoUsuario,
        },
      };
    }

    // Nenhum padrão reconhecido — o controller deve mostrar uma mensagem
    // amigável em vez de tentar adivinhar (mesmo princípio de RF23:
    // na dúvida, não decidir sozinho).
    return { tipo: "NAO_RECONHECIDO", dados: { textoOriginal: textoUsuario } };
  }
}
