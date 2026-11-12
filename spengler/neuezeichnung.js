/* Spengler-Web: Port von kern/NeueTeileBlaetter.kt (Dachrinne, Mauerabdeckung, Kehle). Gleiche Zeichnungsliste wie Android, Masse in mm.
 * Schluessel der Masse (key) = Feldschluessel der Eingaben:
 *   Rinne: l Laenge, w Abwicklung, g Gefaelle, h Halterabstand, d Dilatation
 *   Mauer: b Mauerbreite, u Abstand zur Wand, s Schenkel, t Abkantung, g Gefaelle, l Laenge
 *   Kehle: l Laenge, w Abwicklung, a Aufkantung, m Stueckmass, u Ueberlappung, k Kehlwinkel */
(function (root) {
  'use strict';
  const Ze = root.Ze, Zeichnung = Ze.Zeichnung, min = Math.min, max = Math.max, tan = Math.tan, sin = Math.sin, cos = Math.cos;
  const mm = v => Ze.fmtTrim(v, 1);
  const rad = d => d * Math.PI / 180;

  const NEU_BESCHR_DE = { abwicklung: 'Abwicklung', laenge: 'Länge', gefaelle: 'Gefälle', dilatation: 'Dilatation', ablauf: 'Ablaufrohr', ueberhoeht: 'Gefälle überhöht', querschnitt: 'Querschnitt',
    ansicht: 'Ansicht', stuecke: 'Stücke', ueberlappung: 'Überlappung', halter: 'Halter', mauer: 'Mauer', bruch: 'Länge' };

  // ================================================================ Dachrinne
  function rinneAbwicklung(r, w, h, t, lb) {
    const z = new Zeichnung(w, h, t);
    const lg = 14, rg = 14, oben = 2 * t + 14, unten = 2 * t + 16, a = r.e.abwicklung, laengeZeige = a * 1.3;
    const s = max(0.02, min((w - lg - rg) / a, (h - oben - unten) / laengeZeige));
    const bw = a * s, bh = laengeZeige * s;
    const x0 = lg + (w - lg - rg - bw) / 2, y0 = max(0, (h - oben - unten - bh) / 2) + oben;
    const zig = min(5, bh * 0.08), n = 8, p = [];
    p.push(x0, y0, x0 + bw, y0, x0 + bw, y0 + bh - zig);
    for (let i = n; i >= 0; i--) p.push(x0 + bw * i / n, y0 + bh - (i % 2 === 0 ? 0 : zig));
    z.flaeche(p, 'BLECH', 'KANTE', 'w');
    z.mass(x0, y0, x0 + bw, y0, 0, -1, 8, mm(a), 'w', 1);
    z.text(x0 + bw / 2, y0 + bh + zig + 0.9 * t, lb.laenge + ' ' + mm(r.e.laenge), t, true, 0, 'TEXT', 'l');
    z.fertig();
    return z;
  }

  function rinneAnsicht(r, w, h, t, lb) {
    const z = new Zeichnung(w, h, t), e = r.e;
    const lg = 14, rg = 3.6 * t + 14, oben = 3.2 * t + 14, rohrL = 0.8 * t + 8, unten = 4.4 * t + rohrL + 24;
    const bw = w - lg - rg, plotH = h - oben - unten;
    const drop = Math.min(44, Math.max(6, plotH * 0.5)), band = Math.min(11, Math.max(5, plotH * 0.14));
    const yT = oben + max(0, (plotH - drop - band) / 2 - 4), x0 = lg, x1 = lg + bw;
    const yTopAt = f => yT + drop * f;
    z.flaeche([x0, yT, x1, yT + drop, x1, yT + drop + band, x0, yT + band], 'BLECH', 'KANTE', 'l');
    z.linie(x0, yT, x1, yT, 'HILFE');
    z.mass(x1, yT, x1, yT + drop, 1, 0, 8, mm(r.hoehenunterschied), 'g', 1);
    const L = e.laenge, schritt = e.halterAbstand / L * bw, pos = [];
    if (schritt >= 4) { let p = 0; while (p < L - 1e-6) { pos.push(p / L); p += e.halterAbstand; } pos.push(1); } else { pos.push(0, 1); }
    for (const f of pos) {
      const xx = x0 + bw * f, yb = yTopAt(f) + band;
      z.rechteck(xx - 1.2, yb, xx + 1.2, yb + max(5, band * 0.9), 'AUFKANT2', null, 'h');
    }
    const nd = r.dilatationen; let ersteDil = null;
    for (let i = 1; i <= nd; i++) {
      const f = i / (nd + 1), xx = x0 + bw * f, yy = yTopAt(f);
      z.rechteck(xx - 2, yy - 2, xx + 2, yy + band + 2, 'UMSCHLAG', null, 'd');
      if (!ersteDil) ersteDil = [xx, yy - 2];
    }
    const xr = x1 - (schritt >= 10 ? schritt / 2 : min(10, bw * 0.05)), yr = yTopAt(1) + band;
    z.rechteck(xr - 3, yr, xr + 3, yr + rohrL, 'STUTZEN', 'KANTE', null);
    z.hinweis(x0 + bw * 0.5, yTopAt(0.5), 0, -1, 3, mm(e.gefaelle) + ' mm/m', 'g', 'AKZENT');
    z.hinweis(x0 + bw * 0.5, yTopAt(0.5), 0, -1, 3 + 1.5 * t, '(' + lb.ueberhoeht + ')', null, 'GRAU', false, undefined, true);
    if (ersteDil) z.hinweis(ersteDil[0], ersteDil[1], 0, -1, 3, lb.dilatation, 'd', 'TEXT', false, undefined, true);
    z.hinweis(xr, yr + rohrL * 0.5, -1, 0, 5, lb.ablauf, null, 'GRAU', false, undefined, true);
    const ys = yr + rohrL + 3;
    if (pos.length >= 3) z.mass(x0, ys, x0 + bw * pos[1], ys, 0, 1, 8, mm(e.halterAbstand), 'h', 1);
    z.mass(x0, ys, x1, ys, 0, 1, 8 + 1.9 * t + 6, mm(e.laenge), 'l', 1);
    z.fertig();
    return z;
  }

  // ================================================================ Mauerabdeckung
  function mauerQuerschnitt(m, w, h, t, lb) {
    const z = new Zeichnung(w, h, t), e = m.e, tg = tan(rad(e.gefaelle));
    const B = e.mauerBreite, U = e.ueberstand, S = e.schenkel, A = e.abkantung, dh = B * tg;
    const yOben = x => dh - x * tg;
    const yL = yOben(-U), yR = yOben(B + U), wandUnten = yR - S - max(0.25 * B, 0.2 * S);
    const links = 3.4 * t + 12, rechts = 12, oben = 2.4 * t + 12, unten = 2 * t + 12 + 2 * t + 18, gesH = yL - wandUnten;
    const s = max(0.02, min((w - links - rechts) / (B + 2 * U), (h - oben - unten) / gesH));
    const gesHpx = gesH * s;
    const oy = max(0, (h - oben - unten - gesHpx) / 2) + oben + yL * s;
    const ox = links + max(0, (w - links - rechts - (B + 2 * U) * s) / 2) + U * s;
    const X = v => ox + v * s, Y = v => oy - v * s;
    z.flaeche([X(0), Y(dh), X(B), Y(0), X(B), Y(wandUnten), X(0), Y(wandUnten)], 'KAMIN', null, 'b');
    z.linie(X(0), Y(dh), X(0), Y(wandUnten), 'KANTE', 'b');
    z.linie(X(B), Y(0), X(B), Y(wandUnten), 'KANTE', 'b');
    const hang = Math.atan(tg) * 180 / Math.PI, dk = 2.4;
    const seg = (x1, y1, x2, y2, key) => z.linie(X(x1), Y(y1), X(x2), Y(y2), 'KANTE', key, 0, dk);
    seg(-U + A, yL - S, -U, yL - S, 't');
    seg(-U, yL - S, -U, yL, 's');
    seg(-U, yL, B + U, yR, 'g');
    seg(B + U, yR, B + U, yR - S, 's');
    seg(B + U, yR - S, B + U - A, yR - S, 't');
    if (e.gefaelle > 0) {
      z.linie(X(0), Y(dh), X(B), Y(dh), 'HILFE');
      const ra = min(0.35 * (B * s), 8 * t);
      z.bogen(X(0), Y(dh), ra, -hang, 0, 'MASS', 'g');
      z.hinweis(X(0) + ra, Y(dh), 1, -1, 4, mm(e.gefaelle) + '°', 'g', 'AKZENT');
    }
    z.mass(X(-U), Y(yL), X(-U), Y(yL - S), -1, 0, 8, mm(S), 's', 1);
    z.mass(X(-U), Y(yL - S), X(-U + A), Y(yL - S), 0, 1, 6, mm(A), 't', 1, 'AKZENT');
    z.mass(X(B), Y(yR - S), X(B + U), Y(yR - S), 0, 1, 6, mm(U), 'u', 1);
    z.mass(X(0), Y(wandUnten), X(B), Y(wandUnten), 0, 1, 8, mm(B), 'b', 1);
    z.fertig();
    return z;
  }
  const mauerAbwicklung = (m, w, h, t, lb) => streifen(w, h, t, lb,
    [m.e.abkantung, m.e.schenkel, m.e.ueberstand, m.e.mauerBreite, m.e.ueberstand, m.e.schenkel, m.e.abkantung],
    ['UMSCHLAG', 'AUFKANT', 'AUFKANT2', 'BLECH', 'AUFKANT2', 'AUFKANT', 'UMSCHLAG'], ['t', 's', 'u', 'b', 'u', 's', 't'], m.abwicklung, 'w', lb.laenge + ' ' + mm(m.e.laenge), 'l');

  // ================================================================ Kehle
  function kehleQuerschnitt(k, w, h, t, lb) {
    const z = new Zeichnung(w, h, t), e = k.e, nR = rad(k.schenkelNeigung);
    const sp = k.spannweite, td = k.tiefe, A = e.aufkantung, S = k.schenkel;
    const links = 3.8 * t + 12, rechts = 12, oben = 3.2 * t + 12, unten = 2 * t + 24, gesH = td + A;
    const s = max(0.02, min((w - links - rechts) / sp, (h - oben - unten) / max(gesH, 1)));
    const ox = links + (w - links - rechts) / 2, gesHpx = gesH * s;
    const oy = oben + max(0, (h - oben - unten - gesHpx) / 2) + gesH * s;
    const X = v => ox + v * s, Y = v => oy - v * s, dk = 2.4, lx = -sp / 2, rx = sp / 2;
    z.linie(X(lx), Y(td + A), X(lx), Y(td), 'KANTE', 'a', 0, dk);
    z.linie(X(lx), Y(td), X(0), Y(0), 'KANTE', 'w', 0, dk);
    z.linie(X(0), Y(0), X(rx), Y(td), 'KANTE', 'w', 0, dk);
    z.linie(X(rx), Y(td), X(rx), Y(td + A), 'KANTE', 'a', 0, dk);
    const ra = min(0.2 * (sp * s), 6 * t), nGrad = k.schenkelNeigung;
    z.bogen(X(0), Y(0), ra, nGrad, 180 - nGrad, 'MASS', 'k');
    z.hinweis(X(0), Y(0) - ra, 0, -1, 3, mm(e.kehlwinkel) + '°', 'k', 'AKZENT');
    z.mass(X(lx), Y(td), X(0), Y(0), -sin(nR), cos(nR), 8, mm(S), 'w', 1);
    z.mass(X(lx), Y(td + A), X(lx), Y(td), -1, 0, 8, mm(A), 'a', 1, 'AKZENT');
    z.mass(X(lx), Y(td), X(rx), Y(td), 0, 1, td * s + 12, mm(sp), null, 1);
    z.fertig();
    return z;
  }
  const kehleAbwicklung = (k, w, h, t, lb) => streifen(w, h, t, lb, [k.e.aufkantung, k.schenkel, k.schenkel, k.e.aufkantung], ['UMSCHLAG', 'BLECH', 'BLECH', 'UMSCHLAG'],
    ['a', 'w', 'w', 'a'], k.e.abwicklung, 'w', lb.laenge + ' ' + mm(k.e.laenge), 'l');

  function kehleStuecke(k, w, h, t, lb) {
    const z = new Zeichnung(w, h, t), e = k.e, lg = 14, rg = 14, oben = 2 * t + 14, unten = 2 * t + 14, n = k.stuecke, bw = w - lg - rg, s = bw / e.laenge, rowGap = 3;
    const rowH = Math.min(2.1 * t, Math.max(5, (h - oben - unten - (n - 1) * rowGap) / n));
    const gesH = n * rowH + (n - 1) * rowGap, y0 = oben + max(0, (h - oben - unten - gesH) / 2), laengen = k.stueckLaengen();
    for (let i = 0; i < n; i++) {
      const start = i * (e.maxStueck - e.ueberlappung), xa = lg + start * s, xb = lg + (start + laengen[i]) * s, ya = y0 + i * (rowH + rowGap);
      z.rechteck(xa, ya, xb, ya + rowH, 'BLECH', 'KANTE', 'm');
      if (i > 0) {
        const ow = e.ueberlappung * s;
        z.rechteck(xa, ya, xa + ow, ya + rowH, 'UMSCHLAG', null, 'u');
        z.rechteck(xa, ya - rowGap - rowH, xa + ow, ya - rowGap, 'UMSCHLAG', null, 'u');
      }
      const txt = mm(laengen[i]), tw = Ze.textBreite(txt, t, true);
      if (rowH >= t + 4 && xb - xa >= tw + 8 + (i > 0 ? e.ueberlappung * s : 0)) z.text((xa + xb) / 2 + (i > 0 ? e.ueberlappung * s / 2 : 0), ya + rowH / 2, txt, t, true, 0, 'TEXT', 'm');
    }
    z.mass(lg, y0, lg + bw, y0, 0, -1, 8, mm(e.laenge), 'l', 1);
    if (n > 1) {
      const start1 = (n - 1) * (e.maxStueck - e.ueberlappung), yb = y0 + gesH;
      z.mass(lg + start1 * s, yb, lg + (start1 + e.ueberlappung) * s, yb, 0, 1, 8, mm(e.ueberlappung), 'u', 1, 'AKZENT');
    }
    z.fertig();
    return z;
  }

  // ================================================================ gemeinsam
  function streifen(w, h, t, lb, teile, farben, keys, gesamt, gesamtKey, unterText, unterKey) {
    const z = new Zeichnung(w, h, t), lg = 14, rg = 14, oben = 2 * t + 14, textZeile = t + 14, kettenRaum = 3.4 * t + 14, unten = textZeile + kettenRaum;
    const s = (w - lg - rg) / gesamt;
    const hb = min(Math.min(40, Math.max(14, 0.22 * h)), max(8, h - oben - unten));
    const y0 = oben + max(0, (h - oben - unten - hb) / 2);
    let x = lg; const xs = [x];
    for (let i = 0; i < teile.length; i++) {
      const xn = x + teile[i] * s;
      z.rechteck(x, y0, xn, y0 + hb, farben[i], null, keys[i]);
      x = xn; xs.push(x);
    }
    z.rechteck(lg, y0, x, y0 + hb, 'KEINE', 'KANTE');
    for (let i = 1; i < xs.length - 1; i++) z.linie(xs[i], y0, xs[i], y0 + hb, 'FALZ', keys[i]);
    z.mass(lg, y0, x, y0, 0, -1, 8, mm(gesamt), gesamtKey, 1, 'AKZENT');
    z.kette(xs.map(v => [v, y0 + hb]), 0, 1, 8, teile.map(mm), keys, 1);
    z.text(w / 2, h - 0.5 * t - 7, unterText, t, true, 0, 'TEXT', unterKey);
    z.fertig();
    return z;
  }

  function neuKombi(w, h, t, anteil, a, b, bauA, bauB, minB) {
    minB = minB || 0;
    const z = new Zeichnung(w, h, t), kopf = 1.6 * t;
    const titel = (x, y, s) => z.text(x + 6, y + 0.8 * t, s.toUpperCase(), t * 0.85, true, -1, 'GRAU');
    if (w > h * 1.25) {
      const wa = w * anteil;
      titel(Ze.kopfEinzug || 0, 0, a); z.einfuegen(bauA(wa, h - kopf), 0, kopf);
      titel(wa, 0, b); z.einfuegen(bauB(w - wa, h - kopf), wa, kopf);
    } else {
      // Hoehe nach Bedarf der beiden Teile teilen (wie Ze.kombi), nicht mehr nach festem Anteil
      const frei = max(h - 2 * kopf, 0), nA = Ze.natHoehe(bauA, w, t), nB = Ze.natHoehe(bauB, w, t);
      let ha = frei * anteil;
      if (nA > 0 && nB > 0) { ha = frei * nA / (nA + nB); z.wunschH = 2 * kopf + nA + max(nB, minB); }
      const hb = min(max(frei - ha, minB), frei), ha2 = frei - hb;
      titel(Ze.kopfEinzug || 0, 0, a); z.einfuegen(bauA(w, ha2), 0, kopf);
      titel(0, kopf + ha2 + 0.15 * t, b); z.einfuegen(bauB(w, hb), 0, 2 * kopf + ha2);   // 0,15 t tiefer: der Titel beruehrte sonst die Masslinie am unteren Rand der Ansicht
    }
    z.fertig();
    return z;
  }
  const rinneBlatt = (r, w, h, t, lb) => neuKombi(w, h, t, 0.64, lb.ansicht, lb.abwicklung, (ww, hh) => rinneAnsicht(r, ww, hh, t, lb), (ww, hh) => rinneAbwicklung(r, ww, hh, t, lb));
  const mauerBlatt = (m, w, h, t, lb) => neuKombi(w, h, t, 0.6, lb.querschnitt, lb.abwicklung, (ww, hh) => mauerQuerschnitt(m, ww, hh, t, lb), (ww, hh) => mauerAbwicklung(m, ww, hh, t, lb), 8 * t + 30);
  const kehleBlatt = (k, w, h, t, lb) => neuKombi(w, h, t, 0.6, lb.querschnitt, lb.abwicklung, (ww, hh) => kehleQuerschnitt(k, ww, hh, t, lb), (ww, hh) => kehleAbwicklung(k, ww, hh, t, lb), 8 * t + 30);

  Ze.Neu = { kombi: neuKombi, NEU_BESCHR_DE, rinneAbwicklung, rinneAnsicht, rinneBlatt, mauerQuerschnitt, mauerAbwicklung, mauerBlatt, kehleQuerschnitt, kehleAbwicklung, kehleStuecke, kehleBlatt };
})(typeof window !== 'undefined' ? window : globalThis);
