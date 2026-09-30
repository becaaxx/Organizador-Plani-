/**
 * service-worker.js
 * ---------------------------------------------------------------------------
 * Dois papéis aqui:
 *   1) Junto com manifest.json, é o que faz o navegador considerar este
 *      site "instalável" (ícone de instalar na barra de endereço, app
 *      abrindo em janela própria, sem abas do navegador).
 *   2) Cacheia os arquivos do app na primeira visita, então nas próximas
 *      vezes ele abre instantaneamente e até funciona sem internet — como
 *      os dados já ficam no localStorage (ver RepositorioService.js), o
 *      app inteiro continua utilizável offline depois da primeira visita.
 *
 * IMPORTANTE PARA QUEM FOR EDITAR O CÓDIGO DEPOIS:
 * Sempre que você alterar QUALQUER arquivo do app (um .js, o style.css...),
 * troque o número em CACHE_NAME abaixo (ex: "v1" -> "v2"). Sem isso, quem
 * já instalou o app vai continuar vendo a versão antiga cacheada, porque o
 * Service Worker só busca a versão nova da rede quando o nome do cache muda.
 */

const CACHE_NAME = "organizador-tempo-v1";

// Lista de arquivos "essenciais" para o app funcionar offline. Caminhos
// relativos ao próprio service-worker.js (que fica na raiz do projeto).
const ARQUIVOS_PARA_CACHE = [
  "./",
  "./index.html",
  "./css/style.css",
  "./manifest.json",
  "./js/app.js",
  "./js/controller/AppController.js",
  "./js/core/Assistente.js",
  "./js/core/GerenciadorDeSugestoes.js",
  "./js/core/MotorDeTempo.js",
  "./js/models/Atividade.js",
  "./js/models/AtividadeFlexivel.js",
  "./js/models/BlocoDeTransicao.js",
  "./js/models/CompromissoFixo.js",
  "./js/models/Curso.js",
  "./js/models/FabricaDeAtividades.js",
  "./js/models/ItemLista.js",
  "./js/services/RepositorioService.js",
  "./js/ui/Formularios.js",
  "./js/ui/Renderizador.js",
  "./js/utils/DataUtils.js",
  "./icons/icon-192.png",
  "./icons/icon-512.png",
  "./icons/icon-maskable-192.png",
  "./icons/icon-maskable-512.png",
  "./icons/favicon-32.png",
];

// "install": roda uma vez quando o navegador baixa o service worker pela
// primeira vez (ou quando CACHE_NAME muda). Aqui a gente baixa e guarda
// todos os arquivos da lista acima de uma vez.
self.addEventListener("install", (evento) => {
  evento.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ARQUIVOS_PARA_CACHE))
  );
  self.skipWaiting(); // ativa a nova versão sem esperar todas as abas fecharem
});

// "activate": roda depois do install. Aproveita pra apagar caches de
// versões antigas (ex: "organizador-tempo-v0"), liberando espaço.
self.addEventListener("activate", (evento) => {
  evento.waitUntil(
    caches.keys().then((nomesDeCache) =>
      Promise.all(
        nomesDeCache
          .filter((nome) => nome !== CACHE_NAME)
          .map((nome) => caches.delete(nome))
      )
    )
  );
  self.clients.claim();
});

// "fetch": intercepta toda requisição que a página faz (carregar um .js,
// uma imagem, etc). Estratégia "cache primeiro, rede como reforço": tenta
// responder do cache instantaneamente; se não tiver, busca na rede (e, se
// conseguir, guarda no cache pra próxima vez).
self.addEventListener("fetch", (evento) => {
  // Só intercepta requisições GET do próprio app (não mexe em chamadas a
  // APIs externas, se um dia existirem).
  if (evento.request.method !== "GET") return;

  evento.respondWith(
    caches.match(evento.request).then((respostaEmCache) => {
      if (respostaEmCache) return respostaEmCache;

      return fetch(evento.request)
        .then((respostaDaRede) => {
          const copia = respostaDaRede.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(evento.request, copia));
          return respostaDaRede;
        })
        .catch(() => {
          // Sem cache e sem rede (offline numa página nunca visitada) —
          // cai pro index.html como último recurso, pra pelo menos abrir o app.
          return caches.match("./index.html");
        });
    })
  );
});
