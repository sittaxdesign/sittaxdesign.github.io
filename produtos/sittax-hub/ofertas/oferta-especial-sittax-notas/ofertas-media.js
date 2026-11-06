// Alterar plano: campo "Ver ofertas para [n] notas por mês" (dentro da mensagem) recalcula as três ofertas (faixa mais próxima, recomendada e a seguinte)
// e leva o plano escolhido para a Assinatura e a Confirmação. Usado pelos fluxos Oferta especial e Upgrade de plano.
// FAIXAS: tabela de EXEMPLO para o protótipo (só 2.500 notas = R$ 280 é valor conhecido). Trocar pela tabela real do Sittax Notas.
(() => {
  const FAIXAS = [
    {notas: 500, preco: 120},
    {notas: 1000, preco: 180},
    {notas: 2500, preco: 280},
    {notas: 3300, preco: 340},
    {notas: 5000, preco: 450},
    {notas: 7500, preco: 590},
    {notas: 10000, preco: 720},
  ];
  const fmt = (x) => x.toLocaleString("pt-BR");
  const reais = (x) => "R$ " + x.toLocaleString("pt-BR", {minimumFractionDigits: 2, maximumFractionDigits: 2});
  const tela = document.querySelector('[data-screen="02-planos"]');
  if (!tela) return;
  const campo = tela.querySelector("#campo-media"), input = tela.querySelector("#media-ofertas");
  const cards = [...tela.querySelectorAll(".cards .card-plano")];
  let media = 940, ofertas = [];

  // três faixas a partir da primeira que comporta a média
  const escolher = (n) => {
    let i = FAIXAS.findIndex((f) => f.notas >= n);
    if (i < 0) i = FAIXAS.length - 1;
    const ini = Math.max(0, Math.min(i, FAIXAS.length - 3));
    return FAIXAS.slice(ini, ini + 3);
  };

  const desenhar = () => {
    ofertas = escolher(media);
    cards.forEach((c, k) => {
      const f = ofertas[k]; if (!f) return;
      c.querySelector(".numero").textContent = fmt(f.notas);
      const preco = c.querySelector(".preco"); if (preco) preco.textContent = "R$ " + fmt(f.preco) + "/mês";
      const pct = c.querySelector("[data-pct]"); if (pct) { pct.dataset.pct = f.notas; pct.textContent = fmt(Math.round(media / f.notas * 100)); }
      const folga = c.querySelector("[data-folga]"); if (folga) { folga.dataset.folga = f.notas; folga.textContent = fmt(Math.max(0, f.notas - media)); }
    });
  };

  // plano escolhido → Termo, Resumo e Confirmação
  const aplicar = (k) => {
    const f = ofertas[k], card = cards[k]; if (!f) return;
    const termo = document.querySelector('[data-screen="03-assinatura"] .tb-plano');
    if (termo) {
      termo.querySelector(".numero").textContent = fmt(f.notas);
      termo.querySelector(".preco").innerHTML = "R$ " + fmt(f.preco) + "<span>/mês</span>";
      termo.querySelector(".descricao").textContent = card.querySelector(".descricao").textContent;
      const selo = termo.querySelector(".tags"); if (selo) selo.hidden = k !== 1;
      const folga = termo.querySelector("[data-folga]"); if (folga) { folga.dataset.folga = f.notas; folga.textContent = fmt(Math.max(0, f.notas - media)); }
    }
    document.querySelectorAll('[data-plano="notas"]').forEach((e) => (e.textContent = fmt(f.notas) + " notas"));
    document.querySelectorAll('[data-plano="valor"]').forEach((e) => (e.textContent = reais(f.preco)));
    document.querySelectorAll('[data-plano="numero"]').forEach((e) => (e.textContent = fmt(f.notas)));
  };
  cards.forEach((c, k) => c.querySelector(".botao").addEventListener("click", () => aplicar(k)));

  const valor = () => parseInt(input.value.replace(/\D/g, ""), 10) || 0;
  input.addEventListener("input", () => {
    const n = valor();
    input.value = n ? fmt(n) : "";
    if (!n) { campo.classList.add("state-error"); return; }
    campo.classList.remove("state-error");
    media = n; desenhar();
  });
  input.addEventListener("keydown", (e) => { if (e.key === "Enter") input.blur(); });

  // a média do fluxo (940 no Modelo A, a quantidade digitada no Modelo B) vira o valor inicial do campo
  window.ofertasMedia = (n) => { media = n || 940; input.value = fmt(media); campo.classList.remove("state-error"); desenhar(); };
  window.ofertasMedia(940);
})();
