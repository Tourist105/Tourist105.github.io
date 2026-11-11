/* Spengler-Web: Rohrarbeiten (Rohrbogen, Schwanenhals alt, Hosenrohr, Reduktion). Port von RohrActivity.kt, RohrSkizze.kt (RohrBild),
 * kern/Rohrmodell.kt, kern/Rohr.kt (Mantel, Lage), kern/RohrPruefung.kt. 3D ueber Szene3D.Ansicht3D (gleiche Mathematik wie Android). */
(function (root) {
  'use strict';
  const S = root.S, K = root.Kern, h = S.h, T = S.T, Ze = root.Ze, fmtTrim = Ze.fmtTrim, fmt = Ze.fmt, E = () => S.Einheit;
  const PI = Math.PI, cos = Math.cos, sin = Math.sin, min = Math.min, max = Math.max, sqrt = Math.sqrt, atan2 = Math.atan2;
  const WS = () => K.WERKSTOFFE;

  // ---------------------------------------------------------------- Mantel (Zylinderstueck, Kegelstumpf): Gitter, Rollen
  const RohrGeo = (function () {
    const quads = (m, spalten) => {
      if (m._quads) return m._quads;
      const out = [];
      if (m.lGross != null) {                       // Kegelstumpf
        const zeilen = 3, sp = 48, pt = (rho, psi) => [rho * sin(psi), rho * cos(psi)];
        for (let z = 0; z < zeilen; z++) {
          const r0 = m.lKlein + (m.lGross - m.lKlein) * z / zeilen, r1 = m.lKlein + (m.lGross - m.lKlein) * (z + 1) / zeilen;
          for (let i = 0; i < sp; i++) {
            const p0 = -m.sektor / 2 + m.sektor * i / sp, p1 = -m.sektor / 2 + m.sektor * (i + 1) / sp;
            out.push({ p: [pt(r0, p0), pt(r0, p1), pt(r1, p1), pt(r1, p0)], aussen: [z === 0, i === sp - 1, z === zeilen - 1, i === 0] });
          }
        }
      } else {
        const sp = spalten || 32, r = m.r;
        for (let i = 0; i < sp; i++) {
          const u0 = -PI * r + 2 * PI * r * i / sp, u1 = -PI * r + 2 * PI * r * (i + 1) / sp;
          out.push({ p: [[u0, m.unten(u0)], [u1, m.unten(u1)], [u1, m.oben(u1)], [u0, m.oben(u0)]], aussen: [true, i === sp - 1, true, i === 0] });
        }
      }
      m._quads = out; return out;
    };
    const rolle = (m, p, t) => {
      const tt = min(1, max(0, t));
      if (m.lGross != null) {
        const rho = Math.hypot(p[0], p[1]), psi = atan2(p[0], p[1]), kEnd = m.lGross / m.rg, k = 1 + (kEnd - 1) * tt, rr = rho / k, phi = psi * k, z = rho * sqrt(max(0, 1 - 1 / (k * k)));
        return [rr * sin(phi), rr * cos(phi), z];
      }
      if (tt < 1e-9) return [p[0], m.r, p[1]];
      const k = 2 * tt / m.d;
      return [sin(p[0] * k) / k, m.r - (1 - cos(p[0] * k)) / k, p[1]];
    };
    const flachMitte = m => {
      if (m.lGross != null) { const u = m.umriss(180), xs = u.map(q => q[0]), ys = u.map(q => q[1]); return [(min(...xs) + max(...xs)) / 2, (min(...ys) + max(...ys)) / 2]; }
      return [0, ((m.lc / 2 + m.r * m.tanOben) + (-m.lc / 2 - m.r * m.tanUnten)) / 2];
    };
    const Lage = (o, ex, ey, ez) => ({ o, ex, ey, ez, abbilden: p => [o[0] + ex[0] * p[0] + ey[0] * p[1] + ez[0] * p[2], o[1] + ex[1] * p[0] + ey[1] * p[1] + ez[1] * p[2], o[2] + ex[2] * p[0] + ey[2] * p[1] + ez[2] * p[2]] });

    // ---------- Rohrmodell
    const faltGrad = s => s >= 0.5 ? min(1, max(0, (s - 0.5) * 2)) : 0;
    const ortGrad = s => { if (s >= 0.5) return 0; const p = min(1, max(0, 1 - s / 0.5)); return p * p * (3 - 2 * p); };
    const AUSEIN_CM = 25, SPALT = 6, SEITE = [0, 1, 0];
    function Rohrmodell(teile) {
      let cache = null;
      return {
        kamin: null, einfach: true, anzahl: teile.length, teile, art: i => teile[i].art,
        flaechen(s, ausein) {
          if (cache && cache.s === s && cache.a === ausein) return cache.out;
          const t = faltGrad(s), ort = ortGrad(s), out = [];
          teile.forEach((teil, i) => {
            const k = ausein * AUSEIN_CM * (1 - ort), v = [teil.weg[0] * k, teil.weg[1] * k, teil.weg[2] * k], m = teil.mantel, mitte = flachMitte(m);
            for (const q of quads(m)) {
              const pts = q.p.map(p => {
                const mont = teil.lage.abbilden(rolle(m, p, ort > 0 ? 0 : t));
                let w = mont;
                if (ort > 0) { const fl = [teil.reiheX + (p[0] - mitte[0]), p[1] - mitte[1], 0]; w = [mont[0] + (fl[0] - mont[0]) * ort, mont[1] + (fl[1] - mont[1]) * ort, mont[2] + (fl[2] - mont[2]) * ort]; }
                return [w[0] + v[0], w[1] + v[1], w[2] + v[2]];
              });
              out.push(root.Szene3D.WF(pts, i, teil.art, false, q.aussen));
            }
          });
          cache = { s, a: ausein, out };
          return out;
        }
      };
    }
    const pfad = (p, a) => ({ p, a });
    const bogenAnfuegen = (b, pf, vz, out) => {
      for (let j = 0; j < b.n; j++) {
        const w = pf.a, d = [sin(w), 0, cos(w)], lc = b.mittellinie(j), mitte = [pf.p[0] + d[0] * lc / 2, pf.p[1] + d[1] * lc / 2, pf.p[2] + d[2] * lc / 2];
        const zentrum = [cos(w) * vz, 0, -sin(w) * vz], rueck = [-zentrum[0], -zentrum[1], -zentrum[2]];
        out.push({ art: b.istEnde(j) ? 'BOGEN_ENDE' : 'BOGEN_MITTE', mantel: b.stueck(j), lage: Lage(mitte, SEITE, rueck, d), weg: [0, 0, 0], reiheX: 0 });
        pf.p = [pf.p[0] + d[0] * lc, pf.p[1] + d[1] * lc, pf.p[2] + d[2] * lc];
        if (j < b.n - 1) pf.a += vz * 2 * b.alpha;
      }
    };
    const mitWeg = teile => {
      let c = [0, 0, 0]; for (const t of teile) c = [c[0] + t.lage.o[0], c[1] + t.lage.o[1], c[2] + t.lage.o[2]]; c = c.map(x => x / teile.length);
      return teile.map(t => { let w = [t.lage.o[0] - c[0], t.lage.o[1] - c[1], t.lage.o[2] - c[2]]; let l = Math.hypot(...w); if (l < 1e-6) { w = [0, 0, 1]; l = 1; } return { art: t.art, mantel: t.mantel, lage: t.lage, weg: w.map(x => x / l), reiheX: 0 }; });
    };
    const reihe = teile => {
      let total = -SPALT; for (const t of teile) total += t.mantel.breite + SPALT;
      let cursor = -total / 2; for (const t of teile) { t.reiheX = cursor + t.mantel.breite / 2; cursor += t.mantel.breite + SPALT; }
      return Rohrmodell(teile);
    };
    const modell = {
      bogen(b) { const l = []; bogenAnfuegen(b, pfad([0, 0, 0], 0), 1, l); return reihe(mitWeg(l)); },
      schwanenhals(s) {
        const l = [], pf = pfad([0, 0, s.hoehe], PI); bogenAnfuegen(s.bogen, pf, -1, l);
        const d = [sin(pf.a), 0, cos(pf.a)], lz = max(s.zwischen, 0), rueck = [cos(pf.a), 0, -sin(pf.a)];
        l.push({ art: 'ROHR', mantel: s.zwischenStueck(), lage: Lage([pf.p[0] + d[0] * lz / 2, pf.p[1] + d[1] * lz / 2, pf.p[2] + d[2] * lz / 2], SEITE, rueck, d), weg: [0, 0, 0], reiheX: 0 });
        pf.p = [pf.p[0] + d[0] * lz, pf.p[1] + d[1] * lz, pf.p[2] + d[2] * lz]; bogenAnfuegen(s.bogen, pf, 1, l);
        return reihe(mitWeg(l));
      },
      hosenrohr(hr) {
        const b = hr.beta, x0 = hr.d / 2 / cos(b), l = [];
        for (const vz of [1, -1]) {
          const d = [sin(b) * vz, 0, cos(b)], rueck = [-cos(b) * vz, 0, sin(b)], start = [x0 * vz, 0, 0];
          l.push({ art: 'BEIN', mantel: hr.stueck(), lage: Lage([start[0] + d[0] * hr.bein / 2, start[1], start[2] + d[2] * hr.bein / 2], SEITE, rueck, d), weg: [0, 0, 0], reiheX: 0 });
        }
        return reihe(mitWeg(l));
      },
      reduktion(k) {
        const zSpitze = -k.lKlein * cos(k.beta);
        return reihe([{ art: 'KEGEL', mantel: k, lage: Lage([0, 0, zSpitze], [1, 0, 0], [0, 1, 0], [0, 0, 1]), weg: [0, 0, 1], reiheX: 0 }]);
      }
    };
    return { quads, rolle, flachMitte, Lage, modell, faltGrad };
  })();
  root.RohrGeo = RohrGeo;

  // ---------------------------------------------------------------- RohrBild (Seitenansicht mit Massen, RohrSkizze.kt)
  class RohrBild {
    constructor() { this.art = 'rohrbogen'; this.modell = null; this.bogen = null; this.hals = null; this.kegel = null; this.hose = null; this.einheit = 1; this.belegt = []; }
    profile() {
      const m = this.modell;
      if (m && this.art !== 'reduktion') {
        return m.teile.map(t => {
          const z = t.mantel, r = z.r, pt = (u, oben) => t.lage.abbilden(RohrGeo.rolle(z, [u, oben ? z.oben(u) : z.unten(u)], 1));
          const a = pt(0, false), b = pt(0, true), c = pt(PI * r, true), d = pt(PI * r, false);
          return { x: [a[0], b[0], c[0], d[0]], z: [a[2], b[2], c[2], d[2]] };
        });
      }
      const k = this.kegel; if (!k) return [];
      return [{ x: [-k.rk, -k.rg, k.rg, k.rk], z: [0, k.h, k.h, 0] }];
    }
    grenzen() {
      const p = this.profile(); if (!p.length) return null;
      let x0 = Infinity, x1 = -Infinity, z0 = Infinity, z1 = -Infinity;
      for (const q of p) for (let i = 0; i < 4; i++) { x0 = min(x0, q.x[i]); x1 = max(x1, q.x[i]); z0 = min(z0, q.z[i]); z1 = max(z1, q.z[i]); }
      return [x0, x1, z0, z1];
    }
    verhaeltnis() {
      const g = this.grenzen(); if (!g) return 0.8;
      const rand = 0.27 * max(g[1] - g[0], g[3] - g[2]);
      return min(1.5, max(0.6, (g[3] - g[2] + 2 * rand) / (g[1] - g[0] + 2 * rand)));
    }
    e(cm) { return E().text(this.einheit, cm); }
    zeichne(ctx, breite, hoehe, d) {
      const g = this.grenzen(); if (!g) return;
      this.d = d; const rand = 0.27 * max(g[1] - g[0], g[3] - g[2]), w = g[1] - g[0] + 2 * rand, hh = g[3] - g[2] + 2 * rand, oben = 22 * d;
      const sk = Math.fround(min(breite / w, (hoehe - oben) / hh));
      this.sk = sk; this.ox = (breite - (g[1] - g[0]) * sk) / 2 - g[0] * sk; this.oz = oben + (hoehe - oben + (g[3] - g[2]) * sk) / 2 + g[2] * sk;
      this.ctx = ctx; this.belegt = [];
      ctx.lineCap = 'butt'; ctx.lineJoin = 'round';
      const prof = this.profile();
      for (const p of prof) {
        ctx.beginPath(); ctx.moveTo(this.sx(p.x[0]), this.sz(p.z[0])); for (let i = 1; i < 4; i++) ctx.lineTo(this.sx(p.x[i]), this.sz(p.z[i])); ctx.closePath();
        ctx.fillStyle = 'rgb(234,241,250)'; ctx.fill(); ctx.strokeStyle = 'rgb(11,92,171)'; ctx.lineWidth = 2.2 * d; ctx.stroke();
      }
      ctx.strokeStyle = 'rgb(11,92,171)'; ctx.lineWidth = 1.2 * d;
      for (let j = 0; j < prof.length - 1; j++) { ctx.beginPath(); ctx.moveTo(this.sx(prof[j].x[1]), this.sz(prof[j].z[1])); ctx.lineTo(this.sx(prof[j].x[2]), this.sz(prof[j].z[2])); ctx.stroke(); }
      if (this.art === 'rohrbogen') this.bogenMasse(prof); else if (this.art === 'schwanenhals') this.halsMasse(prof); else if (this.art === 'reduktion') this.kegelMasse(); else this.hoseMasse(prof);
    }
    sx(x) { return this.ox + Math.fround(x * this.sk); } sz(z) { return this.oz - Math.fround(z * this.sk); }
    achseStift() { const c = this.ctx; c.strokeStyle = 'rgb(136,136,136)'; c.lineWidth = 1.2 * this.d; c.setLineDash([7 * this.d, 5 * this.d]); }
    linie(x1, y1, x2, y2) { const c = this.ctx; c.beginPath(); c.moveTo(x1, y1); c.lineTo(x2, y2); c.stroke(); }
    achse(x1, y1, x2, y2) { const c = this.ctx; c.save(); this.achseStift(); this.linie(x1, y1, x2, y2); c.setLineDash([]); c.restore(); }
    massStift() { const c = this.ctx; c.strokeStyle = 'rgb(176,48,32)'; c.lineWidth = 1.3 * this.d; c.setLineDash([]); }
    beschrifte(t, x, y, ausweichen) {
      const c = this.ctx, d = this.d; if (ausweichen === undefined) ausweichen = true;
      c.font = '700 ' + 12 * d + 'px Roboto, sans-serif'; c.textAlign = 'center'; c.textBaseline = 'alphabetic';
      let yy = y;
      if (ausweichen) {
        const w = c.measureText(t).width, hh = 12 * d; let r = [x - w / 2, yy - hh, x + w / 2, yy + hh * 0.25], n = 0;
        const sch = (a, b) => a[0] < b[2] && b[0] < a[2] && a[1] < b[3] && b[1] < a[3];
        while (n < 8 && this.belegt.some(b => sch(b, r))) { n++; const dd = Math.trunc((n + 1) / 2) * hh * 1.05 * (n % 2 === 1 ? 1 : -1); r = [x - w / 2, y + dd - hh, x + w / 2, y + dd + hh * 0.25]; yy = y + dd; }
        this.belegt.push(r);
      }
      c.lineJoin = 'round'; c.lineWidth = 3.5 * d; c.strokeStyle = '#fff'; c.strokeText(t, x, yy); c.fillStyle = 'rgb(176,48,32)'; c.fillText(t, x, yy);
    }
    pfeil(x1, y1, x2, y2) {
      const c = this.ctx; this.massStift(); this.linie(x1, y1, x2, y2);
      const l = Math.hypot(x2 - x1, y2 - y1); if (l < 1) return; const ux = (x2 - x1) / l, uy = (y2 - y1) / l, k = 7 * this.d;
      const spitze = (px, py, ri) => { for (const w of [0.43, -0.43]) { const cw = cos(w), sw = sin(w), dx = (ux * cw - uy * sw) * ri, dy = (ux * sw + uy * cw) * ri; this.linie(px, py, px + dx * k, py + dy * k); } };
      spitze(x1, y1, 1); spitze(x2, y2, -1);
    }
    waagrecht(x1, x2, y, yR1, yR2, t) {
      const sg = v => v >= 0 ? 1 : -1, d = this.d; this.massStift();
      this.linie(x1, yR1, x1, y + 3 * d * sg(y - yR1)); this.linie(x2, yR2, x2, y + 3 * d * sg(y - yR2));
      this.pfeil(x1, y, x2, y); this.beschrifte(t, (x1 + x2) / 2, y - 4 * d);
    }
    senkrecht(z1, z2, x, xRef, t) {
      const sg = v => v >= 0 ? 1 : -1, d = this.d, c = this.ctx; this.massStift();
      this.linie(xRef, z1, x + 3 * d * sg(x - xRef), z1); this.linie(xRef, z2, x + 3 * d * sg(x - xRef), z2);
      this.pfeil(x, z1, x, z2);
      c.save(); const px = x - 5 * d, py = (z1 + z2) / 2; c.translate(px, py); c.rotate(-PI / 2); c.translate(-px, -py);
      this.beschrifte(t, px, py, false); c.restore();
    }
    bogenMasse(prof) {
      const b = this.bogen; if (!b) return; const d = this.d, e = x => this.e(x);
      const mx = this.sx(b.radius), mz = this.sz(0);
      this.achse(mx, mz, this.sx(0), this.sz(0));
      const ex = b.radius * (1 - cos(b.winkelGrad * PI / 180)), ez = b.radius * sin(b.winkelGrad * PI / 180);
      this.achse(mx, mz, this.sx(ex), this.sz(ez));
      this.beschrifte('R ' + e(b.radius), (mx + this.sx(0)) / 2, mz + 16 * d);
      this.beschrifte(fmtTrim(b.winkelGrad, 1) + '°', mx - 10 * d, mz - 14 * d);
      const p0 = prof[0], y = this.sz(min(p0.z[0], p0.z[3])) + 18 * d;
      this.waagrecht(this.sx(min(p0.x[0], p0.x[3])), this.sx(max(p0.x[0], p0.x[3])), y, this.sz(p0.z[0]), this.sz(p0.z[3]), 'Ø ' + e(b.d));
      const richt = p => ((p.x[0] + p.x[1]) / 2 >= (p.x[2] + p.x[3]) / 2) ? 1 : -1;
      if (b.n > 2) {
        const p = prof[1], s = b.stueck(1), mxp = (p.x[0] + p.x[1]) / 2, mzp = (p.z[0] + p.z[1]) / 2;
        this.beschrifte('a ' + e(s.rueckenLaenge), this.sx(mxp) + 24 * d * richt(p), this.sz(mzp));
        const bx = (p.x[3] + p.x[2]) / 2, bz = (p.z[3] + p.z[2]) / 2;
        this.beschrifte('b ' + e(s.bauchLaenge), this.sx(bx) - 24 * d * richt(p), this.sz(bz));
      } else {
        const s = b.stueck(0); this.beschrifte('a ' + e(s.rueckenLaenge) + '  b ' + e(s.bauchLaenge), this.sx(prof[0].x[0]), this.sz(prof[0].z[1]) - 8 * d);
      }
    }
    halsMasse(prof) {
      const s = this.hals; if (!s) return; const d = this.d, e = x => this.e(x), c = this.ctx, a = s.ausladung, hh = s.hoehe;
      this.achse(this.sx(0), this.sz(hh) - 14 * d, this.sx(0), this.sz(hh * 0.55)); this.achse(this.sx(a), this.sz(hh * 0.45), this.sx(a), this.sz(0) + 14 * d);
      const yA = this.sz(hh * 0.5); this.pfeil(this.sx(0), yA, this.sx(a), yA); this.beschrifte('A ' + e(a), this.sx(a / 2), yA + 16 * d);
      const xl = this.sx(min(min(...prof.map(p => min(...p.x))), 0)) - 18 * d;
      this.senkrecht(this.sz(0), this.sz(hh), xl, this.sx(0) - 2 * d, 'H ' + e(hh));
      const zw = prof[s.bogen.n], ax = this.sx(zw.x[0]), az = this.sz(zw.z[0]), dxp = this.sx(zw.x[3]), dzp = this.sz(zw.z[3]);
      let nx = dxp - ax, nz = dzp - az; const breiteBild = max(Math.hypot(nx, nz), 1); nx /= breiteBild; nz /= breiteBild; if (nx < 0) { nx = -nx; nz = -nz; }
      const t1 = 'γ ' + fmtTrim(s.gammaGrad, 1) + '°', t2 = 'Lz ' + e(s.zwischen);
      c.font = '700 ' + 12 * d + 'px Roboto, sans-serif'; const tb = max(c.measureText(t1).width, c.measureText(t2).width);
      const unten = [(ax + dxp) / 2, (az + dzp) / 2], oben2 = [(this.sx(zw.x[1]) + this.sx(zw.x[2])) / 2, (this.sz(zw.z[1]) + this.sz(zw.z[2])) / 2];
      const hoch = oben2[1] < unten[1] ? oben2 : unten, tief = oben2[1] < unten[1] ? unten : oben2;
      const cxm = hoch[0] + 0.3 * (tief[0] - hoch[0]), czm = hoch[1] + 0.3 * (tief[1] - hoch[1]), abstand = breiteBild / 2 + 8 * d + tb / 2;
      const lx = cxm + nx * abstand + 4 * d, lz = czm + nz * abstand;
      this.beschrifte(t1, lx, lz - 3 * d); this.beschrifte(t2, lx, lz + 13 * d);
      const p0 = prof[0], yD = this.sz(max(p0.z[0], p0.z[3])) - 20 * d;
      this.waagrecht(this.sx(min(p0.x[0], p0.x[3])), this.sx(max(p0.x[0], p0.x[3])), yD, this.sz(p0.z[0]), this.sz(p0.z[3]), 'Ø ' + e(s.d));
      const bg = prof[1]; this.beschrifte('R ' + e(s.bogen.radius), this.sx((bg.x[2] + bg.x[3]) / 2) + 34 * d, this.sz((bg.z[2] + bg.z[3]) / 2));
    }
    hoseMasse(prof) {
      const hr = this.hose; if (!hr || prof.length < 2) return; const d = this.d, e = x => this.e(x), nx = this.sx(0), nz = this.sz(0);
      this.achse(nx, nz + 8 * d, nx, nz - 26 * d);
      this.beschrifte('α ' + fmtTrim(hr.winkelGrad, 1) + '°', nx, nz - 34 * d);
      const p = prof.reduce((a, q) => (q.x[0] + q.x[3]) > (a.x[0] + a.x[3]) ? q : a), yD = this.sz(max(p.z[1], p.z[2])) - 20 * d;
      this.waagrecht(this.sx(min(p.x[1], p.x[2])), this.sx(max(p.x[1], p.x[2])), yD, this.sz(p.z[1]), this.sz(p.z[2]), 'Ø ' + e(hr.d));
      const q = prof.reduce((a, r) => (r.x[0] + r.x[3]) < (a.x[0] + a.x[3]) ? r : a), s = hr.stueck();
      this.beschrifte('L ' + e(hr.bein), this.sx((q.x[0] + q.x[1]) / 2) - 36 * d, this.sz((q.z[0] + q.z[1]) / 2));
      this.beschrifte('a ' + e(s.rueckenLaenge) + '  b ' + e(s.bauchLaenge), this.sx(0), this.sz(0) + 20 * d);
    }
    kegelMasse() {
      const k = this.kegel; if (!k) return; const d = this.d, e = x => this.e(x);
      this.waagrecht(this.sx(-k.rg), this.sx(k.rg), this.sz(k.h) - 12 * d, this.sz(k.h), this.sz(k.h), 'D1 ' + e(k.d1));
      this.waagrecht(this.sx(-k.rk), this.sx(k.rk), this.sz(0) + 22 * d, this.sz(0), this.sz(0), 'D2 ' + e(k.d2));
      this.senkrecht(this.sz(0), this.sz(k.h), this.sx(-k.rg) - 22 * d, this.sx(-k.rk) - 2 * d, 'h ' + e(k.h));
      this.achse(this.sx(0), this.sz(k.h) - 6 * d, this.sx(0), this.sz(0) + 6 * d);
    }
  }
  root.RohrBild = RohrBild;

  // ---------------------------------------------------------------- RohrPruefung (Felder einzeln)
  const LAENGENFELDER = ['d', 'd1', 'd2', 'r', 'a', 'l', 'h', 'z', 'g_tb', 'g_tl'];
  const PFLICHT = { rohrbogen: ['d', 'r', 'w', 'n'], 'schwanenhals-alt': ['d', 'a', 'g', 'r', 'n'], hosenrohr: ['d', 'w', 'l'], reduktion: ['d1', 'd2', 'h'] };
  const parse = s => { const v = parseFloat(String(s == null ? '' : s).trim().replace(',', '.')); return /^[-+]?(\d+\.?\d*|\.\d+)$/.test(String(s == null ? '' : s).trim().replace(',', '.')) && isFinite(v) ? v : null; };
  function pruefeFelder(art, roh, zuCm) {
    const out = {}, cm = {}, zahl = {};
    const pflicht = (k, ganz) => {
      const t = roh[k] == null ? '' : roh[k]; if (String(t).trim() === '') { out[k] = { g: 'LEER' }; return; }
      const v = parse(t); if (v == null) { out[k] = { g: 'KEINE_ZAHL' }; return; }
      if (v < 0) { out[k] = { g: 'NEGATIV' }; return; } if (v === 0) { out[k] = { g: 'NICHT_POSITIV' }; return; }
      if (ganz && Math.abs(v - Math.round(v)) > 1e-9) { out[k] = { g: 'NICHT_GANZ' }; return; }
      if (LAENGENFELDER.includes(k)) { const c = zuCm(v), mx = (k === 'd' || k === 'd1' || k === 'd2') ? 100 : 1000; if (c > mx + 1e-9) { out[k] = { g: 'ZU_GROSS', grenze: mx }; return; } cm[k] = c; }
      zahl[k] = v;
    };
    for (const k of PFLICHT[art]) pflicht(k, k === 'n');
    if (roh.z != null && String(roh.z).trim() !== '') { const v = parse(roh.z); if (v == null) out.z = { g: 'KEINE_ZAHL' }; else if (v < 0) out.z = { g: 'NEGATIV' }; else if (zuCm(v) > 10 + 1e-9) out.z = { g: 'ZU_GROSS', grenze: 10 }; }
    pflicht('g_tb'); pflicht('g_tl');
    if (roh.g_vsp != null && String(roh.g_vsp).trim() !== '') { const v = parse(roh.g_vsp); if (v == null) out.g_vsp = { g: 'KEINE_ZAHL' }; else if (v < 0) out.g_vsp = { g: 'NEGATIV' }; else if (v > 100) out.g_vsp = { g: 'VERSCHNITT_ZU_GROSS', grenze: 100 }; }
    const z = roh.z != null && parse(roh.z) != null ? zuCm(parse(roh.z)) : 0, hat = (...ks) => ks.every(k => k in zahl && !(k in out));
    if (art === 'rohrbogen' && hat('d', 'r', 'w', 'n')) {
      const f = K.pruefeBogen(cm.d, cm.r, zahl.w, Math.trunc(zahl.n));
      if (f === 'RADIUS_ZU_KLEIN') out.r = { g: 'RADIUS_ZU_KLEIN', grenze: cm.d / 2 }; else if (f === 'WINKEL') out.w = { g: 'WINKEL_BOGEN' }; else if (f === 'SEGMENTE') out.n = { g: 'SEGMENTE' };
    } else if (art === 'schwanenhals-alt' && hat('d', 'a', 'g', 'r', 'n')) {
      const s = K.RohrSchwanenhals(cm.d, cm.a, zahl.g, cm.r, Math.trunc(zahl.n), z), f = s.fehler();
      if (f === 'RADIUS_ZU_KLEIN') out.r = { g: 'RADIUS_ZU_KLEIN', grenze: cm.d / 2 }; else if (f === 'WINKEL') out.g = { g: 'WINKEL_HALS' }; else if (f === 'SEGMENTE') out.n = { g: 'SEGMENTE' }; else if (f === 'AUSLADUNG_ZU_KLEIN') out.a = { g: 'AUSLADUNG_ZU_KLEIN', grenze: s.minAusladung };
    } else if (art === 'hosenrohr' && hat('d', 'w', 'l')) {
      const f = K.pruefeHose(cm.d, zahl.w, cm.l);
      if (f === 'WINKEL_HOSE') out.w = { g: 'WINKEL_HOSE' }; else if (f === 'BEIN_ZU_KURZ') out.l = { g: 'BEIN_ZU_KURZ', grenze: cm.d / 2 * Math.tan(zahl.w / 2 * PI / 180) };
    } else if (art === 'reduktion' && hat('d1', 'd2', 'h')) {
      if (K.pruefeKegel(cm.d1, cm.d2, cm.h) === 'KEGEL_GLEICH') out.d2 = { g: 'KEGEL_GLEICH' };
    }
    return out;
  }
  const teileZuFeld = (art, k) => art === 'rohrbogen' ? (k === 'n' ? new Set(['BOGEN_MITTE', 'BOGEN_ENDE']) : null) : art === 'schwanenhals-alt' ? (k === 'a' ? new Set(['ROHR']) : (k === 'r' || k === 'n') ? new Set(['BOGEN_MITTE', 'BOGEN_ENDE']) : null) : null;

  S.TP = (k, n, ...a) => { const o = root.TEXTE[S.sprache()][k] || root.TEXTE.de[k]; return String(n === 1 ? o.one : o.other).replace(/%(\d+)\$[sd]/g, (m, i) => { const v = a[i - 1]; return v == null ? '' : String(v); }); };
  const TEILNAME = { BOGEN_ENDE: 't_bogen_ende', BOGEN_MITTE: 't_bogen_mitte', ROHR: 't_rohr', BEIN: 't_bein', KEGEL: 't_kegel' };
  const teilName = a => T(TEILNAME[a]);
  S.teilNameRohr = teilName;

  // ---------------------------------------------------------------- Seite
  const FELDER = {
    rohrbogen: [['d', 'r_d', 'L', '100'], ['r', 'r_radius', 'L', '150'], ['w', 'r_winkel_bogen', 'G', '90'], ['n', 'r_n_bogen', 'A', '4'], ['z', 'r_zugabe', 'L', '0']],
    'schwanenhals-alt': [['d', 'r_d', 'L', '100'], ['a', 'r_ausladung', 'L', '300'], ['g', 'r_gamma', 'G', '45'], ['r', 'r_radius', 'L', '150'], ['n', 'r_n_hals', 'A', '3'], ['z', 'r_zugabe', 'L', '0']],
    hosenrohr: [['d', 'r_d', 'L', '100'], ['w', 'r_winkel_hose', 'G', '60'], ['l', 'r_bein', 'L', '300'], ['z', 'r_zugabe', 'L', '0']],
    reduktion: [['d1', 'r_d1', 'L', '120'], ['d2', 'r_d2', 'L', '100'], ['h', 'r_h', 'L', '100'], ['z', 'r_zugabe', 'L', '0']]
  };
  const TITEL = { rohrbogen: 'titel_rohrbogen', 'schwanenhals-alt': 'titel_schwanenhals', hosenrohr: 'titel_hosenrohr', reduktion: 'titel_reduktion' };
  const ART = { rohrbogen: 'rohrbogen', 'schwanenhals-alt': 'schwanenhals', hosenrohr: 'hosenrohr', reduktion: 'reduktion' };
  const datumHeute = () => { const d = new Date(), p = n => String(n).padStart(2, '0'); return p(d.getDate()) + '.' + p(d.getMonth() + 1) + '.' + d.getFullYear(); };

  /** Gemeinsame Bausteine der 3D-Karte (Rohr und Kamin): Chips, Ansicht, Text, Voreinstellungen, Regler, Haken. d3 ist die Ansicht. */
  S.d3Karte = function (cfg) {
    const { d3, canvasBox, grund, beiAenderung, annahme } = cfg;
    const chipsBox = h('div', { class: 'chips' }), text = h('div', { style: { fontSize: '15px', whiteSpace: 'pre-line' } });
    const regler = h('input', { type: 'range', min: 0, max: 100, value: 100, class: 'seek', 'aria-label': S.T('d3_regler') });
    const reglerWert = () => +regler.value / 100;
    const vor = S.segment([T('d3_schraeg'), T('d3_vorne'), T('d3_seite'), T('d3_oben')], 0, i => { const g = grund(); if (i === 0) d3.voreinstellung(g[0], g[1]); else if (i === 1) d3.voreinstellung(0, cfg.niedrig == null ? 0.08 : cfg.niedrig); else if (i === 2) d3.voreinstellung(1.5708, cfg.niedrig == null ? 0.08 : cfg.niedrig); else d3.voreinstellung(0, 1.45); });
    let reglerStopp = null;
    const reglerFahren = ziel => { if (reglerStopp) reglerStopp(); const von = +regler.value; reglerStopp = S.anim(1400, t => 1 - Math.pow(1 - t, 2.4), e => { regler.value = Math.round(von + (ziel - von) * e); regler.oninput(); }); };
    regler.oninput = () => { d3.regler = reglerWert(); cfg.groesse && cfg.groesse(); d3.zeichnen(); cfg.beschreibung && cfg.beschreibung(); };
    regler.addEventListener('input', () => { if (reglerStopp) { reglerStopp(); reglerStopp = null; } });
    const kopfZeile = h('div', { style: { display: 'flex' } }, h('div', { class: 'fett', style: { flex: '1 1 0', fontSize: '15px' }, text: T('d3_flach') }), h('div', { class: 'fett', style: { flex: '1 1 0', fontSize: '15px', textAlign: 'right' }, text: T('d3_gefaltet') }));
    const flachSeg = S.segment([T('d3_flach'), T('d3_gefaltet')], 1, i => { reglerFahren(i === 0 ? 0 : 100); const g = grund(); if (i === 0) d3.voreinstellung(0, 1.35); else d3.voreinstellung(g[0], g[1]); });
    const haken = (label, onChange) => { const cb = h('input', { type: 'checkbox' }); cb.addEventListener('change', () => onChange(cb.checked)); return h('label', { class: 'haken' }, cb, h('span', { text: label })); };
    const aus = haken(T('d3_ausein'), an => { const von = d3.auseinander || 0; S.anim(350, null, (e, t) => { d3.auseinander = von + ((an ? 1 : 0) - von) * t; d3.zeichnen(); }); });
    const masse = haken(T('d3_masse'), an => { d3.masseAn = an; d3.zeichnen(); });
    const karte = S.karte(S.text(T('d3_titel'), 18, true), chipsBox, canvasBox, text, vor, kopfZeile, regler, flachSeg, aus, masse, S.text(annahme, 13));
    return { karte, chipsBox, text, regler, reglerWert };
  };

  S.seiteRohr = function (name, opt) {
    const primBox0 = h('div', { class: 'primbox' });
    const R = S.weitereShell({ titel: T(TITEL[name]), tabs: [T('ansicht_skizze'), T('ansicht_3d')], dreiD: 1, primBox: primBox0, beiPdf: () => pdfErstellen(), beiTeilen: () => blattTeilen(),
      beiTab: (i, ist3, merken) => { st.d3 = ist3; if (ist3) S.nachLayout(() => { live.setzeGroesse(R.karte.clientWidth, R.karte.clientHeight, window.devicePixelRatio || 1); live.zeichnen(); }); if (merken) speichere(); } });
    const { inh } = R, mt = S.mt, grau = S.grau, text = S.text, art = ART[name], defs = FELDER[name], quer = S.vp.quer;
    const eingabe = {}, st = { mat: 0, dicke: 1, einheit: 1, d3: false, mehr: false };
    const sk = 'rohr_' + name + '.';
    const standard = (f, einheit) => f[2] === 'L' ? E().umrechnen(1, einheit, f[3]) : f[3];
    try { const j = JSON.parse(S.lies(sk + 'state')); if (j) { Object.assign(eingabe, j.eingabe || {}); st.mat = j.mat | 0; st.dicke = j.dicke == null ? 1 : j.dicke; st.einheit = j.einheit == null ? 1 : j.einheit; st.mehr = !!j.mehr; } } catch (e) { /* frisch */ }
    st.mat = min(6, max(0, st.mat)); st.dicke = min(WS()[st.mat].dicken.length - 1, max(0, st.dicke)); st.einheit = min(2, max(0, st.einheit));
    for (const f of defs) if (eingabe[f[0]] == null) eingabe[f[0]] = standard(f, st.einheit);
    if (eingabe.g_tb == null) eingabe.g_tb = E().umrechnen(1, st.einheit, '1000'); if (eingabe.g_tl == null) eingabe.g_tl = E().umrechnen(1, st.einheit, '2000'); if (eingabe.g_vsp == null) eingabe.g_vsp = '10';
    if (eingabe.o_datum == null) eingabe.o_datum = datumHeute(); if (eingabe.o_ort == null) eingabe.o_ort = ''; if (eingabe.o_nr == null) eingabe.o_nr = '';
    if (opt.mehr != null) st.mehr = opt.mehr;
    st.d3 = opt.modus === '3d' || opt.ansicht === '3d' ? true : opt.modus === '2d' || opt.ansicht === '2d' ? false : S.lies(sk + 'd3') === 'true';
    const speichere = () => { S.schreibe(sk + 'state', JSON.stringify({ eingabe, mat: st.mat, dicke: st.dicke, einheit: st.einheit, mehr: st.mehr })); S.schreibe(sk + 'd3', st.d3); };
    const bild = new RohrBild(); let modell = null, letztesGueltiges = null, ergebnis = null;
    const einheit = () => st.einheit;
    const cm = k => { const v = S.parseNum(eingabe[k] == null ? '' : eingabe[k]); return v == null ? 0 : E().zuCm(einheit(), v); };
    const zahl = k => { const v = S.parseNum(eingabe[k] == null ? '' : eingabe[k]); return v == null ? 0 : v; };
    const grund = () => art === 'reduktion' ? [0.55, 0.3] : [0.35, 0.25];

    // ---- Kopf: 3D live
    const cvLive = R.cv3;
    const live = new root.Szene3D.Ansicht3D(cvLive); live.leerText = T('d3_leer'); live.fuellend = true; live.grundZoom = 1.1; live.grundstellung(grund()[0], grund()[1]);
    live.etikett = i => { const t = (modell || letztesGueltiges) && (modell || letztesGueltiges).teile[i]; return t ? E().text(einheit(), t.mantel.breite) + ' x ' + E().text(einheit(), t.mantel.laenge) + ' ' + E().liste[einheit()].kurz : ''; };
    R.onGroesse = (w, hh) => { live.setzeGroesse(w, hh, window.devicePixelRatio || 1); };
    let fokusKey = null, liveTimer = null;
    const liveAus = () => { live.masseAn = false; live.leuchte = null; live.zeichnen(); };
    const hebeHervor = k => { live.leuchte = teileZuFeld(name, k); live.masseAn = true; live.zeichnen(); clearTimeout(liveTimer); if (fokusKey !== k) liveTimer = setTimeout(liveAus, 2500); };
    const fokus = (k, an) => { if (an) { R.view.aktiv = k; } else if (R.view.aktiv === k) R.view.aktiv = null; if (an) { fokusKey = k; hebeHervor(k); } else if (fokusKey === k) { fokusKey = null; clearTimeout(liveTimer); liveTimer = setTimeout(liveAus, 900); } };

    // ---- 3D-Karte
    const cvD3 = h('canvas', { 'aria-label': T('d3_rohr_beschreibung') }), d3Box = h('div', { style: { position: 'relative', width: '100%' } }, cvD3);
    cvD3.style.cssText = 'display:block;width:100%;height:100%';
    const d3 = new root.Szene3D.Ansicht3D(cvD3); d3.leerText = T('d3_leer'); d3.grundstellung(grund()[0], grund()[1]);
    d3.etikett = live.etikett;
    const hinweisGesehen = S.lies('d3.gedreht') === 'true'; if (!hinweisGesehen) d3.hinweis = T('d3_hinweis');
    d3.beiDrehen = () => { if (d3.hinweis) { d3.hinweis = null; S.schreibe('d3.gedreht', 'true'); } };
    const d3k = S.d3Karte({ d3, canvasBox: d3Box, grund, annahme: T('d3_rohr_annahme'),
      groesse: () => d3Groesse(), beschreibung: () => d3Beschreibung() });
    const d3Groesse = () => {
      const w = d3Box.clientWidth || 338, voll = max(260, min(w, 320)), flach = min(1, max(0, 1 - RohrGeo.faltGrad(d3.regler))), hh = Math.trunc(voll * (1 - 0.4 * flach));
      d3Box.style.height = hh + 'px'; d3.setzeGroesse(w, hh, window.devicePixelRatio || 1);
    };
    d3.beiWahl = a => { d3.wahl = a; chipsZeichnen(); d3Beschreibung(); d3.zeichnen(); };
    let chipsFuer = [];
    const chipsZeichnen = () => {
      d3k.chipsBox.innerHTML = '';
      const chip = (label, an, onClick) => { const b = h('button', { class: 'chipk' + (an ? ' an' : ''), text: label, onclick: onClick }); d3k.chipsBox.append(b); };
      chip(T('d3_alle'), d3.wahl == null, () => d3.beiWahl(null));
      for (const a of chipsFuer) chip(teilName(a), d3.wahl === a, () => d3.beiWahl(d3.wahl === a ? null : a));
    };
    const d3Beschreibung = () => {
      const r = ergebnis; if (!r) { d3k.text.textContent = T('d3_leer'); return; }
      let t; if (d3.wahl == null) t = T('d3_rohr_summe', String(r.stueck), S.fmtM2(r.m2)); else { const p = r.posten.find(q => q.art === d3.wahl); t = p ? T('d3_rohr_teil', teilName(d3.wahl), String(p.stueck), E().text(einheit(), p.breite), E().text(einheit(), p.laenge), E().liste[einheit()].kurz) : ''; }
      d3k.text.textContent = d3.regler < 0.02 ? t + '\n' + T('d3_abwicklung') : t;
    };

    // ---- Seite
    const felderBox = {}, felder = {};
    const feldLabel = f => T(f[1]) + (f[2] === 'L' ? ' (' + E().liste[einheit()].kurz + ')' : '');
    const feldBauen = f => { const b = S.feld(feldLabel(f), eingabe[f[0]], { onChange: v => { eingabe[f[0]] = v; hebeHervor(f[0]); aktualisiere(); }, onFokus: an => fokus(f[0], an) }); if (f[2] === 'A') b.input.setAttribute('inputmode', 'numeric'); felder[f[0]] = b; return b; };
    const globalFeld = (k, labelKey, laenge) => { const b = S.feld(T(labelKey) + (laenge ? ' (' + E().liste[einheit()].kurz + ')' : ''), eingabe[k], { onChange: v => { eingabe[k] = v; aktualisiere(); }, onFokus: an => { if (an) { fokusKey = k; liveAus(); } else if (fokusKey === k) fokusKey = null; } }); felder[k] = b; b._laenge = [labelKey, laenge]; return b; };

    const beispielText = S.infoband(T('rohr_beispiel'), quer ? 13 : 15); if (quer) beispielText.style.padding = '3px 14px';
    const einheitSeg = S.segment(E().liste.map((x, i) => i === 2 ? T('u_zoll') : x.kurz), st.einheit, neu => einheitWechseln(neu));
    const fehlerText = text('', 16, true), warnText = text('', 15, true), tabelle = text('', 16), kpi = text('', 18, true), status = text('', 16); status.style.minHeight = '19px';
    fehlerText.style.color = 'var(--fehler)'; warnText.style.color = 'rgb(140,90,0)'; tabelle.style.whiteSpace = 'pre-wrap'; kpi.style.whiteSpace = 'pre-line'; warnText.style.whiteSpace = 'pre-line';
    const masse = S.karte(text(T('l_einheit'), 16, true), einheitSeg);
    { const pr = h('div', { class: 'primreihe' }, defs.slice(0, 3).map(f => feldBauen(f))); primBox0.append(S.primHinweis(pr), pr); }
    const extra = defs.slice(3);
    for (let i = 0; i < extra.length; i += 2) { const a = feldBauen(extra[i]); masse.append(mt(i + 1 < extra.length ? S.zweispalt(a, feldBauen(extra[i + 1])) : a, 8)); }
    masse.append(mt(text(T('annahme_rohr'), 14), 8)); if (art === 'hosenrohr') masse.append(mt(text(T('pdf_hose_annahme'), 14), 6));
    // Segmentzahl als Wahl direkt unter den Hauptmassen (Gliederbogen / Schweizerbogen: viele kurze Stuecke, Alex 11.11.2026)
    if (felder.n && (art === 'rohrbogen' || art === 'schwanenhals')) {
      const werte = art === 'rohrbogen' ? ['3', '4', '5', '6', '8', '10', '12'] : ['2', '3', '4', '5', '6', '8'];
      const segN = S.segment(werte, werte.indexOf(String(eingabe.n).trim()), i => { eingabe.n = werte[i]; felder.n.input.value = werte[i]; hebeHervor('n'); aktualisiere(); });
      felder.n.input.addEventListener('input', () => segN.setze(werte.indexOf(felder.n.input.value.trim())));
      const titelN = h('div', { class: 'bt', text: T(art === 'rohrbogen' ? 'w_segmente_bogen' : 'w_segmente_hals') }); titelN.style.marginTop = '8px';
      primBox0.append(titelN, h('div', { style: { marginTop: '2px' } }, segN));
    }
    const spMat = S.waehler(S.TA('werkstoffe'), st.mat, i => { if (i !== st.mat) { st.mat = i; st.dicke = S.dickeStandard(i); S.waehlerFuelle(spDicke, S.dickenTexte(i), S.dickenReihenfolge(i).indexOf(st.dicke)); aktualisiere(); } });
    const spDicke = S.waehler(S.dickenTexte(st.mat), S.dickenReihenfolge(st.mat).indexOf(st.dicke), p => { const idx = S.dickenReihenfolge(st.mat)[p]; if (idx != null && idx !== st.dicke) { st.dicke = idx; aktualisiere(); } });
    const ortF = S.feld(T('o_ort'), eingabe.o_ort, { text: true, onChange: v => { eingabe.o_ort = v; speichere(); } }); ortF.input.placeholder = T('hint_ort');
    const nrF = S.feld(T('r_nr'), eingabe.o_nr, { text: true, onChange: v => { eingabe.o_nr = v; speichere(); } }); nrF.input.placeholder = T('hint_nr');
    const datF = S.feld(T('o_datum'), eingabe.o_datum, { text: true, onChange: v => { eingabe.o_datum = v; speichere(); } });
    const material = S.karte(text(T('rohr_material_titel'), 18, true), ortF, S.zweispalt(nrF, datF), text(T('l_material'), 16, true), spMat, text(T('l_dicke'), 16, true), spDicke,
      S.zweispalt(globalFeld('g_tb', 'l_tb', true), globalFeld('g_tl', 'l_tl', true)), globalFeld('g_vsp', 'r_vsp', false));
    const ergKarte = S.karte(text(T('rohr_ergebnis_titel'), 22, true), tabelle, kpi);
    const warn = S.warnband(T('warn_home'), 16); if (quer) { warn.style.fontSize = '14px'; warn.style.padding = '4px 14px'; }
    // Mehr Masse (wie Android setzeMehr): Zugabe, Einheit, Material, Baustelle
    const mehrKnopf = h('button', { class: 'mehrknopf' }), mehrBox = h('div', {}, masse, mt(material, 10));
    const setzeMehr = an => {
      st.mehr = an; mehrBox.style.display = an ? '' : 'none';
      const kz = T(an ? 'ss_weniger' : 'ss_mehr'), info = T('w_mehr_rohr');
      mehrKnopf.innerHTML = ''; mehrKnopf.append(h('b', {}, S.dreieck(an), kz), h('small', { text: info })); mehrKnopf.setAttribute('aria-label', kz + ', ' + info);
    };
    mehrKnopf.addEventListener('click', () => { setzeMehr(!st.mehr); speichere(); });
    setzeMehr(st.mehr);
    if (quer) inh.append(mt(S.karte(text(T('ss_masse'), 18, true), primBox0), 0), mt(warn, 8)); else inh.append(mt(warn, 10));
    inh.append(mt(fehlerText, quer ? 8 : 0), mt(warnText, 4), mt(beispielText, 6), mt(mehrKnopf, 8), mt(mehrBox, 6), mt(ergKarte, 10), mt(d3k.karte, 10),
      mt(S.rmKarte(art, T(TITEL[name]), () => snapshot()), 12), mt(status, 6));
    const fokusiere = k => { const f = felder[k]; if (!f) return; if (!st.mehr && defs.findIndex(d => d[0] === k) >= 3) { setzeMehr(true); speichere(); } f.input.focus(); };
    R.view.beiMass = fokusiere;
    R.view.passung = z => z.anpassung(Math.max(160, R.view.w - 56), R.view.h, 8);
    R.view.feldFuer = k => { const f = felder[k]; return f && f.input ? f.input : null; };

    function einheitWechseln(neu) {
      const alt = einheit(); st.einheit = neu;
      for (const f of defs) if (f[2] === 'L') eingabe[f[0]] = E().umrechnen(alt, neu, eingabe[f[0]]);
      for (const k of ['g_tb', 'g_tl']) eingabe[k] = E().umrechnen(alt, neu, eingabe[k]);
      for (const f of defs) { const b = felder[f[0]]; b.lab.textContent = feldLabel(f).replace('Aufkantung H', 'Aufkantung\nH'); if (b.input.value !== eingabe[f[0]]) b.input.value = eingabe[f[0]]; }
      for (const k of ['g_tb', 'g_tl', 'g_vsp']) { const b = felder[k]; if (b._laenge[1]) b.lab.textContent = T(b._laenge[0]) + ' (' + E().liste[neu].kurz + ')'; if (b.input.value !== eingabe[k]) b.input.value = eingabe[k]; }
      aktualisiere();
    }

    // ---- Rechnung
    const fehlerSatz = (f, mindest) => ({ DURCHMESSER: T('fe_durchmesser'), RADIUS_ZU_KLEIN: T('fe_radius'), WINKEL: T(art === 'schwanenhals' ? 'fe_winkel_hals' : 'fe_winkel_bogen'), SEGMENTE: T('fe_segmente'),
      AUSLADUNG_ZU_KLEIN: T('fe_ausladung', E().text(einheit(), mindest), E().liste[einheit()].kurz), KEGEL_GLEICH: T('fe_kegel_gleich'), HOEHE: T('fe_hoehe'), WINKEL_HOSE: T('fe_winkel_hose'), BEIN_ZU_KURZ: T('fe_bein', E().text(einheit(), mindest), E().liste[einheit()].kurz) })[f];
    const leeren = () => { bild.art = art; bild.einheit = einheit(); bild.bogen = null; bild.hals = null; bild.kegel = null; bild.hose = null; bild.modell = null; };
    function aufbauen() {
      leeren(); const z = cm('z');
      if (art === 'rohrbogen') { const n = Math.trunc(zahl('n')), f = K.pruefeBogen(cm('d'), cm('r'), zahl('w'), n); if (f) return { fehler: fehlerSatz(f, 0) }; const b = K.Bogen(cm('d'), cm('r'), zahl('w'), n, z), m = RohrGeo.modell.bogen(b); bild.bogen = b; bild.modell = m; return { modell: m, posten: K.RohrRechnung.postenBogen(b) }; }
      if (art === 'schwanenhals') { const s = K.RohrSchwanenhals(cm('d'), cm('a'), zahl('g'), cm('r'), Math.trunc(zahl('n')), z), f = s.fehler(); if (f) return { fehler: fehlerSatz(f, s.minAusladung) }; const m = RohrGeo.modell.schwanenhals(s); bild.hals = s; bild.modell = m; return { modell: m, posten: K.RohrRechnung.postenSchwanenhals(s) }; }
      if (art === 'hosenrohr') { const hr = K.Hosenrohr(cm('d'), zahl('w'), cm('l'), z), f = hr.fehler(); if (f) return { fehler: fehlerSatz(f, cm('d') / 2 * hr.tanB) }; const m = RohrGeo.modell.hosenrohr(hr); bild.hose = hr; bild.modell = m; return { modell: m, posten: K.RohrRechnung.postenHosenrohr(hr) }; }
      const f = K.pruefeKegel(cm('d1'), cm('d2'), cm('h')); if (f) return { fehler: fehlerSatz(f, 0) };
      const k = K.kegelstumpf(cm('d1'), cm('d2'), cm('h'), z), m = RohrGeo.modell.reduktion(k); bild.kegel = k; bild.modell = m; return { modell: m, posten: K.RohrRechnung.postenReduktion(k) };
    }
    const aufrunden = c => { const f = Math.pow(10, E().liste[einheit()].stellen + 1); return E().text(einheit(), E().zuCm(einheit(), Math.ceil(E().ausCm(einheit(), c) * f - 1e-6) / f)); };
    const meldungText = (m) => { const ku = E().liste[einheit()].kurz; switch (m.g) {
      case 'LEER': return T('fe_f_leer'); case 'KEINE_ZAHL': return T('fe_f_zahl'); case 'NICHT_POSITIV': return T('fe_f_pos'); case 'NEGATIV': return T('fe_f_neg');
      case 'ZU_GROSS': return T('fe_f_gross', E().text(einheit(), m.grenze), ku); case 'NICHT_GANZ': return T('fe_f_ganz'); case 'RADIUS_ZU_KLEIN': return T('fe_f_radius', aufrunden(m.grenze), ku);
      case 'WINKEL_BOGEN': return T('fe_winkel_bogen'); case 'WINKEL_HALS': return T('fe_winkel_hals'); case 'WINKEL_HOSE': return T('fe_winkel_hose'); case 'SEGMENTE': return T('fe_segmente');
      case 'AUSLADUNG_ZU_KLEIN': return T('fe_ausladung', aufrunden(m.grenze), ku); case 'KEGEL_GLEICH': return T('fe_f_kegel'); case 'BEIN_ZU_KURZ': return T('fe_bein', aufrunden(m.grenze), ku);
      case 'VERSCHNITT_ZU_GROSS': return T('fe_f_vsp', fmtTrim(m.grenze, 0)); } return ''; };
    const beispielAktiv = () => defs.every(f => { const a = S.parseNum(eingabe[f[0]]), b = S.parseNum(standard(f, einheit())); return a != null && b != null && Math.abs(a - b) < 1e-9; });
    const aufCm = k => E().zuCm.bind(null, einheit());
    function zeilenText(r) {
      const e = einheit(), mit = c => E().mit(e, c); let s = '';
      for (const p of r.posten) {
        s += T('rz_posten', teilName(p.art), String(p.stueck)) + '\n';
        s += '    ' + T('rz_mass', mit(p.breite), mit(p.laenge), S.fmtM2(p.mantel.flaeche() / 10000) + ' m²') + '\n';
        const m = p.mantel;
        if (m.rueckenLaenge != null) s += '    ' + T('rz_rueck_bauch', mit(m.rueckenLaenge), mit(m.bauchLaenge), mit(m.hoeheBei(PI / 2))) + '\n';
        else if (m.lGross != null) s += '    ' + T('rz_kegel', fmt(m.sektorGrad, 2), mit(m.lGross), mit(m.lKlein)) + '\n';
        s += '\n';
      }
      if (bild.bogen) s += T('rz_gehrung', fmt(bild.bogen.alphaGrad, 2), String(bild.bogen.n - 1)) + '\n';
      if (bild.hals) { s += T('rz_gehrung', fmt(bild.hals.bogen.alphaGrad, 2), String(bild.hals.bogen.n - 1)) + '\n'; s += T('rz_zwischen', mit(bild.hals.zwischen), mit(bild.hals.ausladung), mit(bild.hals.hoehe)) + '\n'; }
      if (bild.hose) s += T('rz_hose', fmt(bild.hose.gehrungGrad, 2)) + '\n';
      return s + T('rz_total', String(r.stueck), S.fmtM2(r.m2));
    }
    function skizzeAktualisieren(gueltig) {
      if (!gueltig) { R.cv2.style.opacity = .4; return; }
      const id = art, mo = bild.modell, bo = bild.bogen, ha = bild.hals, ho = bild.hose, ke = bild.kegel, en = einheit();
      R.view.bauer = (_, w, hh, t) => root.Ze.WB.rohr(id, mo, bo, ha, ho, ke, c => E().text(en, c), w, hh, t);
      R.cv2.style.opacity = 1; R.view.baue(true);
    }
    function aktualisiere() {
      const mel = pruefeFelder(name, eingabe, v => E().zuCm(einheit(), v));
      for (const k in felder) felder[k].fehler(mel[k] ? meldungText(mel[k]) : null);
      let a; if (!Object.keys(mel).length) a = aufbauen(); else { leeren(); a = { fehler: T('fe_rot') }; }
      if (a.modell) letztesGueltiges = a.modell; modell = a.modell || null;
      beispielText.style.display = beispielAktiv() ? '' : 'none';
      fehlerText.textContent = a.fehler || ''; fehlerText.style.display = a.fehler ? '' : 'none';
      warnText.textContent = a.fehler ? '' : [cm('z') <= 0 ? T('warn_keine_zugabe') : null].concat(S.werkstoffWarnungen(st.mat)).filter(Boolean).join('\n'); warnText.style.display = warnText.textContent ? '' : 'none';
      skizzeAktualisieren(!a.fehler);
      if (a.fehler) { ergebnis = null; tabelle.textContent = a.fehler; kpi.textContent = ''; leiste(); d3Aktualisieren(); speichere(); return; }
      const w = WS()[st.mat], tb = cm('g_tb') <= 0 ? 100 : cm('g_tb'), tl = cm('g_tl') <= 0 ? 200 : cm('g_tl');
      const r = K.RohrRechnung.rechnen(a.posten, w.dicken[st.dicke], w.dichte, zahl('g_vsp'), tb, tl); ergebnis = r;
      tabelle.textContent = zeilenText(r);
      kpi.textContent = T('kpi_zeile', S.fmtM2(r.m2), S.fmtM2(r.m2Verschnitt), S.fmtKg(r.kg), T('bedarf_tafeln', String(r.tafeln))) + (r.zuGross.length ? '\n' + r.zuGross.map(x => T('warn_gross', teilName(x))).join(' ') : '');
      leiste(); d3Aktualisieren(); speichere();
    }
    function d3Aktualisieren() {
      const m = modell, zeige = m || letztesGueltiges, alt = !m && zeige ? T('live_veraltet') : null;
      d3.szene = zeige; d3.veraltet = alt; live.szene = zeige; live.veraltet = alt;
      const arten = m ? [...new Set(m.teile.map(t => t.art))] : [];
      if (d3.wahl != null && !arten.includes(d3.wahl) && m) d3.wahl = null;
      if (JSON.stringify(arten) !== JSON.stringify(chipsFuer)) { chipsFuer = arten; chipsZeichnen(); }
      d3Beschreibung(); live.zeichnen(); if (st.d3) d3.zeichnen();
    }
    function leiste() {
      const r = ergebnis;
      if (!r) R.leiste_leer(); else R.leiste_gueltig(T('ss_ergebnis_kamin'), r.m2Verschnitt, v => S.fmtM2(v) + ' m²');
    }
    function snapshot() { return art + ': ' + Object.keys(eingabe).filter(k => String(eingabe[k]).trim() !== '').sort().map(k => k + '=' + eingabe[k]).join(', ') + ', ' + S.TA('werkstoffe')[st.mat] + ' ' + fmtTrim(WS()[st.mat].dicken[st.dicke], 2) + ' mm'; }
    async function blattDatei() {
      const r = ergebnis; if (!r) return null;
      const c = document.createElement('canvas'), W = 1240, H = 1500, ctx = c.getContext('2d'); c.width = W; c.height = H; ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, W, H);
      ctx.fillStyle = '#141C26'; ctx.font = '700 40px Roboto, sans-serif'; ctx.fillText(T('pdf_rohr_titel') + ': ' + T(TITEL[name]), 40, 70);
      ctx.font = '24px Roboto, sans-serif'; ctx.fillText((eingabe.o_ort || '') + '   ' + eingabe.o_datum, 40, 110);
      const sc = document.createElement('canvas'); sc.width = W - 80; sc.height = Math.round((W - 80) * bild.verhaeltnis()); bild.zeichne(sc.getContext('2d'), sc.width, sc.height, 2.2); ctx.drawImage(sc, 40, 140);
      const y0 = 140 + sc.height + 50; ctx.font = '24px Roboto, sans-serif'; zeilenText(r).split('\n').forEach((z, i) => ctx.fillText(z, 40, y0 + i * 32));
      const blob = await new Promise(res => c.toBlob(res, 'image/png'));
      return { blob, name: 'Werkblatt_' + name + '_' + new Date().toISOString().slice(0, 10) + '.png', titel: T('share_rohr_titel', T(TITEL[name]), eingabe.o_ort || '') };
    }
    async function pdfErstellen() {
      if (!ergebnis) { status.textContent = T('status_leer'); return; }
      status.textContent = '';
      try { const d = await blattDatei(); S.pdfDialog(d.blob, d.name, d.titel, m => { status.textContent = m; }); } catch (x) { status.textContent = T('status_pdf_fehler'); }
    }
    async function blattTeilen() {
      if (!ergebnis) { status.textContent = T('status_leer'); return; }
      let d; try { d = await blattDatei(); } catch (x) { d = null; }
      if (!d) { status.textContent = T('status_pdf_fehler'); return; }
      status.textContent = '';
      R.teilenFertig(async () => { const r = await S.teilen(d.blob, d.name, d.titel); if (r === 'download') status.textContent = d.name; });
    }

    S.nachLayout(() => { d3Groesse(); d3.zeichnen(); });
    return {
      el: R.el, overlay: { zurueck: true }, art: name,
      nachEinbau() { R.layout(); aktualisiere(); R.setzeTab(st.d3 ? 1 : 0, false); S.nachLayout(() => { d3Groesse(); S.autosizeAlle(R.el); S.setzeScroll(R, opt); }); S.setzeScroll(R, opt); },
      kontext() { return { ansicht: st.d3 ? T('ansicht_3d') : T('ansicht_skizze'), eingaben: snapshot() }; },
      layout() { R.layout(); d3Groesse(); }, speichere, zerstoere() { speichere(); R.ro.disconnect(); clearTimeout(liveTimer); }
    };
  };
  // Startseiten-Kachel (Nils 10.11.): Modell der Seite mit den Beispielwerten (FELDER, Einheit mm), ohne Seite. Gleiche Rechnung wie aufbauen(). null bei Fehler.
  root.RohrMenueModell = function (art) {
    const defs = FELDER[art]; if (!defs) return null;
    const cm = {}, zahl = {};
    for (const f of defs) { const n = S.parseNum(f[3]); if (f[2] === 'L') cm[f[0]] = S.Einheit.zuCm(1, n); else zahl[f[0]] = n; }
    const c = k => cm[k] || 0, z = c('z');
    try {
      if (art === 'rohrbogen') { const n = Math.trunc(zahl.n), f = K.pruefeBogen(c('d'), c('r'), zahl.w, n); if (f) return null; return RohrGeo.modell.bogen(K.Bogen(c('d'), c('r'), zahl.w, n, z)); }
      if (art === 'schwanenhals-alt') { const s = K.RohrSchwanenhals(c('d'), c('a'), zahl.g, c('r'), Math.trunc(zahl.n), z); if (s.fehler()) return null; return RohrGeo.modell.schwanenhals(s); }
      if (art === 'hosenrohr') { const hr = K.Hosenrohr(c('d'), zahl.w, c('l'), z); if (hr.fehler()) return null; return RohrGeo.modell.hosenrohr(hr); }
      if (art === 'reduktion') { if (K.pruefeKegel(c('d1'), c('d2'), c('h'))) return null; return RohrGeo.modell.reduktion(K.kegelstumpf(c('d1'), c('d2'), c('h'), z)); }
    } catch (e) { return null; }
    return null;
  };
})(window);
