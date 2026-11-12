/* Spengler-Web: direkter Port von kern/Modell.kt (Kamera), kern/Skizzen3D.kt, kern/Tiefenordnung.kt, MenueSzenen.kt und Ansicht3D.kt
 * nach Canvas 2D. Gleiche Formeln (Projektion, Licht, Glanz, Umriss, Reihenfolge). V3 = [x, y, z]. Masse in mm.
 * Farben als ARGB-Zahl ohne Vorzeichen (wie Android), 0 = "nach Teilart". */
(function (root) {
  'use strict';
  const PI = Math.PI, cos = Math.cos, sin = Math.sin, tan = Math.tan, max = Math.max, min = Math.min, abs = Math.abs, sqrt = Math.sqrt;
  const fr = Math.fround;
  const Ze = root.Ze || (typeof require !== 'undefined' ? require('./zeichnung.js') : null);

  // ---------------------------------------------------------------- V3
  const add = (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
  const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
  const mul = (a, k) => [a[0] * k, a[1] * k, a[2] * k];
  const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
  const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
  const len = a => sqrt(dot(a, a));
  const norm = a => { const l = len(a); return l === 0 ? a : mul(a, 1 / l); };

  // ---------------------------------------------------------------- Farben (ARGB als Zahl)
  const argb = (a, r, g, b) => ((a & 255) * 16777216 + ((r & 255) << 16) + ((g & 255) << 8) + (b & 255));
  const rgb = (r, g, b) => argb(255, r, g, b);
  const hex = h => parseInt(h.slice(1), 16) + 255 * 16777216;
  const cA = c => Math.floor(c / 16777216) & 255, cR = c => (c >> 16) & 255, cG = c => (c >> 8) & 255, cB = c => c & 255;
  const css = c => 'rgba(' + cR(c) + ',' + cG(c) + ',' + cB(c) + ',' + (cA(c) / 255).toFixed(4) + ')';
  const F = Ze.FARBEN;
  const SF = { LINIE: hex(F.LINIE), MASS: hex(F.MASS), HILFE: hex(F.HILFE), AKZENT: hex(F.AKZENT), AKZENT_TEXT: hex(F.AKZENT_TEXT), BLECH: hex(F.BLECH), AUFKANT: hex(F.AUFKANT), UMSCHLAG: hex(F.UMSCHLAG), STUTZEN: hex(F.STUTZEN), KAMIN: hex(F.KAMIN) };

  // ---------------------------------------------------------------- Kamera
  class Kamera {
    constructor(yaw, pitch, zoom) { this.yaw = yaw == null ? 0.6 : yaw; this.pitch = pitch == null ? 0.55 : pitch; this.zoom = zoom == null ? 1 : zoom; this.offX = 0; this.offY = 0; this.e = [0, 0, 0]; this.rx = [1, 0, 0]; this.ux = [0, 0, 1]; this.fx = [0, 1, 0]; this.f = 1; this.cx = 0; this.cy = 0; }
    einrichten(zx, zy, zz, radius, breite, hoehe) {
      const halb = 20 * PI / 180;
      this.f = (min(breite, hoehe) / 2) / tan(halb);
      const dist = radius / sin(halb) * 1.0 / this.zoom;
      const ex = zx + dist * cos(this.pitch) * sin(this.yaw), ey = zy - dist * cos(this.pitch) * cos(this.yaw), ez = zz + dist * sin(this.pitch);
      this.e = [ex, ey, ez];
      const fwd = norm([zx - ex, zy - ey, zz - ez]);
      let rgt = cross(fwd, [0, 0, 1]);
      if (len(rgt) < 1e-9) rgt = [1, 0, 0];
      rgt = norm(rgt);
      this.rx = rgt; this.ux = cross(rgt, fwd); this.fx = fwd;
      this.cx = breite / 2; this.cy = hoehe / 2; this.offX = 0; this.offY = 0;
    }
    auge() { return this.e; }
    licht() { return norm(add(add(mul(this.fx, -0.62), mul(this.ux, 0.62)), mul(this.rx, -0.48))); }
    projiziere(p, aus) {
      const d = sub(p, this.e), zc = dot(d, this.fx), zz = max(zc, 1e-3);
      aus[0] = this.cx + this.offX + this.f * dot(d, this.rx) / zz;
      aus[1] = this.cy + this.offY - this.f * dot(d, this.ux) / zz;
      aus[2] = zc;
    }
  }

  // ---------------------------------------------------------------- Flaechen
  function WF(punkte, instanz, art, aufkantung, kanten, glatt, farbe, ordnung, nachbar) {
    return { punkte, instanz, art, aufkantung: !!aufkantung, kanten: kanten || null, glatt: !!glatt, farbe: farbe || 0, ordnung: ordnung || 0, nachbar: nachbar || null };
  }
  function umhuellung(fl) {
    const r = [Infinity, -Infinity, Infinity, -Infinity, Infinity, -Infinity];
    for (const f of fl) for (const p of f.punkte) {
      r[0] = min(r[0], p[0]); r[1] = max(r[1], p[0]); r[2] = min(r[2], p[1]); r[3] = max(r[3], p[1]); r[4] = min(r[4], p[2]); r[5] = max(r[5], p[2]);
    }
    return r;
  }
  function normale(p) { let n = [0, 0, 0]; for (let i = 1; i < p.length - 1; i++) n = add(n, cross(sub(p[i], p[0]), sub(p[i + 1], p[0]))); return n; }
  function mitte(p) { let s = [0, 0, 0]; for (const q of p) s = add(s, q); return mul(s, 1 / p.length); }

  // ================================================================ Tiefenordnung.kt
  const Tiefenordnung = (function () {
    function kaminSeiten(breite, tiefe, hoehe) {
      const xa = -breite / 2, xb = breite / 2, t = tiefe, h = hoehe;
      return [
        [[xa, 0, 0], [xb, 0, 0], [xb, 0, h], [xa, 0, h]],
        [[xb, t, 0], [xa, t, 0], [xa, t, h], [xb, t, h]],
        [[xb, 0, 0], [xb, t, 0], [xb, t, h], [xb, 0, h]],
        [[xa, t, 0], [xa, 0, 0], [xa, 0, h], [xa, t, h]],
        [[xa, 0, h], [xb, 0, h], [xb, t, h], [xa, t, h]]];
    }
    function schneidet(p, n, d) {
      let vorn = false, hinten = false;
      for (const q of p) { const v = dot(n, q) - d; if (v > 1e-6) vorn = true; else if (v < -1e-6) hinten = true; }
      return vorn && hinten;
    }
    function schneide(f, n, d) {
      const p = f.punkte, m = p.length;
      const kf = []; for (let i = 0; i < m; i++) kf.push(f.kanten ? f.kanten[i] : true);
      const pos = [], pf = [], neg = [], nf = [];
      for (let i = 0; i < m; i++) {
        const a = p[i], b = p[(i + 1) % m];
        const sa = dot(n, a) - d, sb = dot(n, b) - d;
        if (sa >= -1e-9) { pos.push(a); pf.push(kf[i]); }
        if (sa <= 1e-9) { neg.push(a); nf.push(kf[i]); }
        if ((sa > 1e-9 && sb < -1e-9) || (sa < -1e-9 && sb > 1e-9)) {
          const t = sa / (sa - sb), c = add(a, mul(sub(b, a), t));
          if (sa > 0) { pos.push(c); pf.push(false); neg.push(c); nf.push(kf[i]); } else { neg.push(c); nf.push(false); pos.push(c); pf.push(kf[i]); }
        }
      }
      const out = [];
      if (pos.length >= 3) out.push(WF(pos, f.instanz, f.art, f.aufkantung, pf, f.glatt, f.farbe, f.ordnung, null));
      if (neg.length >= 3) out.push(WF(neg, f.instanz, f.art, f.aufkantung, nf, f.glatt, f.farbe, f.ordnung, null));
      return out.length ? out : [f];
    }
    function zerlege(liste) {
      let aktuell = liste.map((f, i) => [f, i]);
      let irgendwo = false;
      for (let runde = 0; runde < 3; runde++) {
        const eben = aktuell.map(([f]) => { if (f.glatt) return null; const n = normale(f.punkte), l = len(n); if (l < 1e-12) return null; const u = mul(n, 1 / l); return [u, dot(u, f.punkte[0])]; });
        const kandidaten = []; for (let i = 0; i < aktuell.length; i++) if (eben[i]) kandidaten.push(i);
        const neu = []; let geteilt = false;
        for (let i = 0; i < aktuell.length; i++) {
          const fo = aktuell[i], f = fo[0], ef = eben[i];
          if (!ef) { neu.push(fo); continue; }
          let teile = [f];
          for (const j of kandidaten) {
            if (i === j) continue;
            const eg = eben[j];
            if (teile.some(t => schneidet(t.punkte, eg[0], eg[1])) && schneidet(aktuell[j][0].punkte, ef[0], ef[1])) {
              const n2 = [];
              for (const t of teile) if (schneidet(t.punkte, eg[0], eg[1])) { for (const q of schneide(t, eg[0], eg[1])) n2.push(q); geteilt = true; } else n2.push(t);
              teile = n2;
            }
          }
          for (const t of teile) neu.push([t, fo[1]]);
        }
        aktuell = neu;
        if (geteilt) irgendwo = true; else break;
      }
      if (!irgendwo) return liste;
      const erster = new Map();
      aktuell.forEach((fo, pos) => { if (!erster.has(fo[1])) erster.set(fo[1], pos); });
      return aktuell.map(([f]) => {
        const nb = f.nachbar;
        if (!f.glatt || !nb) return f;
        return WF(f.punkte, f.instanz, f.art, f.aufkantung, f.kanten, f.glatt, f.farbe, f.ordnung, nb.map(v => v < 0 ? -1 : (erster.has(v) ? erster.get(v) : -1)));
      });
    }

    const FERN = 0, NAH = 1, EBEN = 2, GEMISCHT = 3;
    // Zwei Flaechen EXAKT in derselben Ebene (Aufkantung an der Kaminwand, Blech auf Blech): das spaetere Blech liegt immer oben, aus jedem Blickwinkel gleich.
    // Vorher blieb das offen und die Reihenfolge kippte je Winkel (Kachel Kamin: bis 447 Pixel auf einmal)
    const GLEICH = 99;
    function lage(p, e, eps) {
      if (e.vorz === 0) return GEMISCHT;
      const s = e.vorz > 0 ? 1 : -1;
      let hinten = false, vorne = false;
      for (const q of p) { const v = (dot(e.n, q) - e.d) * s; if (v > eps) vorne = true; else if (v < -eps) hinten = true; }
      if (vorne && hinten) return GEMISCHT; if (vorne) return NAH; if (hinten) return FERN; return EBEN;
    }
    function urteil(a, b, eps) {
      const ca = lage(a.f.welt, b, eps), cb = lage(b.f.welt, a, eps);
      if (ca === EBEN && cb === EBEN) return GLEICH;
      const r1 = ca === FERN ? -1 : ca === NAH ? 1 : 0, r2 = cb === NAH ? -1 : cb === FERN ? 1 : 0;
      if (r1 !== 0 && r2 !== 0 && r1 !== r2) return 0;
      return r1 !== 0 ? r1 : r2;
    }
    function trennt(a, b) {
      const n = a.xs.length;
      for (let i = 0; i < n; i++) {
        const j = (i + 1) % n, ex = a.ys[j] - a.ys[i], ey = -(a.xs[j] - a.xs[i]), l = sqrt(ex * ex + ey * ey);
        if (l < 1e-9) continue;
        let amin = Infinity, amax = -Infinity;
        for (let k = 0; k < n; k++) { const v = (a.xs[k] * ex + a.ys[k] * ey) / l; amin = min(amin, v); amax = max(amax, v); }
        let bmin = Infinity, bmax = -Infinity;
        for (let k = 0; k < b.xs.length; k++) { const v = (b.xs[k] * ex + b.ys[k] * ey) / l; bmin = min(bmin, v); bmax = max(bmax, v); }
        if (bmin >= amax - 0.3 || amin >= bmax - 0.3) return true;
      }
      return false;
    }
    const ueberdeckt = (a, b) => !trennt(a, b) && !trennt(b, a);

    // Binaerer Heap mit Vergleichsfunktion
    class Heap {
      constructor(cmp) { this.a = []; this.cmp = cmp; }
      get size() { return this.a.length; }
      push(v) { const a = this.a; a.push(v); let i = a.length - 1; while (i > 0) { const p = (i - 1) >> 1; if (this.cmp(a[i], a[p]) < 0) { [a[i], a[p]] = [a[p], a[i]]; i = p; } else break; } }
      pop() {
        const a = this.a; if (!a.length) return null; const top = a[0], last = a.pop();
        if (a.length) { a[0] = last; let i = 0; for (;;) { let l = 2 * i + 1, r = l + 1, m = i; if (l < a.length && this.cmp(a[l], a[m]) < 0) m = l; if (r < a.length && this.cmp(a[r], a[m]) < 0) m = r; if (m === i) break; [a[i], a[m]] = [a[m], a[i]]; i = m; } }
        return top;
      }
    }

    function sortiere(fl, auge) {
      const ergebnis = []; let mx = 1;
      for (const f of fl) for (const q of f.welt) mx = max(mx, max(abs(q[0]), max(abs(q[1]), abs(q[2]))));
      const eps = 1e-7 * mx;
      const gruppen = Array.from(new Set(fl.map(f => f.ordnung))).sort((a, b) => a - b);
      for (const g of gruppen) {
        const idx = []; for (let i = 0; i < fl.length; i++) if (fl[i].ordnung === g) idx.push(i);
        const inf = idx.map(i => {
          const f = fl[i], nn = normale(f.welt), l = len(nn), nu = l < 1e-12 ? nn : mul(nn, 1 / l), d = dot(nu, f.welt[0]);
          let a = Infinity, b = -Infinity, c = Infinity, e = -Infinity;
          for (let k = 0; k < f.xs.length; k++) { a = min(a, f.xs[k]); b = max(b, f.xs[k]); c = min(c, f.ys[k]); e = max(e, f.ys[k]); }
          return { f, n: nu, d, vorz: dot(nu, auge) - d, x0: a, x1: b, y0: c, y1: e };
        });
        const m = idx.length, nach = Array.from({ length: m }, () => []), grad = new Int32Array(m);
        const kante = (vor, hint) => { nach[vor].push(hint); grad[hint]++; };
        const reihe = Array.from({ length: m }, (_, i) => i).sort((p, q) => inf[p].x0 - inf[q].x0 || p - q);
        for (let ai = 0; ai < m; ai++) {
          const a = reihe[ai], ia = inf[a];
          for (let bi = ai + 1; bi < m; bi++) {
            const b = reihe[bi], ib = inf[b];
            if (ib.x0 >= ia.x1 - 0.3) break;
            if (ib.y0 >= ia.y1 - 0.3 || ia.y0 >= ib.y1 - 0.3) continue;
            if (!ueberdeckt(ia.f, ib.f)) continue;
            const r = urteil(ia, ib, eps);
            if (r === GLEICH) kante(min(a, b), max(a, b)); else if (r < 0) kante(a, b); else if (r > 0) kante(b, a);
          }
        }
        const bereit = new Heap((p, q) => {
          const gp = inf[p].f.glatt, gq = inf[q].f.glatt;
          if (gp !== gq) return gp ? 1 : -1;
          if (gp) { const d = -inf[p].f.tiefe - -inf[q].f.tiefe; if (d) return d; return p - q; }
          return p - q;
        });
        for (let i = 0; i < m; i++) if (grad[i] === 0) bereit.push(i);
        const fertig = new Uint8Array(m); let gesetzt = 0, naechster = 0;
        while (gesetzt < m) {
          let k = bereit.pop();
          if (k == null) { while (fertig[naechster]) naechster++; k = naechster; }
          if (fertig[k]) continue;
          fertig[k] = 1; gesetzt++;
          ergebnis.push(idx[k]);
          for (const j of nach[k]) if (!fertig[j]) { grad[j]--; if (grad[j] === 0) bereit.push(j); }
        }
      }
      return ergebnis;
    }
    return { kaminSeiten, zerlege, sortiere };
  })();

  // ================================================================ Skizzen3D.kt
  const Skizzen3D = (function () {
    const UM = 32;
    const ring = (c, a, v, r, n) => { n = n || UM; const o = []; for (let k = 0; k < n; k++) { const w = 2 * PI * k / n; o.push(add(add(c, mul(a, r * cos(w))), mul(v, r * sin(w)))); } return o; };
    function mantel(ringe, art, inst, farbe, ordnung, aus, innen) {
      const n = ringe[0].length, basis = aus.length;
      const idx = (i, k) => (i < 0 || i >= ringe.length - 1) ? -1 : basis + i * n + (((k % n) + n) % n);
      for (let i = 0; i < ringe.length - 1; i++) for (let k = 0; k < n; k++) {
        const k1 = (k + 1) % n;
        const p = [ringe[i][k], ringe[i][k1], ringe[i + 1][k1], ringe[i + 1][k]];
        if (innen) aus.push(WF(p, inst, art, false, null, true, farbe, ordnung, null));
        else aus.push(WF(p, inst, art, false, null, true, farbe, ordnung, [idx(i - 1, k), idx(i, k + 1), idx(i + 1, k), idx(i, k - 1)]));
      }
    }
    function scheibe(ra, ri, art, inst, farbe, ordnung, kanten, aus) {
      const n = ra.length;
      for (let k = 0; k < n; k++) { const k1 = (k + 1) % n; aus.push(WF([ra[k], ra[k1], ri[k1], ri[k]], inst, art, false, kanten ? [true, false, true, false] : [false, false, false, false], false, farbe, ordnung)); }
    }
    function deckel(r, nach, inst, aus) {
      let p = r; const n = cross(sub(p[1], p[0]), sub(p[2], p[0]));
      if (dot(n, nach) < 0) p = p.slice().reverse();
      aus.push(WF(p, inst, 'BOGEN_ENDE', false, null, true, hex('#3A5478'), 1, null));
    }
    const flach = (pts, art, inst, farbe, ordnung, kanten, aus) => aus.push(WF(pts, inst, art, false, kanten ? null : pts.map(() => false), false, farbe, ordnung));
    const M = (key, a, b, versatz, wert, vor, nach, akzent) => ({ key, a, b, versatz, wert, vor: vor || '', nach: nach || '', akzent: !!akzent });

    function schwanenhals(a, bogenGrad, r, steck) {
      const K = root.Kern, hs = K.SchwanenhalsSkizze(a, bogenGrad, r, steck);
      const b = bogenGrad * PI / 180, lc = hs.luecke;
      const tr = max(1, min(0.55 * r, 0.085 * a)), stub = 1.7 * tr + 0.1 * r, seite = [0, 1, 0];
      const lagef = (p, phi, rad) => { const d = [sin(phi), 0, -cos(phi)]; return ring(p, seite, cross(d, seite), rad); };
      const nb = 22, p0 = [0, 0, 0], p1 = add(p0, [0, 0, -stub]);
      const bogen1 = phi => add(p1, [r * (1 - cos(phi)), 0, -r * sin(phi)]);
      const q0 = bogen1(b), d = [sin(b), 0, -cos(b)], q1 = add(q0, mul(d, lc));
      const bogen2 = phi => add(q1, [r * (cos(phi) - cos(b)), 0, -r * (sin(b) - sin(phi))]);
      const e0 = bogen2(0), e1 = add(e0, [0, 0, -stub]), hoch = -e1[2];
      const s = p => [p[0], p[1], p[2] + hoch];
      const f = [];
      const oben = [lagef(s(p0), 0, tr), lagef(s(p1), 0, tr)];
      for (let j = 1; j <= nb; j++) { const ph = b * j / nb; oben.push(lagef(s(bogen1(ph)), ph, tr)); }
      mantel(oben, 'BOGEN_ENDE', 0, SF.AUFKANT, 0, f);
      const unten = [];
      for (let j = 0; j <= nb; j++) { const ph = b * (1 - j / nb); unten.push(lagef(s(bogen2(ph)), ph, tr)); }
      unten.push(lagef(s(e1), 0, tr));
      mantel(unten, 'BOGEN_ENDE', 2, SF.AUFKANT, 0, f);
      deckel(oben[0], [0, 0, 1], 0, f);
      deckel(unten[unten.length - 1], [0, 0, -1], 2, f);
      const sm = max(0, min(steck, lc * 0.4)), tm = tr * 1.12;
      const gerade = (von, bis, rad, art, farbe) => { mantel([lagef(s(add(q0, mul(d, von))), b, rad), lagef(s(add(q0, mul(d, bis))), b, rad)], art, 1, farbe, 0, f); };
      if (sm > 0.5) {
        gerade(0, sm, tm, 'BOGEN_MITTE', SF.UMSCHLAG);
        gerade(sm, lc - sm, tr, 'ROHR', SF.BLECH);
        gerade(lc - sm, lc, tm, 'BOGEN_MITTE', SF.UMSCHLAG);
        for (const pos of [0, lc]) scheibe(lagef(s(add(q0, mul(d, pos))), b, tm), lagef(s(add(q0, mul(d, pos))), b, tr), 'BOGEN_MITTE', 1, SF.UMSCHLAG, 0, false, f);
      } else gerade(0, lc, tr, 'ROHR', SF.BLECH);
      const m = [], vorn = [0, -1, 0], zTop = hoch;
      m.push(M('a', [0, 0, zTop], [a, 0, zTop], [0, 0, 1.5 * tr], a));
      m.push(M('', [a, 0, zTop + 1.5 * tr], [a, 0, s(e0)[2]], [0, 0, 0], NaN));
      const sAn = s(sub(q1, mul(d, steck)));
      m.push(M('s', add(sAn, mul(vorn, tm * 1.0)), add(add(sAn, mul(d, steck)), mul(vorn, tm * 1.0)), add(mul(vorn, tm * 1.6), mul([0, 0, -1], tm * 2.0)), steck));
      const rm = s(bogen1(b / 2));
      m.push(M('r', add(rm, [-tr * 1.1, 0, 0]), null, [0, 0, 0], r, 'R ', '', false));
      m.push(M('w', add(s(q0), [tr * 1.6, 0, tr * 1.3]), null, [0, 0, 0], bogenGrad, '', '°', true));
      return { szene: festeSzene(f, null), masse: m };
    }

    function konvex(p) {
      const s = p.slice().sort((a, b) => a[0] - b[0] || a[1] - b[1]);
      if (s.length < 3) return s;
      const kr = (o, a, b) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
      const u = [];
      for (const q of s) { while (u.length >= 2 && kr(u[u.length - 2], u[u.length - 1], q) <= 0) u.pop(); u.push(q); }
      const l = [];
      for (const q of s.slice().reverse()) { while (l.length >= 2 && kr(l[l.length - 2], l[l.length - 1], q) <= 0) l.pop(); l.push(q); }
      u.pop(); l.pop();
      return u.concat(l);
    }

    function dunstrohr(d, h, n, b, t, s, u) {
      const an = n * PI / 180, cn = cos(an), sn = sin(an), tn = tan(an), r = d / 2, f = [];
      const dick = max(2.5, 0.012 * b);
      const pl = (x, sl, dz) => [x, sl * cn, sl * sn + (dz || 0)];
      const rand = 0.16 * max(b, t), rb = b / 2 + rand, s0 = -t / 2 - rand, s1 = t / 2 + rand, reihen = 9;
      for (let i = 0; i < reihen; i++) {
        const a0 = s0 + (s1 - s0) * i / reihen, a1 = s0 + (s1 - s0) * (i + 1) / reihen;
        const farbe = i % 2 === 0 ? hex('#E6E9EE') : hex('#DADEE5');
        flach([pl(-rb, a0, -dick * 1.5), pl(rb, a0, -dick * 1.5), pl(rb, a1, -dick * 1.5), pl(-rb, a1, -dick * 1.5)], 'WAND', 2, farbe, -3, false, f);
      }
      const uu = min(max(u, 0), t * 0.4), ss = min(max(s, 0), b * 0.45), xa = -b / 2, xb = b / 2, oberKante = t / 2, unterKante = -t / 2;
      if (uu > 0) flach([pl(xa, unterKante), pl(xb, unterKante), pl(xb, unterKante + uu), pl(xa, unterKante + uu)], 'GRUNDBLECH', 0, SF.UMSCHLAG, -2, true, f);
      const sl0 = unterKante + uu;
      const spalten = [[xa, xa + ss, SF.AUFKANT], [xa + ss, xb - ss, SF.BLECH], [xb - ss, xb, SF.AUFKANT]];
      for (const [x0, x1, c] of spalten) if (x1 - x0 > 0.01) flach([pl(x0, sl0), pl(x1, sl0), pl(x1, oberKante), pl(x0, oberKante)], 'GRUNDBLECH', 0, c, -2, true, f);
      const kante = hex('#7FA3CF');
      flach([pl(xa, unterKante), pl(xb, unterKante), pl(xb, unterKante, -dick), pl(xa, unterKante, -dick)], 'GRUNDBLECH', 0, kante, -2, true, f);
      flach([pl(xb, unterKante), pl(xb, oberKante), pl(xb, oberKante, -dick), pl(xb, unterKante, -dick)], 'GRUNDBLECH', 0, kante, -2, true, f);
      flach([pl(xa, oberKante), pl(xa, unterKante), pl(xa, unterKante, -dick), pl(xa, oberKante, -dick)], 'GRUNDBLECH', 0, kante, -2, true, f);
      const sx = 0.5 * h, sy = 0.28 * h, pts = [];
      for (let k = 0; k < 24; k++) { const w = 2 * PI * k / 24, x = r * cos(w), y = r * sin(w); pts.push([x, y]); pts.push([x + sx, y + sy]); }
      const yMax = oberKante * cn, yMin = unterKante * cn;
      const cl = (v, a, b2) => v < a ? a : v > b2 ? b2 : v;
      const huelle = konvex(pts).map(q => [cl(q[0], xa, xb), cl(q[1], yMin, yMax)]);
      if (huelle.length >= 3) flach(huelle.map(q => [q[0], q[1], q[1] * tn + 0.6]), 'GRUNDBLECH', 0, argb(0x5A, 0x0F, 0x2A, 0x57), -1, false, f);
      const ex = [1, 0, 0], ey = [0, 1, 0], unt = [], obn = [];
      for (let k = 0; k < 40; k++) { const w = 2 * PI * k / 40, x = r * cos(w), y = r * sin(w); unt.push([x, y, y * tn]); obn.push([x, y, h]); }
      mantel([unt, obn], 'ROHR', 1, SF.STUTZEN, 1, f);   // Ebene 1: Aussenmantel liegt immer ueber der Innenwand (Ebene 0), sonst kippt der Rand beim Drehen
      const wand = max(0.07 * r, 1.5), c = [0, 0, h];
      const rIm = ring(c, ex, ey, r - wand, 40), tiefe = min(h * 0.6, d * 0.9);
      const grund = ring(add(c, [0, 0, -tiefe]), ex, ey, r - wand, 40);
      mantel([rIm, grund], 'ROHR', 1, hex('#4F76A8'), 0, f, true);
      flach(grund, 'ROHR', 1, hex('#1F3354'), -1, false, f);
      scheibe(ring(c, ex, ey, r, 40), rIm, 'ROHR', 1, hex('#EAF3FC'), 3, true, f);
      const m = [];
      m.push(M('d', [-r, 0, h], [r, 0, h], [0, 0, 0.18 * max(h, d)], d, 'Ø '));
      m.push(M('h', [r, 0, 0], [r, 0, h], [0.28 * b, 0, 0], h));
      m.push(M('b', pl(xa, unterKante), pl(xb, unterKante), sub(pl(0, -0.14 * t), pl(0, 0)), b));
      m.push(M('t', pl(xb, unterKante), pl(xb, oberKante), [0.13 * b, 0, 0], t));
      m.push(M('n', pl(xb - 0.02 * b, unterKante + 0.1 * t, dick), null, [0, 0, 0], n, '', '°', true));
      return { szene: festeSzene(f, null), masse: m };
    }

    // Fallrohr: Rohrstrang von oben nach unten aus den echten Bauteilen (Fallrohr.zeilen). Durchmesser wird fuer die Lesbarkeit hoechstens
    // auf das 1,1-fache des Bogenradius ueberhoeht, alle Laengen, Winkel und Achsmasse sind echt.
    function fallrohr(fr) {
      const FRm = root.Fallrohr, f = [], masse = [], zeilen = fr.zeilen, steck = fr.e.steckung, nb = 16;
      const rbog = dn => FRm.radius(dn), dn0 = fr.e.dn;
      const sc = max(1, min(fr.e.hoehe / 60 / (dn0 / 2), 1.1 * rbog(dn0) / (dn0 / 2)));
      const tr = dn => sc * dn / 2;
      const seite = [0, 1, 0];
      const dir = (phi, sx) => [sx * sin(phi), 0, -cos(phi)];
      const lage = (p, phi, sx, rad) => ring(p, seite, cross(dir(phi, sx), seite), rad);
      const zyl = (p, q, phi, sx, r1, r2, art, inst, farbe) => { mantel([lage(p, phi, sx, r1), lage(q, phi, sx, r2)], art, inst, farbe, 0, f); };
      const kragen = (p, q, phi, sx, r, inst) => { zyl(p, q, phi, sx, r, r, 'BOGEN_MITTE', inst, SF.UMSCHLAG); for (const e of [p, q]) scheibe(lage(e, phi, sx, r), lage(e, phi, sx, r * 0.9), 'BOGEN_MITTE', inst, SF.UMSCHLAG, 0, false, f); };
      let p = [0, 0, 0], sx = 1, ersteRing = null, letzteRing = null, letztePhi = 0;
      const nichtSchelle = (i, d) => { let j = i + d; while (j >= 0 && j < zeilen.length && zeilen[j].teil.typ === 'schelle') j += d; return j >= 0 && j < zeilen.length ? zeilen[j] : null; };
      const merke = (pt, phi, sx2, rad) => { const r = lage(pt, phi, sx2, rad); if (!ersteRing) ersteRing = r; letzteRing = r; letztePhi = phi; };
      zeilen.forEach((z, i) => {
        const tp = z.teil.typ, r = tr(z.dn), len2 = max(0, z.sichtbar), key = 'p' + i, top = p[2];
        if (!ersteRing) merke(p, 0, sx, r);
        switch (tp) {
          case 'rohr': {
            if (len2 <= 0) break;
            const q = add(p, [0, 0, -len2]);
            zyl(p, q, 0, sx, r, r, 'ROHR', i, SF.BLECH);
            const o = nichtSchelle(i, -1), u = nichtSchelle(i, 1), sm = max(0, min(steck, len2 * 0.4)), kr = r * 1.12;
            if (sm > 0.5 && (o == null || o.teil.typ !== 'rohr')) kragen(p, add(p, [0, 0, -sm]), 0, sx, kr, i);
            if (sm > 0.5 && u != null && u.teil.typ !== 'rohr') kragen(add(q, [0, 0, sm]), q, 0, sx, kr, i);
            if (len2 > r * 3) masse.push(M(key, [sx > 0 ? r * 1.15 : -r * 1.15, 0, p[2]], [sx > 0 ? r * 1.15 : -r * 1.15, 0, q[2]], [sx * r * 1.6, 0, 0], len2));
            p = q; merke(p, 0, sx, r); break;
          }
          case 'versatz': {
            const sk = z.sk, b = rad2(z.teil.w), lc = sk.luecke, rb = rbog(z.dn), d = dir(b, sx), x0 = p[0];
            const b1 = ph => add(p, [sx * rb * (1 - cos(ph)), 0, -rb * sin(ph)]);
            const q0 = b1(b), q1 = add(q0, mul(d, lc));
            const b2 = ph => add(q1, [sx * rb * (cos(ph) - cos(b)), 0, -rb * (sin(b) - sin(ph))]);
            const o1 = []; for (let j = 0; j <= nb; j++) { const ph = b * j / nb; o1.push(lage(b1(ph), ph, sx, r)); }
            mantel(o1, 'BOGEN_ENDE', i, SF.AUFKANT, 0, f);
            const u1 = []; for (let j = 0; j <= nb; j++) { const ph = b * (1 - j / nb); u1.push(lage(b2(ph), ph, sx, r)); }
            mantel(u1, 'BOGEN_ENDE', i, SF.AUFKANT, 0, f);
            const sm = max(0, min(steck, lc * 0.4)), tm = r * 1.12, gerade = (v, bis, rad, art, farbe) => zyl(add(q0, mul(d, v)), add(q0, mul(d, bis)), b, sx, rad, rad, art, i, farbe);
            if (sm > 0.5) { kragen(q0, add(q0, mul(d, sm)), b, sx, tm, i); gerade(sm, lc - sm, r, 'ROHR', SF.BLECH); kragen(add(q0, mul(d, lc - sm)), q1, b, sx, tm, i); }
            else gerade(0, lc, r, 'ROHR', SF.BLECH);
            masse.push(M(key, [x0, 0, top + 0], [x0 + sx * z.teil.m, 0, top], [0, 0, 1.2 * r], z.teil.m));
            p = b2(0); merke(p, 0, sx, r); sx = -sx; break;
          }
          case 'bogen': {
            const b = rad2(z.teil.w), rb = rbog(z.dn), b1 = ph => add(p, [sx * rb * (1 - cos(ph)), 0, -rb * sin(ph)]), o1 = [];
            for (let j = 0; j <= nb; j++) { const ph = b * j / nb; o1.push(lage(b1(ph), ph, sx, r)); }
            mantel(o1, 'BOGEN_ENDE', i, SF.AUFKANT, 0, f);
            p = b1(b); merke(p, b, sx, r);
            masse.push(M(key, add(p, [sx * r * 1.4, 0, r * 1.3]), null, [0, 0, 0], z.teil.w, '', '°', true)); break;
          }
          case 'abzweig': {
            const q = add(p, [0, 0, -max(len2, r * 2)]); zyl(p, q, 0, sx, r, r, 'BOGEN_ENDE', i, SF.AUFKANT);
            const w = rad2(z.teil.w), a0 = add(p, [0, 0, -(p[2] - q[2]) * 0.25]), sl = max(len2 * 0.9, r * 3), d2 = dir(w, -sx);
            zyl(a0, add(a0, mul(d2, sl)), w, -sx, r * 0.85, r * 0.85, 'BOGEN_ENDE', i, SF.AUFKANT);
            p = q; merke(p, 0, sx, r); break;
          }
          case 'reduktion': {
            const l2 = max(len2, r * 0.8), q = add(p, [0, 0, -l2]), r2 = tr(z.dnNach);
            zyl(p, q, 0, sx, r, r2, 'KEGEL', i, rgb(226, 128, 20));
            p = q; merke(p, 0, sx, r2); break;
          }
          case 'muffe': {
            const l2 = max(len2, r * 0.8), q = add(p, [0, 0, -l2]); kragen(p, q, 0, sx, r * 1.2, i); p = q; merke(p, 0, sx, r); break;
          }
          case 'schelle': {
            const hh = max(fr.e.hoehe * 0.006, r * 0.5); zyl(add(p, [0, 0, hh / 2]), add(p, [0, 0, -hh / 2]), 0, sx, r * 1.35, r * 1.35, 'BEIN', i, hex('#1F3354')); break;
          }
          default: {
            const l2 = max(len2, r * 0.8), q = add(p, [0, 0, -l2]); zyl(p, q, 0, sx, r * 1.05, r * 1.05, 'BEIN', i, hex('#3A5478')); p = q; merke(p, 0, sx, r * 1.05);
          }
        }
      });
      if (ersteRing) deckel(ersteRing, [0, 0, 1], 0, f);
      if (letzteRing) deckel(letzteRing, [0, 0, -1], zeilen.length, f);
      // nach oben verschieben: tiefster Punkt auf 0
      let zmin = Infinity; for (const fl of f) for (const q of fl.punkte) zmin = min(zmin, q[2]);
      const h = -zmin, sh = q => [q[0], q[1], q[2] + h];
      for (const fl of f) fl.punkte = fl.punkte.map(sh);
      for (const m of masse) { m.a = sh(m.a); if (m.b) m.b = sh(m.b); }
      let xmin = Infinity; for (const fl of f) for (const q of fl.punkte) xmin = min(xmin, q[0]);
      masse.unshift(M('h', [xmin - tr(dn0) * 1.5, 0, h], [xmin - tr(dn0) * 1.5, 0, 0], [-tr(dn0) * 1.2, 0, 0], fr.e.hoehe));
      return { szene: festeSzene(f, null), masse };
    }
    const rad2 = g => g * PI / 180;

    // Offene Profile (Halbkreis usw.) laengs eines Pfades: je zwei benachbarte Profile ergeben ein Band aus Vierecken
    function band(p0, p1, art, inst, farbe, ordnung, aus, beide) {
      for (let k = 0; k < p0.length - 1; k++) {
        const q = [p0[k], p0[k + 1], p1[k + 1], p1[k]];
        aus.push(WF(q, inst, art, false, null, true, farbe, ordnung, null));
        if (beide) aus.push(WF(q.slice().reverse(), inst, art, false, null, true, farbe, ordnung, null));   // beide Seiten sichtbar (Rueckseitenauswahl)
      }
    }

    // Mauerabdeckung: abgekantetes Blechprofil ueber einem Mauerkoerper, Tropfkanten, Stossstellen (Ueberlappung) und Dilatationen
    function mauer(m) {
      const e = m.e, L = e.laenge, kq = max(1, min(5, L / (5 * (e.mauerBreite + 2 * e.ueberstand)))), b = e.mauerBreite * kq, u = e.ueberstand * kq, sh = e.schenkel * kq, t = min(max(e.abkantung, 0) * kq, max(u - 1, 0)), f = [], masse = [];   // Querschnitt bei langen Mauern bis 5-fach ueberhoeht
      const tg = tan(e.gefaelle * PI / 180), dick = max(2, b * 0.012), hw = max(b * 0.8, 120), c = dick * 1.4;
      const yA = -b / 2 - u, yB = b / 2 + u, zA = c, zB = c + (yB - yA) * tg;
      const P = [[yA + t, zA - sh], [yA, zA - sh], [yA, zA], [yB, zB], [yB, zB - sh], [yB - t, zB - sh]];
      const versch = (Q, dist) => Q.map((q, i) => {
        const nrm = (a, b2) => { const dy = b2[0] - a[0], dz = b2[1] - a[1], l = Math.hypot(dy, dz) || 1; return [-dz / l, dy / l]; };
        const n1 = i > 0 ? nrm(Q[i - 1], q) : null, n2 = i < Q.length - 1 ? nrm(q, Q[i + 1]) : null;
        let nx = (n1 ? n1[0] : 0) + (n2 ? n2[0] : 0), nz2 = (n1 ? n1[1] : 0) + (n2 ? n2[1] : 0); const l = Math.hypot(nx, nz2) || 1;
        return [q[0] + nx / l * dist, q[1] + nz2 / l * dist];
      });
      const Pin = versch(P, -dick), Pout = versch(P, dick * 0.6);
      const at = (Q, x) => Q.map(q => [x, q[0], q[1]]);
      // Mauerkoerper
      const wf = rgb(214, 196, 170), wt = rgb(200, 182, 156), y0 = -b / 2, y1 = b / 2;
      flach([[0, y0, 0], [L, y0, 0], [L, y1, 0], [0, y1, 0]], 'WAND', 9, wt, -1, true, f);
      flach([[0, y0, -hw], [L, y0, -hw], [L, y0, 0], [0, y0, 0]], 'WAND', 9, wf, -1, true, f);
      flach([[0, y1, -hw], [L, y1, -hw], [L, y1, 0], [0, y1, 0]], 'WAND', 9, wf, -1, true, f);
      flach([[0, y0, -hw], [0, y1, -hw], [0, y1, 0], [0, y0, 0]], 'WAND', 9, wf, -1, true, f);
      flach([[L, y0, -hw], [L, y1, -hw], [L, y1, 0], [L, y0, 0]], 'WAND', 9, wf, -1, true, f);
      const n = max(1, m.stuecke), pl = e.stueckLaenge;
      for (let k = 0; k < n; k++) {
        const x0 = k * pl, x1 = k === n - 1 ? L : min(L, (k + 1) * pl), farbe = k % 2 === 0 ? rgb(150, 175, 205) : rgb(190, 208, 228);
        band(at(Pout, x0), at(Pout, x1), 'BOGEN_ENDE', k, farbe, 0, f, true);
        band(at(Pin, x0), at(Pin, x1), 'BOGEN_ENDE', k, hex('#8FA6C2'), 0, f, true);
        band(at(Pout, x0), at(Pin, x0), 'BOGEN_ENDE', k, farbe, 0, f, true);
        band(at(Pout, x1), at(Pin, x1), 'BOGEN_ENDE', k, farbe, 0, f, true);
      }
      const ov = max(b * 0.05, 12);
      const streifen = (x, br, farbe, inst) => { const a = versch(P, dick * 1.8 + dick * 0.6), xa = max(0, x - br / 2), xb = min(L, x + br / 2); band(at(a, xa), at(a, xb), 'BOGEN_MITTE', inst, farbe, 1, f, true); band(at(Pout, xa), at(a, xa), 'BOGEN_MITTE', inst, farbe, 1, f, true); band(at(Pout, xb), at(a, xb), 'BOGEN_MITTE', inst, farbe, 1, f, true); };
      for (let k = 1; k < n; k++) streifen(k * pl, ov, SF.UMSCHLAG, 20 + k);
      for (let k = 1; k <= m.dilatationen; k++) streifen(min(L, k * e.dilatationAbstand), ov * 1.8, rgb(226, 128, 20), 40 + k);
      const xe = L, zl = min(zA, zB) - sh;
      masse.push(M('l', [0, yA, zA - sh - hw * 0.0], [L, yA, zA - sh], [0, -b * 0.25, -hw * 0.12], L));
      masse.push(M('b', [xe, y0, -hw * 0.1], [xe, y1, -hw * 0.1], [0, 0, -hw * 0.2], e.mauerBreite));
      masse.push(M('u', [xe, yA, zl], [xe, y0, zl], [0, 0, -hw * 0.28], e.ueberstand));
      masse.push(M('s', [xe, yA, zA - sh], [xe, yA, zA], [0, -b * 0.22, 0], e.schenkel));
      if (e.abkantung > 0) masse.push(M('t', [xe, yA + t / 2, zA - sh], null, [0, 0, -hw * 0.06], e.abkantung, '', '', false));
      masse.push(M('g', [xe, 0, (zA + zB) / 2 + dick], null, [0, 0, hw * 0.1], e.gefaelle, '', '°', true));
      if (n > 1 || pl < L) masse.push(M('p', [0, yB, zB], [min(pl, L), yB, zB], [0, b * 0.18, hw * 0.1], min(pl, L)));
      return { szene: festeSzene(f, null), masse };
    }

    // Kehle: V-foermiges Kehlblech zwischen zwei Dachflaechen, Laenge, Kehlwinkel, Aufkantung, Stuecke mit Ueberlappung
    function kehle(k) {
      const e = k.e, L = e.laenge, f = [], masse = [];
      const sp0 = k.spannweite, kq = max(1, min(4, L / (5 * sp0))), sp = sp0 * kq, td = k.tiefe * kq, a = e.aufkantung * kq, dick = max(2, sp * 0.012);
      const nw = k.schenkelNeigung * PI / 180;
      const P = [[-sp / 2, td + a], [-sp / 2, td], [0, 0], [sp / 2, td], [sp / 2, td + a]];
      const nrm = (p1, p2) => { const dy = p2[0] - p1[0], dz = p2[1] - p1[1], l = Math.hypot(dy, dz) || 1; return [-dz / l, dy / l]; };
      const versch = (Q, dist) => Q.map((q, i) => {
        const n1 = i > 0 ? nrm(Q[i - 1], q) : null, n2 = i < Q.length - 1 ? nrm(q, Q[i + 1]) : null;
        const nx = (n1 ? n1[0] : 0) + (n2 ? n2[0] : 0), nz2 = (n1 ? n1[1] : 0) + (n2 ? n2[1] : 0), l = Math.hypot(nx, nz2) || 1;
        return [q[0] + nx / l * dist, q[1] + nz2 / l * dist];
      });
      const Pin = versch(P, -dick), at = (Q, x, dz) => Q.map(q => [x, q[0], q[1] + (dz || 0)]);
      // Dachflaechen links und rechts (unter dem Blech), ueber das Blech hinaus verlaengert
      const ex = sp * 0.5, rz = -dick * 1.6, roof = rgb(184, 108, 86), roof2 = rgb(170, 96, 76);
      const R = [[-sp / 2 - ex * cos(nw), td + ex * sin(nw) + rz], [0, rz], [sp / 2 + ex * cos(nw), td + ex * sin(nw) + rz]];
      band(at(R, -0), at(R, L), 'KEHLE', 90, roof, -1, f, true);
      const lens = k.stueckLaengen(), pitch = e.maxStueck - e.ueberlappung;
      lens.forEach((len, i) => {
        const x0 = i * pitch, x1 = min(L, x0 + len), lift = (i % 2) * dick * 1.8, farbe = i % 2 === 0 ? rgb(150, 175, 205) : rgb(190, 208, 228);
        band(at(P, x0, lift), at(P, x1, lift), 'BOGEN_ENDE', i, farbe, 0, f, true);
        band(at(Pin, x0, lift), at(Pin, x1, lift), 'BOGEN_ENDE', i, hex('#8FA6C2'), 0, f, true);
        band(at(P, x0, lift), at(Pin, x0, lift), 'BOGEN_ENDE', i, farbe, 0, f, true);
        band(at(P, x1, lift), at(Pin, x1, lift), 'BOGEN_ENDE', i, farbe, 0, f, true);
        if (i > 0) { const ov = e.ueberlappung, lp = [-sp / 2, td + a * 0.6]; const xa = x0, xb = min(L, x0 + ov); band(at(P, xa, lift), at(P, xb, lift), 'BOGEN_MITTE', 50 + i, SF.UMSCHLAG, 1, f, true); }
      });
      const xe = L, hoch = td + a;
      masse.push(M('l', [0, sp / 2 + ex * 0.2, td + a], [L, sp / 2 + ex * 0.2, td + a], [0, ex * 0.25, 0], L));
      masse.push(M('w', [xe, -sp / 4, td / 2], null, [0, 0, 0], e.abwicklung, 'Abw. ', '', false));
      if (e.aufkantung > 0) masse.push(M('a', [xe, sp / 2, td], [xe, sp / 2, td + a], [0, sp * 0.12, 0], e.aufkantung));
      masse.push(M('k', [xe, 0, -dick * 3 - td * 0.15], null, [0, 0, 0], e.kehlwinkel, '', '°', true));
      if (lens.length > 1) {
        masse.push(M('m', [0, -sp / 2 - ex * 0.2, hoch], [min(e.maxStueck, L), -sp / 2 - ex * 0.2, hoch], [0, -ex * 0.25, 0], e.maxStueck));
        masse.push(M('u', [pitch, -sp / 2 - ex * 0.2, hoch], [pitch + e.ueberlappung, -sp / 2 - ex * 0.2, hoch], [0, -ex * 0.25, ex * 0.3], e.ueberlappung));
      }
      return { szene: festeSzene(f, null), masse };
    }
    // Dachrinne: halbrunde Rinne, Laenge und Abwicklung echt, Querschnitt und Gefaelle fuer die Lesbarkeit ueberhoeht
    function dachrinne(rn) {
      const e = rn.e, L = e.laenge, abw = e.abwicklung, f = [], masse = [];
      const rReal = abw * 0.92 / PI, rd = max(rReal, L / 30), dick = max(1.5, rd * 0.05), hu = rn.hoehenunterschied;
      const dz = hu > 0 ? max(hu, L * 0.05) : 0, mitte = e.ablaufMitte;
      const zAt = x => mitte ? -dz * (1 - abs(x - L / 2) / (L / 2)) : -dz * (x / L);
      const N = 40, M2 = 18;
      const prof = (x, rr) => { const o = []; for (let j = 0; j <= M2; j++) { const th = PI * j / M2; o.push([x, rr * cos(th), zAt(x) - rr * sin(th)]); } return o; };
      const aus = [], inn = []; for (let i = 0; i <= N; i++) { const x = L * i / N; aus.push(prof(x, rd)); inn.push(prof(x, rd - dick)); }
      for (let i = 0; i < N; i++) { band(aus[i], aus[i + 1], 'BOGEN_ENDE', 0, SF.AUFKANT, 0, f); band(inn[i], inn[i + 1], 'ROHR', 0, hex('#9FBFE0'), 0, f); }
      for (const [a, b] of [[aus[0], inn[0]], [aus[N], inn[N]]]) band(a, b, 'BOGEN_ENDE', 0, SF.AUFKANT, 0, f);
      for (let i = 0; i < N; i++) for (const k of [0, M2]) f.push(WF([aus[i][k], aus[i + 1][k], inn[i + 1][k], inn[i][k]], 0, 'BOGEN_ENDE', false, null, false, SF.AUFKANT, 0, null));
      // Halter als Buegel unter der Rinne
      const bw = max(rd * 0.14, 6), zb = SF.UMSCHLAG;
      for (let i = 0; i < rn.halter; i++) {
        const x = rn.halter === 1 ? L / 2 : min(i * e.halterAbstand, L), xa = max(0, x - bw / 2), xb = min(L, x + bw / 2);
        const pa = prof(xa, rd * 1.015), pb = prof(xb, rd * 1.015), qa = prof(xa, rd * 1.1), qb = prof(xb, rd * 1.1);
        band(pa, pb, 'BOGEN_MITTE', 1, zb, 1, f); band(qa, qb, 'BOGEN_MITTE', 1, zb, 1, f); band(pa, qa, 'BOGEN_MITTE', 1, zb, 1, f); band(pb, qb, 'BOGEN_MITTE', 1, zb, 1, f);
      }
      // Ablaufstutzen am tiefsten Punkt (Ende oder Mitte)
      const xs = mitte ? L / 2 : L, rs = rd * 0.3, zs = zAt(xs) - rd + dick, lg = max(rd * 1.6, 60);
      const ex = [1, 0, 0], ey = [0, 1, 0];
      mantel([ring([xs, 0, zs], ex, ey, rs), ring([xs, 0, zs - lg], ex, ey, rs)], 'ROHR', 2, SF.BLECH, 0, f);
      // Masse
      const zmin = zAt(xs) - rd - lg;
      masse.push(M('l', [0, 0, zmin - rd * 0.2], [L, 0, zmin - rd * 0.2], [0, -rd * 0.4, 0], L));
      masse.push(M('w', [0, 0, zAt(0) - rd], null, [0, -rd * 0.2, -rd * 0.25], abw, 'Abw. ', '', false));
      masse.push(M('g', [L * (mitte ? 0.25 : 0.5), 0, zAt(L * (mitte ? 0.25 : 0.5)) + rd * 0.35], null, [0, 0, 0], e.gefaelle, '', ' mm/m', true));
      if (rn.halter > 1) masse.push(M('h', [0, rd * 1.2, zAt(0)], [min(e.halterAbstand, L), rd * 1.2, zAt(min(e.halterAbstand, L))], [0, 0, rd * 0.5], e.halterAbstand));
      return { szene: festeSzene(f, null), masse };
    }
    return { schwanenhals, dunstrohr, fallrohr, dachrinne, mauer, kehle };
  })();

  function festeSzene(liste, kamin) { return { kamin, flaechen: () => liste }; }

  // ================================================================ MenueSzenen.kt
  const MenueSzenen = (function () {
    const rechteck = (a, b, c, d, inst, art, auf) => WF([a, b, c, d], inst, art, auf);
    const platte = (x0, x1, y0, y1, i, art) => rechteck([x0, y0, 0], [x1, y0, 0], [x1, y1, 0], [x0, y1, 0], i, art, false);
    const wandX = (x0, x1, y, h, i, art) => rechteck([x0, y, 0], [x1, y, 0], [x1, y, h], [x0, y, h], i, art, true);
    const wandY = (x, y0, y1, h, i, art) => rechteck([x, y0, 0], [x, y1, 0], [x, y1, h], [x, y0, h], i, art, true);
    let _k, _d, _h;
    const kamin = () => {
      if (_k) return _k;
      const b = 25, t = 40, s = 10, aus = 25, h = 10, l = [], hi = 'HINTERTEIL', vo = 'VORDERTEIL';
      l.push(platte(-b - s, -b, 20.5, t + aus, 0, hi)); l.push(platte(b, b + s, 20.5, t + aus, 0, hi)); l.push(platte(-b, b, t, t + aus, 0, hi));
      l.push(wandX(-b, b, t, h, 0, hi)); l.push(wandY(-b, 20.5, t, h, 0, hi)); l.push(wandY(b, 20.5, t, h, 0, hi));
      l.push(platte(-b - s, -b, -aus, 19.5, 1, vo)); l.push(platte(b, b + s, -aus, 19.5, 1, vo)); l.push(platte(-b, b, -aus, 0, 1, vo));
      l.push(wandX(-b, b, 0, h, 1, vo)); l.push(wandY(-b, 0, 19.5, h, 1, vo)); l.push(wandY(b, 0, 19.5, h, 1, vo));
      return (_k = festeSzene(l, { breite: 2 * b, tiefe: t, hoehe: 32 }));
    };
    const dunst = () => _d || (_d = Skizzen3D.dunstrohr(100, 300, 30, 400, 400, 100, 15).szene);
    const hals = () => _h || (_h = Skizzen3D.schwanenhals(400, 72, 60, 50).szene);
    let _f;
    // Kachel Fallrohr (Nils 10.11.): Standardstrang mit Versatz, kuerzer als im Planer, damit er in der Kachel gross wirkt
    const fall = () => { if (_f) return _f; const FR = root.Fallrohr; if (!FR) return null;
      try { _f = Skizzen3D.fallrohr(FR.Fallrohr({ hoehe: 1800, steckung: 50, dn: 100, teile: FR.STANDARD() })).szene; } catch (e) { _f = null; }
      return _f; };
    // Kacheln Dachrinne, Mauerabdeckung, Kehle (Nils 10.11.): Modelle aus den Standardwerten der Seiten (neueteile.js DEFS), Laengen kuerzer fuer die Kachel
    const _n = {};
    const neu = id => { if (id in _n) return _n[id]; const K = root.Kern; let sz = null;
      try {
        if (id === 'dachrinne') sz = Skizzen3D.dachrinne(K.RinneSkizze({ laenge: 1200, abwicklung: 330, gefaelle: 5, halterAbstand: 700, dilatationAbstand: 5000, tafelBreite: 1000, ablaufMitte: false, verschnitt: 0.05, ablaeufe: 1, aussenEcken: 0, innenEcken: 0 }));
        else if (id === 'mauerabdeckung') sz = Skizzen3D.mauer(K.MauerSkizze({ mauerBreite: 250, laenge: 1500, ueberstand: 50, schenkel: 50, abkantung: 15, gefaelle: 5, ecken: 0, stueckLaenge: 3000, dilatationAbstand: 5000, verschnitt: 0.05, einhaengestreifen: false, haftenAbstand: 330 }));
        else if (id === 'kehle') sz = Skizzen3D.kehle(K.KehleSkizze({ laenge: 2000, abwicklung: 670, aufkantung: 15, maxStueck: 3000, ueberlappung: 100, kehlwinkel: 130, verschnitt: 0.05 }));
      } catch (e) { sz = null; }
      return (_n[id] = sz && sz.szene ? sz.szene : sz); };
    // Kacheln Rohrbogen, Hosenrohr, Reduktion (Rohr-Seiten) und Profil (Nils 10.11.): Modell aus den Beispielwerten der Seite
    const _r = {};
    const rohr = (id, art) => { if (id in _r) return _r[id]; let m = null; try { m = root.RohrMenueModell ? root.RohrMenueModell(art) : null; } catch (e) { m = null; } return (_r[id] = m); };
    // Profil: Querschnitt der Vorlage (Winkel 100/120/15 mm, 90 und 45 Grad) als Blech ueber die Laenge 1000 mm gezogen
    let _p;
    const profil = () => { if (_p !== undefined) return _p; _p = null; const P = root.S && root.S.Profil; if (!P) return null;
      try {
        const L = 1000, pk = P.punkte({ schenkel: [100, 120, 15], knicke: [{ oeffnung: 90, links: false }, { oeffnung: 45, links: true }] }), l = [];
        for (let i = 0; i + 1 < pk.length; i++) { const [x0, y0] = pk[i], [x1, y1] = pk[i + 1]; l.push(rechteck([x0, y0, 0], [x1, y1, 0], [x1, y1, L], [x0, y0, L], 0, 'PROFIL', true)); }
        if (l.length) _p = festeSzene(l, null);
      } catch (e) { _p = null; }
      return _p; };
    const fuer = id => id === 'skizze_kamin' ? kamin() : id === 'skizze_hals' ? hals() : id === 'skizze_dunst' ? dunst() : id === 'fallrohr' ? fall()
      : (id === 'dachrinne' || id === 'mauerabdeckung' || id === 'kehle') ? neu(id)
      : id === 'rohrbogen' ? rohr(id, 'rohrbogen') : id === 'hosenrohr' ? rohr(id, 'hosenrohr') : id === 'reduktion' ? rohr(id, 'reduktion')
      : (id === 'profil' || id === 'einlaufblech') ? profil() : null;
    return { kamin, dunst, hals, fall, neu, fuer };
  })();

  // ================================================================ Ansicht3D.kt (Zeichnen + Gesten)
  const ROT_FAKTOR = 0.011 * 2.8125;   // Android: 0,011 rad je Geraete-Pixel, Moto 2,8125 px je dp

  function farbeArt(t, blatt) {
    if (blatt) {
      switch (t) { case 'BOGEN_ENDE': return SF.AUFKANT; case 'BOGEN_MITTE': return SF.UMSCHLAG; case 'ROHR': return SF.STUTZEN; default: return SF.BLECH; }
    }
    switch (t) {
      case 'VORDERTEIL': return rgb(74, 144, 217); case 'SEITENTEIL': return rgb(240, 150, 50); case 'HINTERTEIL': return rgb(70, 170, 105);
      case 'SATTEL': return rgb(165, 110, 205); case 'KEHLE': return rgb(50, 175, 185); case 'BOGEN_ENDE': return rgb(74, 144, 217);
      case 'BOGEN_MITTE': return rgb(240, 150, 50); case 'ROHR': return rgb(70, 170, 105); case 'KEGEL': return rgb(165, 110, 205); case 'BEIN': return rgb(74, 144, 217);
      default: return rgb(150, 150, 150);
    }
  }
  const clamp255 = v => v < 0 ? 0 : v > 255 ? 255 : Math.trunc(v);
  function schattiere(basis, n) {
    const l = len(n);
    if (l < 1e-9) return basis;
    const licht = [-0.35, -0.55, 0.75], ll = len(licht);
    const k = abs(dot(n, licht)) / (l * ll), f = 0.58 + 0.42 * k;
    return rgb(clamp255(cR(basis) * f), clamp255(cG(basis) * f), clamp255(cB(basis) * f));
  }
  function glanz(basis, n, zumAuge, licht) {
    const nl = len(n), vl = len(zumAuge);
    if (nl < 1e-9 || vl < 1e-9) return basis;
    const nn = mul(n, 1 / nl), vv = mul(zumAuge, 1 / vl);
    const lam = dot(nn, licht) * 0.5 + 0.5;
    let f = 0.60 + 0.46 * lam;
    const rand = Math.pow(1 - min(1, max(0, abs(dot(nn, vv)))), 2.6);
    f *= 1 - 0.30 * rand;
    const hv = add(licht, vv), hl = len(hv);
    const spec = hl < 1e-9 ? 0 : Math.pow(min(1, max(0, dot(nn, mul(hv, 1 / hl)))), 26) * 0.55;
    const k = x => clamp255(x * f + (255 - x * f) * spec);
    return argb(cA(basis), k(cR(basis)), k(cG(basis)), k(cB(basis)));
  }

  class Ansicht3D {
    constructor(canvas) {
      this.canvas = canvas; this.ctx = canvas.getContext('2d');
      this.szene = null; this.regler = 1; this.masse3d = []; this.leuchteKey = null; this.veraltet = null; this.hinweis = null;
      this.wahl = null; this.leuchte = null; this.masseAn = false; this.etikett = () => ''; this.auseinander = 0; this.beiWahl = () => {}; this.blattFarben = false; this.grundYaw = 0.6; this.grundPitch = 0.55; this.grundZoom = 1; this.fuellend = false;
      this.kam = new Kamera(); this.pillenOrte = []; this.beiMass3d = () => {}; this.beiDrehen = () => {};
      this.liste = []; this.cacheZ = null; this.anim = null; this.alpha = 1;
      this.w = 0; this.h = 0; this.dpr = 1; this.warte = false;
      this._gesten();
    }
    setzeGroesse(w, h, dpr) {
      dpr = dpr || (root.devicePixelRatio || 1);
      if (this.w === w && this.h === h && this.dpr === dpr) return;
      this.w = w; this.h = h; this.dpr = dpr;
      this.canvas.width = Math.max(1, Math.round(w * dpr)); this.canvas.height = Math.max(1, Math.round(h * dpr));
      this.zeichnen();
    }
    grundstellung(yaw, pitch) { this._stopp(); this.grundYaw = yaw; this.grundPitch = pitch; this.kam.yaw = yaw; this.kam.pitch = pitch; this.kam.zoom = this.grundZoom; this.zeichnen(); }
    _stopp() { if (this.anim) { cancelAnimationFrame(this.anim); this.anim = null; } }
    voreinstellung(yaw, pitch) {
      this._stopp();
      const y0 = this.kam.yaw, p0 = this.kam.pitch, z0 = this.kam.zoom, t0 = performance.now();
      const schritt = now => {
        let t = min(1, (now - t0) / 280);
        const e = Math.cos((t + 1) * PI) / 2 + 0.5;   // AccelerateDecelerate
        this.kam.yaw = y0 + (yaw - y0) * e; this.kam.pitch = p0 + (pitch - p0) * e; this.kam.zoom = z0 + (1 - z0) * e;
        this.zeichnen();
        this.anim = t < 1 ? requestAnimationFrame(schritt) : null;
      };
      this.anim = requestAnimationFrame(schritt);
    }
    anfordern() { if (this.warte) return; this.warte = true; requestAnimationFrame(() => { this.warte = false; this.zeichnen(); }); }

    _gesten() {
      const c = this.canvas, ptr = new Map();
      let letzterTipp = null, start = null, bewegt = false, pinch0 = null;
      c.style.touchAction = 'pan-y';
      c.addEventListener('pointerdown', e => {
        if (this.interaktivAus) return;
        c.setPointerCapture(e.pointerId); ptr.set(e.pointerId, { x: e.clientX, y: e.clientY });
        if (ptr.size === 1) { start = { x: e.clientX, y: e.clientY, t: performance.now() }; bewegt = false; this._stopp(); }
        if (ptr.size === 2) { const [a, b] = [...ptr.values()]; pinch0 = Math.hypot(a.x - b.x, a.y - b.y); }
      });
      c.addEventListener('pointermove', e => {
        const p = ptr.get(e.pointerId); if (!p) return;
        if (ptr.size >= 2) {
          p.x = e.clientX; p.y = e.clientY;
          const [a, b] = [...ptr.values()], d = Math.hypot(a.x - b.x, a.y - b.y);
          if (pinch0 > 0) { this.kam.zoom = min(2.8, max(0.5, this.kam.zoom * d / pinch0));   /* 2.8 wie Android: ab 2.92 liegt das Auge in der Huelle, bei 3.5 bis 4 Ecken hinter der Kamera */ pinch0 = d; this.anfordern(); }
          bewegt = true; return;
        }
        const dx = p.x - e.clientX, dy = p.y - e.clientY;   // Android: vorherige minus neue Position
        p.x = e.clientX; p.y = e.clientY;
        if (!bewegt && Math.hypot(e.clientX - start.x, e.clientY - start.y) < 8) return;
        bewegt = true;
        this.kam.yaw += dx * ROT_FAKTOR;
        this.kam.pitch = min(1.5, max(0.05, this.kam.pitch - dy * ROT_FAKTOR));
        this.beiDrehen(); this.anfordern();
      });
      const ende = e => {
        if (!ptr.has(e.pointerId)) return;
        ptr.delete(e.pointerId); pinch0 = null;
        if (e.type === 'pointerup' && ptr.size === 0 && !bewegt && start) {
          const r = c.getBoundingClientRect(), x = e.clientX - r.left, y = e.clientY - r.top, jetzt = performance.now();
          if (letzterTipp && jetzt - letzterTipp.t < 300 && Math.hypot(x - letzterTipp.x, y - letzterTipp.y) < 100) { letzterTipp = null; this.voreinstellung(this.grundYaw, this.grundPitch); return; }
          letzterTipp = { x, y, t: jetzt };
          // Tippflaeche mindestens 44 x 44 px, bei mehreren Treffern gewinnt die Pille mit der naechsten Mitte
          let bestP = null, bestD = Infinity;
          for (const [rr, k] of this.pillenOrte) {
            const cx = (rr[0] + rr[2]) / 2, cy = (rr[1] + rr[3]) / 2, hw = Math.max((rr[2] - rr[0]) / 2, 22), hh = Math.max((rr[3] - rr[1]) / 2, 22);
            if (Math.abs(x - cx) <= hw && Math.abs(y - cy) <= hh) { const dd = Math.hypot(x - cx, y - cy); if (dd < bestD) { bestD = dd; bestP = [rr, k]; } }
          }
          if (bestP) { this.beiMass3d(bestP[1], bestP[0]); return; }
          this._wahlBei(x, y);
        }
      };
      c.addEventListener('pointerup', ende); c.addEventListener('pointercancel', ende);
    }

    projiziert(p) {
      const xs = new Float32Array(p.length), ys = new Float32Array(p.length), ts = new Array(p.length), tmp = [0, 0, 0];
      for (let i = 0; i < p.length; i++) { this.kam.projiziere(p[i], tmp); xs[i] = tmp[0]; ys[i] = tmp[1]; ts[i] = tmp[2]; }
      return [xs, ys, ts];
    }

    zeichnen() {
      const ctx = this.ctx, w = this.w, h = this.h;
      if (!w || !h) return;
      ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
      ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, w, h);
      ctx.lineJoin = 'round'; ctx.lineCap = 'round';
      const m = this.szene;
      if (!m) {
        this.liste = [];
        const teile = String(this.leerText || '').split('. ').map(t => t.trim().replace(/\.$/, '') + '.').filter(t => t.length > 1);
        ctx.fillStyle = '#000'; ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic';
        teile.forEach((z, i) => { let sz = 16; ctx.font = '700 ' + sz + 'px Roboto, sans-serif'; while (ctx.measureText(z).width > w - 24 && sz > 9) { sz -= 0.5; ctx.font = '700 ' + sz + 'px Roboto, sans-serif'; } ctx.fillText(z, w / 2, h / 2 + (i - (teile.length - 1) / 2) * 22 + sz * 0.35); });
        return;
      }
      const kam = this.kam, tmp = [0, 0, 0], regler = this.regler;
      const bleche = m.flaechen(regler, this.auseinander || 0), u = umhuellung(bleche), k = m.kamin;
      const mont = regler >= 0.5 ? min(1, max(0, (regler - 0.5) * 2)) : 0;
      let [x0, x1, y0, y1, z0, z1] = u;
      if (k) { z0 = min(0, z0); z1 = max(z1, 1); }
      if (k && mont > 0) { x0 = min(x0, -k.breite / 2); x1 = max(x1, k.breite / 2); y0 = min(y0, 0); y1 = max(y1, k.tiefe); z1 = max(z1, k.hoehe); }
      if (k && mont > 0) { x0 -= 20; x1 += 20; y0 -= 20; y1 += 20; }
      for (const ms of this.masse3d) {
        const qs = [ms.a]; if (ms.b) { qs.push(ms.b); qs.push(add(ms.b, ms.versatz)); } qs.push(add(ms.a, ms.versatz));
        for (const q of qs) { x0 = min(x0, q[0]); x1 = max(x1, q[0]); y0 = min(y0, q[1]); y1 = max(y1, q[1]); z0 = min(z0, q[2]); z1 = max(z1, q[2]); }
      }
      const cx = (x0 + x1) / 2, cy = (y0 + y1) / 2, cz = (z0 + z1) / 2, dx = x1 - x0, dy = y1 - y0, dz = z1 - z0;
      const rad = sqrt(dx * dx + dy * dy + dz * dz) / 2;
      kam.einrichten(cx, cy, cz, rad, w, h);
      // Flache Abwicklung: auf die Bildgroesse einpassen (Ansicht3D.kt onDraw)
      const flachGrad = 1 - mont;
      if (flachGrad > 0.001 && bleche.length) {
        const bb = () => { let a = Infinity, b = -Infinity, c = Infinity, e = -Infinity; for (const f of bleche) for (const q of f.punkte) { kam.projiziere(q, tmp); a = min(a, tmp[0]); b = max(b, tmp[0]); c = min(c, tmp[1]); e = max(e, tmp[1]); } return [a, b, c, e]; };
        let [minX, maxX, minY, maxY] = bb(); const bw = maxX - minX, bh = maxY - minY;
        if (bw > 1 && bh > 1) {
          const sk = min(max(min(w * 0.9 / bw, h * 0.7 / bh), 0.3), 6), se = 1 + (sk - 1) * flachGrad;
          kam.einrichten(cx, cy, cz, rad / se, w, h);
          [minX, maxX, minY, maxY] = bb();
          kam.offX = (w / 2 - (minX + maxX) / 2) * flachGrad; kam.offY = (h / 2 - (minY + maxY) / 2) * flachGrad;
        }
      }
      const auge = kam.auge();
      const aktivF = t => (this.wahl == null || this.wahl === t) && (this.leuchte == null || this.leuchte.has(t));
      const out = [], umriss = [];
      const blatt = this.blattFarben, d = 1;
      if (k && mont > 0) {
        const dach = [[x0, y0, -0.2], [x1, y0, -0.2], [x1, y1, -0.2], [x0, y1, -0.2]];
        const [xs, ys] = this.projiziert(dach), a = Math.trunc(mont * 255);
        ctx.fillStyle = css(argb(Math.trunc(a * 0.9), 238, 236, 230));
        ctx.beginPath(); ctx.moveTo(xs[0], ys[0]); for (let i = 1; i < 4; i++) ctx.lineTo(xs[i], ys[i]); ctx.closePath(); ctx.fill();
        ctx.lineWidth = 1.2 * d; ctx.strokeStyle = css(argb(Math.trunc(a * 0.5), 150, 150, 150)); ctx.stroke();
      }
      // Zerlegung (sichtunabhaengig) einmal je Szene und Regler
      const kaminFl = k && mont > 0 ? Tiefenordnung.kaminSeiten(k.breite, k.tiefe, k.hoehe).map(p => WF(p, -1, 'HINTERTEIL', false)) : [];
      const schluessel = bleche;
      let zalle;
      if (this.cacheZ && this.cacheZ.s === schluessel && this.cacheZ.km === (k && mont > 0)) zalle = this.cacheZ.z;
      else { zalle = m.einfach ? bleche : Tiefenordnung.zerlege(kaminFl.concat(bleche)); this.cacheZ = { s: schluessel, km: !!(k && mont > 0), z: zalle }; }
      const zbleche = zalle.filter(f => f.instanz >= 0), zkamin = zalle.filter(f => f.instanz < 0);
      if (k && mont > 0) {
        for (const kf of zkamin) {
          const s = kf.punkte, n = normale(s);
          if (dot(n, sub(auge, mitte(s))) <= 0) continue;
          const [xs, ys, ts] = this.projiziert(s);
          const basis = blatt ? SF.KAMIN : rgb(196, 140, 120), col = schattiere(basis, n);
          const aCol = argb(Math.trunc(mont * 235), cR(col), cG(col), cB(col));
          out.push({ xs, ys, tiefe: Math.max(...ts), farbe: aCol, teil: null, kamin: true, welt: s, ordnung: 0, glatt: false, fl: null, kanten: null });
        }
      }
      const vorn = new Array(zbleche.length).fill(false), lichtV = kam.licht();
      zbleche.forEach((f, nr) => {
        if (f.glatt) { const sicht = dot(normale(f.punkte), sub(auge, mitte(f.punkte))) > 0; vorn[nr] = sicht; if (!sicht) return; }
        const [xs, ys, ts] = this.projiziert(f.punkte);
        const basis = f.farbe !== 0 ? f.farbe : (blatt && f.aufkantung) ? SF.AUFKANT : farbeArt(f.art, blatt);
        let col = f.glatt ? glanz(basis, normale(f.punkte), sub(auge, mitte(f.punkte)), lichtV) : f.farbe !== 0 ? basis : schattiere(basis, normale(f.punkte));
        if (!aktivF(f.art)) col = argb(this.blassAlpha == null ? 70 : this.blassAlpha, cR(col), cG(col), cB(col));
        const tf = f.glatt ? ts.reduce((a, b) => a + b, 0) / ts.length : Math.min(...ts);
        out.push({ xs, ys, tiefe: tf, farbe: col, teil: f.art, kamin: false, welt: f.punkte, ordnung: f.ordnung, glatt: f.glatt, fl: f, kanten: f.kanten, nr });
      });
      const rf = m.einfach ? out.map((o, i) => i).sort((a, b) => (out[a].ordnung - out[b].ordnung) || (out[b].tiefe - out[a].tiefe) || (a - b))   // Rohrteile: Stand d7bb9ca (Ordnung, dann Tiefe)
        : Tiefenordnung.sortiere(out.map(o => ({ welt: o.welt, xs: o.xs, ys: o.ys, tiefe: o.tiefe, ordnung: o.ordnung, glatt: o.glatt })), auge);
      this.liste = rf.map(i => out[i]);
      const pfad = z => { ctx.beginPath(); ctx.moveTo(z.xs[0], z.ys[0]); for (let i = 1; i < z.xs.length; i++) ctx.lineTo(z.xs[i], z.ys[i]); ctx.closePath(); };
      for (const z of this.liste) {
        pfad(z);
        ctx.fillStyle = css(z.farbe); ctx.fill();
        const blassZ = z.teil != null && !aktivF(z.teil), gewZ = z.teil != null && (this.wahl === z.teil || (this.leuchte != null && this.leuchte.has(z.teil)));
        let lw = (gewZ ? 3.4 : z.kamin ? 1.6 : 2.4) * d;
        const fest = z.fl && z.fl.farbe !== 0;
        if (fest) lw = 1.5 * d;
        let rc;
        if (blassZ) rc = argb(60, 30, 30, 30); else if (fest) rc = SF.LINIE; else if (blatt && !z.kamin) rc = SF.LINIE; else if (z.kamin) rc = blatt ? argb(160, 90, 105, 130) : argb(Math.trunc(cA(z.farbe) * 0.7), 60, 40, 35); else rc = rgb(30, 30, 30);
        const kn = z.kanten, fz = z.fl;
        if (fz && fz.glatt) {
          ctx.lineWidth = 1.1 * d; ctx.strokeStyle = css(z.farbe); pfad(z); ctx.stroke();
          const nb = fz.nachbar;
          if (nb) for (let i = 0; i < nb.length; i++) {
            const o = nb[i]; if (o >= 0 && vorn[o]) continue;
            const j = (i + 1) % z.xs.length;
            umriss.push([z.xs[i], z.ys[i], z.xs[j], z.ys[j], blassZ ? 0 : 1]);
          }
        } else if (kn == null) {
          ctx.lineWidth = lw; ctx.strokeStyle = css(rc); pfad(z); ctx.stroke();
        } else {
          ctx.lineWidth = 1.2 * d; ctx.strokeStyle = css(z.farbe); pfad(z); ctx.stroke();
          ctx.lineWidth = (fz && fz.farbe !== 0) ? 1.7 * d : lw; ctx.strokeStyle = css(rc);
          for (let i = 0; i < kn.length; i++) { if (!kn[i]) continue; const j = (i + 1) % z.xs.length; ctx.beginPath(); ctx.moveTo(z.xs[i], z.ys[i]); ctx.lineTo(z.xs[j], z.ys[j]); ctx.stroke(); }
        }
      }
      ctx.lineWidth = 2 * d; ctx.strokeStyle = css(SF.LINIE);
      for (const l of umriss) { ctx.strokeStyle = css(l[4] === 0 ? argb(60, 30, 30, 30) : SF.LINIE); ctx.beginPath(); ctx.moveTo(l[0], l[1]); ctx.lineTo(l[2], l[3]); ctx.stroke(); }
      if (this.masseAn && !this.veraltet) this._masseAlt(m, bleche, aktivF);
      this.pillenOrte = [];
      if (this.masse3d.length && !this.veraltet) this._masse3d();
      if (this.veraltet) {
        ctx.fillStyle = 'rgba(255,255,255,0.47)'; ctx.fillRect(0, 0, w, h);
        this._unterzeile(this.veraltet, 24);
      }
      if (this.hinweis) this._unterzeile(this.hinweis, 16);
    }
    _masseAlt(m, bleche, aktivF) {
      const ctx = this.ctx, kam = this.kam, p = [0, 0, 0], d = 1, w = this.w, h = this.h;
      const sz = 12; ctx.font = '700 ' + sz + 'px Roboto, sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic';
      const hoehe = sz + 8 * d, belegt = [], flach = (this.regler >= 0.5 ? min(1, max(0, (this.regler - 0.5) * 2)) : 0) < 0.05;
      for (let i = 0; i < m.anzahl; i++) {
        if (!aktivF(m.art(i))) continue;
        const pts = []; for (const f of bleche) if (f.instanz === i) for (const q of f.punkte) pts.push(q);
        if (!pts.length) continue;
        const ziel = m.kamin ? bleche.filter(f => f.instanz === i).pop().punkte : pts;
        kam.projiziere(mitte(ziel), p);
        const t = m.kamin ? (this.beschriftung ? this.beschriftung(i) : '') : this.etikett(i); if (!t) continue;
        const bw = ctx.measureText(t).width + 10 * d, x = min(max(p[0], bw / 2), max(bw / 2, w - bw / 2)); let yM = p[1];
        if (flach) { let unten = -Infinity; for (const q of pts) { kam.projiziere(q, p); unten = max(unten, p[1]); } yM = unten + hoehe / 2 + 4 * d; }
        let r = [x - bw / 2, yM - hoehe / 2, x + bw / 2, yM + hoehe / 2]; const sch = (a, b) => a[0] < b[2] && b[0] < a[2] && a[1] < b[3] && b[1] < a[3];
        let versuch = 0;
        while (versuch < 14 && belegt.some(b => sch(b, r))) { versuch++; const zeile = hoehe + 2 * d, sc = flach ? versuch * zeile : Math.trunc((versuch + 1) / 2) * zeile * (versuch % 2 === 1 ? 1 : -1); r = [x - bw / 2, yM - hoehe / 2 + sc, x + bw / 2, yM + hoehe / 2 + sc]; }
        if (r[1] < 0) { r[3] -= r[1]; r[1] = 0; } if (r[3] > h) { r[1] -= r[3] - h; r[3] = h; }
        belegt.push(r);
        ctx.fillStyle = 'rgba(255,255,255,0.9216)'; ctx.strokeStyle = 'rgb(60,60,60)'; ctx.lineWidth = 1 * d;
        ctx.beginPath(); ctx.roundRect(r[0], r[1], r[2] - r[0], r[3] - r[1], 6 * d); ctx.fill(); ctx.stroke();
        ctx.fillStyle = '#000'; ctx.fillText(t, (r[0] + r[2]) / 2, (r[1] + r[3]) / 2 + sz * 0.35);
      }
    }
    _wahlBei(x, y) {
      for (let i = this.liste.length - 1; i >= 0; i--) {
        const z = this.liste[i]; if (z.kamin || z.teil == null) continue;
        let innen = false; for (let a = 0, b = z.xs.length - 1; a < z.xs.length; b = a++) if ((z.ys[a] > y) !== (z.ys[b] > y) && x < (z.xs[b] - z.xs[a]) * (y - z.ys[a]) / (z.ys[b] - z.ys[a]) + z.xs[a]) innen = !innen;
        if (innen) { this.beiWahl(this.wahl === z.teil ? null : z.teil); return; }
      }
      this.beiWahl(null);
    }
    _unterzeile(t, rand) {
      const ctx = this.ctx; let sz = 14;
      ctx.font = '700 ' + sz + 'px Roboto, sans-serif';
      while (ctx.measureText(t).width > this.w - rand && sz > 12) { sz -= 0.5; ctx.font = '700 ' + sz + 'px Roboto, sans-serif'; }
      // nie kleiner als 12 px: was dann noch nicht passt, kommt in zwei Zeilen (Mindestschrift am Handy)
      let zeilen = [t];
      if (ctx.measureText(t).width > this.w - rand) { const m = Math.floor(t.length / 2); let i = t.lastIndexOf(' ', m), j = t.indexOf(' ', m); if (i < 0 || (j >= 0 && m - i > j - m)) i = j; if (i > 0) zeilen = [t.slice(0, i), t.slice(i + 1)]; }
      ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic';
      zeilen.forEach((z, k) => { const y = this.h - 12 - (zeilen.length - 1 - k) * (sz + 3); ctx.lineWidth = 4; ctx.strokeStyle = '#fff'; ctx.strokeText(z, this.w / 2, y); ctx.fillStyle = '#000'; ctx.fillText(z, this.w / 2, y); });
    }
    _masse3d() {
      const ctx = this.ctx, kam = this.kam, p = [0, 0, 0], belegt = [], d = 1, w = this.w, h = this.h;
      const sz = 15, hoehe = sz + 14 * d;   // 12.11.: groessere Schrift und Pille (Handy, Tippflaeche)
      ctx.font = '700 ' + sz + 'px Roboto, sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic';
      const scr = v => { kam.projiziere(v, p); return [p[0], p[1]]; };
      const pillen = [];   // erst alle Pillen platzieren, dann gegenseitig auseinanderschieben (12.11.), dann zeichnen
      for (const ms of this.masse3d) {
        if (Number.isNaN(ms.wert)) {
          if (!ms.b) continue;
          const q0 = scr(ms.a), q1 = scr(ms.b);
          ctx.strokeStyle = css(SF.HILFE); ctx.lineWidth = 1 * d; ctx.setLineDash([6 * d, 4 * d]);
          ctx.beginPath(); ctx.moveTo(q0[0], q0[1]); ctx.lineTo(q1[0], q1[1]); ctx.stroke(); ctx.setLineDash([]);
          continue;
        }
        const an = ms.key === this.leuchteKey;
        const farbeL = an ? rgb(226, 110, 10) : ms.akzent ? SF.AKZENT_TEXT : SF.MASS;
        ctx.strokeStyle = css(farbeL);
        let mx, my;
        if (!ms.b) { const q = scr(ms.a); mx = q[0]; my = q[1]; }
        else {
          const a0 = scr(ms.a), b0 = scr(ms.b), a1 = scr(add(ms.a, ms.versatz)), b1 = scr(add(ms.b, ms.versatz));
          ctx.lineWidth = 1 * d;
          ctx.beginPath(); ctx.moveTo(a0[0], a0[1]); ctx.lineTo(a1[0], a1[1]); ctx.stroke();
          ctx.beginPath(); ctx.moveTo(b0[0], b0[1]); ctx.lineTo(b1[0], b1[1]); ctx.stroke();
          ctx.lineWidth = (an ? 2.4 : 1.5) * d;
          ctx.beginPath(); ctx.moveTo(a1[0], a1[1]); ctx.lineTo(b1[0], b1[1]); ctx.stroke();
          const dxl = b1[0] - a1[0], dyl = b1[1] - a1[1], ll = max(1, sqrt(dxl * dxl + dyl * dyl)), ux = dxl / ll, uy = dyl / ll, tk = 6 * d;
          for (const e of [a1, b1]) { ctx.beginPath(); ctx.moveTo(e[0] - (ux - uy) * tk, e[1] - (uy + ux) * tk); ctx.lineTo(e[0] + (ux - uy) * tk, e[1] + (uy + ux) * tk); ctx.stroke(); }
          mx = (a1[0] + b1[0]) / 2; my = (a1[1] + b1[1]) / 2;
        }
        const t = ms.vor + Ze.fmtTrim(ms.wert, 1) + ms.nach;
        const bw = ctx.measureText(t).width + 14 * d;
        const lo = bw / 2 + 2 * d, hi = max(lo, w - bw / 2 - 2 * d);
        const x = mx < lo ? lo : mx > hi ? hi : mx;
        let r = [x - bw / 2, my - hoehe / 2, x + bw / 2, my + hoehe / 2];
        const schneidet = (a, b) => a[0] < b[2] && b[0] < a[2] && a[1] < b[3] && b[1] < a[3];
        let versuch = 0;
        while (versuch < 14 && belegt.some(b => schneidet(b, r))) {
          versuch++;
          const sch = Math.trunc((versuch + 1) / 2) * (hoehe + 2 * d) * (versuch % 2 === 1 ? 1 : -1);
          r = [x - bw / 2, my - hoehe / 2 + sch, x + bw / 2, my + hoehe / 2 + sch];
        }
        // noch Ueberlappung: seitlich ausweichen (nach rechts oder links, dann wieder senkrecht suchen)
        for (const dx of [bw * 0.55, -bw * 0.55, bw * 1.1, -bw * 1.1]) {
          if (!belegt.some(b => schneidet(b, r))) break;
          for (let v2 = 0; v2 < 14; v2++) {
            const sch = Math.trunc((v2 + 1) / 2) * (hoehe + 2 * d) * (v2 % 2 === 1 ? 1 : -1);
            const x2 = Math.min(hi, Math.max(lo, x + dx));
            const r2 = [x2 - bw / 2, my - hoehe / 2 + sch, x2 + bw / 2, my + hoehe / 2 + sch];
            if (!belegt.some(b => schneidet(b, r2))) { r = r2; break; }
          }
        }
        if (r[1] < 2 * d) { const o = 2 * d - r[1]; r[1] += o; r[3] += o; }
        if (r[3] > h - 2 * d) { const o = h - 2 * d - r[3]; r[1] += o; r[3] += o; }
        belegt.push(r); pillen.push({ r, ms, an, farbeL, t, mx, my });
      }
      // Restliche Ueberlappungen (z. B. durch das Zurueckschieben in den Bildrand) aufloesen: je Paar entlang der kleineren Ueberdeckung auseinander
      const luft = 9 * d, lo2 = 2 * d;
      for (let durchgang = 0; durchgang < 120; durchgang++) {
        let bewegt = false;
        for (let i = 0; i < pillen.length; i++) for (let j = i + 1; j < pillen.length; j++) {
          const a = pillen[i].r, b = pillen[j].r;
          const ox = min(a[2], b[2]) - max(a[0], b[0]) + luft, oy = min(a[3], b[3]) - max(a[1], b[1]) + luft;
          if (ox <= 0 || oy <= 0) continue;
          bewegt = true;
          const schieb = (r, dx, dy) => { r[0] += dx; r[2] += dx; r[1] += dy; r[3] += dy; };
          if (oy <= ox) { const v = ((a[1] + a[3]) / 2 <= (b[1] + b[3]) / 2 ? -1 : 1) * oy / 2; schieb(a, 0, v); schieb(b, 0, -v); }
          else { const v = ((a[0] + a[2]) / 2 <= (b[0] + b[2]) / 2 ? -1 : 1) * ox / 2; schieb(a, v, 0); schieb(b, -v, 0); }
        }
        for (const q of pillen) {
          const r = q.r; let dx = 0, dy = 0;
          if (r[0] < lo2) dx = lo2 - r[0]; else if (r[2] > w - lo2) dx = w - lo2 - r[2];
          if (r[1] < lo2) dy = lo2 - r[1]; else if (r[3] > h - lo2) dy = h - lo2 - r[3];
          r[0] += dx; r[2] += dx; r[1] += dy; r[3] += dy;
        }
        if (!bewegt) break;
      }
      for (const { r, ms, an, farbeL, t, mx, my } of pillen) {
        this.pillenOrte.push([r, ms.key]);
        // weit vom Messpunkt weggeschoben: duenne Fuehrungslinie zum Messpunkt, damit klar bleibt, was die Pille misst
        const nx = min(max(mx, r[0]), r[2]), ny = min(max(my, r[1]), r[3]);
        if (Math.hypot(nx - mx, ny - my) > hoehe * 0.6) { ctx.strokeStyle = css(farbeL); ctx.lineWidth = 1 * d; ctx.beginPath(); ctx.moveTo(mx, my); ctx.lineTo(nx, ny); ctx.stroke(); }
        ctx.fillStyle = an ? css(rgb(255, 238, 214)) : css(argb(240, 255, 255, 255));
        ctx.strokeStyle = css(farbeL); ctx.lineWidth = (an ? 2 : 1.2) * d;
        ctx.beginPath(); ctx.roundRect(r[0], r[1], r[2] - r[0], r[3] - r[1], hoehe / 2); ctx.fill(); ctx.stroke();
        ctx.fillStyle = css(farbeL);
        ctx.fillText(t, (r[0] + r[2]) / 2, (r[1] + r[3]) / 2 + sz * 0.35);
      }
    }
  }

  root.Szene3D = { Kamera, Ansicht3D, Skizzen3D, MenueSzenen, Tiefenordnung, WF, umhuellung, add, sub, mul, dot, cross, norm, len, argb, rgb, css, SF, glanz, schattiere, ROT_FAKTOR };
  if (typeof module !== 'undefined') module.exports = root.Szene3D;
})(typeof window !== 'undefined' ? window : globalThis);
