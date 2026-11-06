/* ==========================================================================
   Camada de protótipo e especificação — comum a todos os fluxos do repositório.
   O fluxo declara no <head>:
     <meta name="proto:produto" content="sittax-hub">
     <meta name="proto:funcionalidade" content="ofertas">
     <meta name="proto:fluxo" content="oferta-especial-sittax-notas">
   e tem, na mesma pasta, especificacao.json (anotações por tela e dados do fluxo).
   Telas: <section data-screen="id" data-title="..." data-figma="...">. Navegação: data-goto, data-open, data-close.
   Lista de telas: data-grupo="Nome do fluxo" (título em negrito; agrupa telas seguidas) e data-perfil="admin" (recuo).
   Atalhos: ←/→ telas · E especificação · I inspecionar · M mapa do fluxo · D modo dev · Esc fecha.
   ========================================================================== */
(() => {
  const raiz = new URL('../', document.currentScript.src).href;
  const meta = (n) => document.querySelector(`meta[name="proto:${n}"]`)?.content || '';
  const ids = {produto: meta('produto'), funcionalidade: meta('funcionalidade'), fluxo: meta('fluxo')};
  const screens = [...document.querySelectorAll('[data-screen]')];
  const el = (tag, cls, txt) => { const e = document.createElement(tag); if (cls) e.className = cls; if (txt != null) e.textContent = txt; return e; };
  const dataBR = (d) => d ? d.split('-').reverse().join('/') : '';
  const STATUS = {'Em andamento': 'st-andamento', 'Em revisão': 'st-revisao', 'Aprovado': 'st-aprovado', 'Para validação': 'st-validacao', 'Concluído': 'st-concluido',
    'Aprovado pelo designer': 'st-aprovado', 'Em validação': 'st-validacao', 'Validado': 'st-validado', 'Arquivado': 'st-arquivado'};
  let spec = null, catFluxo = null, catProduto = null, modo = null, aba = 'tela';

  /* ---------- Barra superior ---------- */
  const barra = el('header', 'proto-barra');
  const voltar = el('a', 'proto-voltar', '← Sittax Design/P&D');
  voltar.href = raiz + 'index.html' + (ids.produto ? '#prototipos-' + ids.produto : '');
  const titulo = el('div', 'proto-titulo');
  const tNome = el('strong', null, document.title);
  const tSub = el('span', null, '');
  titulo.append(tNome, tSub);
  const status = el('span', 'proto-status'); status.hidden = true;
  const telas = el('div', 'proto-telas');
  const ant = el('button', 'proto-btn', '←'); ant.type = 'button'; ant.title = 'Tela anterior (←)'; ant.setAttribute('aria-label', 'Tela anterior');
  const sel = el('select'); sel.setAttribute('aria-label', 'Tela');
  const prox = el('button', 'proto-btn', '→'); prox.type = 'button'; prox.title = 'Próxima tela (→)'; prox.setAttribute('aria-label', 'Próxima tela');
  // Lista de telas: data-grupo agrupa telas seguidas sob um título em negrito (início de cada fluxo);
  // data-perfil="admin" recua a tela, para separar o caminho do administrador.
  let grupoAtual = null, destinoLista = sel;
  screens.forEach((s) => {
    const g = s.dataset.grupo || null;
    if (g !== grupoAtual) { grupoAtual = g; destinoLista = sel; if (g) { destinoLista = el('optgroup'); destinoLista.label = g; sel.append(destinoLista); } }
    const nome = s.dataset.title || s.dataset.screen;
    destinoLista.append(new Option(s.dataset.perfil === 'admin' ? '  ↳ Admin · ' + nome : nome, s.dataset.screen));
  });
  telas.append(ant, sel, prox);
  const modos = el('div', 'proto-modos');
  const bSpec = el('button', 'proto-btn', 'Especificação'); bSpec.type = 'button'; bSpec.title = 'Anotações da tela e do fluxo (E)';
  const bInsp = el('button', 'proto-btn', 'Inspecionar'); bInsp.type = 'button'; bInsp.title = 'Componente, medidas e tokens do elemento (I)';
  const bSair = el('button', 'proto-btn', 'Sair'); bSair.type = 'button'; bSair.title = 'Encerrar a sessão'; bSair.addEventListener('click', () => { if (window.__sair) window.__sair(); }); modos.append(bSpec, bInsp, bSair);
  barra.append(voltar, titulo, status, telas, modos);
  document.body.prepend(barra);

  /* ---------- Painel lateral ---------- */
  const painel = el('aside', 'proto-painel'); painel.setAttribute('aria-label', 'Especificação');
  const abas = el('div', 'proto-abas'); abas.setAttribute('role', 'tablist');
  const abaTela = el('button', null, 'Esta tela'), abaFluxo = el('button', null, 'Fluxo'), abaInsp = el('button', null, 'Inspecionar');
  [abaTela, abaFluxo, abaInsp].forEach((b) => { b.type = 'button'; b.setAttribute('role', 'tab'); abas.append(b); });
  const conteudo = el('div', 'proto-conteudo');
  painel.append(abas, conteudo);
  document.body.append(painel);
  const camadaPinos = el('div', 'proto-pinos'); document.body.append(camadaPinos);
  const alvo = el('div', 'proto-alvo'); document.body.append(alvo);
  const caixa = el('div', 'proto-caixa'); caixa.append(el('div', 'pad')); document.body.append(caixa);
  const medida = el('div', 'proto-medida'); document.body.append(medida);

  let marcarMapa = () => {}; // o mapa do fluxo (mais abaixo) troca esta função

  /* ---------- Navegação ---------- */
  const atual = () => screens.find((s) => s.classList.contains('is-active')) || screens[0];
  const show = (id) => {
    const target = screens.find((s) => s.dataset.screen === id) || screens[0];
    if (!target) return;
    screens.forEach((s) => s.classList.toggle('is-active', s === target));
    document.querySelectorAll('.proto-overlay.is-open').forEach((o) => o.classList.remove('is-open'));
    sel.value = target.dataset.screen;
    const i = screens.indexOf(target);
    ant.disabled = i <= 0; prox.disabled = i >= screens.length - 1;
    window.scrollTo(0, 0);
    render();
    marcarMapa(target.dataset.screen);
  };
  const ir = (d) => { const i = screens.indexOf(atual()) + d; if (screens[i]) location.hash = screens[i].dataset.screen; };
  ant.onclick = () => ir(-1); prox.onclick = () => ir(1);
  sel.onchange = () => { location.hash = sel.value; };
  const route = () => show(decodeURIComponent(location.hash.slice(1)));
  window.addEventListener('hashchange', route);

  // No modo Inspecionar o clique só inspeciona (fase de captura, antes dos scripts do fluxo).
  document.addEventListener('click', (e) => {
    if (modo === 'inspecionar' && e.target.closest('[data-screen]')) { e.preventDefault(); e.stopPropagation(); fixarInspecao(e.target); }
  }, true);
  // Navegação na fase de bolha: os scripts do fluxo podem barrar o avanço com stopPropagation (ex.: validação).
  document.addEventListener('click', (e) => {
    const go = e.target.closest('[data-goto]'), open = e.target.closest('[data-open]'), close = e.target.closest('[data-close]');
    if (go) { e.preventDefault(); location.hash = go.dataset.goto; return; }
    if (open) { e.preventDefault(); document.getElementById(open.dataset.open)?.classList.add('is-open'); return; }
    if (close) { e.preventDefault(); close.closest('.proto-overlay')?.classList.remove('is-open'); return; }
    if (e.target.closest('.proto-barra, .proto-painel, a, button, input, select, textarea, label')) return;
    document.body.classList.add('proto-hint'); setTimeout(() => document.body.classList.remove('proto-hint'), 600);
  });

  document.addEventListener('keydown', (e) => {
    if (e.target.matches('input, textarea, select')) return;
    if (e.key === 'ArrowRight') ir(1);
    if (e.key === 'ArrowLeft') ir(-1);
    if (e.key === 'e' || e.key === 'E') alternar('especificacao');
    if (e.key === 'i' || e.key === 'I') alternar('inspecionar');
    if (e.key === 'd' || e.key === 'D') document.body.classList.toggle('proto-dev');
    if (e.key === 'Escape') { if (modo) alternar(modo); document.querySelectorAll('.proto-overlay.is-open').forEach((o) => o.classList.remove('is-open')); }
  });

  /* ---------- Zoom: a tela de 1440 cabe na área livre ---------- */
  const fit = () => {
    const livre = document.documentElement.clientWidth - (document.body.classList.contains('proto-com-painel') ? painel.offsetWidth || 400 : 0);
    document.documentElement.style.setProperty('--proto-zoom', Math.min(1, livre / 1440));
    posicionarPinos();
  };
  window.addEventListener('resize', fit);

  /* ---------- Modos ---------- */
  const alternar = (m) => {
    modo = modo === m ? null : m;
    bSpec.setAttribute('aria-pressed', String(modo === 'especificacao'));
    bInsp.setAttribute('aria-pressed', String(modo === 'inspecionar'));
    document.body.classList.toggle('proto-com-painel', !!modo);
    document.body.classList.toggle('proto-inspecionar', modo === 'inspecionar');
    if (modo === 'especificacao' && aba === 'insp') aba = 'tela';
    if (modo === 'inspecionar') aba = 'insp';
    esconderInspecao(); fixado = null;
    fit(); render();
  };
  bSpec.onclick = () => alternar('especificacao');
  bInsp.onclick = () => alternar('inspecionar');
  abaTela.onclick = () => { aba = 'tela'; if (modo !== 'especificacao') alternar('especificacao'); else render(); };
  abaFluxo.onclick = () => { aba = 'fluxo'; if (modo !== 'especificacao') alternar('especificacao'); else render(); };
  abaInsp.onclick = () => { if (modo !== 'inspecionar') alternar('inspecionar'); };

  /* ---------- Especificação ---------- */
  let pinos = [];
  const itensDaTela = () => {
    const s = atual();
    const t = spec?.telas?.[s?.dataset.screen];
    return (t?.itens || []).map((it, i) => ({...it, n: i + 1, el: it.alvo ? s.querySelector(it.alvo) : null}));
  };
  const destacar = (it, on) => {
    pinos.forEach((p) => p.classList.toggle('is-hover', on && p.dataset.n === String(it?.n)));
    conteudo.querySelectorAll('.proto-item').forEach((li) => li.classList.toggle('is-hover', on && li.dataset.n === String(it?.n)));
    if (on && it?.el) { const r = it.el.getBoundingClientRect(); Object.assign(alvo.style, {display: 'block', left: r.left + 'px', top: r.top + 'px', width: r.width + 'px', height: r.height + 'px'}); }
    else alvo.style.display = 'none';
  };
  const posicionarPinos = () => {
    camadaPinos.replaceChildren(); pinos = [];
    if (modo !== 'especificacao') return;
    itensDaTela().forEach((it) => {
      if (!it.el || !it.el.getClientRects().length) return;
      const r = it.el.getBoundingClientRect();
      const p = el('button', 'proto-pino', String(it.n)); p.type = 'button'; p.dataset.n = it.n;
      p.style.left = Math.max(12, r.left) + 'px'; p.style.top = Math.max(document.querySelector('.proto-barra').offsetHeight + 12, r.top) + 'px';
      p.setAttribute('aria-label', 'Anotação ' + it.n + ': ' + it.nome);
      p.onmouseenter = () => destacar(it, true); p.onmouseleave = () => destacar(it, false);
      p.onclick = () => conteudo.querySelector(`.proto-item[data-n="${it.n}"]`)?.scrollIntoView({block: 'nearest', behavior: 'smooth'});
      camadaPinos.append(p); pinos.push(p);
    });
  };
  window.addEventListener('scroll', posicionarPinos, {passive: true});

  const secao = (tituloTxt, filhos) => { const s = el('section'); s.append(el('h3', null, tituloTxt)); filhos.forEach((f) => s.append(f)); return s; };
  const lista = (arr, ordenada) => { const l = el(ordenada ? 'ol' : 'ul'); arr.forEach((t) => l.append(el('li', null, t))); return l; };
  const link = (txt, href) => { const a = el('a', null, txt); a.href = href; a.target = '_blank'; a.rel = 'noopener'; return a; };

  const renderTela = () => {
    const s = atual(); const t = spec?.telas?.[s?.dataset.screen];
    if (!spec) { conteudo.append(el('p', 'proto-vazio', 'Este fluxo ainda não tem especificacao.json.')); return; }
    if (!t) { conteudo.append(el('p', 'proto-vazio', 'Esta tela ainda não tem anotações.')); return; }
    conteudo.append(secao(s.dataset.title || s.dataset.screen, [el('p', null, t.resumo || '')]));
    const itens = itensDaTela();
    if (itens.length) {
      const ol = el('ol', 'proto-itens');
      itens.forEach((it) => {
        const li = el('li', 'proto-item'); li.dataset.n = it.n;
        li.append(el('span', 'n', String(it.n)));
        const corpo = el('div');
        corpo.append(el('div', 'nome', it.nome));
        if (it.componente) corpo.append(el('div', 'comp', it.componente));
        const dl = el('dl');
        [['Obrigatório', it.obrigatorio], ['Interação', it.interacao], ['Resultado', it.resultado]].forEach(([k, v]) => { if (v) dl.append(el('dt', null, k), el('dd', null, v)); });
        if (dl.children.length) corpo.append(dl);
        if (it.alvo && !it.el) corpo.append(el('div', 'sem-alvo', 'Elemento não encontrado nesta tela (' + it.alvo + ')'));
        li.append(corpo);
        li.onmouseenter = () => destacar(it, true); li.onmouseleave = () => destacar(it, false);
        ol.append(li);
      });
      conteudo.append(secao('Componentes e comportamento', [ol]));
    }
    if (t.criterios?.length) conteudo.append(secao('Critérios de aceite', [lista(t.criterios)]));
    if (t.notas?.length) conteudo.append(secao('Notas', [lista(t.notas)]));
    const lk = el('div', 'proto-links');
    const fig = t.figma || s.dataset.figma; if (fig) lk.append(link('Ver no Figma', fig));
    if (lk.children.length) conteudo.append(lk);
  };

  const renderFluxo = () => {
    const f = spec?.fluxo || {};
    const dl = el('dl', 'proto-meta');
    const add = (k, v) => { if (v) dl.append(el('dt', null, k), el('dd', null, v)); };
    add('Produto', catProduto?.nome || ids.produto);
    add('Status', catFluxo?.status);
    if (catFluxo?.revisao?.por) add('Revisão', catFluxo.revisao.por + (catFluxo.revisao.em ? ' em ' + dataBR(catFluxo.revisao.em) : ''));
    add('Atualizado', dataBR(catFluxo?.atualizado_em));
    add('Telas', String(screens.length));
    conteudo.append(secao('Fluxo', [dl]));
    if (f.sobre) conteudo.append(secao('Sobre', [el('p', null, f.sobre)]));
    if (f.padroes?.length) conteudo.append(secao('Padrões de layout', [lista(f.padroes)]));
    if (f.fora_do_escopo?.length) conteudo.append(secao('Fora do escopo', [lista(f.fora_do_escopo)]));
    if (f.propostas?.length) conteudo.append(secao('Propostas ao UI Kit', [lista(f.propostas)]));
    if (f.historico?.length) conteudo.append(secao('Histórico', [lista(f.historico.slice().reverse().map((h) => `${h.versao} · ${h.data} — ${h.alteracao}`))]));
    const lk = el('div', 'proto-links');
    if (f.fsd || catFluxo?.fsd) lk.append(link('Documentação (FSD)', f.fsd || catFluxo.fsd));
    if (f.figma || catFluxo?.figma) lk.append(link('Figma', f.figma || catFluxo.figma));
    if (lk.children.length) conteudo.append(lk);
    conteudo.append(el('p', 'proto-dica', 'Para pedir ajustes neste protótipo, fale com o time de Design.'));
  };

  const render = () => {
    abaTela.setAttribute('aria-selected', String(aba === 'tela'));
    abaFluxo.setAttribute('aria-selected', String(aba === 'fluxo'));
    abaInsp.setAttribute('aria-selected', String(aba === 'insp'));
    abaInsp.hidden = modo !== 'inspecionar';
    if (aba === 'insp') { if (!fixado) { conteudo.replaceChildren(el('p', 'proto-vazio', 'Passe o mouse sobre um elemento da tela. Clique para fixar a inspeção; Esc sai do modo.')); } }
    else { conteudo.replaceChildren(); aba === 'fluxo' ? renderFluxo() : renderTela(); }
    setTimeout(posicionarPinos, 350);
  };

  /* ---------- Inspecionar ---------- */
  const tokens = {cor: new Map(), px: new Map()};
  const lerTokens = () => {
    const nomes = new Set();
    [...document.styleSheets].forEach((sh) => { try { [...sh.cssRules].forEach((r) => { if (r.style) for (const p of r.style) if (p.startsWith('--')) nomes.add(p); }); } catch (e) {} });
    const cs = getComputedStyle(atual() || document.body);
    const tmp = el('span'); document.body.append(tmp);
    tokens.cor.clear(); tokens.px.clear();
    nomes.forEach((n) => {
      const v = cs.getPropertyValue(n).trim(); if (!v) return;
      if (/^#|^rgb|^hsl/.test(v)) { tmp.style.color = ''; tmp.style.color = v; const c = getComputedStyle(tmp).color; if (!tokens.cor.has(c)) tokens.cor.set(c, []); tokens.cor.get(c).push(n); }
      else if (/^\d+(\.\d+)?px$/.test(v) && /^--(spacing|radius|border)-/.test(n)) { if (!tokens.px.has(v)) tokens.px.set(v, []); tokens.px.get(v).push(n); }
    });
    tmp.remove();
  };
  // Cada valor devolve o que mostrar e o que copiar: com token, copia var(--token); sem token, o valor bruto.
  const tokenCor = (valor, prefer) => {
    if (!valor || valor === 'rgba(0, 0, 0, 0)' || valor === 'transparent') return null;
    const nomes = tokens.cor.get(valor) || [];
    const n = nomes.find((x) => x.startsWith('--' + prefer)) || nomes[0];
    const span = el('span', 'proto-token' + (n ? '' : ' solto'));
    const sw = el('i'); sw.style.background = valor; span.append(sw, document.createTextNode(n ? n.slice(2) : valor + ' (sem token)'));
    span.dataset.copiar = n ? 'var(' + n + ')' : valor;
    return span;
  };
  const tokenPx = (valor, prefer) => {
    if (!valor || valor === '0px') return null;
    // com zoom, o navegador arredonda bordas finas ao pixel do dispositivo (1px vira 1.215px): volta ao inteiro mais próximo
    const vs = valor.split(' ').map((v) => { const n = parseFloat(v); return /px$/.test(v) && Math.abs(n - Math.round(n)) < 0.3 ? Math.round(n) + 'px' : v; });
    const achados = vs.map((v) => { const nomes = tokens.px.get(v) || []; return nomes.find((x) => x.startsWith('--' + prefer)); });
    const span = el('span', 'proto-token', vs.map((v, i) => achados[i] ? achados[i].slice(2) + ' (' + v + ')' : v).join(' · '));
    span.dataset.copiar = vs.map((v, i) => achados[i] ? 'var(' + achados[i] + ')' : v).join(' ');
    return span;
  };

  /* Copiar para a área de transferência: clipboard dentro do clique; se recusado, execCommand; se não, seleciona o texto. */
  const ICONE = {
    copiar: '<svg viewBox="0 0 256 256" width="16" height="16" aria-hidden="true"><path fill="currentColor" d="M216,32H88a8,8,0,0,0-8,8V80H40a8,8,0,0,0-8,8V216a8,8,0,0,0,8,8H168a8,8,0,0,0,8-8V176h40a8,8,0,0,0,8-8V40A8,8,0,0,0,216,32ZM160,208H48V96H160Zm48-48H176V88a8,8,0,0,0-8-8H96V48H208V160Z"/></svg>',
    ok: '<svg viewBox="0 0 256 256" width="16" height="16" aria-hidden="true"><path fill="currentColor" d="M229.66,77.66l-128,128a8,8,0,0,1-11.32,0l-56-56a8,8,0,0,1,11.32-11.32L96,188.69,218.34,66.34a8,8,0,0,1,11.32,11.32Z"/></svg>',
  };
  const avisoCopia = el('div', 'proto-sr'); avisoCopia.setAttribute('aria-live', 'polite'); document.body.append(avisoCopia);
  const copiarTexto = (texto, botao, rotulo, alvoSelecao) => {
    const feito = () => {
      botao.innerHTML = ICONE.ok; botao.classList.add('is-ok'); avisoCopia.textContent = rotulo + ' copiado';
      setTimeout(() => { botao.innerHTML = ICONE.copiar; botao.classList.remove('is-ok'); }, 1200);
    };
    const reserva = () => {
      const ta = el('textarea'); ta.value = texto; ta.setAttribute('readonly', ''); ta.style.cssText = 'position:fixed;opacity:0;top:0;left:0';
      document.body.append(ta); ta.select();
      let ok = false; try { ok = document.execCommand('copy'); } catch (e) {}
      ta.remove();
      if (ok) return feito();
      if (alvoSelecao) { const r = document.createRange(); r.selectNodeContents(alvoSelecao); const s = getSelection(); s.removeAllRanges(); s.addRange(r); }
      avisoCopia.textContent = 'Não foi possível copiar automaticamente: o texto ficou selecionado, use Ctrl+C.';
    };
    try { navigator.clipboard.writeText(texto).then(feito, reserva); } catch (e) { reserva(); }
  };
  const botaoCopiar = (rotulo, obterTexto, alvoSelecao) => {
    const b = el('button', 'proto-copiar'); b.type = 'button'; b.innerHTML = ICONE.copiar;
    b.title = 'Copiar ' + rotulo.toLowerCase(); b.setAttribute('aria-label', 'Copiar ' + rotulo.toLowerCase());
    b.onclick = (e) => { e.stopPropagation(); copiarTexto(obterTexto(), b, rotulo, alvoSelecao); };
    return b;
  };

  /* Código do elemento: HTML (outerHTML formatado), CSS (regras que se aplicam, por arquivo) e JS (trechos dos scripts do fluxo). */
  const formatarHTML = (html) => {
    const vazios = /^(area|base|br|col|embed|hr|img|input|link|meta|source|track|wbr)$/i;
    const partes = html.replace(/>\s+</g, '><').split(/(<[^>]+>)/).filter((p) => p.trim());
    let nivel = 0; const linhas = [];
    partes.forEach((p) => {
      if (/^<\//.test(p)) { nivel = Math.max(0, nivel - 1); linhas.push('  '.repeat(nivel) + p); }
      else if (/^<[^!]/.test(p)) { linhas.push('  '.repeat(nivel) + p); const tag = (p.match(/^<([\w-]+)/) || [])[1] || ''; if (!vazios.test(tag) && !/\/>$/.test(p)) nivel++; }
      else linhas.push('  '.repeat(nivel) + p.trim());
    });
    // junta abertura + texto curto + fechamento numa linha só
    return linhas.join('\n').replace(/(<([\w-]+)[^>]*>)\n\s*([^<\n]{0,80})\n\s*(<\/\2>)/g, '$1$3$4');
  };
  const nomeFolha = (sh) => {
    if (sh.href) { const u = new URL(sh.href); return u.pathname.includes('/kit/') ? 'kit/' + u.pathname.split('/').pop() : u.pathname.split('/').pop(); }
    const id = sh.ownerNode?.id; return id ? '<style id="' + id + '"> do fluxo' : '<style> do fluxo';
  };
  const ESTADOS = /:(hover|active|focus-visible|focus-within|focus|checked|disabled)\b|::?(before|after|placeholder|-webkit-scrollbar[\w-]*)/g;
  const cssDoElemento = (t) => {
    const grupos = new Map();
    const casa = (sel) => { try { if (t.matches(sel)) return true; const semEstado = sel.replace(ESTADOS, ''); return semEstado !== sel && semEstado.trim() && t.matches(semEstado); } catch (e) { return false; } };
    const percorrer = (regras, nome, envoltorio) => {
      [...regras].forEach((r) => {
        if (r.cssRules && !r.selectorText) { const cab = r.cssText.slice(0, r.cssText.indexOf('{')).trim(); percorrer(r.cssRules, nome, cab); return; }
        if (!r.selectorText) return;
        const seletores = r.selectorText.split(',').map((s) => s.trim()).filter(casa);
        if (!seletores.length) return;
        if (/^(\*|html|body|:root)/.test(seletores[0]) && !seletores.some((s) => /[.#\[]/.test(s))) return;
        const corpo = r.style.cssText.split(';').map((d) => d.trim()).filter(Boolean).map((d) => '  ' + d + ';').join('\n');
        let bloco = seletores.join(',\n') + ' {\n' + corpo + '\n}';
        if (envoltorio) bloco = envoltorio + ' {\n' + bloco.split('\n').map((l) => '  ' + l).join('\n') + '\n}';
        if (!grupos.has(nome)) grupos.set(nome, []);
        grupos.get(nome).push(bloco);
      });
    };
    [...document.styleSheets].forEach((sh) => {
      const nome = nomeFolha(sh);
      if (nome === 'kit/proto.css') return; // camada do protótipo, não é parte da tela
      try { percorrer(sh.cssRules, nome); } catch (e) {}
    });
    if (t.getAttribute('style')) grupos.set('atributo style', ['element.style {\n  ' + t.getAttribute('style').split(';').map((d) => d.trim()).filter(Boolean).join(';\n  ') + ';\n}']);
    return [...grupos].map(([nome, blocos]) => '/* ' + nome + ' */\n' + blocos.join('\n\n')).join('\n\n');
  };
  let scriptsDoFluxo = null;
  const carregarScripts = () => scriptsDoFluxo || (scriptsDoFluxo = Promise.all([...document.scripts].filter((s) => !s.src || !s.src.includes('/kit/')).map((s) =>
    s.src ? fetch(s.src).then((r) => r.ok ? r.text() : '').then((txt) => ({nome: s.src.split('/').pop(), txt})).catch(() => ({nome: s.src.split('/').pop(), txt: ''}))
          : Promise.resolve({nome: '<script> do fluxo', txt: s.textContent}))));
  const jsDoElemento = async (t) => {
    const partes = [];
    const nav = [];
    const alvoNav = t.closest('[data-goto], [data-open], [data-close]');
    if (alvoNav?.dataset.goto) nav.push('// Navegação do kit: clique leva à tela "' + alvoNav.dataset.goto + '" (data-goto)');
    if (alvoNav?.dataset.open) nav.push('// Navegação do kit: clique abre o overlay "#' + alvoNav.dataset.open + '" (data-open)');
    if (alvoNav && 'close' in alvoNav.dataset) nav.push('// Navegação do kit: clique fecha o overlay (data-close)');
    [...t.attributes].filter((a) => /^on/i.test(a.name)).forEach((a) => nav.push('// ' + a.name + '="' + a.value + '"'));
    if (nav.length) partes.push(nav.join('\n'));
    // termos que identificam o elemento nos scripts: id próprio e do ancestral mais próximo, e atributos data-* próprios do fluxo
    const termos = new Set();
    if (t.id) termos.add(t.id);
    const anc = t.parentElement?.closest('[id]:not([data-screen])'); if (anc && anc.id) termos.add(anc.id);
    [...t.attributes].map((a) => a.name).filter((n) => n.startsWith('data-') && !/^data-(component|goto|open|close|screen|title|figma|grupo|perfil)$/.test(n)).forEach((n) => termos.add(n));
    if (termos.size) {
      const scripts = await carregarScripts();
      scripts.forEach(({nome, txt}) => {
        // variáveis que recebem o elemento pelo id (btn = document.getElementById("btn-x")) também identificam o elemento
        // a variável só vale dentro do bloco (() => { … })() em que foi declarada, porque outros blocos reaproveitam nomes como "btn"
        const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const variaveis = []; // {re, ini, fim} em posições de caractere
        [...termos].filter((x) => !x.startsWith('data-')).forEach((id) => {
          const re = new RegExp('([A-Za-z_$][\\w$]*)\\s*=\\s*(?:document|[\\w$.]+)\\.(?:getElementById|querySelector)\\(\\s*["\'`]#?' + esc(id) + '["\'`]', 'g');
          let m;
          while ((m = re.exec(txt))) {
            if (m[1].length < 2) continue;
            const ini = Math.max(0, txt.lastIndexOf('(() =>', m.index));
            const f = txt.indexOf('})()', m.index);
            variaveis.push({re: new RegExp('\\b' + esc(m[1]) + '\\b'), ini, fim: f < 0 ? txt.length : f + 4});
          }
        });
        const linhas = txt.split('\n'); const marcadas = new Set();
        let pos = 0;
        linhas.forEach((l, i) => {
          const cita = [...termos].some((x) => l.includes(x)) || variaveis.some((v) => pos >= v.ini && pos <= v.fim && v.re.test(l));
          if (cita) for (let j = Math.max(0, i - 2); j <= Math.min(linhas.length - 1, i + 2); j++) marcadas.add(j);
          pos += l.length + 1;
        });
        if (!marcadas.size) return;
        const ord = [...marcadas].sort((a, b) => a - b); const saida = []; let ultimo = -2;
        ord.forEach((i) => { if (i > ultimo + 1 && saida.length) saida.push('  // …'); saida.push(linhas[i].replace(/\s+$/, '')); ultimo = i; });
        partes.push('// ' + nome + ' (trechos que citam ' + [...termos].map((x) => '"' + x + '"').join(', ') + ')\n' + saida.join('\n'));
      });
    }
    return partes.join('\n\n');
  };
  const LIMITE = 12000;
  const janelaCodigo = async (t) => {
    const sec = el('section', 'proto-codigo');
    sec.append(el('h3', null, 'Código do elemento'));
    const abasCod = el('div', 'proto-codigo-abas'); abasCod.setAttribute('role', 'tablist');
    const caixaCod = el('div', 'proto-codigo-caixa');
    const pre = el('pre', 'proto-codigo-pre'); pre.tabIndex = 0;
    const fontes = {HTML: formatarHTML(t.outerHTML), CSS: cssDoElemento(t)};
    let atualCod = 'HTML';
    const mostrar = (k) => {
      atualCod = k;
      abasCod.querySelectorAll('button').forEach((b) => b.setAttribute('aria-selected', String(b.dataset.k === k)));
      const txt = fontes[k] || '';
      pre.textContent = txt.length > LIMITE ? txt.slice(0, LIMITE) + '\n\n/* … cortado: ' + (txt.length - LIMITE).toLocaleString('pt-BR') + ' caracteres a mais. Copie para ver tudo. */' : txt;
      pre.setAttribute('aria-label', k + ' do elemento');
    };
    const aba = (k) => { const b = el('button', null, k); b.type = 'button'; b.dataset.k = k; b.setAttribute('role', 'tab'); b.onclick = () => mostrar(k); abasCod.append(b); };
    aba('HTML'); if (fontes.CSS) aba('CSS');
    caixaCod.append(pre, botaoCopiar('Código', () => fontes[atualCod] || '', pre));
    sec.append(abasCod, caixaCod);
    mostrar('HTML');
    const js = await jsDoElemento(t);
    if (js && fixado === t) { fontes.JS = js; aba('JS'); }
    return sec;
  };
  const zoom = () => parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--proto-zoom')) || 1;
  let fixado = null;
  const esconderInspecao = () => { caixa.style.display = 'none'; medida.style.display = 'none'; };
  const mostrarCaixa = (t) => {
    const r = t.getBoundingClientRect(), cs = getComputedStyle(t), z = zoom();
    Object.assign(caixa.style, {display: 'block', left: r.left + 'px', top: r.top + 'px', width: r.width + 'px', height: r.height + 'px'});
    const pad = caixa.firstChild;
    pad.style.borderWidth = ['Top', 'Right', 'Bottom', 'Left'].map((k) => (parseFloat(cs['padding' + k]) * z) + 'px').join(' ');
    medida.textContent = Math.round(r.width / z) + ' × ' + Math.round(r.height / z);
    Object.assign(medida.style, {display: 'block', left: r.left + 'px', top: Math.max(document.querySelector('.proto-barra').offsetHeight + 2, r.top - 22) + 'px'});
  };
  const descrever = (t) => {
    if (!tokens.cor.size) lerTokens();
    // lê o estado final, não o meio de uma transição (ex.: hover que ainda está animando a cor)
    const transAntes = t.style.transition, animAntes = t.style.animation;
    t.style.transition = "none"; t.style.animation = "none"; void t.offsetWidth;
    const cs = getComputedStyle(t), z = zoom(), r = t.getBoundingClientRect();
    const comp = t.closest('[data-component]');
    const box = el('div', 'proto-insp');
    // linha(rótulo, valor, texto a copiar): o valor pode ser texto ou um elemento com data-copiar
    const linha = (k, v, copia) => {
      if (!v) return;
      const d = el('div', 'linha'); d.append(el('span', null, k));
      const c = el('span', 'valor'); typeof v === 'string' ? c.textContent = v : c.append(v); d.append(c);
      const texto = copia || (typeof v === 'string' ? v : v.dataset?.copiar || v.textContent);
      if (fixado === t && texto) d.append(botaoCopiar(k, () => texto, c));
      box.append(d);
    };
    linha('Componente', comp ? comp.dataset.component : 'Estrutura da tela (não é componente do kit)', comp ? comp.dataset.component : '');
    const classes = t.className && typeof t.className === 'string' ? t.className.trim().split(/\s+/).filter(Boolean) : [];
    linha('Elemento', t.tagName.toLowerCase() + (classes.length ? '.' + classes.join('.') : ''));
    linha('Tamanho', Math.round(r.width / z) + ' × ' + Math.round(r.height / z) + ' px', 'width: ' + Math.round(r.width / z) + 'px; height: ' + Math.round(r.height / z) + 'px;');
    linha('Padding', tokenPx(cs.padding, 'spacing'));
    if (cs.display.includes('flex') || cs.display.includes('grid')) linha('Gap', tokenPx(cs.gap === 'normal' ? '' : cs.gap, 'spacing'));
    linha('Raio', tokenPx(cs.borderRadius, 'radius'));
    linha('Fundo', tokenCor(cs.backgroundColor, 'surface'));
    if (parseFloat(cs.borderTopWidth)) {
      const larg = tokenPx(cs.borderTopWidth, 'border'), cor = tokenCor(cs.borderTopColor, 'border');
      const s = el('span'); s.append(larg || '', ' ', cor || '');
      linha('Borda', s, [larg?.dataset.copiar, cs.borderTopStyle, cor?.dataset.copiar].filter(Boolean).join(' '));
    }
    if (t.childNodes.length && [...t.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim())) {
      linha('Texto', tokenCor(cs.color, 'typography'));
      const ts = classes.find((c) => c.startsWith('ts-'));
      const fonte = cs.fontWeight + ' ' + cs.fontSize + '/' + cs.lineHeight + ' ' + cs.fontFamily.split(',')[0].replace(/['"]/g, '');
      linha('Fonte', (ts ? ts.slice(3) + ' · ' : '') + fonte, ts ? '.' + ts : 'font: ' + fonte + ';');
    }
    t.style.transition = transAntes; t.style.animation = animAntes;
    conteudo.replaceChildren(box);
    if (fixado === t) {
      janelaCodigo(t).then((sec) => { if (fixado === t) conteudo.append(sec, el('p', 'proto-dica', 'Inspeção fixada. Clique em outro elemento para trocar; Esc sai do modo.')); });
    } else {
      conteudo.append(el('p', 'proto-dica', 'Clique no elemento para fixar a inspeção, copiar as propriedades e ver o HTML, o CSS e o JS dele.'));
    }
  };
  const fixarInspecao = (t) => { fixado = t; mostrarCaixa(t); descrever(t); };
  document.addEventListener('mousemove', (e) => {
    if (modo !== 'inspecionar' || fixado) return;
    const t = e.target.closest('[data-screen] *');
    if (!t) { esconderInspecao(); return; }
    mostrarCaixa(t); descrever(t);
  });

  /* ---------- Mapa do fluxo (rodapé) ----------
     Desenha as telas do protótipo e as ligações entre elas, como os conectores do Figma.
     Ligações: data-goto (tela) e data-open (janela) de cada tela; saídas para outros fluxos:
     link para outro arquivo (href) ou data-saida="Nome do fluxo"; ligações condicionais ou que o
     HTML não mostra: especificacao.json → fluxo.conexoes [{de, para | fluxo, rotulo, condicao, alvo, volta}].
     Faixas: data-grupo de cada tela. Atalho: M abre e fecha o mapa. */
  const MAPA = {larg: 144, colGap: 170, linGap: 44, faixaRot: 132, topo: 34};
  const VOLTA = /\b(anterior|voltar|fechar|agora n[ãa]o|cancelar|sair)\b/i;
  const lerEstado = () => { try { return JSON.parse(localStorage.getItem('proto-mapa') || '{}'); } catch (e) { return {}; } };
  const gravarEstado = (st) => { try { localStorage.setItem('proto-mapa', JSON.stringify(st)); } catch (e) {} };
  const estadoMapa = Object.assign({aberto: false, voltas: false}, lerEstado());

  const dock = el('section', 'proto-mapa'); dock.setAttribute('aria-label', 'Mapa do fluxo');
  const mCab = el('div', 'proto-mapa-cab');
  const mTit = el('button', 'proto-mapa-tit'); mTit.type = 'button';
  mTit.innerHTML = '<svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true"><path fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" d="M6 19a2 2 0 1 0 0-4 2 2 0 0 0 0 4zM18 9a2 2 0 1 0 0-4 2 2 0 0 0 0 4zM12 19h4.5a3.5 3.5 0 0 0 0-7h-8a3.5 3.5 0 0 1 0-7H12"/></svg><span>Mapa do fluxo</span>';
  const mResumo = el('span', 'proto-mapa-resumo');
  const mOpc = el('div', 'proto-mapa-opc');
  const lbVolta = el('label', 'proto-mapa-chk'); const ckVolta = el('input'); ckVolta.type = 'checkbox'; ckVolta.checked = estadoMapa.voltas;
  lbVolta.append(ckVolta, document.createTextNode('Mostrar voltar e fechar'));
  const bPng = el('button', 'proto-btn', 'Exportar PNG'); bPng.type = 'button';
  const bExp = el('button', 'proto-btn', 'Expandir'); bExp.type = 'button';
  const bMin = el('button', 'proto-btn'); bMin.type = 'button';
  mOpc.append(lbVolta, bPng, bExp, bMin);
  mCab.append(mTit, mResumo, mOpc);
  const mCorpo = el('div', 'proto-mapa-corpo');
  const mLegenda = el('p', 'proto-mapa-legenda', 'Ponto azul: onde se clica na tela. Linha azul: vai para outra tela deste fluxo. Seta tracejada com nome: sai para outro fluxo. Clique numa tela para abri-la.');
  dock.append(mCab, mCorpo);
  document.body.append(dock);

  // Janela expandida (modal) com zoom
  const modal = el('div', 'proto-mapa-modal'); modal.hidden = true; modal.setAttribute('role', 'dialog'); modal.setAttribute('aria-modal', 'true'); modal.setAttribute('aria-label', 'Mapa do fluxo expandido');
  const modalCab = el('div', 'proto-mapa-cab');
  const modalTit = el('strong', null, 'Mapa do fluxo');
  const zMenos = el('button', 'proto-btn', '−'); zMenos.type = 'button'; zMenos.setAttribute('aria-label', 'Diminuir zoom');
  const zVal = el('span', 'proto-mapa-zoom', '100%');
  const zMais = el('button', 'proto-btn', '+'); zMais.type = 'button'; zMais.setAttribute('aria-label', 'Aumentar zoom');
  const zAjus = el('button', 'proto-btn', 'Ajustar'); zAjus.type = 'button';
  const bFechar = el('button', 'proto-btn', 'Fechar'); bFechar.type = 'button';
  const modalOpc = el('div', 'proto-mapa-opc'); modalOpc.append(zMenos, zVal, zMais, zAjus, bFechar);
  modalCab.append(modalTit, modalOpc);
  const modalCorpo = el('div', 'proto-mapa-corpo grande');
  modal.append(modalCab, modalCorpo);
  document.body.append(modal);

  let grafo = null, telaAtualMapa = null, zoomModal = 1;

  // Ligações declaradas no HTML de cada tela
  const montarGrafo = () => {
    const nos = screens.map((s, i) => ({id: s.dataset.screen, s, i, titulo: s.dataset.title || s.dataset.screen, grupo: s.dataset.grupo || 'Telas', saem: [], chegam: 0, chegamVolta: 0}));
    const porId = new Map(nos.map((n) => [n.id, n]));
    const overlays = new Map([...document.querySelectorAll('.proto-overlay[id]')].map((o) => [o.id, o]));
    let k = 0;
    const rotuloDe = (a) => (a.getAttribute('aria-label') || a.textContent || a.getAttribute('title') || '').replace(/\s+/g, ' ').trim().slice(0, 32) || '(sem texto)';
    const ligacoes = [];
    nos.forEach((n) => {
      n.s.querySelectorAll('[data-goto], [data-open], a[href], [data-saida]').forEach((a) => {
        const href = a.getAttribute('href') || '';
        let tipo = null, para = null, fluxo = null, url = null;
        if (a.dataset.saida) { tipo = 'saida'; fluxo = a.dataset.saida; url = a.dataset.saidaUrl || (href && !href.startsWith('#') ? href : null); }
        else if (a.dataset.goto) { tipo = 'tela'; para = a.dataset.goto; }
        else if (a.dataset.open) { tipo = 'janela'; para = a.dataset.open; }
        else if (href && !href.startsWith('#') && !/^(mailto|tel|javascript):/i.test(href)) {
          tipo = 'saida'; url = href;
          const m = href.match(/produtos\/[^/]+\/[^/]+\/([^/]+)\//) || href.match(/\/\/([^/]+)/);
          fluxo = a.dataset.fluxo || (m ? m[1].replace(/-/g, ' ') : 'Outro fluxo');
        }
        if (!tipo) return;
        if (tipo === 'tela' && !porId.has(para)) return;
        if (tipo === 'janela' && !overlays.has(para)) return;
        if (!a.dataset.mapaI) a.dataset.mapaI = String(k++);
        ligacoes.push({de: n.id, para, tipo, fluxo, url, rotulo: rotuloDe(a), mapaI: a.dataset.mapaI});
      });
    });
    // Ligações declaradas na especificação (condicionais ou que o HTML não mostra)
    (spec?.fluxo?.conexoes || []).forEach((c) => {
      if (!porId.has(c.de)) return;
      const ehTela = c.para && porId.has(c.para);
      let mapaI = null;
      if (c.alvo) { const a = porId.get(c.de).s.querySelector(c.alvo); if (a) { if (!a.dataset.mapaI) a.dataset.mapaI = String(k++); mapaI = a.dataset.mapaI; } }
      ligacoes.push({de: c.de, para: ehTela ? c.para : null, tipo: ehTela ? 'tela' : 'saida', fluxo: ehTela ? null : (c.fluxo || c.para || 'Outro fluxo'), url: c.url || null,
        rotulo: (c.rotulo || '').slice(0, 32), condicao: c.condicao || '', mapaI, volta: c.volta === true, declarada: true});
    });
    // Janelas (overlays) viram nós da faixa da tela que as abre
    ligacoes.filter((l) => l.tipo === 'janela').forEach((l) => {
      if (!porId.has(l.para)) {
        const o = overlays.get(l.para);
        const n = {id: l.para, s: o, i: nos.length, titulo: o.dataset.title || o.getAttribute('aria-label') || l.para, grupo: porId.get(l.de).grupo, saem: [], chegam: 0, chegamVolta: 0, janela: true};
        nos.push(n); porId.set(n.id, n);
        o.querySelectorAll('[data-goto]').forEach((a) => {
          if (!porId.has(a.dataset.goto)) return;
          if (!a.dataset.mapaI) a.dataset.mapaI = String(k++);
          ligacoes.push({de: n.id, para: a.dataset.goto, tipo: 'tela', rotulo: rotuloDe(a), mapaI: a.dataset.mapaI});
        });
      }
      l.tipo = 'tela';
    });
    // Ida ou volta: volta = rótulo de voltar/fechar, ou ligação que fecha um ciclo (o destino já leva até a origem).
    // Colunas: caminho mais longo pelas idas, para que cada ida aponte para a direita.
    const ehVoltaRot = (l) => l.volta || VOLTA.test(l.rotulo);
    const telas = ligacoes.filter((l) => l.tipo === 'tela');
    const base = telas.filter((l) => !ehVoltaRot(l) && l.para !== l.de);
    const alcanca = (de, ate, ignorar) => {
      const vistos = new Set([de]), pilha = [de];
      while (pilha.length) {
        const id = pilha.pop(); if (id === ate) return true;
        base.forEach((l) => { if (l !== ignorar && l.de === id && !vistos.has(l.para)) { vistos.add(l.para); pilha.push(l.para); } });
      }
      return false;
    };
    // ordem de descoberta a partir das entradas (telas sem ida chegando), na ordem do HTML: no ciclo, volta é a que aponta para trás
    const ordem = new Map(), filaO = nos.filter((n) => !base.some((l) => l.para === n.id)).map((n) => n.id);
    if (!filaO.length && nos.length) filaO.push(nos[0].id);
    filaO.forEach((id) => ordem.set(id, ordem.size));
    for (let i = 0; i < filaO.length; i++) base.filter((l) => l.de === filaO[i]).forEach((l) => { if (!ordem.has(l.para)) { ordem.set(l.para, ordem.size); filaO.push(l.para); } });
    nos.forEach((n) => { if (!ordem.has(n.id)) ordem.set(n.id, ordem.size); });
    telas.forEach((l) => { l.volta = ehVoltaRot(l) || l.para === l.de || (ordem.get(l.para) <= ordem.get(l.de) && alcanca(l.para, l.de, l)); });
    const idas = telas.filter((l) => !l.volta);
    nos.forEach((n) => { n.col = 0; });
    for (let passo = 0; passo < nos.length; passo++) {
      let mudou = false;
      idas.forEach((l) => { const a = porId.get(l.de), b = porId.get(l.para); if (b.col < a.col + 1) { b.col = a.col + 1; mudou = true; } });
      if (!mudou) break;
    }
    telas.forEach((l) => { const alvoN = porId.get(l.para); if (l.volta) alvoN.chegamVolta++; else alvoN.chegam++; });
    ligacoes.forEach((l) => porId.get(l.de).saem.push(l));
    return {nos, porId, ligacoes, grupos: [...new Set(nos.map((n) => n.grupo))]};
  };

  // Miniatura: cópia da tela sem ids nem atributos de navegação, em escala
  const medidor = el('div', 'proto-mapa-medidor'); document.body.append(medidor);
  const miniatura = (n) => {
    const c = n.s.cloneNode(true);
    c.removeAttribute('data-screen'); c.removeAttribute('id'); c.classList.remove('is-active', 'is-open');
    c.querySelectorAll('[id]').forEach((e) => e.removeAttribute('id'));
    c.querySelectorAll('[data-draw], script').forEach((e) => { if (e.tagName === 'SCRIPT') e.remove(); });
    c.classList.add('proto-mapa-clone');
    if (n.janela) c.classList.add('janela');
    c.setAttribute('aria-hidden', 'true'); c.setAttribute('inert', '');
    medidor.append(c);
    const r0 = c.getBoundingClientRect();
    const alt = Math.min(Math.max(c.scrollHeight || r0.height, 400), 1200);
    const pontos = {};
    c.querySelectorAll('[data-mapa-i]').forEach((a) => {
      const r = a.getBoundingClientRect();
      if (r.width || r.height) pontos[a.dataset.mapaI] = {x: (r.left - r0.left + r.width / 2) / 1440, y: (r.top - r0.top + r.height / 2) / alt};
    });
    return {c, alt, pontos};
  };

  const desenhar = (corpo, escala) => {
    corpo.replaceChildren();
    if (!grafo) return;
    const W = MAPA.larg * escala, colGap = MAPA.colGap * escala, rot = MAPA.faixaRot;
    const tela = el('div', 'proto-mapa-tela');
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg'); svg.classList.add('proto-mapa-svg');
    svg.innerHTML = '<defs><marker id="pm-seta" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M2 1L8 5L2 9" fill="none" stroke="context-stroke" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></marker></defs>';
    tela.append(svg);
    const pos = new Map(); let y = 0, largMax = 0;
    grafo.grupos.forEach((g) => {
      const doGrupo = grafo.nos.filter((n) => n.grupo === g);
      const faixa = el('div', 'proto-mapa-faixa'); faixa.style.top = y + 'px';
      faixa.append(el('span', 'proto-mapa-faixa-rot', g));
      tela.append(faixa);
      const porCol = new Map();
      doGrupo.forEach((n) => { if (!porCol.has(n.col)) porCol.set(n.col, []); porCol.get(n.col).push(n); });
      let altFaixa = 0;
      porCol.forEach((lista) => {
        let yy = MAPA.topo;
        lista.forEach((n) => {
          const m = n._mini || (n._mini = miniatura(n));
          const H = Math.round(W * m.alt / 1440);
          pos.set(n.id, {x: rot + n.col * (W + colGap), y: y + yy, w: W, h: H, m});
          yy += H + 30 + MAPA.linGap * 0.4 + Math.max(0, n.saem.filter((l) => l.tipo === 'saida').length - 1) * 24;
        });
        altFaixa = Math.max(altFaixa, yy);
      });
      faixa.style.height = (altFaixa + 8) + 'px';
      y += altFaixa + 16;
    });
    // nós
    grafo.nos.forEach((n) => {
      const p = pos.get(n.id);
      const no = el('button', 'proto-mapa-no' + (n.id === telaAtualMapa ? ' is-atual' : '') + (n.janela ? ' janela' : '')); no.type = 'button';
      no.dataset.id = n.id;
      Object.assign(no.style, {left: p.x + 'px', top: p.y + 'px', width: p.w + 'px'});
      const thumb = el('span', 'proto-mapa-thumb'); thumb.style.height = p.h + 'px';
      const inner = p.m.c.cloneNode(true); inner.style.transform = 'scale(' + (p.w / 1440) + ')';
      thumb.append(inner);
      no.append(thumb, el('span', 'proto-mapa-nome', n.titulo));
      if (!n.chegam && !n.chegamVolta && !n.janela && grafo.nos.find((x) => x.grupo === n.grupo) !== n) { const t = el('span', 'proto-mapa-alerta', 'Nenhuma tela leva até aqui'); no.append(t); }
      no.setAttribute('aria-label', 'Abrir a tela ' + n.titulo);
      no.onclick = () => { if (!n.janela) { location.hash = n.id; if (!modal.hidden) fecharModal(); } };
      no.onmouseenter = () => tela.classList.add('foco') || tela.querySelectorAll('[data-de="' + n.id + '"], [data-para="' + n.id + '"]').forEach((e) => e.classList.add('is-foco'));
      no.onmouseleave = () => { tela.classList.remove('foco'); tela.querySelectorAll('.is-foco').forEach((e) => e.classList.remove('is-foco')); };
      tela.append(no);
      largMax = Math.max(largMax, p.x + p.w);
    });
    // ligações
    const ns = 'http://www.w3.org/2000/svg';
    const caminho = (d, cls, l) => { const pth = document.createElementNS(ns, 'path'); pth.setAttribute('d', d); pth.setAttribute('class', cls); pth.setAttribute('marker-end', 'url(#pm-seta)'); pth.dataset.de = l.de; if (l.para) pth.dataset.para = l.para; svg.append(pth); return pth; };
    const rotulo = (x, yy, txt, cls, l) => { const r = el('span', 'proto-mapa-rot ' + cls, txt); r.style.left = x + 'px'; r.style.top = yy + 'px'; r.dataset.de = l.de; if (l.para) r.dataset.para = l.para; if (l.condicao) r.title = 'Condição: ' + l.condicao; tela.append(r); };
    const ponto = (n, l) => {
      const p = pos.get(n.id), pt = l.mapaI != null && p.m.pontos[l.mapaI];
      return pt ? {x: p.x + pt.x * p.w, y: p.y + 2 + pt.y * p.h, real: true} : {x: p.x + p.w, y: p.y + p.h / 2, real: false};
    };
    grafo.nos.forEach((n) => {
      let nSaida = 0;
      n.saem.forEach((l) => {
        const a = ponto(n, l);
        if (a.real) { const dot = el('span', 'proto-mapa-ponto' + (l.volta ? ' volta' : '')); dot.style.left = a.x + 'px'; dot.style.top = a.y + 'px'; dot.dataset.de = l.de; if (l.para) dot.dataset.para = l.para; if (l.volta && !ckVolta.checked) dot.hidden = true; tela.append(dot); }
        const txt = l.rotulo + (l.condicao ? ' · ' + l.condicao : '');
        if (l.tipo === 'saida') {
          const p = pos.get(n.id);
          const bx = p.x + p.w + 28, by = p.y + 10 + nSaida++ * 26;
          caminho('M' + a.x + ' ' + a.y + ' C' + (a.x + 40) + ' ' + a.y + ',' + (bx - 30) + ' ' + (by + 10) + ',' + (bx - 4) + ' ' + (by + 10), 'pm-saida', l);
          const chip = el(l.url ? 'a' : 'span', 'proto-mapa-saida', '→ ' + (l.fluxo || 'Outro fluxo'));
          if (l.url) { chip.href = l.url; chip.title = 'Abrir o fluxo ' + l.fluxo; }
          chip.style.left = bx + 'px'; chip.style.top = by + 'px'; chip.dataset.de = l.de;
          tela.append(chip);
          largMax = Math.max(largMax, bx + 180);
          if (l.rotulo) rotulo(bx, by + 22, l.rotulo, 'saida', l);
          return;
        }
        const pb = pos.get(l.para); if (!pb) return;
        if (l.volta) {
          if (!ckVolta.checked) return;
          const tx = pb.x + pb.w / 2, ty = pb.y - 2, topo = Math.min(a.y, ty) - 26;
          caminho('M' + a.x + ' ' + a.y + ' C' + a.x + ' ' + topo + ',' + tx + ' ' + topo + ',' + tx + ' ' + ty, 'pm-volta', l);
          return;
        }
        const tx = pb.x - 4, ty = pb.y + pb.h / 2;
        const dx = Math.max(40, (tx - a.x) / 2);
        caminho('M' + a.x + ' ' + a.y + ' C' + (a.x + dx) + ' ' + a.y + ',' + (tx - dx) + ' ' + ty + ',' + tx + ' ' + ty, 'pm-ida' + (l.condicao ? ' cond' : ''), l);
        rotulo((a.x + tx) / 2, (a.y + ty) / 2, txt, l.condicao ? 'cond' : '', l);
      });
    });
    tela.style.width = (largMax + 40) + 'px'; tela.style.height = (y + 8) + 'px';
    svg.setAttribute('width', largMax + 40); svg.setAttribute('height', y + 8);
    corpo.append(tela, mLegenda.cloneNode(true));
    return tela;
  };

  const resumoMapa = () => {
    if (!grafo) return;
    const ida = grafo.ligacoes.filter((l) => l.tipo === 'tela' && !l.volta).length, saidas = grafo.ligacoes.filter((l) => l.tipo === 'saida').length;
    mResumo.textContent = grafo.nos.filter((n) => !n.janela).length + ' telas · ' + ida + ' ligações' + (saidas ? ' · ' + saidas + (saidas === 1 ? ' saída' : ' saídas') : '');
  };
  const atualizarMapa = () => {
    grafo = montarGrafo(); resumoMapa();
    if (estadoMapa.aberto) desenhar(mCorpo, 1);
    if (!modal.hidden) desenharModal();
  };
  const aplicarAberto = () => {
    dock.classList.toggle('aberto', estadoMapa.aberto);
    document.body.classList.toggle('proto-com-mapa', estadoMapa.aberto);
    bMin.textContent = estadoMapa.aberto ? 'Minimizar' : 'Mostrar mapa';
    mTit.setAttribute('aria-expanded', String(estadoMapa.aberto));
    if (estadoMapa.aberto) { if (!grafo) grafo = montarGrafo(); desenhar(mCorpo, 1); rolarAtual(mCorpo); }
    gravarEstado(estadoMapa);
  };
  const rolarAtual = (corpo) => { const n = corpo.querySelector('.proto-mapa-no.is-atual'); if (n) corpo.scrollTo({left: Math.max(0, n.offsetLeft - 80), top: Math.max(0, n.offsetTop - 30)}); };
  const alternarMapa = () => { estadoMapa.aberto = !estadoMapa.aberto; aplicarAberto(); };
  mTit.onclick = alternarMapa; bMin.onclick = alternarMapa;
  ckVolta.onchange = () => { estadoMapa.voltas = ckVolta.checked; gravarEstado(estadoMapa); if (estadoMapa.aberto) desenhar(mCorpo, 1); if (!modal.hidden) desenharModal(); };

  const desenharModal = () => { const t = desenhar(modalCorpo, 1.8); if (t) { t.style.zoom = zoomModal; zVal.textContent = Math.round(zoomModal * 100) + '%'; } };
  const abrirModal = () => { if (!grafo) grafo = montarGrafo(); modal.hidden = false; zoomModal = 1; desenharModal(); rolarAtual(modalCorpo); bFechar.focus(); };
  const fecharModal = () => { modal.hidden = true; bExp.focus(); };
  const mudarZoom = (z) => { zoomModal = Math.min(2, Math.max(0.3, z)); const t = modalCorpo.querySelector('.proto-mapa-tela'); if (t) t.style.zoom = zoomModal; zVal.textContent = Math.round(zoomModal * 100) + '%'; };
  bExp.onclick = abrirModal; bFechar.onclick = fecharModal;
  zMais.onclick = () => mudarZoom(zoomModal + 0.2); zMenos.onclick = () => mudarZoom(zoomModal - 0.2);
  zAjus.onclick = () => { const t = modalCorpo.querySelector('.proto-mapa-tela'); if (t) mudarZoom(Math.min((modalCorpo.clientWidth - 24) / (parseFloat(t.style.width) || 1), (modalCorpo.clientHeight - 24) / (parseFloat(t.style.height) || 1))); };
  modal.addEventListener('click', (e) => { if (e.target === modal) fecharModal(); });

  // Exportar PNG: desenho simplificado (telas como caixas com o nome, ligações e rótulos)
  const exportarPng = async () => {
    if (!grafo) grafo = montarGrafo();
    const tmp = el('div'); tmp.style.cssText = 'position:absolute;left:-30000px;top:0'; document.body.append(tmp);
    const tela = desenhar(tmp, 1.4);
    const W = parseFloat(tela.style.width), H = parseFloat(tela.style.height), dpr = 2;
    const cv = document.createElement('canvas'); cv.width = W * dpr; cv.height = (H + 48) * dpr;
    const g = cv.getContext('2d'); g.scale(dpr, dpr);
    const cs = getComputedStyle(document.body), cor = (v, d) => cs.getPropertyValue(v).trim() || d;
    const AZUL = cor("--typography-info", "#5091e6"), AZUL_ESC = cor("--typography-info-dark", "#3e71b3"), AZUL_BORDA = cor("--border-info", "#8abdff"), CINZA = cor("--typography-tertiary", "#9a9ea8");
    g.fillStyle = cor('--surface-default', '#fff'); g.fillRect(0, 0, W, H + 48);
    g.fillStyle = cor('--typography-primary', '#414043'); g.font = '600 16px "Source Sans 3", sans-serif';
    g.fillText((tNome.textContent || document.title) + ' — mapa do fluxo', 16, 28);
    const r0 = tela.getBoundingClientRect(), off = (e) => { const r = e.getBoundingClientRect(); return {x: r.left - r0.left, y: r.top - r0.top + 40, w: r.width, h: r.height}; };
    tela.querySelectorAll('.proto-mapa-faixa').forEach((f) => { const o = off(f); g.fillStyle = cor('--surface-soft', '#f4f6fa'); g.fillRect(0, o.y, W, o.h); g.fillStyle = cor('--typography-secondary', '#7f7e80'); g.font = '600 12px "Source Sans 3", sans-serif'; g.fillText(f.textContent, 12, o.y + 20); });
    g.save(); g.translate(0, 40);
    tela.querySelectorAll('.proto-mapa-svg path[d]').forEach((p) => {
      if (p.closest('marker')) return;
      const path = new Path2D(p.getAttribute('d')), cls = p.getAttribute('class') || '';
      g.strokeStyle = cls.includes('volta') ? CINZA : AZUL; g.lineWidth = 1.6; g.setLineDash(cls.includes('saida') || cls.includes('volta') || cls.includes('cond') ? [5, 4] : []);
      g.stroke(path);
    });
    g.restore(); g.setLineDash([]);
    tela.querySelectorAll('.proto-mapa-no').forEach((n) => {
      const o = off(n.querySelector('.proto-mapa-thumb'));
      g.fillStyle = cor('--surface-blank', '#eeeded'); g.fillRect(o.x, o.y, o.w, o.h);
      g.strokeStyle = n.classList.contains('is-atual') ? AZUL : cor('--border-default', '#dbe1f0'); g.lineWidth = n.classList.contains('is-atual') ? 2 : 1; g.strokeRect(o.x, o.y, o.w, o.h);
      g.fillStyle = cor('--typography-primary', '#414043'); g.font = '600 12px "Source Sans 3", sans-serif';
      g.fillText(n.querySelector('.proto-mapa-nome').textContent.slice(0, 34), o.x, o.y + o.h + 16);
    });
    tela.querySelectorAll('.proto-mapa-ponto:not([hidden])').forEach((p) => { const o = off(p); g.fillStyle = p.classList.contains('volta') ? CINZA : AZUL; g.beginPath(); g.arc(o.x + o.w / 2, o.y + o.h / 2, 5, 0, 7); g.fill(); });
    tela.querySelectorAll('.proto-mapa-rot, .proto-mapa-saida').forEach((r) => {
      const o = off(r); g.font = '400 11px "Source Sans 3", sans-serif';
      const tw = g.measureText(r.textContent).width + 10;
      g.fillStyle = cor('--surface-default', '#fff'); g.fillRect(o.x, o.y, tw, 18);
      g.strokeStyle = AZUL_BORDA; g.lineWidth = 1; g.strokeRect(o.x, o.y, tw, 18);
      g.fillStyle = AZUL_ESC; g.fillText(r.textContent, o.x + 5, o.y + 13);
    });
    tmp.remove();
    const blob = await new Promise((res) => cv.toBlob(res, 'image/png'));
    const nome = 'mapa-' + (ids.fluxo || 'fluxo') + '.png';
    try {
      const dl = window.claude && window.claude.use ? await window.claude.use('downloads') : null;
      if (dl) { await dl.save({filename: nome, data: blob}); return; }
    } catch (e) { if (e && (e.code === 'declined' || e.code === 'rate_limited')) return; }
    // sem o recurso de download: mostra a imagem numa janela para salvar com o botão direito
    const ov = el('div', 'proto-mapa-modal'); ov.setAttribute('role', 'dialog'); ov.setAttribute('aria-label', 'Imagem do mapa');
    const cab = el('div', 'proto-mapa-cab'); const fx = el('button', 'proto-btn', 'Fechar'); fx.type = 'button'; fx.onclick = () => ov.remove();
    cab.append(el('strong', null, 'Clique com o botão direito na imagem e escolha "Salvar imagem como"'), fx);
    const cp = el('div', 'proto-mapa-corpo grande'); const img = el('img'); img.src = URL.createObjectURL(blob); img.alt = 'Mapa do fluxo'; img.style.maxWidth = 'none'; cp.append(img);
    ov.append(cab, cp); document.body.append(ov);
  };
  bPng.onclick = () => { exportarPng(); };

  marcarMapa = (id) => {
    telaAtualMapa = id;
    [mCorpo, modalCorpo].forEach((c) => c.querySelectorAll('.proto-mapa-no').forEach((n) => n.classList.toggle('is-atual', n.dataset.id === id)));
  };
  document.addEventListener('keydown', (e) => {
    if (e.target.matches('input, textarea, select')) return;
    if (e.key === 'm' || e.key === 'M') alternarMapa();
    if (e.key === 'Escape' && !modal.hidden) fecharModal();
  });
  aplicarAberto();
  setTimeout(atualizarMapa, 0);

  /* ---------- Dados: especificação e catálogo ---------- */
  Promise.all([
    fetch('especificacao.json', {cache: 'no-store'}).then((r) => r.ok ? r.json() : null).catch(() => null),
    fetch(raiz + 'catalogo.json', {cache: 'no-store'}).then((r) => r.ok ? r.json() : null).catch(() => null),
  ]).then(([s, c]) => {
    spec = s;
    catProduto = c?.produtos?.find((p) => p.id === ids.produto) || null;
    const func = catProduto?.funcionalidades?.find((f) => f.id === ids.funcionalidade);
    catFluxo = func?.fluxos?.find((f) => f.id === ids.fluxo) || null;
    tNome.textContent = catFluxo?.nome || spec?.fluxo?.nome || document.title;
    tSub.textContent = [catProduto?.nome, func?.nome].filter(Boolean).join(' › ');
    // status: o da revisão (gravado no Sittax Design/P&D) vale mais que o do catálogo
    const mostrarStatus = (s) => { if (!s) return; status.textContent = s; status.className = 'proto-status ' + (STATUS[s] || ''); status.hidden = false; };
    mostrarStatus(new URLSearchParams(location.search).get('status') || catFluxo?.status);
    if (window.claude && window.claude.use) window.claude.use('db').then((db) => {
      if (db) db.doc('revisoes/' + ids.produto + '--' + ids.fluxo).onSnapshot((d) => { if (d.exists) mostrarStatus(d.data().status); }, () => {});
    }).catch(() => {});
    render();
    atualizarMapa();
  });

  route(); fit();
})();
