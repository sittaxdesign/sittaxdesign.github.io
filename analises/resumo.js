// Estado resumido das análises de um produto. Usado pela tela Análises e pelo cartão Análises da página do produto no P&D,
// para os dois mostrarem exatamente o mesmo número.
const ResumoAnalises = (() => {
  const acoes = (A) => {
    const out = [];
    for (const a of A.analises) {
      const t = a.tipo === 'teste-ab' ? 'Teste A/B' : 'Monitoramento';
      if (a.status === 'Pronto para rodar' && a.clarity?.preparacao?.length) out.push(['Preparar', a.titulo, a.clarity.preparacao[0]]);
      else if (a.status === 'Rascunho') out.push(['Revisar', a.titulo, t + ' em rascunho: fechar as definições e liberar.']);
      else if (a.status === 'Em análise') out.push(['Decidir', a.titulo, 'Coleta encerrada: ler o resultado e decidir.']);
      else if (a.tipo === 'teste-ab' && a.status === 'Em coleta') { const r = Object.values(a.resultados || {}); if (r.length && r.every((x) => x.n >= a.amostra.por_variante)) out.push(['Ler resultado', a.titulo, 'A amostra planejada foi atingida.']); }
    }
    return out;
  };

  // n: análises; pendencias: o que precisa de decisão ou ação; acima: indicadores acima da meta (de 3)
  const estado = (A, I) => {
    const c = (f) => A.analises.filter(f).length;
    const acima = I ? ['dead_click', 'rage_click', 'erro_js'].filter((k) => I.geral[k] > I.metas[k]).length : null;
    return {n: A.analises.length, testes: c((a) => a.tipo === 'teste-ab'), monitoramentos: c((a) => a.tipo === 'monitoramento'), concluidas: c((a) => a.status === 'Concluído'), pendencias: acoes(A).length, acima, indicadores: 3};
  };
  return {acoes, estado};
})();
