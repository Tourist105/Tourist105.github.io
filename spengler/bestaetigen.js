/* Spengler-Web: "Kurz bestaetigen" (BestaetigenActivity.kt, kern/Bestaetigen.kt). Daten: bestaetigen_daten.js (aus bestaetigen.json). */
(function (root) {
  'use strict';
  const S = root.S, h = S.h;
  const D = root.BEST_DATEN || { punkte: [], gruppen: [], empfaenger: '', minuten: 5 };
  const PUNKTE = D.punkte, GRUPPEN = D.gruppen, EMPF = D.empfaenger;
  const KEY = 'best1';
  const fotos = {};   // id -> [{name, blob}] nur in dieser Sitzung (Fotos sind zu gross fuer den Browser-Speicher)

  const punkt = id => PUNKTE.find(p => p.id === id);
  const minuten = n => Math.max(1, Math.round(n * 9 / 60));
  const erledigt = a => !!a && (a.u === 'stimmt' || (a.u === 'anders' && ((a.w || '').trim() !== '' || (a.f || []).length > 0)));
  let antworten = null;
  function lade() {
    if (antworten) return antworten;
    antworten = {};
    try { const t = JSON.parse(S.lies(KEY) || '{}'); for (const id in t) if (punkt(id) && (t[id].u === 'stimmt' || t[id].u === 'anders')) antworten[id] = { u: t[id].u, w: String(t[id].w || ''), f: Array.isArray(t[id].f) ? t[id].f : [] }; } catch (e) { antworten = {}; }
    return antworten;
  }
  function speichere() { try { S.schreibe(KEY, JSON.stringify(antworten)); } catch (e) { /* bleibt im Speicher */ } }
  function fortschritt() { const a = lade(); return [PUNKTE.filter(p => erledigt(a[p.id])).length, PUNKTE.length]; }
  function fortschrittGruppe(g) { const a = lade(), ps = PUNKTE.filter(p => p.gruppe === g); return [ps.filter(p => erledigt(a[p.id])).length, ps.length]; }
  S.bestNeuLaden = () => { antworten = null; }; S.bestFortschritt = fortschritt; S.bestMinuten = minuten;

  // ------------------------------------------------------------ Export (exportText, exportJson)
  const jetzt = () => { const d = new Date(), z = n => String(n).padStart(2, '0'); return d.getFullYear() + '-' + z(d.getMonth() + 1) + '-' + z(d.getDate()) + 'T' + z(d.getHours()) + ':' + z(d.getMinutes()) + ':' + z(d.getSeconds()); };
  function exportText(zeit) {
    const a = lade(), [fertig, alle] = fortschritt();
    const n1 = PUNKTE.filter(p => erledigt(a[p.id]) && a[p.id].u === 'stimmt').length, n2 = PUNKTE.filter(p => erledigt(a[p.id]) && a[p.id].u === 'anders').length;
    let s = 'Spengler-App, Bestätigung von Alex\nStand ' + zeit.replace('T', ' ').slice(0, 16) + ', App web\nBeantwortet: ' + fertig + ' von ' + alle + ' (Stimmt: ' + n1 + ', Bei mir anders: ' + n2 + '), offen: ' + (alle - fertig) + '\n';
    let nr = 0;
    for (const g of GRUPPEN) {
      s += '\n' + g.toUpperCase() + '\n';
      for (const p of PUNKTE.filter(q => q.gruppe === g)) {
        nr++; const x = a[p.id];
        s += nr + '. ' + p.frage + '\n   Vorgabe: ' + p.vorgabe + '\n   Antwort: ';
        if (!x || !erledigt(x)) s += x ? 'BEI MIR ANDERS, aber noch ohne Wert' : 'offen';
        else if (x.u === 'stimmt') s += 'STIMMT';
        else {
          s += 'BEI MIR ANDERS'; const w = x.w.trim();
          if (w) s += ': ' + w.replace(/\n/g, ' ');
          if (w && p.zahlFeld && p.einheit && /^[0-9,.\- ]+$/.test(w)) s += ' ' + p.einheit;
        }
        s += '\n';
        if (x && x.f.length) s += '   Fotos: ' + x.f.join(', ') + '\n';
      }
    }
    return s;
  }
  // Kurzform fuer mailto (Laengenlimit): jede Zeile nur Nummer, Stichwort der Frage, Antwort. Nie abschneiden.
  function exportKurz(zeit) {
    const a = lade(), [fertig, alle] = fortschritt();
    let s = 'Spengler-App, Bestätigung von Alex (Kurzfassung)\nStand ' + zeit.replace('T', ' ').slice(0, 16) + ', App web\nBeantwortet: ' + fertig + ' von ' + alle + '\n';
    let nr = 0;
    for (const g of GRUPPEN) {
      s += '\n' + g.toUpperCase() + '\n';
      for (const p of PUNKTE.filter(q => q.gruppe === g)) {
        nr++; const x = a[p.id]; let r;
        if (!x || !erledigt(x)) r = x ? 'BEI MIR ANDERS, ohne Wert' : 'offen';
        else if (x.u === 'stimmt') r = 'STIMMT';
        else { const w = x.w.trim().replace(/\n/g, ' '); r = 'ANDERS' + (w ? ': ' + w + (p.zahlFeld && p.einheit && /^[0-9,.\- ]+$/.test(w) ? ' ' + p.einheit : '') : '') + (x.f.length ? ' (Fotos: ' + x.f.join(', ') + ')' : ''); }
        s += nr + '. ' + p.frage + ' ' + r + '\n';
      }
    }
    return s;
  }
  function exportJson(zeit) {
    const a = lade(), [fertig, alle] = fortschritt();
    return JSON.stringify({
      art: 'bestaetigung_alex', zeit, appVersion: 'web', beantwortet: fertig, alle,
      antworten: PUNKTE.map(p => { const x = a[p.id]; return { id: p.id, gruppe: p.gruppe, frage: p.frage, vorgabe: p.vorgabe, urteil: !x ? 'offen' : x.u === 'stimmt' ? 'stimmt' : 'anders', wert: x ? x.w : '', einheit: p.einheit, fotos: x ? x.f : [] }; })
    }, null, 2) + '\n';
  }
  S.bestExport = { exportText, exportJson, exportKurz };

  // ------------------------------------------------------------ Ring (RingView)
  function ring(px) {
    const e = h('div', { class: 'bring' }); e.style.width = e.style.height = px + 'px';
    const sw = px * 0.12, r = (px - sw) / 2, u = 2 * Math.PI * r;
    e.innerHTML = '<svg width="' + px + '" height="' + px + '" viewBox="0 0 ' + px + ' ' + px + '"><circle cx="' + px / 2 + '" cy="' + px / 2 + '" r="' + r + '" fill="none" stroke="#D6E0EC" stroke-width="' + sw + '"/><circle class="bg" cx="' + px / 2 + '" cy="' + px / 2 + '" r="' + r + '" fill="none" stroke="#0B5CAB" stroke-width="' + sw + '" stroke-linecap="round" stroke-dasharray="' + u + '" stroke-dashoffset="' + u + '" transform="rotate(-90 ' + px / 2 + ' ' + px / 2 + ')" style="transition:stroke-dashoffset .45s cubic-bezier(.2,.7,.2,1)"/></svg><div class="bz"></div>';
    const bg = e.querySelector('.bg'), bz = e.querySelector('.bz');
    e.setze = (f, alle) => {
      const z = alle ? f / alle : 0; bg.style.strokeDashoffset = u * (1 - z);
      bg.style.opacity = z > 0 ? 1 : 0; bg.setAttribute('stroke', f >= alle && alle > 0 ? '#188246' : '#0B5CAB');
      const m = f + '/' + alle; bz.textContent = m; bz.style.fontSize = px * (m.length > 4 ? 0.27 : 0.34) + 'px';
    };
    return e;
  }

  // ------------------------------------------------------------ Karte im Hauptmenue (bestaetigenKarte)
  S.bestKarte = function () {
    const rg = ring(72), unter = h('div', { class: 'bunter' }), stand = h('div', { class: 'bstand' });
    const k = h('button', { class: 'bkarte', 'aria-label': 'Bitte kurz bestätigen, Fortschritt anzeigen' }, rg, h('div', { class: 'btext' }, h('div', { class: 'btitel', text: 'Bitte kurz bestätigen' }), unter, stand));
    const [f, alle] = fortschritt();
    unter.textContent = alle + ' Punkte, etwa ' + minuten(alle) + ' Minuten';
    stand.textContent = f >= alle ? 'Alles beantwortet. Danke!' : f === 0 ? 'Jetzt starten' : 'Weiter mit Punkt ' + (f + 1);
    rg.setze(0, alle); requestAnimationFrame(() => requestAnimationFrame(() => rg.setze(f, alle)));
    k.addEventListener('click', () => { S.haptik(10); S.gehe('bestaetigen'); });
    return k;
  };

  // ------------------------------------------------------------ Bildschirm
  function verkleinere(file) {
    return new Promise(res => {
      try {
        const url = URL.createObjectURL(file), im = new Image();
        im.onload = () => { const s = Math.min(1, 1600 / Math.max(im.width, im.height)), c = document.createElement('canvas'); c.width = Math.round(im.width * s); c.height = Math.round(im.height * s); c.getContext('2d').drawImage(im, 0, 0, c.width, c.height); URL.revokeObjectURL(url); c.toBlob(b => res(b || file), 'image/jpeg', 0.85); };
        im.onerror = () => { URL.revokeObjectURL(url); res(file); }; im.src = url;
      } catch (e) { res(file); }
    });
  }

  S.seiteBestaetigen = function (opt) {
    opt = opt || {};
    const a = lade();
    const inh = h('div', { class: 'inhalt' });
    const mt = (e, px) => { e.style.marginTop = px + 'px'; return e; };
    inh.append(S.seitenTitel('Kurz bestätigen', 28, 56, 156));
    const rg = ring(84), ringText = h('div', { class: 'brt' });
    inh.append(mt(h('div', { class: 'bkopf' }, rg, h('div', { class: 'btext' }, ringText, h('div', { class: 'bhinweis', text: 'Zu jedem Punkt sagst du nur: Stimmt, oder bei dir anders. Der Wert darunter ist meine Annahme mit Quelle.' }))), 10));
    const gz = {}, karten = {}; let nr = 0;
    const sendeInfo = h('div', { class: 'brt' });

    const antwortText = id => { const x = a[id]; if (!x) return 'offen'; if (x.u === 'stimmt') return 'Stimmt'; return 'Bei mir anders' + (x.w ? ': ' + x.w.replace(/\n/g, ' ') : ''); };
    const punktKontext = (p, n) => ({ ansicht: p.gruppe, punkt: 'Punkt ' + n + ' von ' + PUNKTE.length + ': ' + p.frage, eingaben: 'Vorgabe: ' + p.vorgabe + ' | Antwort: ' + antwortText(p.id) });

    function karteFuer(p, n) {
      const haken = S.erfolgView(); haken.className = 'bhaken'; haken.style.visibility = 'hidden';
      const titelzeile = h('div', { class: 'bpunkt' }, h('span', { text: 'Punkt ' + n + ' von ' + PUNKTE.length }), haken);
      const stimmt = h('button', { class: 'bjn', text: 'Stimmt' }), anders = h('button', { class: 'bjn', text: 'Bei mir anders' });
      const feld = p.zahlFeld
        ? h('input', { type: 'text', inputmode: 'decimal', enterkeyhint: 'done', autocomplete: 'off', autocapitalize: 'off', spellcheck: 'false', placeholder: 'Zahl eintippen', 'aria-label': 'Dein Wert' })
        : h('textarea', { rows: 2, enterkeyhint: 'done', autocomplete: 'off', placeholder: 'Kurz aufschreiben', 'aria-label': 'Wie machst du es?' });
      feld.className = 'bfeld';
      const fotoInfo = h('div', { class: 'bfotoinfo' });
      const dat = h('input', { type: 'file', accept: 'image/*', style: { display: 'none' } });
      const dat2 = h('input', { type: 'file', accept: 'image/*', capture: 'environment', style: { display: 'none' } });
      const fotoK = S.knopf('Foto', false, () => dat2.click()), galK = S.knopf('Aus Galerie', false, () => dat.click());
      const panel = h('div', { class: 'bpanel' }, h('div', { class: 'blab', text: p.zahlFeld ? 'Dein Wert' + (p.einheit ? ' in ' + p.einheit : '') : 'Wie machst du es?' }), feld,
        h('div', { class: 'bfr' }, fotoK, galK), fotoInfo, dat, dat2);
      const karte = h('div', { class: 'bk', 'data-id': p.id }, titelzeile, h('div', { class: 'bfrage', text: p.frage }), h('div', { class: 'bvorgabe', text: p.vorgabe }), h('div', { class: 'bquelle', text: 'Quelle: ' + p.quelle }),
        h('div', { class: 'bjnr' }, stimmt, anders), panel,
        S.kmKnopfKarte ? S.kmKnopfKarte(() => Object.assign(S.kmKontextFuer('bestaetigen', null)(), punktKontext(p, n))) : null);
      karten[p.id] = { karte, stimmt, anders, panel, feld, fotoInfo, haken };
      let gezeigt = !!erledigt(a[p.id]);
      const zeige = () => {
        const x = a[p.id], z = karten[p.id], an = !!x && x.u === 'anders';
        z.stimmt.classList.toggle('an', !!x && x.u === 'stimmt'); z.anders.classList.toggle('an', an);
        z.stimmt.setAttribute('aria-pressed', String(!!x && x.u === 'stimmt')); z.anders.setAttribute('aria-pressed', String(an));
        z.panel.style.display = an ? 'block' : 'none';
        if (an && z.feld.value !== x.w && document.activeElement !== z.feld) z.feld.value = x.w;
        const k = x ? x.f.length : 0; z.fotoInfo.textContent = k === 0 ? 'Foto ist freiwillig.' : k === 1 ? '1 Foto angehängt.' : k + ' Fotos angehängt.';
        const ok = erledigt(x); z.haken.style.visibility = ok ? 'visible' : 'hidden'; z.karte.classList.toggle('ok', ok);
      };
      const geaendert = mitHaken => {
        speichere(); zeige(); const ok = erledigt(a[p.id]);
        if (ok && (mitHaken || !gezeigt)) karten[p.id].haken.start(); gezeigt = ok; alle();
      };
      stimmt.addEventListener('click', () => { const x = a[p.id]; a[p.id] = { u: 'stimmt', w: x ? x.w : '', f: x ? x.f : [] }; geaendert(true); });
      anders.addEventListener('click', () => { const x = a[p.id]; a[p.id] = { u: 'anders', w: x ? x.w : '', f: x ? x.f : [] }; geaendert(false); feld.value = a[p.id].w; try { feld.focus({ preventScroll: true }); } catch (e) { /* */ } });
      feld.addEventListener('input', () => { const x = a[p.id]; if (!x || x.u !== 'anders' || feld.value === x.w) return; x.w = feld.value; geaendert(false); });
      feld.addEventListener('keydown', e => { if (e.key === 'Enter' && p.zahlFeld) { e.preventDefault(); feld.blur(); } });
      const neu = async ev => {
        const f = ev.target.files && ev.target.files[0]; ev.target.value = ''; if (!f) return;
        const blob = await verkleinere(f), x = a[p.id] || { u: 'anders', w: '', f: [] };
        const name = 'bestaetigen_' + p.id + '_' + jetzt().replace(/:/g, '-') + '_' + (x.f.length + 1) + '.jpg';
        (fotos[p.id] = fotos[p.id] || []).push({ name, blob }); a[p.id] = { u: 'anders', w: x.w, f: x.f.concat(name) }; geaendert(true);
      };
      dat.addEventListener('change', neu); dat2.addEventListener('change', neu);
      zeige(); return karte;
    }

    for (const g of GRUPPEN) {
      const z = h('span', { class: 'bgz' }); gz[g] = z;
      inh.append(mt(h('div', { class: 'bgruppe' }, h('span', { class: 'bgn', text: g }), z), 26));
      for (const p of PUNKTE.filter(q => q.gruppe === g)) { nr++; inh.append(mt(karteFuer(p, nr), 10)); }
    }
    const dateiName = () => 'Spengler_Bestaetigung_' + jetzt().replace('T', '_').replace(/:/g, '').slice(0, 15) + '.json';
    const senden = S.knopf('Antworten an Nils senden', true, () => sende());
    const dl = S.knopf('Datei speichern', false, () => S.download(new Blob([exportJson(jetzt())], { type: 'application/json' }), dateiName()));
    const msg = h('div', { class: 'bhinweis', style: { marginTop: '8px' } });
    inh.append(mt(h('div', { class: 'bsende' }, sendeInfo, h('div', { class: 'bhinweis', style: { marginTop: '4px' }, text: 'Das öffnet das Teilen-Menü mit einer Mail an Nils. Der Text ist lesbar, die Datei im Anhang liest die App von Nils.' }), mt(senden, 12), mt(dl, 8), msg), 30));

    function alle() {
      const [f, n] = fortschritt();
      rg.setze(f, n); ringText.textContent = f >= n ? 'Alles beantwortet. Danke!' : f + ' von ' + n + ' erledigt, noch etwa ' + minuten(n - f) + ' Minuten';
      for (const g of GRUPPEN) { const [x, y] = fortschrittGruppe(g); gz[g].textContent = x >= y ? x + ' von ' + y + ' ✓' : x + ' von ' + y; gz[g].classList.toggle('ok', x >= y); }
      sendeInfo.textContent = f >= n ? 'Fertig. Jetzt an Nils senden.' : (n - f) + ' Punkte noch offen. Du kannst auch jetzt senden, offene bleiben offen.';
    }
    alle();

    async function sende() {
      const zeit = jetzt(), text = exportText(zeit), json = exportJson(zeit), [f, n] = fortschritt();
      const betreff = 'Spengler-App Bestätigung: ' + f + ' von ' + n;
      const dateien = [new File([json], dateiName(), { type: 'application/json' })];
      for (const id in fotos) for (const x of fotos[id]) if (a[id] && a[id].f.includes(x.name)) dateien.push(new File([x.blob], x.name, { type: 'image/jpeg' }));
      try {
        if (navigator.share) {
          let daten = { title: betreff, text: 'An: ' + EMPF + '\n\n' + text, files: dateien };
          if (!(navigator.canShare && navigator.canShare(daten))) daten = { title: betreff, text: 'An: ' + EMPF + '\n\n' + text };
          await navigator.share(daten); msg.textContent = 'Das Teilen-Menü war offen. Wähle dort die Mail-App und sende an ' + EMPF + '.'; return;
        }
      } catch (e) { if (e && e.name === 'AbortError') { msg.textContent = 'Abgebrochen. Nichts wurde gesendet.'; return; } }
      try {
        const body = encodeURIComponent(text).length > 6000 ? exportKurz(zeit) : text;
        location.href = 'mailto:' + EMPF + '?subject=' + encodeURIComponent(betreff) + '&body=' + encodeURIComponent(body);
        msg.textContent = 'Die Mail-App öffnet sich mit dem Text. Fotos und die Datei hängst du über "Datei speichern" an.';
      } catch (e) { S.download(new Blob([json], { type: 'application/json' }), dateiName()); msg.textContent = 'Die Datei wurde gespeichert. Schick sie an ' + EMPF + '.'; }
    }

    const el = h('div', { class: 'seite' }, inh);
    // Kommentar-Knopf der Seite: der Punkt, der gerade in der Bildschirmmitte steht
    const kontext = () => {
      const mitte = window.innerHeight / 2; let best = null, bd = 1e9, i = 0;
      for (const p of PUNKTE) { i++; const k = karten[p.id]; if (!k || !k.karte.isConnected) continue; const r = k.karte.getBoundingClientRect(); const d = r.top <= mitte && r.bottom >= mitte ? 0 : Math.min(Math.abs(r.top - mitte), Math.abs(r.bottom - mitte)); if (d < bd) { bd = d; best = [p, i]; } }
      return best && el.scrollTop > 40 ? punktKontext(best[0], best[1]) : { ansicht: '', eingaben: '' };
    };
    return { el, overlay: { zurueck: true }, kontext, nachEinbau() { if (opt.scroll) el.scrollTop = +opt.scroll; S.autosizeAlle(el); }, layout() { S.autosizeAlle(el); }, zerstoere() { } };
  };
})(window);
