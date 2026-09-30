/**
 * RepositorioService.js
 * ---------------------------------------------------------------------------
 * Implementa o Repository Pattern pedido na Seção 15-C dos requisitos.
 *
 * A REGRA DE OURO deste arquivo: em todo o resto do projeto (controller,
 * UI, motor de tempo, assistente), NINGUÉM deve chamar `localStorage`
 * diretamente. Toda leitura e escrita passa por uma instância desta classe.
 *
 * Por quê? Porque assim, no dia em que este projeto crescer e precisar de
 * uma API/back-end de verdade, você troca SÓ este arquivo (ex: os métodos
 * passam a fazer fetch() para um servidor) e o resto do app — telas,
 * cálculos, assistente — continua funcionando sem precisar mudar uma linha.
 * Essa é a ideia central de uma "camada de serviço" isolada.
 *
 * Esta classe é genérica: ela não sabe o que é um "Compromisso" ou um
 * "Curso" — ela só sabe guardar e recuperar listas de objetos simples (JSON)
 * associadas a uma "chave" (ex: 'organizador.compromissos'). Quem dá
 * significado aos dados são as classes de modelo (Atividade, Curso, etc.) e
 * as fábricas que reconstroem essas classes a partir do JSON puro.
 */
export class RepositorioService {
  /** @param {string} chave - namespace único deste repositório no localStorage. */
  constructor(chave) {
    this.chave = `organizador-tempo.${chave}`;
  }

  /** Lê a lista inteira (array de objetos simples) do armazenamento local. */
  listarTudo() {
    try {
      const bruto = localStorage.getItem(this.chave);
      return bruto ? JSON.parse(bruto) : [];
    } catch (erro) {
      // Se o localStorage estiver corrompido/inacessível, falha de forma
      // segura devolvendo uma lista vazia em vez de quebrar o app inteiro.
      console.error(`[RepositorioService] Falha ao ler "${this.chave}":`, erro);
      return [];
    }
  }

  /** Sobrescreve a lista inteira. Usado internamente pelos outros métodos. */
  _salvarTudo(lista) {
    localStorage.setItem(this.chave, JSON.stringify(lista));
  }

  /** Busca um item pelo id. Retorna `undefined` se não encontrar. */
  buscarPorId(id) {
    return this.listarTudo().find((item) => item.id === id);
  }

  /**
   * Insere um item novo ou atualiza um existente (identificado por `id`).
   * Recebe e devolve objetos JSON simples — quem converte para/de instância
   * de classe é a camada acima (controller), usando as fábricas dos modelos.
   */
  salvar(itemPlano) {
    const lista = this.listarTudo();
    const indice = lista.findIndex((item) => item.id === itemPlano.id);
    if (indice >= 0) {
      lista[indice] = itemPlano;
    } else {
      lista.push(itemPlano);
    }
    this._salvarTudo(lista);
    return itemPlano;
  }

  /** Remove um item pelo id. Retorna true se algo foi de fato removido. */
  remover(id) {
    const lista = this.listarTudo();
    const novaLista = lista.filter((item) => item.id !== id);
    const removeuAlgo = novaLista.length !== lista.length;
    this._salvarTudo(novaLista);
    return removeuAlgo;
  }

  /** Apaga todos os itens deste repositório (usado no botão "Limpar dados"). */
  limparTudo() {
    this._salvarTudo([]);
  }
}
