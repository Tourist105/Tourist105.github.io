/* Spengler-Web: Vektorskizze des alten Kamin-Entwurfs (Kamin alt). Port von kern/KaminAltBlatt.kt, gleiche Mathematik, Android-frei.
 * Ansichten: 1 = Seite (Teile einzeln im Profil), 2 = Oben (Grundriss auf dem Dach); Rohr/Metallkamin und Wandeinfassung haben nur "Oben". */
(function (root) {
  'use strict';
  const Ze = root.Ze || (typeof require !== 'undefined' ? require('./zeichnung.js') : null), fmtTrim = Ze.fmtTrim;
  const min = Math.min, max = Math.max, tan = Math.tan, PI = Math.PI;
  const MAX_GRAD = 75, versatzAusGrad = (grad, breite) => breite <= 0 || grad <= 0 ? 0 : breite * tan(min(grad, MAX_GRAD) * PI / 180);
  // ================================================================ kern/KaminAltBlatt.kt (Port): Vektorskizze des alten Kamin-Entwurfs
  const KaminAltBlatt = (function () {
    const Zeichnung = Ze.Zeichnung, tb = (s, g) => Ze.textBreite(s, g, true);
    const passend = (s, g, maxB) => tb(s, g) <= maxB ? g : max(6, g * maxB / tb(s, g));
    const v = (d, k) => d.werte[k] || 0;
    const txt = (d, k) => v(d, k) > 0 ? d.fmt(v(d, k)) : '?';
    const grad = x => fmtTrim(x, 1) + '°';
    const schr = (d, k) => d.schrGrad ? grad(v(d, k)) : d.fmt(v(d, k));
    const pts = (...p) => p;
    const RAND = Ze.RAND != null ? Ze.RAND : 5;

    function seite(d, w, h, tOrig, lb) {
      const z = new Zeichnung(w, h, tOrig), lang = (k, fb) => v(d, k) > 0 ? v(d, k) : fb, zeilen = [], ueb = d.art.keinUeberlapp ? 0 : d.ueberlapp;
      if (!d.art.keinHinten) { const tl = []; if (ueb > 0) tl.push([ueb, d.fmt(ueb), 'g_ueb']); tl.push([lang('hl', 40), txt(d, 'hl'), 'hl']); zeilen.push({ name: lb.hinten, aufkant: d.aufH, teile: tl, ueberlapp: ueb > 0 }); }
      zeilen.push({ name: lb.seiten, aufkant: d.aufS, teile: [[lang('sl', 45), txt(d, 'sl'), 'sl']], ueberlapp: false });
      zeilen.push({ name: lb.vorn, aufkant: d.aufV, teile: [[lang('vz', 25), txt(d, 'vz'), 'vz'], [lang('vk', 25), txt(d, 'vk'), 'vk']], ueberlapp: false });
      const breiteMax = max(...zeilen.map(r => r.teile.reduce((a, b) => a + b[0], 0))), nz = zeilen.length;
      const t = min(tOrig, h / (6.4 * nz + (d.lattenAn ? 5.9 : 1.2)));
      const aufTexte = [d.aufH, d.aufS, d.aufV].map(x => d.fmt(x));
      const links = 2.0 * t + max(...aufTexte.map(s => tb(s, t))) + 8, rechts = 1.8 * t, oben = d.lattenAn ? 5.9 * t : 1.2 * t;
      const zeileH = (h - oben - 0.3 * t) / nz;
      const s = max(0.01, (w - links - rechts) / breiteMax), x0 = links;
      if (d.lattenAn) {
        const ly = 2.9 * t, lmv = v(d, 'lm') > 0 ? v(d, 'lm') : 30, lw = min(lmv * s, w - links - rechts - 4 * t), xa = x0 + 1.4 * t;
        z.linie(x0, ly, w - rechts, ly, 'MITTEL', null, 0, 1.6);
        for (const lx of [xa, xa + lw]) z.rechteck(lx - 2, ly - 1.0 * t, lx + 2, ly, 'UMSCHLAG', 'KANTE');
        z.mass(xa, ly, xa + lw, ly, 0, 1, 2.0 * t, txt(d, 'lm'), 'lm', -1, 'AKZENT', true, t);
        z.text(RAND + 2, RAND + 0.7 * t, lb.latten, t * 0.95, false, -1, 'GRAU');
      }
      zeilen.forEach((r, i) => {
        const yb = oben + i * zeileH + zeileH - 3.4 * t, ha = min(max(r.aufkant * s, 1.4 * t), max(1.4 * t, zeileH - 5.6 * t));
        z.text(x0, yb - ha - 1.0 * t, r.name, t * 1.05, true, -1, 'BLAU');
        const total = r.teile.reduce((a, b) => a + b[0], 0) * s;
        z.linie(x0, yb - ha, x0, yb, 'KANTE', null, 0, 2.7); z.linie(x0, yb, x0 + total, yb, 'KANTE', null, 0, 2.7);
        if (r.ueberlapp) z.linie(x0, yb, x0 + ueb * s, yb, 'KANTE', null, 0, 5.2);
        z.mass(x0, yb - ha, x0, yb, -1, 0, 1.2 * t, d.fmt(r.aufkant), 'g_auf', 1, 'TEXT', true, t);
        const xs = [[x0, yb]]; let x = x0;
        for (const tl of r.teile) { x += tl[0] * s; xs.push([x, yb]); }
        if (xs.length === 2) z.mass(xs[0][0], yb, xs[1][0], yb, 0, 1, 1.5 * t, r.teile[0][1], r.teile[0][2], 1, 'TEXT', true, t);
        else z.kette(xs, 0, 1, 1.5 * t, r.teile.map(q => q[1]), r.teile.map(q => q[2]), 1, 'TEXT', true, t, z.neueGruppe(), true, Infinity);
      });
      z.fertig(); return z;
    }

    function oben(d, w, h, t, lb) {
      const z = new Zeichnung(w, h, t), a = d.art;
      const kb = [v(d, 'vbo'), v(d, 'hb'), v(d, 'vbu')].find(x => x > 0) || 50, kt = v(d, 'sb') > 0 ? v(d, 'sb') : 50;
      const hb = v(d, 'hb') > 0 ? v(d, 'hb') : kb, hl = v(d, 'hl') > 0 ? v(d, 'hl') : 0.8 * kt, sl = v(d, 'sl') > 0 ? v(d, 'sl') : 0.7 * kb;
      const vbo = v(d, 'vbo') > 0 ? v(d, 'vbo') : kb, vbu = v(d, 'vbu') > 0 ? v(d, 'vbu') : vbo * 1.15;
      const vlSum = v(d, 'vz') + v(d, 'vk'), vl = vlSum > 0 ? vlSum : 1.1 * kt;
      const schrH = d.schrGrad ? versatzAusGrad(v(d, 'sh'), hb) : v(d, 'sh'), schrV = d.schrGrad ? versatzAusGrad(v(d, 'sv'), max(vbo, vbu)) : v(d, 'sv');
      const vH = min(schrH, hl * 0.6), vV = min(schrV, vl * 0.6), hinten = !a.keinHinten, zweiVorn = a.keinHinten && a.vorne2;
      const xMin = min(-hb / 2, -vbo / 2, -vbu / 2, -kb / 2 - sl), xMax = max(hb / 2, vbo / 2, vbu / 2, kb / 2 + (a.eineSeite ? 0 : sl)), breiteGes = xMax - xMin;
      const oberLaenge = hinten ? hl : zweiVorn ? vl : 0, hoeheGes = oberLaenge + kt + vl;
      const gesamtTxt = vlSum > 0 ? d.fmt(vlSum) : '?';
      const linksR = 1.9 * t + max(tb(txt(d, 'sb'), t), vH > 0 ? tb(schr(d, 'sh'), t) - 0.6 * t : 0) + 6;
      const rechtsR = 1.9 * t + max(tb(txt(d, 'hl'), t), tb(gesamtTxt, t)) + 6;
      const obenR = 3.4 * t, untenR = 3.6 * t + ((a.sattel || a.kehle) ? 1.8 * t : 0);
      const s = max(0.01, min((w - linksR - rechtsR) / breiteGes, (h - obenR - untenR) / hoeheGes));
      const xLinks = linksR + (w - linksR - rechtsR - breiteGes * s) / 2, yKaminOben = obenR + oberLaenge * s;
      const X = x => xLinks + (x - xMin) * s, Y = y => yKaminOben + y * s;
      const xl = -kb / 2, xr = kb / 2;
      z.flaeche(pts(X(xl - sl), Y(0), X(xl), Y(0), X(xl), Y(kt), X(xl - sl), Y(kt)), 'BLECH', 'KANTE');
      if (!a.eineSeite) z.flaeche(pts(X(xr), Y(0), X(xr + sl), Y(0), X(xr + sl), Y(kt), X(xr), Y(kt)), 'BLECH', 'KANTE');
      else {
        z.linie(X(xr), Y(-0.04 * kt), X(xr), Y(1.04 * kt), 'KANTE', null, 0, 4.5);
        z.beweglich(X(xr + 0.3 * kb), Y(kt / 2), lb.mauer, 0, 0, X(xr + 0.3 * kb), Y(kt / 2), t * 0.95, true, 'GRAU', null, 0, false, true);
      }
      if (hinten) z.flaeche(pts(X(-hb / 2), Y(-hl + vH), X(hb / 2), Y(-hl), X(hb / 2), Y(0), X(-hb / 2), Y(0)), 'BLECH', 'KANTE');
      z.flaeche(pts(X(-vbo / 2), Y(kt), X(vbo / 2), Y(kt), X(vbu / 2), Y(kt + vl), X(-vbu / 2), Y(kt + vl - vV)), 'BLECH', 'KANTE');
      if (zweiVorn) z.flaeche(pts(X(-vbo / 2), Y(0), X(vbo / 2), Y(0), X(vbu / 2), Y(-vl), X(-vbu / 2), Y(-vl + vV)), 'BLECH', 'KANTE');
      z.flaeche(pts(X(xl), Y(0), X(xr), Y(0), X(xr), Y(kt), X(xl), Y(kt)), 'KAMIN', 'MITTEL');
      if (Ze.textBreite(lb.kamin, t, false) + 4 <= kb * s && t + 6 <= kt * s) z.text(X(0), Y(kt / 2), lb.kamin, t, false, 0, 'GRAU');
      if (hinten) z.beweglich(X(0), Y(-hl / 2), lb.hinten, 0, 0, X(0), Y(-hl / 2), t * 0.95, true, 'BLAU', null, 0, false, true);
      z.beweglich(X(-kb / 2 - sl / 2), Y(kt / 2), lb.seiten, 0, 0, X(-kb / 2 - sl / 2), Y(kt / 2), t * 0.85, true, 'BLAU', null, 0, false, true);
      z.beweglich(X(0), Y(kt + vl * 0.62), lb.vorn, 0, 0, X(0), Y(kt + vl * 0.62), t * 0.95, true, 'BLAU', null, 0, false, true);
      if (hinten) {
        z.mass(X(-hb / 2), Y(-hl), X(hb / 2), Y(-hl), 0, -1, 1.4 * t, txt(d, 'hb'), 'hb', 1, 'TEXT', true, t);
        if (vH > 0) z.linie(X(-hb / 2), Y(-hl + vH), X(-hb / 2), Y(-hl) - 1, 'HILFE', null, 0);
        z.mass(X(hb / 2), Y(-hl), X(hb / 2), Y(0), 1, 0, 1.4 * t, txt(d, 'hl'), 'hl', 1, 'TEXT', true, t);
        if (vH > 0) z.hinweis(X(-hb / 2), Y(-hl + vH / 2), -1, 0, 1.2 * t, schr(d, 'sh'), 'sh', 'AKZENT', true, z.neueGruppe());
      }
      z.mass(X(xl - sl), Y(0), X(xl - sl), Y(kt), -1, 0, 1.4 * t, txt(d, 'sb'), 'sb', 1, 'TEXT', true, t);
      z.mass(X(xl - sl), Y(kt), X(xl), Y(kt), 0, 1, 1.4 * t, txt(d, 'sl'), 'sl', 1, 'TEXT', true, t, true);
      z.mass(X(-vbo / 2), Y(kt), X(vbo / 2), Y(kt), 0, 1, min(1.5 * t, 0.2 * vl * s), txt(d, 'vbo'), 'vbo', 1, 'TEXT', true, t);
      z.mass(X(-vbu / 2), Y(kt + vl), X(vbu / 2), Y(kt + vl), 0, 1, 1.4 * t, txt(d, 'vbu'), 'vbu', 1, 'TEXT', true, t);
      if (vV > 0) z.linie(X(-vbu / 2), Y(kt + vl - vV), X(-vbu / 2), Y(kt + vl) + 1, 'HILFE', null, 0);
      if (vV > 0) z.hinweis(X(-vbu / 2), Y(kt + vl - vV / 2), -1, 0, 1.2 * t, schr(d, 'sv'), 'sv', 'AKZENT', true, z.neueGruppe());
      const xg = max(vbu / 2, xr + (a.eineSeite ? 0 : sl));
      z.mass(X(xg), Y(kt), X(xg), Y(kt + vl), 1, 0, 1.4 * t, gesamtTxt, null, 1, 'TEXT', true, t);
      const hinweis = a.sattel ? lb.sattelHinweis : a.kehle ? lb.kehleHinweis : '';
      if (hinweis) z.text(w / 2, h - RAND - 0.6 * t, hinweis, passend(hinweis, t * 0.92, w - 2 * RAND - 4), false, 0, 'GRAU');
      z.text(RAND + 2, RAND + 0.7 * t, '▲ ' + lb.first, t * 0.9, true, -1, 'GRAU');
      z.text(RAND + 2, h - RAND - 0.6 * t - (hinweis ? 1.8 * t : 0), '▼ ' + lb.traufe, t * 0.9, true, -1, 'GRAU');
      z.fertig(); return z;
    }

    function rund(d, w, h, t, lb) {
      const z = new Zeichnung(w, h, t);
      const gl = v(d, 'gl') > 0 ? v(d, 'gl') : 60, gb = v(d, 'gb') > 0 ? v(d, 'gb') : 50, rd = v(d, 'rd') > 0 ? min(v(d, 'rd'), min(gl, gb) * 0.95) : min(gl, gb) * 0.5;
      const linksR = 4.8 * t, rechtsR = 5.0 * t, obenR = 3.6 * t, untenR = 4.4 * t;
      const s = max(0.01, min((w - linksR - rechtsR) / gl, (h - obenR - untenR) / gb));
      const x0 = linksR + (w - linksR - rechtsR - gl * s) / 2, y0 = obenR + (h - obenR - untenR - gb * s) / 2, X = x => x0 + x * s, Y = y => y0 + y * s;
      z.flaeche(pts(X(0), Y(0), X(gl), Y(0), X(gl), Y(gb), X(0), Y(gb)), 'BLECH', 'KANTE');
      z.ellipse(X(gl / 2), Y(gb / 2), rd * s / 2, rd * s / 2, 'KAMIN', 'MITTEL');
      z.beweglich(X(gl / 2), Y(gb * 0.14), lb.grundblech, 0, 0, X(gl / 2), Y(gb * 0.14), t * 0.95, true, 'BLAU', null, 0, false, true);
      if (Ze.textBreite(lb.rohr, t, false) + 4 <= rd * s) z.text(X(gl / 2), Y(gb / 2), lb.rohr, t, false, 0, 'GRAU');
      z.mass(X(0), Y(gb), X(gl), Y(gb), 0, 1, 1.4 * t, txt(d, 'gl'), 'gl', 1, 'TEXT', true, t);
      z.mass(X(gl), Y(0), X(gl), Y(gb), 1, 0, 1.4 * t, txt(d, 'gb'), 'gb', 1, 'TEXT', true, t);
      z.mass(X(gl / 2 - rd / 2), Y(gb / 2), X(gl / 2 + rd / 2), Y(gb / 2), 0, -1, 0.2 * rd * s + 0.6 * t, txt(d, 'rd'), 'rd', 1, 'TEXT', true, t);
      z.hinweis(X(gl / 2 - rd * 0.36), Y(gb / 2 + rd * 0.36), -1, 1, 1.0 * t, lb.manschette + ' ' + txt(d, 'rh'), 'rh', 'AKZENT', true, z.neueGruppe());
      z.fertig(); return z;
    }

    function wand(d, w, h, t, lb) {
      const z = new Zeichnung(w, h, t), stufe = d.art.stufe, wl = v(d, 'wl') > 0 ? v(d, 'wl') : 120, wb = v(d, 'wb') > 0 ? v(d, 'wb') : 30, mauerH = max(0.25 * wb, 8);
      const stueckTxt = lb.stueck + ' ' + (v(d, 'wa') > 0 ? fmtTrim(v(d, 'wa'), 0) : '?');
      const linksR = 2.0 * t, rechtsR = 1.9 * t + max(tb(stueckTxt, t), tb(txt(d, 'wb'), t)) + 6, obenR = 2.6 * t, untenR = 3.6 * t;
      const s = max(0.01, min((w - linksR - rechtsR) / wl, (h - obenR - untenR) / (wb + mauerH)));
      const x0 = linksR + (w - linksR - rechtsR - wl * s) / 2, y0 = obenR + (h - obenR - untenR - (wb + mauerH) * s) / 2, X = x => x0 + x * s, Y = y => y0 + y * s;
      z.flaeche(pts(X(0), Y(0), X(wl), Y(0), X(wl), Y(mauerH), X(0), Y(mauerH)), 'KAMIN', 'KANTE');
      if (Ze.textBreite(lb.mauer, t, false) + 4 <= mauerH * s * 4 && t + 4 <= mauerH * s) z.text(X(wl / 2), Y(mauerH / 2), lb.mauer, t, false, 0, 'GRAU');
      z.flaeche(pts(X(0), Y(mauerH), X(wl), Y(mauerH), X(wl), Y(mauerH + wb), X(0), Y(mauerH + wb)), 'BLECH', 'KANTE');
      z.beweglich(X(wl / 2), Y(mauerH + wb / 2), stufe ? lb.stufe : lb.wand, 0, 0, X(wl / 2), Y(mauerH + wb / 2), t * 0.95, true, 'BLAU', null, 0, false, true);
      z.mass(X(0), Y(mauerH + wb), X(wl), Y(mauerH + wb), 0, 1, 1.4 * t, txt(d, 'wl'), 'wl', 1, 'TEXT', true, t);
      z.mass(X(wl), Y(mauerH), X(wl), Y(mauerH + wb), 1, 0, 1.4 * t, txt(d, 'wb'), 'wb', 1, 'TEXT', true, t);
      z.hinweis(X(wl), Y(mauerH / 2), 1, 0, 1.4 * t, stueckTxt, 'wa', 'AKZENT', true, z.neueGruppe());
      z.fertig(); return z;
    }

    /** Gesamte Zeichnung fuer die Ansicht: 1 = Seite (nur Kamin-Arten), 2 = Oben. */
    function zeichne(ansicht, d, w, h, t, lb) {
      const typ = d.art.typ;
      return typ === 'KAMIN' ? (ansicht === 1 ? seite(d, w, h, t, lb) : oben(d, w, h, t, lb)) : typ === 'RUND' ? rund(d, w, h, t, lb) : wand(d, w, h, t, lb);
    }
    return { zeichne, seite, oben, rund, wand };
  })();
  root.KaminAltBlatt = KaminAltBlatt;
  if (typeof module !== 'undefined') module.exports = KaminAltBlatt;
})(typeof window !== 'undefined' ? window : globalThis);
