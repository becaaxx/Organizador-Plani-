/**
 * GerenciadorDeSugestoes.js
 * ---------------------------------------------------------------------------
 * Responsável pelas "Recomendações" do app (Seção 4) — RF11 (distribuição
 * sugerida), RF12 (replanejamento) e RF22 (redistribuição por solicitação,
 * ex: "não consegui estudar na quarta; redistribua até domingo").
 *
 * REGRA DE PRODUTO IMPORTANTE (RF13, Seção 11): "As sugestões devem ser
 * editáveis e nunca substituir a decisão do usuário." Por isso, tudo aqui
 * é uma função PURA que devolve uma proposta (um array de sessões
 * sugeridas). Nada aqui grava no repositório. Quem decide gravar (depois
 * do usuário aceitar) é o AppController.
 *
 * Este módulo é desacoplado do RepositorioService de propósito: em vez de
 * ler dados diretamente, ele recebe uma função `obterAtividadesDoDia(data)`
 * como parâmetro (Injeção de Dependência). Isso facilita testar a lógica de
 * distribuição isoladamente, sem precisar de um localStorage de verdade.
 */
import { MotorDeTempo } from "./MotorDeTempo.js";
import { Atividade } from "../models/Atividade.js";

const DURACAO_MAXIMA_SESSAO_PADRAO = 120; // não sugerir sessões de estudo gigantes
const DURACAO_MINIMA_SESSAO_PADRAO = 15; // ignora frestas de tempo inúteis

export class GerenciadorDeSugestoes {
  /**
   * @param {Object} opcoes
   * @param {number} opcoes.minutosNecessarios - quanto tempo ainda precisa ser alocado.
   * @param {string[]} opcoes.diasCandidatos - lista de datas 'YYYY-MM-DD', em ordem, onde procurar espaço.
   * @param {(dataISO: string) => Atividade[]} opcoes.obterAtividadesDoDia - callback que devolve as
   *        atividades (fixas + transições + flexíveis já alocadas) já existentes num dia,
   *        para que o motor saiba o que já está ocupado.
   * @param {number} [opcoes.duracaoMaximaSessao]
   * @param {number} [opcoes.duracaoMinimaSessao]
   * @returns {{sugestoes: Array, minutosNaoAlocados: number}}
   */
  static sugerirDistribuicao({
    minutosNecessarios,
    diasCandidatos,
    obterAtividadesDoDia,
    duracaoMaximaSessao = DURACAO_MAXIMA_SESSAO_PADRAO,
    duracaoMinimaSessao = DURACAO_MINIMA_SESSAO_PADRAO,
  }) {
    const sugestoes = [];
    let restante = minutosNecessarios;

    for (const dataISO of diasCandidatos) {
      if (restante <= 0) break;

      const motor = new MotorDeTempo(dataISO);
      motor.aplicarBloqueios(obterAtividadesDoDia(dataISO));
      const blocosLivres = motor.calcularBlocosLivres();

      for (const bloco of blocosLivres) {
        if (restante <= 0) break;
        if (bloco.duracaoMinutos < duracaoMinimaSessao) continue; // fresta pequena demais, ignora

        const duracaoSessao = Math.min(bloco.duracaoMinutos, duracaoMaximaSessao, restante);
        const inicioMinutos = Atividade.horaParaMinutos(bloco.inicio);

        sugestoes.push({
          data: dataISO,
          horaInicio: bloco.inicio,
          horaFim: Atividade.minutosParaHora(inicioMinutos + duracaoSessao),
          minutos: duracaoSessao,
        });

        restante -= duracaoSessao;
      }
    }

    return { sugestoes, minutosNaoAlocados: Math.max(0, restante) };
  }

  /**
   * RF22: atalho específico para o caso "perdi uma atividade, redistribua
   * até tal dia". Internamente é só sugerirDistribuicao com os minutos da
   * atividade perdida.
   */
  static redistribuirPorPerda({ minutosPerdidos, dataInicioBusca, dias, obterAtividadesDoDia }) {
    return GerenciadorDeSugestoes.sugerirDistribuicao({
      minutosNecessarios: minutosPerdidos,
      diasCandidatos: dias,
      obterAtividadesDoDia,
    });
  }
}
