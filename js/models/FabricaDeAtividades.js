/**
 * FabricaDeAtividades.js
 * ---------------------------------------------------------------------------
 * Problema que este arquivo resolve: o localStorage só guarda texto (JSON).
 * Quando lemos `{ tipo: "CompromissoFixo", nome: "Faculdade", ... }` de
 * volta, isso é um objeto JavaScript "comum" — ele NÃO é uma instância de
 * `CompromissoFixo` e não tem os métodos dessa classe (duracaoMinutos(),
 * ocorreEm(), etc.).
 *
 * Este é o padrão de projeto "Factory": uma função cuja única
 * responsabilidade é olhar o campo `tipo` e devolver a instância de classe
 * correta. Assim, o resto do app sempre trabalha com objetos "de verdade"
 * (com métodos), nunca com JSON cru.
 */
import { CompromissoFixo } from "./CompromissoFixo.js";
import { BlocoDeTransicao } from "./BlocoDeTransicao.js";
import { AtividadeFlexivel } from "./AtividadeFlexivel.js";

/** @param {Object} dadosPlanos - objeto simples vindo do RepositorioService. */
export function criarAtividadeApartirDeJSON(dadosPlanos) {
  switch (dadosPlanos.tipo) {
    case "CompromissoFixo":
      return new CompromissoFixo(dadosPlanos);
    case "BlocoDeTransicao":
      return new BlocoDeTransicao(dadosPlanos);
    case "AtividadeFlexivel":
      return new AtividadeFlexivel(dadosPlanos);
    default:
      console.warn(`Tipo de atividade desconhecido: "${dadosPlanos.tipo}". Tratando como flexível.`);
      return new AtividadeFlexivel(dadosPlanos);
  }
}
