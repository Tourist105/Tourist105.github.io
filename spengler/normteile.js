/* Spengler-Web: Port von kern/Normteile.kt (Normteile-Katalog und Materialliste). Der Katalog kommt aus normteile_daten.js (Kopie von
 * app/src/main/assets/normteile.json, erzeugt vom Android-Test). Gleiche Zeilen wie die App: test_normteile.mjs vergleicht gegen ref/normteile_ref.txt. */
(function (root) {
  'use strict';
  const D = root.NORMTEILE || (typeof require !== 'undefined' ? require('./normteile_daten.js') : null);
  const ND = root.NEUETEILE_DATEN || (typeof require !== 'undefined' ? require('./neueteile_daten.js') : null);
  const RANG = { beleg: 0, annahme: 1, unsicher: 2 };
  const schlechter = (a, b) => RANG[b] > RANG[a] ? b : a;
  const aufrunden = x => Math.ceil(x - 1e-9);

  /** Zahl fuer die Anzeige: hoechstens dez Stellen, Nullen am Ende weg, Komma (wie nz in Kotlin). */
  function nz(v, dez) {
    dez = dez == null ? 1 : dez;
    const f = Math.pow(10, dez), r = Math.round(v * f) / f;
    let t = r.toFixed(dez);
    if (t.indexOf('.') >= 0) t = t.replace(/0+$/, '').replace(/\.$/, '');
    if (t === '-0') t = '0';
    return t.replace('.', ',');
  }

  // Anzeigesprache: im Browser die Wahl der Seite, in den Node-Tests immer Deutsch (Referenzdateien bleiben unveraendert)
  const en = () => typeof root.S !== 'undefined' && root.S && root.S.sprache && root.S.sprache() === 'en';
  const STATUS_EN = { beleg: 'Source found', annahme: 'Assumption, Alex checks', unsicher: 'Uncertain, Alex checks' };
  const HINWEIS_EN = 'I did not read any Swiss wholesaler catalogue in detail. What Alex gets from his supplier, he will say.';
  const statusText = s => (en() && STATUS_EN[s]) || D.status[s];
  const hinweisText = () => (en() ? HINWEIS_EN : D.hinweis);
  const nt = m => ({ v: String(m.v), s: m.s, q: m.q, v120: m.ab120 == null ? null : m.ab120, fuer(dn) { return dn >= 120 && this.v120 != null ? this.v120 : this.v; } });
  const werkstoffe = D.werkstoffe.map(m => ({ id: m.id, name: m.name, dichte: m.dichte, bogenDicke: nt(m.bogen_dicke), rohrDicke: nt(m.rohr_dicke),
    rinne: { v: m.rinne_dicke.v, s: m.rinne_dicke.s, q: m.rinne_dicke.q }, rinne400: m.rinne_dicke.ab400, mauer: { v: m.mauer_dicke.v, s: m.mauer_dicke.s, q: m.mauer_dicke.q }, kehle: { v: m.kehle_dicke.v, s: m.kehle_dicke.s, q: m.kehle_dicke.q } }));
  const werkstoff = id => werkstoffe.find(w => w.id === id) || werkstoffe[0];
  const durchmesser = D.durchmesser.map(m => ({ dn: m.dn, muffe: m.muffe, s: m.s, q: m.q, muffeStatus: m.ms || 'unsicher', muffeQuelle: m.mq || '' }));
  const dnVon = dn => durchmesser.find(d => d.dn === dn) || null;
  const winkel = D.winkel.map(m => ({ grad: m.grad, s: m.s, q: m.q }));
  const winkelVon = g => winkel.find(w => Math.abs(w.grad - g) < 1e-9) || null;
  const rinneAbwicklung = D.rinne_abwicklung.map(m => ({ mm: m.mm, s: m.s, q: m.q }));
  const rinneStueck = D.rinne_stueck.map(m => ({ mm: m.mm, s: m.s, q: m.q }));
  const teil = id => D.teile[id];
  const regelZahl = id => D.regeln[id];
  const radiusFaktor = { v: D.radius.faktor, s: D.radius.s, q: D.radius.q };
  const versatzQuelle = { s: D.versatz.s, q: D.versatz.q };
  function versatz(grad, dn) {
    const spalte = D.versatz.dn.indexOf(dn === 75 ? 76 : dn);
    if (spalte < 0) return null;
    if (Math.abs(grad - Math.round(grad)) >= 1e-9) return null;
    const zeile = D.versatz.mm[String(Math.round(grad))];
    return zeile ? zeile[spalte] : null;
  }

  const quelleVon = (...teile) => teile.filter(t => t[1] && t[1].trim() !== '').map(t => t[0] === '' ? t[1] : t[0] + ': ' + t[1]).join('. ');
  const dickeText = (wk, d) => wk.name + ' ' + nz(d, 2) + ' mm';
  const gewicht = (wk, m2, dicke) => wk.dichte > 0 ? nz(m2 * dicke * wk.dichte, 1) + ' kg' : null;
  const Z = (teil, menge, einheit, detail, status, quelle) => ({ teil, menge, einheit, detail, status, quelle });

  function hals(sk, wahl) {
    const wk = werkstoff(wahl.werkstoff), dn = dnVon(wahl.dn), dnS = dn ? dn.s : 'unsicher', dnQ = dn ? dn.q : 'Nenn ' + wahl.dn + ' steht nicht im Katalog';
    const wi = winkelVon(sk.bogenGrad), bogenT = teil('bogen'), rohrT = teil('rohr'), schT = teil('schelle'), z = [];
    const winkelStatus = wi ? wi.s : 'unsicher';
    const winkelQ = wi ? wi.q : 'Normwinkel im Katalog: ' + winkel.map(w => nz(w.grad, 0)).join(', ') + '. Ein anderer Winkel ist kein Fertigteil, Alex prüft';
    z.push(Z(bogenT.name + ' ' + nz(sk.bogenGrad, 1) + '°' + (wi ? '' : ' (kein Normwinkel)'), 2, 'Stk', 'Nenn ' + wahl.dn + ', ' + wk.name + ', Dicke ' + wk.bogenDicke.fuer(wahl.dn),
      schlechter(schlechter(winkelStatus, dnS), wk.bogenDicke.s), quelleVon(['', bogenT.q], ['Winkel', winkelQ], ['Durchmesser', dnQ], ['Dicke', wk.bogenDicke.q])));
    const stueck = regelZahl('rohr_stueck'), nRohr = Math.max(1, aufrunden(sk.rohrZuschnitt / wahl.rohrStueck));
    z.push(Z(rohrT.name, nRohr, 'Stk', 'Nenn ' + wahl.dn + ', ' + wk.name + ', Dicke ' + wk.rohrDicke.fuer(wahl.dn) + ', Zuschnitt ' + nz(sk.rohrZuschnitt, 1) + ' mm aus Stück ' + nz(wahl.rohrStueck / 1000, 1) + ' m',
      schlechter(schlechter(stueck.s, dnS), wk.rohrDicke.s), quelleVon(['', rohrT.q], ['Stücklänge', stueck.q], ['Dicke', wk.rohrDicke.q])));
    const ab = regelZahl('schelle_abstand');
    z.push(Z(schT.name, Math.max(1, aufrunden(sk.rohrZuschnitt / ab.v)), 'Stk', 'Nenn ' + wahl.dn + ', ' + wk.name + ', am Zwischenrohr, höchstens ' + nz(ab.v / 1000, 1) + ' m Abstand', schlechter(ab.s, dnS), quelleVon(['', schT.q], ['Abstand', ab.q])));
    const st = regelZahl('steckung');
    const sum = [['Werkstoff', wk.name], ['Zuschnitt Zwischenrohr', nz(sk.rohrZuschnitt, 1) + ' mm'], ['Laufmeter Rohr', nz(sk.rohrZuschnitt / 1000, 2) + ' m'], ['Steckung je Seite', nz(sk.steckung, 1) + ' mm']];
    const h = [];
    h.push([radiusFaktor.s, 'Radius der Mittellinie bei Nenn ' + wahl.dn + ': etwa ' + nz(radiusFaktor.v * wahl.dn, 0) + ' mm (' + nz(radiusFaktor.v, 1) + ' x Nenn, abgeleitet). Eingegeben ist ' + nz(sk.radius, 1) + ' mm. ' + radiusFaktor.q]);
    const v = versatz(sk.bogenGrad, wahl.dn);
    if (v != null) h.push([versatzQuelle.s, 'Händler-Richtwert für zwei ineinandergesteckte Bögen ' + nz(sk.bogenGrad, 0) + '° Nenn ' + wahl.dn + ': Achsversatz ' + v + ' mm. ' +
      (sk.achsmass < v ? 'Dein Achsmass ' + nz(sk.achsmass, 1) + ' mm ist kleiner, mit zwei Normbögen nicht möglich. ' : 'Dein Achsmass ' + nz(sk.achsmass, 1) + ' mm ist grösser, das Zwischenrohr füllt den Rest. ') + versatzQuelle.q]);
    if (st.v !== sk.steckung) h.push(['annahme', 'Die Steckung ' + nz(sk.steckung, 1) + " mm weicht von den 50 mm auf Alex' Skizze ab."]);
    return { titel: 'Materialliste Schwanenhals', zeilen: z, summen: sum, hinweise: h };
  }

  function rinne(r, wahl) {
    const wk = werkstoff(wahl.werkstoff), dn = dnVon(wahl.dn), dnS = dn ? dn.s : 'unsicher';
    const dicke = r.e.abwicklung >= 400 ? wk.rinne400 : wk.rinne.v;
    const abw = rinneAbwicklung.find(a => Math.abs(a.mm - r.e.abwicklung) < 1e-9), stueckM = rinneStueck.find(a => Math.abs(a.mm - wahl.rinneStueck) < 1e-9);
    const nStueck = Math.max(1, aufrunden(r.e.laenge / wahl.rinneStueck)), rinneT = teil('rinne'), z = [];
    z.push(Z(rinneT.name + ', Abwicklung ' + nz(r.e.abwicklung, 0), nStueck, 'Stk', dickeText(wk, dicke) + ', Stücklänge ' + nz(wahl.rinneStueck / 1000, 1) + ' m, ' + nz(r.laengeM, 1) + ' m Rinne',
      schlechter(schlechter(abw ? abw.s : 'unsicher', 'annahme'), wk.rinne.s),
      quelleVon(['', rinneT.q], ['Abwicklung', abw ? abw.q : 'keine Normabwicklung, Alex prüft'], ['Stücklänge', (stueckM ? stueckM.q : 'nicht im Katalog') + '. Welche Länge Alex nimmt, ist offen'], ['Dicke', wk.rinne.q])));
    if (nStueck > 1) { const t = teil('verbinder'); z.push(Z(t.name, nStueck - 1, 'Stk', 'Stücke minus 1', t.s, t.q)); }
    const ht = teil('halter');
    z.push(Z(ht.name, r.halter, 'Stk', 'Abstand ' + nz(r.e.halterAbstand, 0) + ' mm, Typ nach Rinne (Schweizer Haken oder Kastenhalter)', 'annahme', quelleVon(['', ht.q], ['Abstand', 'Annahme, nur Quellen aus Deutschland und Österreich'])));
    const eb = teil('endboden'), ebR = regelZahl('endboden_je_rinne');
    z.push(Z(eb.name, ebR.v, 'Stk', 'links und rechts, passend zur Abwicklung', schlechter(eb.s, ebR.s), quelleVon(['', eb.q], ['Anzahl', ebR.q])));
    if (r.ablaeufe > 0) { const t = teil('stutzen'); z.push(Z(t.name, r.ablaeufe, 'Stk', 'für Ablaufrohr Nenn ' + wahl.dn, schlechter(t.s, dnS), quelleVon(['', t.q], ['Durchmesser', dn ? dn.q : 'Nenn ' + wahl.dn + ' steht nicht im Katalog']))); }
    if (r.aussenEcken > 0) { const t = teil('winkel_aussen'); z.push(Z(t.name, r.aussenEcken, 'Stk', '90 Grad', t.s, t.q)); }
    if (r.innenEcken > 0) { const t = teil('winkel_innen'); z.push(Z(t.name, r.innenEcken, 'Stk', '90 Grad', t.s, t.q)); }
    if (r.dilatationen > 0) { const t = teil('dilatation'); z.push(Z(t.name, r.dilatationen, 'Stk', 'höchstens alle ' + nz(r.e.dilatationAbstand / 1000, 1) + ' m', t.s, t.q)); }
    const sum = [['Werkstoff und Dicke', dickeText(wk, dicke)], ['Laufmeter Rinne', nz(r.laengeM, 1) + ' m'], ['Blech netto', nz(r.blechNettoM2, 2) + ' m²'], ['Blech mit Verschnitt', nz(r.blechM2, 2) + ' m²']];
    const g = gewicht(wk, r.blechM2, dicke); if (g) sum.push(['Gewicht (Kontrolle)', g]);
    sum.push(['Streifen je Tafel', String(r.streifenProBahn)]);
    const h = [];
    if (r.e.abwicklung <= 333 && wahl.dn > 100) h.push(['unsicher', 'Nenn ' + wahl.dn + ' ist für eine Rinne mit Abwicklung ' + nz(r.e.abwicklung, 0) + ' gross: der Katalog nennt Stutzen bis Nenn 100 (330) und Nenn 120 (400).']);
    h.push(['annahme', 'Zuschnitt aus Tafel 1000 x 2000: ' + r.streifenProBahn + ' Streifen je Tafel. Was Alex lagert (Tafel, Band, zugeschnitten), weiss nur er.']);
    return { titel: 'Materialliste Dachrinne', zeilen: z, summen: sum, hinweise: h };
  }

  function mauer(m, wahl) {
    const wk = werkstoff(wahl.werkstoff), dicke = wk.mauer.v, z = [];
    z.push(Z('Abdeckung, Abwicklung ' + nz(m.abwicklung, 1), m.stuecke, 'Stk', dickeText(wk, dicke) + ', je Stück bis ' + nz(m.e.stueckLaenge / 1000, 1) + ' m, ' + nz(m.e.laenge / 1000, 1) + ' m gesamt', wk.mauer.s, 'Kantprofil nach Mass, kein Normteil. Dicke: ' + wk.mauer.q));
    if (m.stossverbinder > 0) { const t = teil('stossverbinder'); z.push(Z(t.name, m.stossverbinder, 'Stk', 'Fuge etwa ' + nz(ND.vorgaben.MAUER_STOSSFUGE, 0) + ' mm', t.s, t.q)); }
    if (m.haften > 0) { const t = teil('haften'); z.push(Z(t.name, m.haften, 'Stk', 'Teilung ' + nz(m.e.haftenAbstand, 0) + ' mm', 'annahme', t.q + '. Teilung: Annahme')); }
    if (m.streifenLaenge > 0) { const t = teil('einhaengestreifen'); z.push(Z(t.name, m.streifenLaenge / 1000, 'm', 'beidseitig, Abwicklung 125', 'annahme', t.q + '. Zwei Seiten: Annahme')); }
    if (m.e.ecken > 0) z.push(Z('Gehrung / Ecke', m.e.ecken, 'Stk', '45 Grad, Werkstatt, gelötet', 'annahme', 'Debrunner Normfigur 100.00 C, RHEINZINK. Alex: Werkstatt oder Baustelle offen'));
    if (m.dilatationen > 0) { const t = teil('dilatation'); z.push(Z(t.name, m.dilatationen, 'Stk', 'höchstens alle ' + nz(m.e.dilatationAbstand / 1000, 1) + ' m', t.s, t.q)); }
    const sum = [['Werkstoff und Dicke', dickeText(wk, dicke)], ['Laufmeter Abdeckung', nz(m.e.laenge / 1000, 1) + ' m'], ['Blech netto', nz(m.blechNettoM2, 2) + ' m²'], ['Blech mit Verschnitt', nz(m.blechM2, 2) + ' m²']];
    const g = gewicht(wk, m.blechM2, dicke); if (g) sum.push(['Gewicht (Kontrolle)', g]);
    return { titel: 'Materialliste Mauerabdeckung', zeilen: z, summen: sum, hinweise: [['annahme', 'Unterkonstruktion (Vollholz 24 mm oder OSB mind. 25 mm) ist nicht gerechnet.']] };
  }

  function kehle(k, wahl) {
    const wk = werkstoff(wahl.werkstoff), dicke = wk.kehle.v, z = [];
    z.push(Z('Kehlblech, Abwicklung ' + nz(k.e.abwicklung, 0), k.stuecke, 'Stk', dickeText(wk, dicke) + ', Stücke bis ' + nz(k.e.maxStueck / 1000, 1) + ' m, Überlappung ' + nz(k.e.ueberlappung, 0) + ' mm, ' + nz(k.e.laenge / 1000, 1) + ' m Kehle',
      wk.kehle.s, 'Kantprofil nach Mass, kein Normteil. Dicke: ' + wk.kehle.q));
    const sum = [['Werkstoff und Dicke', dickeText(wk, dicke)], ['Blechlänge mit Überlappung', nz(k.blechLaenge / 1000, 2) + ' m'], ['Blech netto', nz(k.blechNettoM2, 2) + ' m²'], ['Blech mit Verschnitt', nz(k.blechM2, 2) + ' m²']];
    const g = gewicht(wk, k.blechM2, dicke); if (g) sum.push(['Gewicht (Kontrolle)', g]);
    return { titel: 'Materialliste Kehle', zeilen: z, summen: sum, hinweise: [['annahme', 'Unterlage (Bitumenbahn unter dem Kehlblech) ist nicht gerechnet. Breite und Länge misst Alex auf dem Dach.']] };
  }

  const zeile = z => nz(z.menge, 2) + ' ' + z.einheit + '  ' + z.teil + '  (' + z.detail + ')';
  root.Normteile = { D, nz, statusText, werkstoffe, werkstoff, durchmesser, dnVon, winkel, winkelVon, rinneAbwicklung, rinneStueck, teil, regelZahl, radiusFaktor, versatz, versatzQuelle, hals, rinne, mauer, kehle, zeile, schlechter, hinweisText };
  if (typeof module !== 'undefined' && module.exports) module.exports = root.Normteile;
})(typeof window !== 'undefined' ? window : globalThis);
