/**
 * DataUtils.js
 * ---------------------------------------------------------------------------
 * Funções puras de manipulação de datas. "Puras" significa: mesma entrada
 * sempre dá a mesma saída, sem efeitos colaterais (não mexem no DOM, não
 * leem localStorage). Isso facilita muito testar e entender cada função
 * isoladamente — bom hábito para carregar para outros projetos.
 */

const NOMES_DIA_SEMANA = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"];
const NOMES_MES = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
];

/** Data de hoje no formato 'YYYY-MM-DD', respeitando o fuso local. */
export function hojeISO() {
  return paraISO(new Date());
}

/** Converte um objeto Date para 'YYYY-MM-DD' usando o fuso LOCAL (não UTC). */
export function paraISO(data) {
  const ano = data.getFullYear();
  const mes = String(data.getMonth() + 1).padStart(2, "0");
  const dia = String(data.getDate()).padStart(2, "0");
  return `${ano}-${mes}-${dia}`;
}

/** Soma (ou subtrai, com número negativo) dias a uma data 'YYYY-MM-DD'. */
export function somarDias(dataISO, quantidadeDias) {
  const data = new Date(`${dataISO}T00:00:00`);
  data.setDate(data.getDate() + quantidadeDias);
  return paraISO(data);
}

/** Lista de datas ISO entre duas datas (inclusive), útil para redistribuição. */
export function intervaloDeDias(dataInicioISO, dataFimISO) {
  const dias = [];
  let atual = dataInicioISO;
  while (atual <= dataFimISO) {
    dias.push(atual);
    atual = somarDias(atual, 1);
  }
  return dias;
}

/** Data (ISO) da segunda-feira da semana que contém 'dataISO'. */
export function inicioDaSemana(dataISO) {
  const diaDaSemana = new Date(`${dataISO}T00:00:00`).getDay(); // 0=domingo
  const deslocamento = diaDaSemana === 0 ? -6 : 1 - diaDaSemana; // volta até a segunda
  return somarDias(dataISO, deslocamento);
}

/** Data (ISO) do domingo da semana que contém 'dataISO'. */
export function fimDaSemana(dataISO) {
  return somarDias(inicioDaSemana(dataISO), 6);
}

/** Nome do dia da semana em português, a partir de 'YYYY-MM-DD'. */
export function nomeDiaSemana(dataISO) {
  const diaDaSemana = new Date(`${dataISO}T00:00:00`).getDay();
  return NOMES_DIA_SEMANA[diaDaSemana];
}

/**
 * Converte um nome de dia da semana em português (com ou sem acento, com
 * ou sem "-feira") para o índice usado por Date.getDay() (0=domingo ...
 * 6=sábado). Devolve null se não reconhecer. Usado pelo Assistente para
 * entender comandos como "remover academia na quarta".
 */
export function indiceDiaSemana(nomeDiaTexto) {
  const texto = nomeDiaTexto
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // remove acentos (ç, ã, á...)
    .toLowerCase()
    .replace(/-feira$/, "")
    .trim();

  const MAPA = { domingo: 0, segunda: 1, terca: 2, quarta: 3, quinta: 4, sexta: 5, sabado: 6 };
  return texto in MAPA ? MAPA[texto] : null;
}

/**
 * Encontra a próxima data (a partir de dataReferenciaISO, incluindo ela
 * mesma) cujo dia da semana bate com `nomeDiaTexto`. Procura no máximo 7
 * dias à frente. Devolve null se `nomeDiaTexto` não for um dia reconhecido.
 */
export function proximaDataParaDiaSemana(nomeDiaTexto, dataReferenciaISO) {
  const alvo = indiceDiaSemana(nomeDiaTexto);
  if (alvo === null) return null;

  let dataCandidata = dataReferenciaISO;
  for (let i = 0; i < 7; i++) {
    if (new Date(`${dataCandidata}T00:00:00`).getDay() === alvo) return dataCandidata;
    dataCandidata = somarDias(dataCandidata, 1);
  }
  return null; // nunca deveria chegar aqui (7 dias cobrem a semana inteira)
}

/** Formata 'YYYY-MM-DD' como "Segunda, 22 de setembro". */
export function formatarDataLegivel(dataISO) {
  const data = new Date(`${dataISO}T00:00:00`);
  return `${nomeDiaSemana(dataISO)}, ${data.getDate()} de ${NOMES_MES[data.getMonth()].toLowerCase()}`;
}

/** Converte minutos totais (ex: 150) em texto "2h30" ou "45min". */
export function formatarDuracao(totalMinutos) {
  const horas = Math.floor(totalMinutos / 60);
  const minutos = totalMinutos % 60;
  if (horas === 0) return `${minutos}min`;
  if (minutos === 0) return `${horas}h`;
  return `${horas}h${String(minutos).padStart(2, "0")}`;
}

/**
 * Deixa maiúscula só a primeira letra. Usado para nomes extraídos de
 * comandos do Assistente (Assistente.js trabalha em texto minúsculo para
 * simplificar as expressões regulares, então o que ele devolve — nome de
 * atividade, nome de categoria — sai tudo em minúsculo; isso aqui devolve
 * uma aparência de título sem precisar reconstruir a capitalização
 * original de cada palavra digitada pelo usuário).
 */
export function capitalizarPrimeiraLetra(texto) {
  if (!texto) return texto;
  return texto.charAt(0).toUpperCase() + texto.slice(1);
}
