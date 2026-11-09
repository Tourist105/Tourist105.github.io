/* Spengler-Web: Start, Routing (Hash + History API), Overlay-Knoepfe (Zurueck, Sprache, Info).
 * Adressen:  #start | #dachrinne | #mauerabdeckung | #kehle | #kamineinfassung | #schwanenhals | #dunstrohr | #annahmen | #bestaetigen | #profil | #kamin-alt | #schwanenhals-alt | #rohrbogen | #hosenrohr | #reduktion
 *   Ansicht:  #schwanenhals/uebersicht|aufriss|zuschnitt|3d|2d   #kamineinfassung/grundriss   #dunstrohr/stutzen
 *   Zustand:  ?k=500&t=400 (Feldwerte) &mehr=1 &fokus=r &kb=1 (Tastatur) &si=oben,rechts,unten,links (Systemleisten in px, nur Test) &t=5000 (Startmenue-Zeit) &frei=1 &scroll=px &kopf=alt
 *   Dialog:   +info | +sprache | +pdf | +vollbild | +rueck:stimmt_nicht | +kommentar | +kommentare
 */
(function (root) {
  'use strict';
  const S = root.S, h = S.h, T = S.T;
  const app = document.getElementById('app');
  let seite = null, route = null, ov = [], tiefe = 0, letzteQuer = null;

  const ALIAS = { kamineinfassung: 'skizze_kamin', kamin: 'skizze_kamin', schwanenhals: 'skizze_hals', dunstrohr: 'skizze_dunst', dunst: 'skizze_dunst', skizze_kamin: 'skizze_kamin', skizze_hals: 'skizze_hals', skizze_dunst: 'skizze_dunst' };
  const RESERVIERT = ['kopf', 'modus', 'kb', 'si', 'frei', 'scroll', 'mehr', 'fokus', 'weitere', 't', 'lang', 'zustand'];

  function parse() {
    let hs = decodeURIComponent((location.hash || '').replace(/^#\/?/, ''));
    let dialog = null; const pi = hs.indexOf('+'); if (pi >= 0) { dialog = hs.slice(pi + 1); hs = hs.slice(0, pi); }
    let q = {}; const qi = hs.indexOf('?'); if (qi >= 0) { for (const p of hs.slice(qi + 1).split('&')) { const [k, v] = p.split('='); if (k) q[k] = v == null ? '1' : v; } hs = hs.slice(0, qi); }
    const [name, ansicht] = hs.split('/');
    return { name: name || 'start', ansicht: ansicht || null, q, dialog };
  }

  S.gehe = r => { tiefe++; location.hash = '#' + r; };
  S.zurueck = () => { if (tiefe > 0 && history.length > 1) { tiefe--; history.back(); } else { location.hash = '#start'; } };

  function overlays(p) {
    for (const e of ov) { if (e._weg) e._weg(); e.remove(); } ov = [];
    const o = p.overlay || {};
    const info = h('button', { class: 'ov rechts ovi', 'aria-label': T('about'), onclick: () => S.info() }, S.iconInfo());
    const flag = h('button', { class: 'ov flagge ovi ' + (o.zurueck ? 'rechts2' : 'links'), 'aria-label': T('language_title'), onclick: () => S.sprachDialog(() => rendere(true)) }, S.flaggeSvg(S.flaggeAktuell()));
    ov.push(info, flag);
    const kmb = S.kmKnopf ? S.kmKnopf(S.kmKontextFuer(route, seite), o.zurueck ? 'p3' : 'p2') : null; if (kmb) ov.push(kmb);
    if (o.zurueck) ov.push(h('button', { class: 'ov zur', 'aria-label': T('zurueck'), onclick: () => S.zurueck() }, S.iconZurueck()));
    if (o.scroll) {
      o.scroll.addEventListener('scroll', () => { const weg = o.scroll.scrollTop > 36; for (const e of [info, flag, kmb]) if (e) e.classList.toggle('weg', weg); }, { passive: true });
    }
    for (const e of ov) document.body.append(e);
  }

  function optionen(pr) {
    const o = {};
    const q = pr.q;
    S.opt = { kb: q.kb ? (+q.kb > 1 ? +q.kb : 1) : 0, kopf: q.kopf || '' };
    if (q.si) { const a = q.si.split(',').map(Number); S.setzeInsets(a[0] || 0, a[1] || 0, a[2] || 0, a[3] || 0); }
    if (q.lang) { S.setzeSprache(q.lang === 'auto' ? '' : q.lang); }
    o.werte = {}; for (const k in q) if (!RESERVIERT.includes(k)) o.werte[k] = q[k];
    o.mehr = q.mehr != null ? q.mehr !== '0' : null; o.fokus = q.fokus || null; o.scroll = q.scroll || null; o.weitere = q.weitere === '1';
    o.modus = q.modus || null; o.t = q.t != null ? +q.t : null; o.frei = q.frei != null; o.ansicht = pr.ansicht; o.dialog = pr.dialog;
    return o;
  }

  function rendere(neuLaden) {
    const pr = parse();
    const o = optionen(pr);
    S.messe();
    if (seite && seite.zerstoere) seite.zerstoere();
    S.dlgAlleZu();
    app.innerHTML = ''; seite = null;
    const name = ALIAS[pr.name] || pr.name;
    document.documentElement.lang = S.sprache();
    let p;
    if (name === 'start') p = S.seiteHome(o);
    else if (name === 'bestaetigen') p = S.seiteBestaetigen(o);
    else if (name === 'annahmen') p = S.seiteAnnahmen(o);
    else if (name.startsWith('skizze_')) p = S.seiteSkizze(name, o);
    else if (name === 'dachrinne' || name === 'mauerabdeckung' || name === 'kehle') p = S.seiteNeu(name, o);
    else if (S.seiteWeitere) p = S.seiteWeitere(name, o);
    if (!p) p = S.seiteHome(o);
    seite = p; route = name;
    app.append(p.el); overlays(p);
    letzteQuer = S.vp.quer;
    if (p.nachEinbau) p.nachEinbau();
    document.title = name === 'start' ? T('home_titel') : T('app_name');
    // Dialog aus der URL
    if (pr.dialog) {
      const [d, arg] = pr.dialog.split(':');
      setTimeout(() => {
        if (d === 'info') S.info(true);
        else if (d === 'sprache') S.sprachDialog(() => rendere(true), true);
        else if (d === 'kommentar') S.kmBlatt(S.kmKontextFuer(name, seite), true);
        else if (d === 'kommentare') S.kmListe(true);
        else if (d === 'rueck') S.rmDialog(name === 'start' ? 'start' : name, T(name === 'start' ? 'home_titel' : 'app_name'), arg || null, () => '', null, true);
      }, 60);
    }
    document.body.setAttribute('data-bereit', '1');
  }
  S.rendere = rendere;
  S.kmAktuell = () => S.kmKontextFuer(route, seite)();

  function umgebung() {
    const alt = letzteQuer;
    S.messe();
    if (seite && alt !== null && S.vp.quer !== alt) { rendere(true); return; }
    if (seite && seite.layout) seite.layout();
  }
  window.addEventListener('hashchange', () => { document.body.removeAttribute('data-bereit'); rendere(); });
  window.addEventListener('resize', umgebung);
  if (window.visualViewport) { window.visualViewport.addEventListener('resize', umgebung); window.visualViewport.addEventListener('scroll', umgebung); }
  window.addEventListener('orientationchange', () => setTimeout(umgebung, 200));
  window.addEventListener('pagehide', () => { if (seite && seite.speichere) seite.speichere(); });
  document.addEventListener('visibilitychange', () => { if (!seite) return; if (document.hidden) { if (seite.speichere) seite.speichere(); if (seite.pause) seite.pause(); } else if (seite.weiter) seite.weiter(); });
  // Schrift zuerst laden, damit Textbreiten stimmen
  const start = () => { if (!location.hash) history.replaceState(null, '', '#start'); rendere(); };
  if (document.fonts && document.fonts.load) Promise.all([document.fonts.load('400 16px Roboto'), document.fonts.load('700 16px Roboto')]).then(start, start); else start();
  if ('serviceWorker' in navigator && location.protocol.startsWith('http') && !location.search.includes('nosw')) navigator.serviceWorker.register('sw.js').catch(() => { });
})(window);
