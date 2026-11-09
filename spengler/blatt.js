/* Spengler-Web: Port von kern/SkizzenSeiten.kt (A4-Blatt 595 x 842 pt) und SkizzenBlatt.kt (hier als PNG statt PDF). */
(function (root) {
  'use strict';
  const Ze = root.Ze, Zeichnung = Ze.Zeichnung;
  const B = 595, H = 842, R = 28, INH = B - 2 * R;

  function umbrechen(t, g, fett, breite) {
    const out = [];
    for (const absatz of t.split('\n')) {
      let zeile = '';
      for (const wort of absatz.split(' ')) {
        const probe = zeile === '' ? wort : zeile + ' ' + wort;
        if (Ze.textBreite(probe, g, fett) <= breite) zeile = probe; else { if (zeile !== '') out.push(zeile); zeile = wort; }
      }
      if (zeile !== '') out.push(zeile);
    }
    return out;
  }
  function absatz(z, x, y0, breite, t, g, fett, farbe, zh) {
    zh = zh == null ? g * 1.28 : zh; let y = y0;
    for (const l of umbrechen(t, g, fett, breite)) { z.text(x, y + g * 0.5, l, g, fett, -1, farbe); y += zh; }
    return y;
  }
  function kopf(z, tx) {
    z.text(R, R + 12, tx.titel, 22, true, -1, 'BLAU');
    z.text(B - R, R + 8, tx.datum, 10, false, 1, 'GRAU');
    const y = R + 40;
    z.text(R, y, tx.kunde, 8.5, false, -1, 'GRAU');
    const lx = R + Ze.textBreite(tx.kunde, 8.5, false) + 8;
    z.linie(lx, y + 4, B - R, y + 4, 'HILFE');
    z.linie(R, R + 52, B - R, R + 52, 'KANTE', null, 0, 1.6);
    z.rechteck(R, R + 50, R + 64, R + 54.5, 'AKZENT', null);
    return R + 62;
  }
  function abschnitt(z, x, y, w, titel) {
    z.text(x, y + 6, titel.toUpperCase(), 8.5, true, -1, 'GRAU');
    z.linie(x + Ze.textBreite(titel.toUpperCase(), 8.5, true) + 6, y + 6, x + w, y + 6, 'HILFE');
  }
  function kasten(z, x, y, w, tx, grosz) {
    const zeilen = [];
    for (const s of tx.zeilen) zeilen.push(...umbrechen(s, 9, false, w - 24));
    const hh = 14 + 12 + grosz * 1.25 + 8 + zeilen.length * 12 + 14;
    z.rechteck(x, y, x + w, y + hh, 'KASTEN', null);
    z.text(x + 12, y + 20, tx.ergebnisLabel, 9.5, true, -1, 'WEISS');
    z.text(x + 12, y + 20 + 8 + grosz * 0.75, tx.gross, grosz, true, -1, 'WEISS');
    let yy = y + 20 + 8 + grosz * 1.35 + 6;
    for (const l of zeilen) { z.text(x + 12, yy + 4.5, l, 9, false, -1, 'WEISS'); yy += 12; }
    return y + hh;
  }
  function legende(z, x, y, tx) {
    let yy = y;
    for (const [f, s] of tx.legende) { z.rechteck(x, yy, x + 16, yy + 9, f, 'KANTE'); z.text(x + 22, yy + 4.5, s, 8.5, false, -1, 'TEXT'); yy += 15; }
    if (tx.faltlinie) { z.linie(x, yy + 4.5, x + 16, yy + 4.5, 'FALZ'); z.text(x + 22, yy + 4.5, tx.faltlinie, 8.5, false, -1, 'TEXT'); yy += 15; }
    return yy;
  }
  function legendeZeile(z, x, y, tx) {
    let xx = x;
    for (const [f, s] of tx.legende) { z.rechteck(xx, y, xx + 16, y + 9, f, 'KANTE'); z.text(xx + 22, y + 4.5, s, 8.5, false, -1, 'TEXT'); xx += 22 + Ze.textBreite(s, 8.5, false) + 16; }
    if (tx.faltlinie) { z.linie(xx, y + 4.5, xx + 16, y + 4.5, 'FALZ'); z.text(xx + 22, y + 4.5, tx.faltlinie, 8.5, false, -1, 'TEXT'); }
    return y + 15;
  }
  function annahmen(z, x, y, w, tx) { z.text(x, y + 4.5, tx.annahmenTitel, 8.5, true, -1, 'GRAU'); return absatz(z, x, y + 13, w, tx.annahmen, 8, false, 'GRAU', 10); }
  function fuss(z, tx) { if (tx.fuss) z.text(R, H - 20, tx.fuss, 7.5, false, -1, 'GRAU'); }

  function kamin(k, tx, lb) {
    const z = new Zeichnung(B, H, 9); let y = kopf(z, tx);
    abschnitt(z, R, y, INH, tx.aufrissTitel);
    const ah = 352; z.einfuegen(Ze.kaminAufriss(k, INH, ah, 9, lb, true), R, y + 14); y += 14 + ah + 6;
    abschnitt(z, R, y, 300, tx.grundrissTitel);
    z.einfuegen(Ze.kaminGrundriss(k, 300, 336, 9, lb), R, y + 14);
    const xr = R + 300 + 16, wr = B - R - xr;
    let yr = kasten(z, xr, y + 14, wr, tx, 26) + 16; yr = legende(z, xr, yr, tx) + 8; annahmen(z, xr, yr, wr, tx); fuss(z, tx); return z;
  }
  function hals(hs, tx, lb) {
    const z = new Zeichnung(B, H, 9); let y = kopf(z, tx);
    abschnitt(z, R, y, INH, tx.aufrissTitel);
    z.einfuegen(Ze.halsAufriss(hs, INH, 392, 9, lb), R, y + 14); y += 14 + 392 + 8;
    abschnitt(z, R, y, INH, tx.zuschnittTitel);
    z.einfuegen(Ze.halsZuschnitt(hs, INH, 88, 9, lb), R, y + 14); y += 14 + 88 + 10;
    y = kasten(z, R, y, INH, tx, 26) + 12; legendeZeile(z, R, y, tx); annahmen(z, R, y + 20, INH, tx); fuss(z, tx); return z;
  }
  function dunst(d, tx, lb) {
    const z = new Zeichnung(B, H, 9); let y = kopf(z, tx);
    abschnitt(z, R, y, INH, tx.aufrissTitel);
    const wa = 340, ha = 390;
    z.einfuegen(Ze.dunstAufriss(d, wa, ha, 9, lb, true), R, y + 14);
    const xr = R + wa + 14, wr = B - R - xr;
    let yr = kasten(z, xr, y + 18, wr, tx, 17) + 12; yr = legende(z, xr, yr, tx) + 8; annahmen(z, xr, yr, wr, tx);
    y += 14 + ha + 6;
    const wg = 300, hg = 330;
    abschnitt(z, R, y, wg, tx.grundrissTitel); z.einfuegen(Ze.dunstGrundriss(d, wg, hg, 9, lb), R, y + 14);
    const xs = R + wg + 10, ws = B - R - xs;
    abschnitt(z, xs, y, ws, tx.stutzenTitel); z.einfuegen(Ze.dunstStutzen(d, ws, hg, 9, lb), xs, y + 14);
    fuss(z, tx); return z;
  }

  /** Blatt als PNG (Faktor 2 = 1190 x 1684 px). */
  function alsPng(zeichnung, faktor) {
    faktor = faktor || 2;
    const c = document.createElement('canvas'); c.width = B * faktor; c.height = H * faktor;
    const ctx = c.getContext('2d'); ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, c.width, c.height);
    Ze.malen(ctx, zeichnung, faktor, 0, 0, null, 1);
    return new Promise(res => c.toBlob(b => res(b), 'image/png'));
  }
  /** Mehrere A4-Seiten untereinander in einem PNG (Web hat kein PDF, ein Bild laesst sich teilen und drucken). */
  function alsPngSeiten(seiten, faktor) {
    faktor = faktor || 2;
    const c = document.createElement('canvas'); c.width = B * faktor; c.height = H * faktor * seiten.length;
    const ctx = c.getContext('2d'); ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, c.width, c.height);
    seiten.forEach((z, i) => { Ze.malen(ctx, z, faktor, 0, H * faktor * i, null, 1); if (i > 0) { ctx.fillStyle = '#9AA4B2'; ctx.fillRect(0, H * faktor * i - 1, c.width, 2); } });
    return new Promise(res => c.toBlob(b => res(b), 'image/png'));
  }
  root.Blatt = { B, H, R, INH, kamin, hals, dunst, alsPng, alsPngSeiten, umbrechen, absatz, kopf, abschnitt, kasten, legende, legendeZeile, annahmen, fuss };
})(window);
