/* Spengler-Web: gemeinsamer Rahmen der Seiten Rohrbogen, Schwanenhals (alt), Hosenrohr, Reduktion und Gekantetes Profil im Stil der Alex-Teile.
 * Port von SkizzenKopf, ErgebnisLeiste und seiteMitLeiste (Android): Titel, Reiter und PDF-Knopf oben, grosse Vektorskizze mit antippbaren Massen
 * (Tipp aufs Mass = Feld, Tipp in die Skizze = Vollbild), optional ein 3D-Reiter, Hauptfelder unter der Skizze, Ergebnis-Leiste mit "Blatt teilen".
 * Aufbau wie in skizze.js (seiteSkizze), nur ohne die Rechnung: die steckt in der Seite (rohr.js, alt.js). */
(function (root) {
  'use strict';
  const S = root.S, h = S.h, T = S.T, Ze = root.Ze;

  /** o: { titel, tabs: [Namen], dreiD: Index des 3D-Reiters oder -1, primBox, beiTab(i), beiPdf(), beiTeilen(), anteil } */
  S.weitereShell = function (o) {
    const quer = S.vp.quer, dreiD = o.dreiD == null ? -1 : o.dreiD;
    const R = { tab: 0, quer };
    const karte = h('div', { class: 'skkarte' }), cv2 = h('canvas', { 'aria-label': T('ss_live') });
    karte.append(cv2);
    const view = new S.SkizzenAnsicht(cv2); view.arten = o.tabs.map((_, i) => i);
    let cv3 = null;
    if (dreiD >= 0) { cv3 = h('canvas', { 'aria-label': T('d3_rohr_beschreibung') }); cv3.style.display = 'none'; karte.append(cv3); }
    const kippGross = h('button', { class: 'kippgross', 'aria-label': T('ss_tipp'), onclick: () => R.vollbild() }, S.iconVollbild());
    if (!quer) karte.append(kippGross);
    const chips = o.tabs.map((n, i) => h('button', { class: 'chip', text: n, onclick: () => R.setzeTab(i, true) }));
    const pdfKnopf = h('button', { class: 'pdfknopf', text: T('ss_ansehen'), onclick: () => o.beiPdf && o.beiPdf() });
    const reiter = h('div', { class: 'reiterzeile' }, chips, pdfKnopf);
    const titel = h('div', { class: 'sktitel' }, h('span', { text: o.titel }));
    const ts = titel.firstChild; S.autosize(ts, 12, 22); ts.style.display = 'block'; ts.style.overflow = 'hidden'; ts.style.width = '100%'; ts.style.fontSize = '22px';
    const primBox = o.primBox; if (quer && primBox) primBox.style.cssText = 'padding:0;margin:0';
    const kopf = h('div', { class: 'skkopf' }, quer ? null : titel, reiter, karte, quer ? null : primBox);

    const leisteLabel = h('div', { class: 'll' }), leisteWert = h('div', { class: 'lw' });
    const teilenKnopf = h('button', { class: 'teilen', text: T('ss_blatt_teilen'), onclick: () => o.beiTeilen && o.beiTeilen() });
    const leiste = h('div', { class: 'leiste' }, h('div', { class: 'lt' }, leisteLabel, leisteWert), teilenKnopf);
    S.autosize(leisteWert, 16, 26);
    const inh = h('div', { class: 'skinhalt' }), scroll = h('div', { class: 'skscroll' }, inh);
    const el = h('div', { class: 'sk' + (quer ? ' quer' : '') });
    const hoch = !quer && S.kopfScrollt();
    if (quer) el.append(kopf, h('div', { class: 'skrechts' }, scroll, leiste)); else if (hoch) { scroll.prepend(kopf); el.append(scroll, leiste); } else el.append(kopf, scroll, leiste);
    Object.assign(R, { el, kopf, karte, cv2, cv3, view, chips, inh, scroll, leiste, leisteLabel, leisteWert, teilenKnopf, kippGross, primBox, titel, reiter });

    R.zeigeChips = () => chips.forEach((b, i) => b.classList.toggle('an', i === R.tab));
    R.setzeTab = (i, merken) => {
      R.tab = i; const ist3 = i === dreiD;
      if (cv3) { cv3.style.display = ist3 ? '' : 'none'; cv2.style.visibility = ist3 ? 'hidden' : 'visible'; }
      kippGross.style.display = ist3 || quer ? 'none' : '';
      if (!ist3) { view.ansicht = i; view.baue(false); }
      R.zeigeChips(); if (o.beiTab) o.beiTab(i, ist3, merken);
    };
    R.ist3d = () => R.tab === dreiD;
    R.vollbild = () => { const a = R.tab; if (a === dreiD) return; S.vollbildZeigen((w, hh) => view.zeichnungMit(a, w, hh), view.aktiv); };
    view.beiLeerTipp = () => R.vollbild();

    // ---- Ergebnis-Leiste (ErgebnisLeiste): Zahl zaehlt hoch, "Blatt teilen" bestaetigt kurz
    let angezeigt = NaN, zaehlStopp = null;
    R.leiste_leer = text => { leisteLabel.textContent = text || T('ss_leiste_leer'); leisteWert.textContent = '-'; angezeigt = NaN; teilenKnopf.disabled = true; teilenKnopf.style.opacity = .5; };
    R.leiste_gueltig = (label, ziel, textFn) => {
      leisteLabel.textContent = label; teilenKnopf.disabled = false; teilenKnopf.style.opacity = 1;
      const von = isNaN(angezeigt) ? ziel : angezeigt;
      if (zaehlStopp) zaehlStopp();
      if (von === ziel) { angezeigt = ziel; leisteWert.textContent = textFn(ziel); leisteWert.style.transform = ''; return; }
      zaehlStopp = S.anim(320, S.decel, (e, t) => { const x = von + (ziel - von) * t; angezeigt = x; leisteWert.textContent = textFn(x); leisteWert.style.transform = 'scale(' + (1 + 0.05 * (1 - Math.abs(2 * t - 1))) + ')'; },
        () => { angezeigt = ziel; leisteWert.textContent = textFn(ziel); leisteWert.style.transform = ''; });
    };
    R.teilenFertig = (dann) => {
      S.haptik(20); const vorher = teilenKnopf.textContent; teilenKnopf.textContent = '✓  ' + T('ss_blatt_fertig'); teilenKnopf.classList.add('ok');
      teilenKnopf.style.transform = 'scale(1.05)'; setTimeout(() => { teilenKnopf.style.transform = ''; }, 140);
      setTimeout(dann, 420); setTimeout(() => { teilenKnopf.textContent = vorher; teilenKnopf.classList.remove('ok'); }, 2200);
    };

    // ---- Layout (kopfAnpassen, Tastatur, Sichtbarkeit) wie seiteSkizze
    const anteil = o.anteil || 0.80;
    R.onGroesse = null;
    R.layout = () => {
      const vp = S.vp;
      leiste.style.display = vp.tastatur ? 'none' : '';
      const insTop = S.inset('top'), insBot = S.inset('bottom');
      el.style.paddingBottom = (vp.tastatur ? Math.max(vp.ime, 0) : insBot) + 'px';
      if (!quer) {
        const wunsch = vp.voll * (vp.tastatur ? 0.52 : anteil);
        const frei = vp.h - insTop - (vp.tastatur ? vp.ime : insBot) - (vp.tastatur ? 0 : leiste.offsetHeight);
        let kh = wunsch; if (frei > 0) kh = Math.min(wunsch, Math.max(300, frei - 96));
        if (hoch) { kopf.style.height = ''; karte.style.flex = 'none'; karte.style.height = S.karteHoch() + 'px'; } else kopf.style.height = kh + 'px';
        const klein = vp.tastatur || kh < 420;
        titel.style.visibility = klein ? 'hidden' : ''; reiter.style.visibility = klein ? 'hidden' : '';
      }
      view.groesse(karte.clientWidth, karte.clientHeight);
      if (R.onGroesse) R.onGroesse(karte.clientWidth, karte.clientHeight);
      S.autosizeAlle(el);
    };
    R.ro = new ResizeObserver(() => { view.groesse(karte.clientWidth, karte.clientHeight); if (R.onGroesse) R.onGroesse(karte.clientWidth, karte.clientHeight); });
    R.ro.observe(karte);
    R.zeigeChips();
    return R;
  };
})(window);
