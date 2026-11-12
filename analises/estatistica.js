// Estatística do gerenciador de análises. Um arquivo só, usado pela página (script comum) e pelo
// scripts/pd/analises.mjs (que lê o texto e executa), para a conta ser a mesma nos dois lugares.
// Cobre teste A/B de proporções (sessões com o evento / sessões totais), que é o que o Clarity devolve por segmento.
const Estat = (() => {
  // erf pela aproximação de Abramowitz e Stegun 7.1.26 (erro < 1,5e-7)
  const erf = (x) => {
    const s = x < 0 ? -1 : 1; x = Math.abs(x);
    const t = 1 / (1 + 0.3275911 * x);
    const y = 1 - (((((1.061405429 * t - 1.453152027) * t) + 1.421413741) * t - 0.284496736) * t + 0.254829592) * t * Math.exp(-x * x);
    return s * y;
  };
  const cdf = (z) => 0.5 * (1 + erf(z / Math.SQRT2));
  // inversa da normal por bisseção (precisão de sobra para alfa e poder)
  const zInv = (p) => { let lo = -10, hi = 10; for (let i = 0; i < 80; i++) { const m = (lo + hi) / 2; if (cdf(m) < p) lo = m; else hi = m; } return (lo + hi) / 2; };

  // Tamanho de amostra por variante, teste bicaudal de duas proporções.
  // p1: taxa atual (0 a 1); mdeRel: menor mudança relativa que vale detectar (0,15 = 15%).
  const amostra = ({p1, mdeRel, alfa = 0.05, poder = 0.8}) => {
    const p2 = p1 * (1 + mdeRel);
    if (!(p1 > 0 && p1 < 1) || !(p2 > 0 && p2 < 1) || !mdeRel) return {erro: 'Taxa atual e efeito mínimo precisam gerar taxas entre 0% e 100%.'};
    const za = zInv(1 - alfa / 2), zb = zInv(poder), pm = (p1 + p2) / 2;
    const n = Math.ceil(((za * Math.sqrt(2 * pm * (1 - pm)) + zb * Math.sqrt(p1 * (1 - p1) + p2 * (1 - p2))) ** 2) / ((p2 - p1) ** 2));
    return {p1, p2, n, alfa, poder};
  };

  // Duração em semanas COMPLETAS (o comportamento muda por dia da semana)
  const semanas = ({nPorVariante, variantes = 2, sessoesPorSemana}) => {
    if (!sessoesPorSemana) return null;
    return Math.max(1, Math.ceil((nPorVariante * variantes) / sessoesPorSemana));
  };

  // Resultado de um teste: duas proporções, com intervalo de confiança da diferença
  const comparar = ({n1, x1, n2, x2, alfa = 0.05}) => {
    if (!(n1 > 0 && n2 > 0)) return {erro: 'Informe as sessões das duas variantes.'};
    const p1 = x1 / n1, p2 = x2 / n2, pp = (x1 + x2) / (n1 + n2);
    const ep = Math.sqrt(pp * (1 - pp) * (1 / n1 + 1 / n2));
    const z = ep ? (p2 - p1) / ep : 0;
    const p = 2 * (1 - cdf(Math.abs(z)));
    const epNaoPool = Math.sqrt(p1 * (1 - p1) / n1 + p2 * (1 - p2) / n2), zc = zInv(1 - alfa / 2);
    return {p1, p2, dif: p2 - p1, rel: p1 ? (p2 - p1) / p1 : null, z, p, significativo: p < alfa, ic: [p2 - p1 - zc * epNaoPool, p2 - p1 + zc * epNaoPool]};
  };

  // Divergência de proporção da amostra (SRM): as variantes receberam a divisão planejada?
  // p < 0,001 = o teste não é confiável (problema de atribuição ou de coleta); não interprete o resultado.
  const srm = ({n1, n2, razao = 0.5}) => {
    const t = n1 + n2; if (!t) return null;
    const e1 = t * razao, e2 = t * (1 - razao);
    const chi = ((n1 - e1) ** 2) / e1 + ((n2 - e2) ** 2) / e2;
    return {chi, p: 1 - erf(Math.sqrt(chi / 2)), alerta: 1 - erf(Math.sqrt(chi / 2)) < 0.001};
  };
  // Faixa usual de um indicador acompanhado no tempo (gráfico de processo XmR, Wheeler): média ± 2,66 x amplitude móvel média.
  // Não é meta: diz se o valor de hoje é variação normal ou mudança real. Com menos de 15 pontos fica "preliminar".
  const limites = (valores, minimo = 15) => {
    const v = valores.filter((x) => Number.isFinite(x)); if (v.length < 2) return null;
    const media = v.reduce((a, b) => a + b, 0) / v.length;
    const amr = v.slice(1).reduce((a, x, i) => a + Math.abs(x - v[i]), 0) / (v.length - 1);
    const ultimo = v[v.length - 1], inferior = Math.max(0, media - 2.66 * amr), superior = media + 2.66 * amr;
    return {n: v.length, media, inferior, superior, ultimo, fora: ultimo < inferior || ultimo > superior, preliminar: v.length < minimo};
  };
  return {cdf, zInv, amostra, semanas, comparar, srm, limites};
})();
