/* Spengler-Web: Dialoge (Info, Sprache, Rueckmeldung, PDF-Blatt, Vorschau, Vollbild), Rueckmeldungsspeicher. Entspricht AboutSheet.kt, LanguageSwitcher.kt,
 * Rueckmeldungen.kt, PdfAktionen.kt, Erfolg.kt, PdfVorschau.kt. */
(function (root) {
  'use strict';
  const S = root.S, h = S.h, T = S.T;

  // ---------------------------------------------------------------- Dialog-Stapel mit History (Zurueck schliesst zuerst den Dialog)
  const stapel = [];
  S.dlgOffen = () => stapel.length > 0;
  S.dlgOeffnen = (el, onClose, ohnePush) => {
    document.body.append(el);
    const e = { el, onClose, push: !ohnePush };
    stapel.push(e);
    if (e.push) { try { history.pushState({ dlg: stapel.length }, ''); } catch (x) { e.push = false; } }
    return e;
  };
  S.dlgZu = (e, vonPop) => {
    const i = stapel.indexOf(e); if (i < 0) return;
    stapel.splice(i, 1); e.el.remove(); if (e.onClose) e.onClose();
    if (!vonPop && e.push) { try { history.back(); } catch (x) { /* */ } }
  };
  S.dlgAlleZu = () => { while (stapel.length) { const e = stapel[stapel.length - 1]; stapel.pop(); e.el.remove(); if (e.onClose) e.onClose(); } };
  window.addEventListener('popstate', () => {
    const n = (history.state && history.state.dlg) || 0;
    while (stapel.length && stapel.filter(d => d.push).length > n) { const e = stapel[stapel.length - 1]; S.dlgZu(e, true); }
  });
  function scrim(inhalt, schliesst) {
    const sc = h('div', { class: 'scrim' }, inhalt);
    sc.addEventListener('pointerdown', ev => { if (ev.target === sc && schliesst) schliesst(); });
    return sc;
  }

  // ---------------------------------------------------------------- Info (AboutSheet)
  const lum = (r, g, b) => { const f = v => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); }; return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b); };
  function lesbar(accent, bg) {
    let c = accent.slice(), i = 0;
    const kontrast = () => { const a = lum(...c) + 0.05, b = lum(...bg) + 0.05; return Math.max(a, b) / Math.min(a, b); };
    while (kontrast() < 4.5 && i < 20) { c = c.map(v => Math.round(v + (255 - v) * 0.12)); i++; }
    return 'rgb(' + c.join(',') + ')';
  }
  S.info = (ohnePush) => {
    const acc = lesbar([11, 92, 171], [31, 31, 31]), accKarte = lesbar([11, 92, 171], [44, 44, 46]);
    const link = (text, href, onclick) => h('a', { class: 'ilink', href: href || '#', style: { color: acc }, text, onclick: ev => { if (onclick) { ev.preventDefault(); onclick(); } }, target: href && href.startsWith('http') ? '_blank' : null, rel: 'noopener' });
    const sek = (titel, body) => [titel && h('div', { class: 'ititel', style: { color: accKarte, paddingTop: '20px' }, text: titel }),
      h('div', { class: 'ibody', style: { paddingTop: titel ? '4px' : '8px', lineHeight: '1.64' }, html: S.html(body) })];
    const inhalt = h('div', { class: 'dk' },
      h('div', { style: { fontSize: '26px', fontWeight: 700, letterSpacing: '.045em', letterSpacing: '.045em' }, text: T('app_name') }),
      h('div', { style: { fontSize: '13px', color: 'rgba(255,255,255,.85)', paddingTop: '4px' }, text: T('about_version_line', '1.0.0-web') }),
      h('div', { style: { fontSize: '15px', lineHeight: '1.7', marginTop: '20px' }, text: T('about_bio') }),
      link(T('about_more_apps_link'), 'https://play.google.com/store/apps/developer?id=Nils+R%C3%B6thlisberger'),
      h('div', { class: 'icard' },
        h('div', { style: { fontSize: '17px', fontWeight: 700, letterSpacing: '.045em', color: accKarte }, text: T('about_zu') }),
        sek(null, T('about_was')), sek(T('about_annahmen_titel'), T('about_annahmen')), sek(T('about_3d_titel'), T('about_3d')), sek(T('about_privat_titel'), T('about_privat'))),
      h('div', { style: { height: '8px' } }),
      link(T('about_privacy_policy'), 'https://tourist105.github.io/privacy/'),
      link(T('about_rate_app'), 'https://play.google.com/store/apps/details?id=ch.roethlisberger.spengler'),
      link(T('about_share_app'), null, async () => { try { if (navigator.share) await navigator.share({ title: T('app_name'), url: location.href.split('#')[0] }); } catch (e) { /* */ } }),
      link(T('about_contact'), 'mailto:nils.roethlisberger@gmx.ch?subject=' + encodeURIComponent(T('app_name') + ' 1.0.0-web')),
      null);
    const dlg = h('div', { class: 'dialog info', style: { borderRadius: '24px' } }, inhalt, h('div', { class: 'ibar' }, h('button', { class: 'iok', style: { color: acc }, text: 'OK', onclick: () => S.dlgZu(e) })));
    const sc = scrim(dlg, () => S.dlgZu(e)); sc.style.padding = 'calc(var(--si-top) - 1px) 8px calc(var(--si-bottom) - 1px)';
    const e = S.dlgOeffnen(sc, null, ohnePush);
    return e;
  };

  // ---------------------------------------------------------------- Sprache
  S.sprachDialog = (onWahl, ohnePush) => {
    const L = [['', T('language_system'), 'ch'], ['de', 'Deutsch', 'de'], ['en', 'English', 'en']];
    const eintr = L.map(([tag, name, flag], i) => {
      const sys = (navigator.language || 'de-CH').toLowerCase(); const f = tag === '' ? S.flaggeAktuell() : (tag === 'de' ? (sys.endsWith('-de') || sys.endsWith('-at') ? 'de' : 'ch') : flag);
      return h('button', { class: 'listeneintrag', onclick: () => { S.dlgZu(e); S.setzeSprache(tag); onWahl && onWahl(); } },
        h('span', { class: 'radio' + (S.sprachWahl === tag ? ' an' : '') }), h('span', { style: { display: 'inline-flex', marginRight: '10px' } }, S.flaggeSvg(f)), name);
    });
    const dlg = h('div', { class: 'dialog' },
      h('div', { style: { padding: '24px 24px 16px', fontSize: '24px' }, text: '🌐  ' + T('language_title') }),
      h('div', { style: { overflowY: 'auto' } }, eintr),
      h('div', { style: { display: 'flex', justifyContent: 'flex-end', padding: '8px 24px 20px' } }, h('button', { style: { color: 'var(--pri)', fontSize: '14px', fontWeight: 400, letterSpacing: '.02em', padding: '10px 12px' }, text: root.TEXTE[S.sprache()].btn_abbrechen || (S.sprache() === 'en' ? 'Cancel' : 'Abbrechen'), onclick: () => S.dlgZu(e) })));
    const sc = scrim(dlg, () => S.dlgZu(e));
    sc.firstChild.style.maxWidth = '420px';
    const e = S.dlgOeffnen(sc, null, ohnePush);
    return e;
  };

  // ---------------------------------------------------------------- Rueckmeldungen
  const URTEILE = ['stimmt', 'stimmt_nicht', 'brauche_ich_nie'];
  const URTEIL_TEXT = { stimmt: 'rm_urteil_stimmt', stimmt_nicht: 'rm_urteil_stimmt_nicht', brauche_ich_nie: 'rm_urteil_nie', notiz: 'rm_urteil_notiz' };
  const RM = S.RM = {
    liste() { try { return JSON.parse(S.lies('rueckmeldungen') || '[]'); } catch (e) { return []; } },
    speichere(r) { const l = RM.liste(); l.push(r); S.schreibe('rueckmeldungen', JSON.stringify(l)); const z = JSON.parse(S.lies('rm_zuletzt') || '{}'); z[r.teil] = r.urteil + '|' + r.zeit.substring(11, 16); S.schreibe('rm_zuletzt', JSON.stringify(z)); },
    anzahl() { return RM.liste().length; },
    zuletzt(teil) { try { const v = JSON.parse(S.lies('rm_zuletzt') || '{}')[teil]; return v ? v.split('|') : null; } catch (e) { return null; } },
    zeitJetzt() { const d = new Date(), p = n => String(n).padStart(2, '0'); return d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate()) + 'T' + p(d.getHours()) + ':' + p(d.getMinutes()) + ':' + p(d.getSeconds()); },
    async exportieren(meldung) {
      const l = RM.liste();
      if (!l.length) { meldung(T('rm_export_leer')); return; }
      const name = 'Spengler_Rueckmeldungen_' + RM.zeitJetzt().replace(/[-:]/g, '').replace('T', '_').slice(0, 13) + '.json';
      const blob = new Blob([JSON.stringify(l, null, 2)], { type: 'application/json' });
      const r = await S.teilen(blob, name, T('rm_export_chooser'));
      meldung(T('rm_export_ok_nur_teilen', name));
    }
  };
  /** Karte mit den drei Knoepfen (rm.karte). snapshot() liefert den Stand der Eingaben. */
  S.rmKarte = (teil, teilName, snapshot, vorwahl) => {
    const letzte = h('div', { style: { fontSize: '14px', color: 'var(--text2)', marginTop: '6px' } });
    const zeigeLetzte = () => {
      const z = RM.zuletzt(teil);
      if (!z) letzte.style.display = 'none'; else { letzte.style.display = ''; letzte.textContent = T('rm_zuletzt', T(URTEIL_TEXT[z[0]] || 'rm_urteil_notiz'), z[1]); }
    };
    zeigeLetzte();
    const namen = [['stimmt', 'rm_stimmt'], ['stimmt_nicht', 'rm_stimmt_nicht'], ['brauche_ich_nie', 'rm_nie']];
    const btns = namen.map(([u, k]) => {
      const b = h('button', { class: 'rmknopf', onclick: () => S.rmDialog(teil, teilName, u, snapshot, zeigeLetzte) }, h('span', { text: T(k) }));
      return b;
    });
    const reihe = h('div', { style: { display: 'flex', marginTop: '8px', alignItems: 'flex-start' } }, btns.map((b, i) => { b.style.flex = '1 1 0'; b.style.minWidth = 0; if (i) b.style.marginLeft = '6px'; b.style.fontSize = '14px'; return b; }));
    for (const b of btns) { const sp = b.firstChild; sp.style.display = 'block'; sp.style.width = '100%'; sp.style.overflow = 'hidden'; S.autosize(sp, 9, 14); }
    const km = S.kmKnopfKarte && S.kmAktuell ? S.kmKnopfKarte(() => S.kmAktuell(), 'knopf_seite') : null;
    const k = S.karte(h('div', {}, S.text(T('rm_karte_titel'), 18, true), h('div', { style: { fontSize: '15px', color: 'var(--text2)' }, text: T('rm_frage') }), reihe, letzte, km));
    return k;
  };
  S.rmDialog = (teil, teilName, vorwahl, snapshot, danach, ohnePush) => {
    let urteil = vorwahl; const fotos = []; const zeit = RM.zeitJetzt();
    const tasten = [['stimmt', 'rm_stimmt'], ['stimmt_nicht', 'rm_stimmt_nicht'], ['brauche_ich_nie', 'rm_nie']].map(([u, k], i) => h('button', { class: 'rmdlgbtn', style: { marginLeft: i ? '6px' : 0, flex: '1 1 0', padding: '0 4px', minWidth: 0 },
      onclick: () => { urteil = urteil === u ? null : u; faerbe(); } }, h('span', { text: T(k), style: { display: 'block', width: '100%', overflow: 'hidden', whiteSpace: 'nowrap', fontSize: '15px' } }))); tasten.forEach(b => S.autosize(b.firstChild, 9, 15));
    const faerbe = () => tasten.forEach((b, i) => b.classList.toggle('an', urteil === URTEILE[i]));
    faerbe();
    const eingabe = h('textarea', { rows: 3, placeholder: T('rm_text_hint'), style: { fontSize: '18px', minHeight: '0', padding: '10px 14px', resize: 'none', border: '1.5px solid var(--feldrand)', borderRadius: '12px', width: '100%', display: 'block', font: '400 18px Roboto, sans-serif', outline: 'none', marginTop: '12px' } });
    const fotoInfo = h('div', { style: { fontSize: '14px', color: 'var(--text2)', marginTop: '4px' } });
    const meldung = h('div', { style: { fontSize: '14px', fontWeight: 700, letterSpacing: '.045em', color: 'var(--fehler)', marginTop: '4px', display: 'none' } });
    const fotoDatei = h('input', { type: 'file', accept: 'image/*', style: { display: 'none' } });
    const fotoKam = h('input', { type: 'file', accept: 'image/*', capture: 'environment', style: { display: 'none' } });
    const nimm = ev => { const f = ev.target.files && ev.target.files[0]; if (f) { fotos.push(f); fotoInfo.textContent = T('rm_fotos_n', fotos.length); } ev.target.value = ''; };
    fotoDatei.addEventListener('change', nimm); fotoKam.addEventListener('change', nimm);
    const tn = h('button', { class: 'knopf', style: { fontSize: '15px' }, text: T('rm_foto'), onclick: () => { meldung.style.display = 'none'; fotoKam.click(); } });
    const tw = h('button', { class: 'knopf', style: { fontSize: '15px', marginLeft: '6px' }, text: T('rm_foto_wahl'), onclick: () => { meldung.style.display = 'none'; fotoDatei.click(); } });
    const abbruch = h('button', { class: 'knopf', text: T('rm_abbrechen'), onclick: () => S.dlgZu(e) });
    const speichern = h('button', { class: 'knopf prim', text: T('rm_speichern'), style: { marginLeft: '8px' }, onclick: async () => {
      const text = eingabe.value.trim();
      if (!urteil && !text && !fotos.length) { meldung.textContent = T('rm_kein_wert'); meldung.style.display = 'block'; return; }
      const r = { id: zeit.replace(/[^0-9]+/g, '') + '_' + teil, zeit, teil, teilName, urteil: urteil || 'notiz', text, fotos: fotos.map((f, i) => teil + '_' + zeit.replace(/[^0-9]+/g, '') + '_' + (i + 1) + '.jpg'), eingaben: snapshot ? snapshot() : '', appVersion: '1.0.0-web', sprache: S.sprache() };
      RM.speichere(r); S.dlgZu(e); danach && danach(); S.toast(T('rm_gespeichert'));
    } });
    const box = h('div', { class: 'dk', style: { padding: '16px 20px 12px' } },
      h('h2', { text: T('rm_titel', teilName) }),
      h('div', { style: { display: 'flex', marginTop: '12px' } }, tasten),
      eingabe,
      h('div', { style: { display: 'flex', marginTop: '4px' } }, tn, tw), fotoDatei, fotoKam, fotoInfo, meldung,
      h('div', { style: { fontSize: '13px', color: 'var(--text2)', marginTop: '26px', lineHeight: '1.25' }, text: T('rm_privat') }),
      h('div', { style: { display: 'flex', marginTop: '12px' } }, abbruch, speichern));
    for (const b of [tn, tw]) b.style.flex = '1 1 0';
    abbruch.style.flex = '1 1 0'; speichern.style.flex = '1 1 0';
    const dlg = h('div', { class: 'dialog tint' }, box);
    const sc = scrim(dlg, () => S.dlgZu(e));
    const e = S.dlgOeffnen(sc, null, ohnePush);
    return e;
  };

  // ---------------------------------------------------------------- Erfolgs-Haken (ErfolgsView)
  S.erfolgView = () => {
    const c = h('canvas', { class: 'erfolg', width: 260, height: 260 });
    const ctx = c.getContext('2d'); const s = 260;
    const t = (p, a, b) => Math.min(1, Math.max(0, (p - a) / (b - a)));
    const zeichne = p => {
      ctx.clearRect(0, 0, s, s); const cx = s / 2, cy = s / 2, r = s * 0.34;
      ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.lineWidth = s * 0.07; ctx.strokeStyle = '#188246';
      ctx.fillStyle = 'rgba(24,130,70,' + (60 * t(p, 0.35, 0.8) / 255) + ')'; ctx.beginPath(); ctx.arc(cx, cy, r, 0, 7); ctx.fill();
      const bogen = t(p, 0, 0.5); ctx.beginPath(); ctx.arc(cx, cy, r, -Math.PI / 2, -Math.PI / 2 + 2 * Math.PI * bogen); ctx.stroke();
      const pts = [[cx - r * 0.45, cy + r * 0.02], [cx - r * 0.1, cy + r * 0.38], [cx + r * 0.5, cy - r * 0.32]];
      const l1 = Math.hypot(pts[1][0] - pts[0][0], pts[1][1] - pts[0][1]), l2 = Math.hypot(pts[2][0] - pts[1][0], pts[2][1] - pts[1][1]);
      let rest = (l1 + l2) * t(p, 0.45, 0.8);
      ctx.beginPath(); ctx.moveTo(...pts[0]);
      if (rest <= l1) ctx.lineTo(pts[0][0] + (pts[1][0] - pts[0][0]) * rest / l1, pts[0][1] + (pts[1][1] - pts[0][1]) * rest / l1);
      else { ctx.lineTo(...pts[1]); const q = (rest - l1) / l2; ctx.lineTo(pts[1][0] + (pts[2][0] - pts[1][0]) * q, pts[1][1] + (pts[2][1] - pts[1][1]) * q); }
      ctx.stroke();
      const f = t(p, 0.55, 1);
      if (f > 0) {
        ctx.strokeStyle = 'rgba(255,176,0,' + (1 - f) + ')'; ctx.lineWidth = s * 0.035;
        for (let i = 0; i < 8; i++) { const w = (i * 45 + 22) * Math.PI / 180, r1 = r * (1.25 + 0.35 * f), r2 = r1 + s * 0.07 * (1 - f * 0.5); ctx.beginPath(); ctx.moveTo(cx + Math.cos(w) * r1, cy + Math.sin(w) * r1); ctx.lineTo(cx + Math.cos(w) * r2, cy + Math.sin(w) * r2); ctx.stroke(); }
      }
    };
    c.start = () => { c.style.transform = 'scale(.7)'; S.anim(450, t => S.overshoot(t) , v => { c.style.transform = 'scale(' + (0.7 + 0.3 * v) + ')'; }); S.anim(900, t => 1 - Math.pow(1 - t, 2.4), zeichne); };
    zeichne(1);
    return c;
  };

  // ---------------------------------------------------------------- Blatt: Dialog "bereit" + Vorschau
  S.vorschau = (url) => {
    let zoom = 1;
    const img = h('img', { src: url, alt: '' }); const vs = h('div', { class: 'vs' }, img);
    const setze = () => { img.style.width = (S.vp.w * zoom) + 'px'; };
    let letzter = 0;
    vs.addEventListener('click', () => { const n = performance.now(); if (n - letzter < 300) { zoom = zoom === 1 ? 2 : 1; setze(); vs.scrollTo(0, 0); } letzter = n; });
    const zu = h('button', { class: 'knopf prim', style: { margin: '8px 16px 12px', width: 'calc(100% - 32px)' }, text: T('btn_schliessen'), onclick: () => S.dlgZu(e) });
    const el = h('div', { class: 'vorschau' }, h('div', { style: { fontSize: '14px', color: 'var(--text2)', padding: '10px 16px 8px' }, text: T('pdf_vorschau_tipp') }), vs, zu);
    const e = S.dlgOeffnen(el); setze(); return e;
  };
  /** Teilen-Dialog: Chrome erlaubt das Teilen nur kurz nach einem Fingertipp (am Samsung 12.11.2026: NotAllowedError, weil das Blatt zu lange gebaut wurde).
   *  Dann liegt das Blatt hier fertig, und der Tipp auf "Teilen" gibt Bild und DXF ohne Wartezeit ins Teilen-Menue. */
  S.teilenDialog = (blob, name, titel, dazu) => {
    const alle = [{ blob, name }].concat(dazu || []);
    const dateien = () => alle.map(x => new File([x.blob], x.name, { type: x.blob.type }));
    const box = h('div', { class: 'dk', style: { padding: '20px 20px 12px', textAlign: 'center' } },
      h('div', { style: { fontSize: '22px', fontWeight: 700, letterSpacing: '.045em' }, text: T('pdf_fertig') }), h('div', { style: { fontSize: '14px', marginTop: '6px' }, text: alle.map(x => x.name).join(', ') }),
      h('button', { class: 'knopf prim', style: { marginTop: '14px' }, text: T('btn_pdf_teilen'), onclick: async () => {
        const r = await S.teilen(blob, name, titel, dazu, true); if (r === 'geteilt') S.dlgZu(e); } }),
      h('button', { class: 'knopf', style: { marginTop: '8px' }, text: T('btn_schliessen'), onclick: () => S.dlgZu(e) }));
    const sc = scrim(h('div', { class: 'dialog' }, box), () => S.dlgZu(e)); const e = S.dlgOeffnen(sc, () => { });
    return e;
  };
  S.pdfDialog = (blob, name, titel, meldung, ohnePush) => {
    const url = URL.createObjectURL(blob);
    const icon = S.erfolgView();
    const box = h('div', { class: 'dk', style: { padding: '20px 20px 12px', textAlign: 'center' } }, icon,
      h('div', { style: { fontSize: '22px', fontWeight: 700, letterSpacing: '.045em', letterSpacing: '.045em' }, text: T('pdf_fertig') }), h('div', { style: { fontSize: '14px' }, text: name }),
      h('button', { class: 'knopf prim', style: { marginTop: '14px' }, text: T('btn_oeffnen'), onclick: () => S.vorschau(url) }),
      h('button', { class: 'knopf', style: { marginTop: '8px' }, text: T('btn_pdf_teilen'), onclick: async () => { await S.teilen(blob, name, titel); } }),
      h('button', { class: 'knopf', style: { marginTop: '8px' }, text: T('btn_drucken'), onclick: () => S.drucken(url) }),
      h('button', { class: 'knopf', style: { marginTop: '8px' }, text: T('btn_schliessen'), onclick: () => S.dlgZu(e) }));
    const dlg = h('div', { class: 'dialog' }, box);
    const sc = scrim(dlg, () => S.dlgZu(e)); const e = S.dlgOeffnen(sc, () => setTimeout(() => URL.revokeObjectURL(url), 60000), ohnePush);
    icon.start(); S.haptik(15);
    return e;
  };
  S.drucken = url => {
    const f = h('iframe', { style: { position: 'fixed', width: 0, height: 0, border: 0, left: '-100px' } });
    document.body.append(f);
    const d = f.contentWindow.document; d.open(); d.write('<!doctype html><title>Spengler</title><style>@page{size:A4;margin:0}html,body{margin:0}img{width:210mm;height:297mm;display:block}</style><img src="' + url + '">'); d.close();
    f.contentWindow.onload = () => { try { f.contentWindow.focus(); f.contentWindow.print(); } catch (e) { /* */ } setTimeout(() => f.remove(), 60000); };
  };

  // ---------------------------------------------------------------- Vollbild mit Pinch-Zoom (ZoomSkizzeView)
  S.vollbildZeigen = (bauer, aktivKey, ohnePush, view) => {
    // Aufbau (Pruefer 12.11.): Kopfstreifen mit Hinweis und Schliessen-Knopf, darunter das Zeichenfeld. Die Zeichnung liegt NIE unter Knopf oder Hinweis.
    // Bei offenem Eingabeband schrumpft das ganze Innere (Hochformat: bis ueber das Band, Querformat: bis links vom Band), die Zeichnung wird in den freien Platz eingepasst.
    // Beobachtet wird das Feld (nicht das Canvas): das Canvas liegt mit width/height 100 % darin, darum keine Rueckkopplung der Groesse.
    const cv = h('canvas', {}); const zu = h('button', { class: 'zu', 'aria-label': T('ss_schliessen'), text: '✕', onclick: () => S.dlgZu(e) });
    const tipp = h('div', { class: 'tipp', text: T('ss_zoom_tipp') });
    const feldEl = h('div', { class: 'vbfeld' }, cv);
    const innen = h('div', { class: 'vbinnen' }, h('div', { class: 'vbkopf' }, tipp, zu), feldEl);
    const el = h('div', { class: 'vollbild' }, innen);
    const e = S.dlgOeffnen(el, () => { ro.disconnect(); S.vollbildPlatz = null; if (view && S.band && S.band.offen()) S.band.zu(true); }, ohnePush);
    /** Platz fuer das Eingabeband freihalten (wird von masse.js bei jedem Layout und beim Schliessen gerufen). */
    S.vollbildPlatz = () => {
      const b = document.querySelector('.mband'), r = b ? b.getBoundingClientRect() : null;
      innen.style.bottom = r && !S.vp.quer ? Math.max(0, window.innerHeight - r.top) + 'px' : '';
      innen.style.right = r && S.vp.quer ? Math.max(0, window.innerWidth - r.left) + 'px' : '';
    };
    let s = 1, tx = 0, ty = 0, z = null, w = 0, hh = 0, dpr = 1;
    const begr = () => { s = Math.min(6, Math.max(1, s)); tx = Math.min(0, Math.max(w * (1 - s), tx)); ty = Math.min(0, Math.max(hh * (1 - s), ty)); };
    const zeichne = () => {
      const ctx = cv.getContext('2d'); ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, w, hh);
      if (!z) return;
      const f = z.anpassung(w, hh, 8);
      ctx.save(); ctx.translate(tx, ty); ctx.scale(s, s); Ze_malen(ctx, z, f); ctx.restore();
    };
    const Ze_malen = (ctx, zz, f) => { root.Ze.tippKeys = view && view.feldFuer ? (k, e2) => view.editierbar(k, e2) : null; try { root.Ze.malen(ctx, zz, f[0], f[1], f[2], aktivKey, 1); } finally { root.Ze.tippKeys = null; } };
    /** Zeigerort im Zeichenfeld (das Feld beginnt unter dem Kopfstreifen). */
    const lok = ev => { const r = feldEl.getBoundingClientRect(); return [ev.clientX - r.left, ev.clientY - r.top]; };
    let erst = true;
    const ro = new ResizeObserver(() => {
      const w0 = w, h0 = hh; w = feldEl.clientWidth; hh = feldEl.clientHeight; if (!w || !hh) return;
      dpr = window.devicePixelRatio || 1; cv.width = Math.round(w * dpr); cv.height = Math.round(hh * dpr); z = bauer(w, hh);
      // andere Groesse durch das Eingabeband: Zoom und Ausschnitt bleiben (nur der Rand wird neu begrenzt), sonst Neustart bei 1
      if (erst || s === 1 || Math.abs(w - w0) > 80) { s = 1; tx = ty = 0; erst = false; } else { tx = tx * (w / w0); ty = ty * (hh / h0); }
      begr(); zeichne();
      if (view && S.band && S.band.offen() && S.band.aktuell && S.band.aktuell() != null && quelle) setTimeout(() => quelle.sichtbar(S.band.aktuell()), 0);
    });
    ro.observe(feldEl);
    const ptr = new Map(); let p0 = null, letzter = null, bewegt = false;
    cv.addEventListener('pointerdown', ev => { cv.setPointerCapture(ev.pointerId); const [x, y] = lok(ev); ptr.set(ev.pointerId, { x, y }); if (ptr.size === 2) { const [a, b] = [...ptr.values()]; p0 = Math.hypot(a.x - b.x, a.y - b.y); } bewegt = false; });
    cv.addEventListener('pointermove', ev => {
      const p = ptr.get(ev.pointerId); if (!p) return;
      const [mx, my] = lok(ev);
      if (ptr.size >= 2) {
        p.x = mx; p.y = my; const [a, b] = [...ptr.values()], d = Math.hypot(a.x - b.x, a.y - b.y), fx = (a.x + b.x) / 2, fy = (a.y + b.y) / 2;
        if (p0 > 0) { const alt = s; s = Math.min(6, Math.max(1, s * d / p0)); const k = s / alt; tx = fx - (fx - tx) * k; ty = fy - (fy - ty) * k; p0 = d; begr(); zeichne(); }
        bewegt = true; return;
      }
      const dx = mx - p.x, dy = my - p.y; p.x = mx; p.y = my;
      if (Math.abs(dx) + Math.abs(dy) > 0) bewegt = bewegt || true;
      tx += dx; ty += dy; begr(); zeichne();
    });
    const ende = ev => {
      if (!ptr.has(ev.pointerId)) return; ptr.delete(ev.pointerId); p0 = null;
      if (ev.type === 'pointerup' && ptr.size === 0) {
        const n = performance.now(), [x, y] = lok(ev);
        if (letzter && n - letzter.t < 300 && Math.hypot(x - letzter.x, y - letzter.y) < 60) {
          const ziel = s > 1.5 ? 1 : 2.5, k = ziel / s; tx = x - (x - tx) * k; ty = y - (y - ty) * k; s = ziel; begr(); zeichne(); letzter = null;
        } else letzter = { t: n, x, y };
      }
    };
    // Masseingabe im Vollbild: Tipp aufs Mass oeffnet dasselbe Eingabeband wie in der Seite (S.band), die Zeichnung wird in den Platz ueber dem Band eingepasst
    const bild = () => z && z.anpassung(w, hh, 8);
    const quelle = view ? {
      feldFuer: k => view.feldFuer ? view.feldFuer(k) : null,
      schluessel: () => { const f = k => view.feldFuer(k), ks = []; if (z) for (const e of z.elems) if (e.k === 't' && e.key != null && !ks.includes(e.key) && view.editierbar(e.key, e)) ks.push(e.key); return ks.sort((a, b) => { const fa = f(a), fb = f(b); return !fa || !fb ? 0 : (fa.compareDocumentPosition(fb) & 4 ? -1 : 1); }); },
      einheit: k => view.einheit(k),
      platzhalter: k => { const e = z && z.elems.find(x => x.k === 't' && x.key === k); return e ? String(e.text) : ''; },
      aktivSetzen: k => { aktivKey = k; view.aktiv = k; zeichne(); },
      neuZeichnen: () => { z = bauer(w, hh) || z; zeichne(); },
      sichtbar: k => {
        const f = bild(), e = z && z.elems.find(x => x.k === 't' && x.key === k); if (!f || !e) return;
        const sy = ty + s * (f[2] + f[0] * e.y), sx = tx + s * (f[1] + f[0] * e.x);
        if (sy > hh - 40) ty -= sy - (hh - 40); else if (sy < 40) ty += 40 - sy;
        if (sx > w - 40) tx -= sx - (w - 40); else if (sx < 40) tx += 40 - sx;
        begr(); zeichne();
      }
    } : null;
    const mass = ev => {
      if (!quelle || bewegt || !z) return false;
      const [x, y] = lok(ev), f = bild(), px = ((x - tx) / s - f[1]) / f[0], py = ((y - ty) / s - f[2]) / f[0], sp = 18 / (f[0] * s), mh = 22 / (f[0] * s);
      let k = z.trefferMass(px, py, sp, mh, (kk, ee) => view.editierbar(kk, ee));
      if (k == null) return false;
      S.haptik(8); view._ist3d = false; S.band.oeffne(quelle, k); return true;
    };
    cv.addEventListener('pointerup', ev => { if (ev.pointerType !== 'mouse' || ev.button === 0) { if (ptr.size === 1 && mass(ev)) { ptr.delete(ev.pointerId); p0 = null; return; } } ende(ev); }); cv.addEventListener('pointercancel', ende);
    return { e, zoom: (ns, fx, fy) => { const k = ns / s; tx = fx - (fx - tx) * k; ty = fy - (fy - ty) * k; s = ns; begr(); zeichne(); } };
  };
})(window);
