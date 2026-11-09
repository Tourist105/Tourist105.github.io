/* Spengler-Web: Kommentar direkt aus der Seite (Text, Sprachnachricht, Foto). Entspricht Kommentare.kt der Android-App.
 * Kein Server, kein Konto: Kommentare liegen lokal (IndexedDB, Text zusaetzlich in localStorage). "An Nils senden" oeffnet das Teilen-Menue des
 * Geraets mit Text, Sprachnachricht und Fotos als Dateien (Web Share API). Rueckfall: Mail mit Text, zuletzt ZIP-Datei.
 * Adresse zum Testen: #start+kommentar  (Blatt offen), #start+kommentare (Liste). */
(function (root) {
  'use strict';
  const S = root.S, h = S.h;
  const EMPF = (root.BEST_DATEN && root.BEST_DATEN.empfaenger) || 'nils.roethlisberger@gmx.ch';
  const MAX_SEK = 180, MAX_FOTOS = 3, MIN_MS = 700, HALTEN_MS = 450, LEISE = 0.02, APP = '1.0.0-web';

  // ---------------------------------------------------------------- Texte (de, en)
  const TX = {
    de: {
      knopf: 'Kommentar', knopf_punkt: 'Kommentar zu diesem Punkt', knopf_seite: 'Kommentar schreiben oder sprechen', titel: 'Kommentar für Nils', zu: 'Zu: %1',
      text_hint: 'Schreib hier, was dir auffällt. Zum Beispiel: Das Mass stimmt nicht. Oder: Das brauche ich nie.', text_label: 'Dein Kommentar als Text',
      sprache: 'Sprachnachricht', sprache_hinweis: 'Tippen zum Starten und zum Beenden. Oder gedrückt halten und loslassen.',
      mic_erklaerung: 'Dein Handy fragt gleich, ob diese Seite das Mikrofon benutzen darf. Das braucht sie nur für deine Sprachnachricht. Es wird nichts im Hintergrund aufgenommen.',
      weiter: 'Weiter', nur_text: 'Nur Text', laeuft: 'Aufnahme läuft', stopp: 'Stopp', pegel: 'Pegel', dauer_max: 'höchstens %1',
      fertig: 'Deine Sprachnachricht, %1', neu: 'Neu aufnehmen', entfernen: 'Entfernen',
      zu_kurz: 'Das war zu kurz. Tippe zum Starten, sprich, und tippe nochmal zum Beenden.',
      zu_leise: 'Die Aufnahme ist sehr leise. Sprich näher ans Mikrofon oder nimm sie neu auf.',
      mic_gesperrt: 'Das Mikrofon ist gesperrt. Schreib den Text, oder erlaube das Mikrofon in den Einstellungen für diese Seite.',
      mic_fehlt: 'Es wurde kein Mikrofon gefunden. Schreib den Text.', mic_fehler: 'Das Mikrofon geht gerade nicht. Schreib den Text, oder versuche es später nochmal.',
      mic_nicht: 'Sprachnachrichten gehen in diesem Browser nicht (auf dem iPhone braucht es iOS 14.5 oder neuer). Schreib den Text, oder schick Nils die Sprachnachricht direkt per WhatsApp.',
      unterbrochen: 'Die Aufnahme wurde beendet, weil du die Seite verlassen hast. Du kannst sie anhören oder neu aufnehmen.',
      foto: 'Foto', foto_wahl: 'Aus Galerie', foto_n: '%1 Foto angehängt', fotos_n: '%1 Fotos angehängt', foto_max: 'Mehr als %1 Fotos gehen pro Kommentar nicht.',
      speichern: 'Speichern', abbrechen: 'Abbrechen', leer: 'Schreib etwas, nimm eine Sprachnachricht auf oder häng ein Foto an.',
      privat: 'Alles bleibt auf deinem Gerät, bis du auf "An Nils senden" tippst. Dort wählst du selbst, wohin es geht.',
      gespeichert: 'Gespeichert', wartet1: '1 Kommentar wartet auf das Senden.', wartet_n: '%1 Kommentare warten auf das Senden.', alles_gesendet: 'Alle Kommentare sind gesendet.',
      senden: 'An Nils senden', fertig_knopf: 'Fertig', schliessen: 'Schliessen',
      liste_titel: 'Meine Kommentare', liste_leer: 'Noch keine Kommentare. Tippe auf "Kommentar", um einen zu schreiben oder zu sprechen.',
      menue: 'Meine Kommentare', menue_zahl: '%1 gespeichert, %2 noch nicht gesendet', menue_leer: 'Noch keine. Schreiben oder sprechen geht überall.',
      neu_gesendet: 'noch nicht gesendet', gesendet: 'gesendet', sprachn: 'Sprachnachricht %1', fotos_zahl: 'Fotos: %1',
      senden_n: 'An Nils senden (%1)', senden_alle: 'Nochmal senden', entfernen_frage: 'Diesen Kommentar entfernen? Das geht nicht rückgängig.', ja_entfernen: 'Ja, entfernen',
      geteilt: 'Das Teilen-Menü war offen. Wähle dort WhatsApp, Mail oder Nachrichten und sende an Nils. Die Kommentare sind jetzt als gesendet markiert.',
      abbruch: 'Abgebrochen. Nichts wurde gesendet.',
      weitere_wege: 'Dein Browser kann die Dateien nicht direkt ins Teilen-Menü legen. Wähle einen anderen Weg:',
      mail_text: 'Mail mit Text öffnen', zip_laden: 'Alles als ZIP laden', audio_laden: 'Sprachnachricht speichern (%1)', ich_gesendet: 'Ich habe es gesendet',
      mail_hinweis: 'Die Mail-App hängt keine Sprachnachricht von selbst an. Speichere sie und häng sie in der Mail an. Die Adresse ist %1.',
      zip_hinweis: 'Die ZIP-Datei liegt jetzt bei deinen Downloads. Schick sie per Mail oder WhatsApp an Nils (%1).',
      mail_zu_lang: 'Der Text ist für eine Mail zu lang. Lade stattdessen die ZIP-Datei.',
      gemerkt: 'Danke. Die Kommentare sind als gesendet markiert.',
      speicher_warn: 'Dein Browser lässt kein Speichern zu. Der Kommentar bleibt nur, bis du die Seite schliesst. Sende ihn lieber gleich.',
      mail_betreff: 'Spengler-Seite: %1 Kommentare', kopf: 'Spengler (Web), Kommentare', stand: 'Stand', text: 'Text', sprachdatei: 'Sprachnachricht', fotos: 'Fotos', bildschirm: 'Stand auf dem Bildschirm', ansicht: 'Ansicht',
      start_name: 'Start', e_start: 'Startseite'
    },
    en: {
      knopf: 'Comment', knopf_punkt: 'Comment on this point', knopf_seite: 'Write or speak a comment', titel: 'Comment for Nils', zu: 'About: %1',
      text_hint: 'Write what you notice here. For example: this measurement is wrong. Or: I never need this.', text_label: 'Your comment as text',
      sprache: 'Voice message', sprache_hinweis: 'Tap to start and tap to stop. Or press and hold, then let go.',
      mic_erklaerung: 'Your phone will ask next whether this page may use the microphone. It only needs it for your voice message. Nothing is recorded in the background.',
      weiter: 'Continue', nur_text: 'Text only', laeuft: 'Recording', stopp: 'Stop', pegel: 'Level', dauer_max: 'at most %1',
      fertig: 'Your voice message, %1', neu: 'Record again', entfernen: 'Remove',
      zu_kurz: 'That was too short. Tap to start, speak, and tap again to stop.',
      zu_leise: 'The recording is very quiet. Speak closer to the microphone or record it again.',
      mic_gesperrt: 'The microphone is blocked. Write the text, or allow the microphone for this page in the settings.',
      mic_fehlt: 'No microphone was found. Write the text.', mic_fehler: 'The microphone is not working right now. Write the text, or try again later.',
      mic_nicht: 'Voice messages do not work in this browser (on iPhone you need iOS 14.5 or newer). Write the text, or send Nils the voice message directly by WhatsApp.',
      unterbrochen: 'The recording stopped because you left the page. You can listen to it or record again.',
      foto: 'Photo', foto_wahl: 'From gallery', foto_n: '%1 photo attached', fotos_n: '%1 photos attached', foto_max: 'No more than %1 photos per comment.',
      speichern: 'Save', abbrechen: 'Cancel', leer: 'Write something, record a voice message or attach a photo.',
      privat: 'Everything stays on your device until you tap "Send to Nils". There you choose where it goes.',
      gespeichert: 'Saved', wartet1: '1 comment is waiting to be sent.', wartet_n: '%1 comments are waiting to be sent.', alles_gesendet: 'All comments have been sent.',
      senden: 'Send to Nils', fertig_knopf: 'Done', schliessen: 'Close',
      liste_titel: 'My comments', liste_leer: 'No comments yet. Tap "Comment" to write or speak one.',
      menue: 'My comments', menue_zahl: '%1 saved, %2 not sent yet', menue_leer: 'None yet. You can write or speak anywhere.',
      neu_gesendet: 'not sent yet', gesendet: 'sent', sprachn: 'Voice message %1', fotos_zahl: 'Photos: %1',
      senden_n: 'Send to Nils (%1)', senden_alle: 'Send again', entfernen_frage: 'Remove this comment? This cannot be undone.', ja_entfernen: 'Yes, remove',
      geteilt: 'The share menu was open. Pick WhatsApp, Mail or Messages there and send it to Nils. The comments are now marked as sent.',
      abbruch: 'Cancelled. Nothing was sent.',
      weitere_wege: 'Your browser cannot put the files into the share menu directly. Pick another way:',
      mail_text: 'Open mail with the text', zip_laden: 'Download everything as ZIP', audio_laden: 'Save voice message (%1)', ich_gesendet: 'I have sent it',
      mail_hinweis: 'The mail app does not attach a voice message by itself. Save it and attach it to the mail. The address is %1.',
      zip_hinweis: 'The ZIP file is now in your downloads. Send it to Nils (%1) by mail or WhatsApp.',
      mail_zu_lang: 'The text is too long for a mail. Download the ZIP file instead.',
      gemerkt: 'Thanks. The comments are marked as sent.',
      speicher_warn: 'Your browser does not allow saving. The comment only stays until you close the page. Send it right away.',
      mail_betreff: 'Spengler page: %1 comments', kopf: 'Spengler (web), comments', stand: 'As of', text: 'Text', sprachdatei: 'Voice message', fotos: 'Photos', bildschirm: 'State on screen', ansicht: 'View',
      start_name: 'Start', e_start: 'Start page'
    }
  };
  const KT = (k, ...a) => { const sp = S.sprache(); let s = (TX[sp] && TX[sp][k] != null) ? TX[sp][k] : (TX.de[k] != null ? TX.de[k] : k); return s.replace(/%(\d)/g, (m, i) => a[i - 1] == null ? '' : String(a[i - 1])); };
  S.KT = KT;

  const z2 = n => String(n).padStart(2, '0');
  const jetzt = () => { const d = new Date(); return d.getFullYear() + '-' + z2(d.getMonth() + 1) + '-' + z2(d.getDate()) + 'T' + z2(d.getHours()) + ':' + z2(d.getMinutes()) + ':' + z2(d.getSeconds()); };
  const stempel = zeit => zeit.replace(/[^0-9]/g, '').replace(/^(\d{8})(\d{6})$/, '$1_$2');
  const dauerText = ms => { const s = Math.round(ms / 1000); return Math.floor(s / 60) + ':' + z2(s % 60); };
  const sauber = s => String(s || 'start').replace(/[^A-Za-z0-9_]+/g, '_').replace(/^_+|_+$/g, '').slice(0, 30) || 'start';
  const ascii = s => String(s || '').replace(/ä/g, 'ae').replace(/ö/g, 'oe').replace(/ü/g, 'ue').replace(/Ä/g, 'Ae').replace(/Ö/g, 'Oe').replace(/Ü/g, 'Ue').replace(/ß/g, 'ss');
  const erst = (fn, wert) => { try { return fn(); } catch (e) { return wert; } };

  // ---------------------------------------------------------------- Speicher
  const DB_NAME = 'spengler_kommentare', STORE = 'k';
  let db = null, liste = [], hoerer = [], initP = null, speicherOk = true;
  function oeffneDb() {
    return new Promise(res => {
      try {
        if (!root.indexedDB) { res(false); return; }
        const rq = indexedDB.open(DB_NAME, 1);
        rq.onupgradeneeded = () => { try { rq.result.createObjectStore(STORE, { keyPath: 'id' }); } catch (e) { /* */ } };
        rq.onsuccess = () => { db = rq.result; res(true); };
        rq.onerror = () => res(false); rq.onblocked = () => res(false);
      } catch (e) { res(false); }
    });
  }
  const dbAlle = () => new Promise(res => { try { const rq = db.transaction(STORE, 'readonly').objectStore(STORE).getAll(); rq.onsuccess = () => res(rq.result || []); rq.onerror = () => res(null); } catch (e) { res(null); } });
  const dbTun = (art, wert) => new Promise(res => { try { const t = db.transaction(STORE, 'readwrite'); const os = t.objectStore(STORE); if (art === 'put') os.put(wert); else os.delete(wert); t.oncomplete = () => res(true); t.onerror = t.onabort = () => res(false); } catch (e) { res(false); } });
  // Text-Spiegel in localStorage: bleibt auch erhalten, wenn IndexedDB nicht geht (Audio und Fotos dann nur im Speicher)
  const spiegel = () => liste.map(r => ({ id: r.id, zeit: r.zeit, teil: r.teil, teilName: r.teilName, ansicht: r.ansicht, adresse: r.adresse, eingaben: r.eingaben, text: r.text, gesendet: r.gesendet,
    audio: r.audio ? { ext: r.audio.ext, mime: r.audio.mime, dauerMs: r.audio.dauerMs, verloren: true } : null, fotos: r.fotos.map(f => ({ name: f.name, verloren: true })), sprache: r.sprache, appVersion: r.appVersion }));
  const schreibeSpiegel = () => erst(() => S.schreibe('km_text', JSON.stringify(spiegel())));
  const meldeAenderung = () => { for (const f of hoerer.slice()) erst(() => f()); };

  const KM = S.KM = {
    init() {
      if (initP) return initP;
      initP = (async () => {
        const ok = await oeffneDb(); let aus = null;
        if (ok) aus = await dbAlle();
        if (aus) liste = aus; else { liste = erst(() => JSON.parse(S.lies('km_text') || '[]'), []); speicherOk = !!ok; }
        if (ok && aus && !aus.length) { const sp = erst(() => JSON.parse(S.lies('km_text') || '[]'), []); if (sp.length) liste = sp; }
        liste.sort((a, b) => a.zeit < b.zeit ? -1 : a.zeit > b.zeit ? 1 : 0);
        meldeAenderung();
      })();
      return initP;
    },
    alle() { return liste.slice(); },
    anzahl() { return liste.length; },
    neue() { return liste.filter(r => !r.gesendet); },
    beiAenderung(f) { hoerer.push(f); return () => { hoerer = hoerer.filter(x => x !== f); }; },
    async speichere(r) {
      liste.push(r); schreibeSpiegel();
      let ok = false; if (db) ok = await dbTun('put', r);
      if (!ok) speicherOk = false;
      erst(() => navigator.storage && navigator.storage.persist && navigator.storage.persist());
      meldeAenderung(); return ok;
    },
    async setzeGesendet(ids, wert) {
      for (const r of liste) if (ids.includes(r.id)) { r.gesendet = wert; if (db) await dbTun('put', r); }
      schreibeSpiegel(); meldeAenderung();
    },
    async entferne(id) { liste = liste.filter(r => r.id !== id); if (db) await dbTun('del', id); schreibeSpiegel(); meldeAenderung(); },
    get speicherOk() { return speicherOk; }
  };
  KM.init();

  // ---------------------------------------------------------------- Kontext der Seite (automatisch dabei)
  const sichtbar = e => !!(e && (e.offsetParent || e.getClientRects().length));
  function felderLesen() {
    const wurzel = document.getElementById('app'); if (!wurzel) return '';
    const out = [];
    for (const e of wurzel.querySelectorAll('input:not([type=file]):not([type=hidden]), textarea, select')) {
      if (!sichtbar(e)) continue;
      let wert = e.tagName === 'SELECT' ? (e.options[e.selectedIndex] ? e.options[e.selectedIndex].text : '') : e.value;
      wert = String(wert || '').trim(); if (!wert) continue;
      const lab = erst(() => (e.closest('.feld') && e.closest('.feld').querySelector('.lab')) ? e.closest('.feld').querySelector('.lab').textContent : '', '') || e.getAttribute('aria-label') || '';
      out.push((lab.trim().replace(/\s+/g, ' ') + ' = ' + wert.replace(/\n/g, ' ')).replace(/^ = /, ''));
    }
    return out.join(' | ');
  }
  function ansichtLesen() {
    const wurzel = document.getElementById('app'); if (!wurzel) return '';
    const namen = [];
    for (const b of wurzel.querySelectorAll('button.an, .chip.an, .segment .an')) { if (!sichtbar(b)) continue; const t = b.textContent.trim().replace(/\s+/g, ' '); if (t && t.length < 40 && !namen.includes(t)) namen.push(t); }
    return namen.join(', ');
  }
  function titelLesen() { const t = document.querySelector('#app .titel'); return t && t.textContent.trim() ? t.textContent.trim().replace(/\s+/g, ' ') : (S.T('app_name') || 'Spengler'); }
  /** Baut die Kontext-Funktion fuer eine Seite. [seite] darf kontext() liefern: {ansicht, eingaben, teilName, punkt}. */
  S.kmKontextFuer = (route, seite) => () => {
    const artName = seite && seite.art ? S.T('ablauf_sk_' + String(seite.art).replace('skizze_', '')) : '';
    const k = { teil: sauber(route), teilName: route === 'start' ? S.T('home_titel') : (artName && !artName.startsWith('ablauf_sk_') ? artName : titelLesen()), ansicht: '', eingaben: '', adresse: location.hash || '#start', punkt: '' };
    erst(() => { if (seite && seite.kontext) Object.assign(k, seite.kontext()); });
    if (!k.ansicht) k.ansicht = erst(ansichtLesen, '');
    if (!k.eingaben) k.eingaben = erst(felderLesen, '');
    return k;
  };
  const kontextText = k => k.teilName + (k.ansicht ? ', ' + KT('ansicht') + ' ' + k.ansicht : '') + (k.punkt ? ', ' + k.punkt : '');

  // ---------------------------------------------------------------- Symbole
  const icoBlase = (px, farbe) => S.svg('<path d="M4 4h16a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2h-8l-5 4v-4H4a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2z" fill="none" stroke="' + (farbe || 'currentColor') + '" stroke-width="1.9" stroke-linejoin="round"/><circle cx="8" cy="10.5" r="1.2" fill="' + (farbe || 'currentColor') + '"/><circle cx="12" cy="10.5" r="1.2" fill="' + (farbe || 'currentColor') + '"/><circle cx="16" cy="10.5" r="1.2" fill="' + (farbe || 'currentColor') + '"/>', px, px, '0 0 24 24');
  const icoMic = (px, farbe) => S.svg('<rect x="9" y="2.5" width="6" height="12" rx="3" fill="' + (farbe || 'currentColor') + '"/><path d="M5.5 11.5a6.5 6.5 0 0 0 13 0M12 18v3.5M8.5 21.5h7" fill="none" stroke="' + (farbe || 'currentColor') + '" stroke-width="1.9" stroke-linecap="round"/>', px, px, '0 0 24 24');
  S.kmIcoBlase = icoBlase;

  // ---------------------------------------------------------------- Aufnahme
  function mimeWahl() {
    if (!root.MediaRecorder) return null;
    const l = [['audio/mp4;codecs=mp4a.40.2', 'm4a', 'audio/mp4'], ['audio/mp4', 'm4a', 'audio/mp4'], ['audio/aac', 'aac', 'audio/aac'], ['audio/webm;codecs=opus', 'webm', 'audio/webm'], ['audio/webm', 'webm', 'audio/webm'], ['audio/ogg;codecs=opus', 'ogg', 'audio/ogg']];
    for (const [voll, ext, mime] of l) if (erst(() => MediaRecorder.isTypeSupported(voll), false)) return { voll, ext, mime };
    return { voll: '', ext: 'webm', mime: 'audio/webm' };
  }
  const endung = mime => /mp4|m4a|aac/.test(mime) ? 'm4a' : /ogg/.test(mime) ? 'ogg' : /webm/.test(mime) ? 'webm' : /wav/.test(mime) ? 'wav' : 'm4a';
  const kannAufnehmen = () => !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia && root.MediaRecorder);

  /** Startet eine Aufnahme. Liefert {stopp(): Promise<{blob,mime,ext,dauerMs,pegel}|null>, abbruch(), pegel(): 0..1, sek(): number}. */
  async function starteAufnahme() {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true } });
    const m = mimeWahl(); let rec;
    try { rec = m.voll ? new MediaRecorder(stream, { mimeType: m.voll, audioBitsPerSecond: 64000 }) : new MediaRecorder(stream); }
    catch (e) { try { rec = new MediaRecorder(stream); } catch (e2) { stream.getTracks().forEach(t => t.stop()); throw e2; } }
    const stuecke = []; let ctx = null, an = null, puffer = null, spitze = 0, aktuell = 0, t0 = performance.now(), fertig = false, timer = 0;
    rec.addEventListener('dataavailable', ev => { if (ev.data && ev.data.size) stuecke.push(ev.data); });
    try {
      const AC = root.AudioContext || root.webkitAudioContext;
      if (AC) { ctx = new AC(); if (ctx.state === 'suspended') ctx.resume().catch(() => { }); const q = ctx.createMediaStreamSource(stream); an = ctx.createAnalyser(); an.fftSize = 1024; q.connect(an); puffer = new Float32Array(an.fftSize); }
    } catch (e) { ctx = null; an = null; }
    const messen = () => {
      if (fertig) return;
      if (an) { an.getFloatTimeDomainData(puffer); let s = 0, mx = 0; for (let i = 0; i < puffer.length; i++) { const v = puffer[i]; s += v * v; const a = Math.abs(v); if (a > mx) mx = a; } aktuell = Math.sqrt(s / puffer.length); if (mx > spitze) spitze = mx; }
    };
    timer = setInterval(messen, 50);
    rec.start();
    t0 = performance.now();
    const aufraeumen = () => { fertig = true; clearInterval(timer); stream.getTracks().forEach(t => erst(() => t.stop())); if (ctx) erst(() => ctx.close()); };
    const a = {
      mime: m,
      pegel: () => Math.min(1, aktuell * 4),
      spitze: () => spitze,
      sek: () => (performance.now() - t0) / 1000,
      stopp() {
        return new Promise(res => {
          if (fertig) { res(null); return; }
          const dauerMs = performance.now() - t0; messen();
          rec.addEventListener('stop', () => {
            aufraeumen();
            const typ = (rec.mimeType || m.mime || '').split(';')[0] || m.mime;
            const blob = new Blob(stuecke, { type: typ });
            res(blob.size ? { blob, mime: typ, ext: endung(typ), dauerMs, pegel: Math.round(spitze * 1000) / 1000 } : null);
          }, { once: true });
          try { if (rec.state !== 'inactive') rec.stop(); else { aufraeumen(); res(null); } } catch (e) { aufraeumen(); res(null); }
        });
      },
      abbruch() { if (fertig) return; aufraeumen(); erst(() => { if (rec.state !== 'inactive') rec.stop(); }); }
    };
    return a;
  }

  // ---------------------------------------------------------------- Fotos
  function verkleinere(file) {
    return new Promise(res => {
      try {
        const url = URL.createObjectURL(file), im = new Image();
        im.onload = () => { const s = Math.min(1, 1600 / Math.max(im.width, im.height)), c = document.createElement('canvas'); c.width = Math.round(im.width * s); c.height = Math.round(im.height * s); c.getContext('2d').drawImage(im, 0, 0, c.width, c.height); URL.revokeObjectURL(url); c.toBlob(b => res(b || file), 'image/jpeg', 0.85); };
        im.onerror = () => { URL.revokeObjectURL(url); res(file); }; im.src = url;
      } catch (e) { res(file); }
    });
  }

  // ---------------------------------------------------------------- Fenster (Scrim + Blatt, Tastatur-fest)
  function fenster(inhaltFn, onZu, ohnePush) {
    const blatt = h('div', { class: 'dialog tint kmblatt', role: 'dialog', 'aria-modal': 'true' });
    const sc = h('div', { class: 'scrim km' }, blatt);
    const anpassen = () => {
      const vv = window.visualViewport; if (!vv) return;
      sc.style.top = vv.offsetTop + 'px'; sc.style.height = vv.height + 'px'; sc.style.bottom = 'auto';
    };
    const e = S.dlgOeffnen(sc, () => { if (window.visualViewport) { visualViewport.removeEventListener('resize', anpassen); visualViewport.removeEventListener('scroll', anpassen); } onZu && onZu(); }, ohnePush);
    if (window.visualViewport) { visualViewport.addEventListener('resize', anpassen); visualViewport.addEventListener('scroll', anpassen); }
    anpassen();
    inhaltFn(blatt, () => S.dlgZu(e));
    return e;
  }

  // ---------------------------------------------------------------- Blatt: neuer Kommentar
  S.kmBlatt = function (kontext, ohnePush) {
    const k0 = kontext ? kontext() : { teil: 'start', teilName: S.T('home_titel'), ansicht: '', eingaben: '', adresse: location.hash, punkt: '' };
    let blatt = null, audio = null, audioUrl = null, aufn = null, laeuftStart = false, zustand = 'leer', mikOk = !!S.lies('km_mic_ok');
    const fotos = []; let zeitNr = 0, tick = 0, raf = 0, gedrueckt = 0, stopBeiLos = false, geschlossen = false, gespeichertId = null;
    const zeit = jetzt();
    const text = h('textarea', { class: 'kmtext', rows: 4, placeholder: KT('text_hint'), 'aria-label': KT('text_label'), enterkeyhint: 'enter', autocapitalize: 'sentences' });
    const meldung = h('div', { class: 'kmmeld', role: 'status', 'aria-live': 'polite' });
    const sprachBox = h('div', { class: 'kmsprache' });
    const fotoInfo = h('div', { class: 'kmfotoinfo' }), fotoReihe = h('div', { class: 'kmthumbs' });
    const fehl = t => { meldung.textContent = t || ''; meldung.classList.toggle('an', !!t); };
    const datFoto = h('input', { type: 'file', accept: 'image/*', style: { display: 'none' }, 'data-km': 'galerie' });
    const datKam = h('input', { type: 'file', accept: 'image/*', capture: 'environment', style: { display: 'none' }, 'data-km': 'kamera' });
    let zu = () => { };

    const loeseAudio = () => { if (audioUrl) { URL.revokeObjectURL(audioUrl); audioUrl = null; } };
    const stoppeAnzeige = () => { clearInterval(tick); cancelAnimationFrame(raf); };

    // Ein einziger Mikrofon-Knopf bleibt im Baum (Gedrueckt-halten braucht dasselbe Element bis zum Loslassen)
    const mic = h('button', { class: 'kmmic', type: 'button' });
    for (const ev of ['contextmenu', 'selectstart', 'dragstart']) mic.addEventListener(ev, x => x.preventDefault());
    mic.addEventListener('pointerdown', ev => {
      if (ev.button) return;
      try { mic.setPointerCapture(ev.pointerId); } catch (e) { /* */ }
      if (zustand === 'laeuft') { stopBeiLos = true; return; }
      if (zustand === 'leer') { gedrueckt = performance.now(); starte(); }
    });
    mic.addEventListener('pointerup', () => {
      if (stopBeiLos) { stopBeiLos = false; beende(); return; }
      if (aufn && gedrueckt && performance.now() - gedrueckt >= HALTEN_MS) { gedrueckt = 0; beende(); }
    });
    mic.addEventListener('keydown', ev => { if (ev.key !== 'Enter' && ev.key !== ' ') return; ev.preventDefault(); if (zustand === 'laeuft') beende(); else if (zustand === 'leer') { gedrueckt = 0; starte(); } });
    const infoBox = h('div', { class: 'kminfo' });
    sprachBox.append(mic, infoBox);

    function zeigeSprache() {
      infoBox.textContent = ''; stoppeAnzeige();
      mic.classList.toggle('stopp', zustand === 'laeuft'); mic.disabled = zustand === 'fehler' || zustand === 'erklaerung'; mic.style.display = zustand === 'fertig' ? 'none' : '';
      mic.textContent = '';
      if (zustand === 'laeuft') { mic.append(h('span', { class: 'kmpunkt' }), h('span', { text: KT('stopp') })); mic.setAttribute('aria-label', KT('stopp')); }
      else { mic.append(icoMic(28, '#fff'), h('span', { text: KT('sprache') })); mic.setAttribute('aria-label', KT('sprache')); }
      if (zustand === 'leer') {
        infoBox.append(h('div', { class: 'kmhinweis', text: KT('sprache_hinweis') }));
      } else if (zustand === 'erklaerung') {
        infoBox.append(h('div', { class: 'kmerkl', text: KT('mic_erklaerung') }),
          h('div', { class: 'kmzeile' }, S.knopf(KT('nur_text'), false, () => { zustand = 'leer'; zeigeSprache(); }), S.knopf(KT('weiter'), true, () => { mikOk = true; S.schreibe('km_mic_ok', '1'); zustand = 'leer'; zeigeSprache(); gedrueckt = 0; starte(); })));
      } else if (zustand === 'laeuft') {
        const zeitEl = h('div', { class: 'kmzeit', text: '0:00' }), fuell = h('div', { class: 'kmpegelfuell' });
        const pegel = h('div', { class: 'kmpegel', role: 'meter', 'aria-label': KT('pegel'), 'aria-valuemin': 0, 'aria-valuemax': 1 }, fuell);
        infoBox.append(h('div', { class: 'kmlauf' }, h('span', { class: 'kmpunkt' }), h('span', { class: 'kmlauftext', text: KT('laeuft') }), zeitEl, h('span', { class: 'kmmax', text: '/ ' + dauerText(MAX_SEK * 1000) })), pegel);
        tick = setInterval(() => { if (!aufn) return; const s = aufn.sek(); zeitEl.textContent = dauerText(s * 1000); if (s >= MAX_SEK) beende(); }, 200);
        const rahmen = () => { if (aufn) { const p = aufn.pegel(); fuell.style.transform = 'scaleX(' + Math.max(0.02, p).toFixed(3) + ')'; pegel.setAttribute('aria-valuenow', p.toFixed(2)); } raf = requestAnimationFrame(rahmen); };
        raf = requestAnimationFrame(rahmen);
      } else if (zustand === 'fertig') {
        const a = h('audio', { controls: true, preload: 'metadata', src: audioUrl, 'aria-label': KT('fertig', dauerText(audio.dauerMs)) });
        infoBox.append(h('div', { class: 'kmfertig' }, icoMic(22, 'var(--pri)'), h('span', { text: KT('fertig', dauerText(audio.dauerMs)) })), a,
          h('div', { class: 'kmzeile' }, S.knopf(KT('neu'), false, () => { loeseAudio(); audio = null; zustand = 'leer'; fehl(''); zeigeSprache(); gedrueckt = 0; starte(); }), S.knopf(KT('entfernen'), false, () => { loeseAudio(); audio = null; zustand = 'leer'; fehl(''); zeigeSprache(); })));
      }
    }

    async function starte() {
      if (aufn || laeuftStart) return;
      fehl('');
      if (!kannAufnehmen()) { zustand = 'fehler'; fehl(KT('mic_nicht')); zeigeSprache(); return; }
      if (!mikOk) { zustand = 'erklaerung'; zeigeSprache(); return; }
      laeuftStart = true;
      try {
        const a = await starteAufnahme();
        if (geschlossen) { a.abbruch(); return; }
        aufn = a; zustand = 'laeuft'; laeuftStart = false; zeigeSprache();
      } catch (e) {
        laeuftStart = false; zustand = 'fehler';
        const n = e && e.name;
        if (n === 'NotAllowedError' || n === 'SecurityError' || n === 'PermissionDeniedError') fehl(KT('mic_gesperrt'));
        else if (n === 'NotFoundError' || n === 'OverconstrainedError') fehl(KT('mic_fehlt'));
        else fehl(KT('mic_fehler'));
        zeigeSprache();
      }
    }

    async function beende(grund) {
      if (!aufn) { return; }
      const a = aufn; aufn = null; stoppeAnzeige();
      const r = await a.stopp();
      if (geschlossen) return;
      if (!r || r.dauerMs < MIN_MS) { zustand = 'leer'; fehl(KT('zu_kurz')); zeigeSprache(); return; }
      audio = r; loeseAudio(); audioUrl = URL.createObjectURL(r.blob); zustand = 'fertig';
      fehl(grund === 'weg' ? KT('unterbrochen') : (r.pegel < LEISE ? KT('zu_leise') : ''));
      zeigeSprache();
    }
    const beiVersteckt = () => { if (document.hidden && aufn) beende('weg'); };
    document.addEventListener('visibilitychange', beiVersteckt);

    // Fotos
    function zeigeFotos() {
      fotoReihe.textContent = '';
      fotos.forEach((f, i) => {
        const u = URL.createObjectURL(f.blob);
        const t = h('div', { class: 'kmthumb' }, h('img', { src: u, alt: '', onload: () => URL.revokeObjectURL(u) }), h('button', { type: 'button', class: 'kmx', 'aria-label': KT('entfernen'), text: '×', onclick: () => { fotos.splice(i, 1); zeigeFotos(); } }));
        fotoReihe.append(t);
      });
      fotoInfo.textContent = fotos.length === 0 ? '' : fotos.length === 1 ? KT('foto_n', 1) : KT('fotos_n', fotos.length);
    }
    const nimmFoto = async ev => {
      const f = ev.target.files && ev.target.files[0]; ev.target.value = ''; if (!f) return;
      if (fotos.length >= MAX_FOTOS) { fehl(KT('foto_max', MAX_FOTOS)); return; }
      fehl(''); const blob = await verkleinere(f);
      fotos.push({ name: 'Foto_' + sauber(ascii(k0.teilName)) + '_' + stempel(zeit) + '_' + (++zeitNr) + '.jpg', blob }); zeigeFotos();
    };
    datFoto.addEventListener('change', nimmFoto); datKam.addEventListener('change', nimmFoto);

    // Speichern
    async function speichere() {
      const t = text.value.trim();
      if (!t && !audio && !fotos.length) { fehl(KT('leer')); return; }
      if (aufn) await beende();
      const id = stempel(zeit) + '_' + sauber(k0.teil);
      const r = { id, zeit, teil: k0.teil, teilName: k0.teilName, ansicht: k0.ansicht || '', adresse: k0.adresse || '', punkt: k0.punkt || '', eingaben: k0.eingaben || '', text: t,
        audio: audio ? { blob: audio.blob, mime: audio.mime, ext: audio.ext, dauerMs: Math.round(audio.dauerMs), pegel: audio.pegel, name: 'Kommentar_' + sauber(ascii(k0.teilName)) + '_' + stempel(zeit) + '.' + audio.ext } : null,
        fotos: fotos.map(f => ({ name: f.name, blob: f.blob })), gesendet: false, appVersion: APP, sprache: S.sprache() };
      const ok = await KM.speichere(r); gespeichertId = id;
      zeigeFertig(ok);
    }

    function zeigeFertig(ok) {
      stoppeAnzeige();
      const n = KM.neue().length;
      blatt.textContent = ''; loeseAudio();
      const haken = S.erfolgView(); haken.className = 'erfolg kmhaken';
      blatt.append(h('div', { class: 'dk kmdk', style: { textAlign: 'center', padding: '22px 20px 14px' } }, haken,
        h('h2', { text: KT('gespeichert'), style: { marginTop: '4px' } }),
        h('div', { class: 'kmhinweis', style: { marginTop: '6px' }, text: n === 1 ? KT('wartet1') : n > 1 ? KT('wartet_n', n) : KT('alles_gesendet') }),
        ok ? null : h('div', { class: 'kmmeld an', text: KT('speicher_warn') }),
        h('div', { class: 'kmmeld', role: 'status' }),
        h('div', { class: 'kmzeile', style: { marginTop: '16px' } }, S.knopf(KT('fertig_knopf'), false, () => zu()), S.knopf(KT('senden'), true, () => { blatt.textContent = ''; baueListe(blatt, zu); }))));
      haken.start && haken.start();
    }

    function schliesse() {
      geschlossen = true; document.removeEventListener('visibilitychange', beiVersteckt); stoppeAnzeige();
      if (aufn) { aufn.abbruch(); aufn = null; } loeseAudio();
    }

    fenster((blatt1, zumachen) => {
      blatt = blatt1; zu = zumachen;
      const kopf = h('div', { class: 'kmkopf' }, icoBlase(26, 'var(--pri)'), h('h2', { text: KT('titel') }));
      const kontextZeile = h('div', { class: 'kmkontext', text: KT('zu', kontextText(k0)) });
      const fotoZeile = h('div', { class: 'kmzeile', style: { marginTop: '10px' } }, S.knopf(KT('foto'), false, () => { fehl(''); if (fotos.length >= MAX_FOTOS) fehl(KT('foto_max', MAX_FOTOS)); else datKam.click(); }), S.knopf(KT('foto_wahl'), false, () => { fehl(''); if (fotos.length >= MAX_FOTOS) fehl(KT('foto_max', MAX_FOTOS)); else datFoto.click(); }));
      blatt.append(h('div', { class: 'dk kmdk' }, kopf, kontextZeile, text, sprachBox, fotoZeile, fotoReihe, fotoInfo, datFoto, datKam, meldung,
        h('div', { class: 'kmprivat', text: KT('privat') })),
        h('div', { class: 'kmfuss' }, S.knopf(KT('abbrechen'), false, () => zu()), S.knopf(KT('speichern'), true, speichere)));
      zeigeSprache();
    }, () => { schliesse(); freiUrls(); }, ohnePush);
  };

  // ---------------------------------------------------------------- Paket zum Senden (Text, Dateien)
  function paketBauen(rs) {
    const zeile = [KT('kopf'), KT('stand') + ' ' + jetzt().replace('T', ' ').slice(0, 16), ''];
    const dateien = [], audios = [];
    rs.forEach((r, i) => {
      zeile.push((i + 1) + '. ' + r.teilName + (r.ansicht ? ', ' + KT('ansicht') + ' ' + r.ansicht : '') + (r.punkt ? ', ' + r.punkt : '') + ' (' + r.zeit.replace('T', ' ').slice(0, 16) + ')');
      if (r.text) zeile.push('   ' + KT('text') + ': ' + r.text.replace(/\n/g, '\n   '));
      if (r.audio) { zeile.push('   ' + KT('sprachdatei') + ': ' + r.audio.name + ' (' + dauerText(r.audio.dauerMs) + ')'); audios.push(r); }
      if (r.fotos.length) zeile.push('   ' + KT('fotos') + ': ' + r.fotos.map(f => f.name).join(', '));
      if (r.eingaben) zeile.push('   ' + KT('bildschirm') + ': ' + r.eingaben.replace(/\n/g, ' | '));
      zeile.push('');
    });
    const text = zeile.join('\n').trim() + '\n';
    return { text, betreff: KT('mail_betreff', rs.length), rs, audios };
  }
  /** Dateien fuer das Teilen-Menue. Der Typ der Sprachdatei wird so gewaehlt, wie der Browser ihn zum Teilen zulaesst. */
  function dateienFuer(paket) {
    const out = [];
    const txt = new File([paket.text], 'Kommentare.txt', { type: 'text/plain' });
    const typen = r => /m4a|mp4/.test(r.audio.ext) ? ['audio/mp4', 'audio/x-m4a', 'audio/m4a'] : [r.audio.mime];
    for (const r of paket.rs) {
      if (r.audio) {
        let f = null;
        for (const t of typen(r)) { const k = new File([r.audio.blob], r.audio.name, { type: t }); if (!navigator.canShare || erst(() => navigator.canShare({ files: [k] }), false)) { f = k; break; } if (!f) f = k; }
        out.push(f);
      }
      for (const x of r.fotos) out.push(new File([x.blob], x.name, { type: 'image/jpeg' }));
    }
    out.push(txt);
    return out;
  }
  // ---------------------------------------------------------------- ZIP (ohne Kompression), fuer den letzten Rueckfall
  const CRC = (() => { const t = new Uint32Array(256); for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; } return t; })();
  const crc32 = b => { let c = 0xFFFFFFFF; for (let i = 0; i < b.length; i++) c = CRC[(c ^ b[i]) & 255] ^ (c >>> 8); return (c ^ 0xFFFFFFFF) >>> 0; };
  async function zipBauen(eintraege) {
    const enc = new TextEncoder(), teile = [], zentral = []; let pos = 0;
    const d = new Date(), dosZeit = (d.getHours() << 11) | (d.getMinutes() << 5) | (d.getSeconds() >> 1), dosDatum = ((d.getFullYear() - 1980) << 9) | ((d.getMonth() + 1) << 5) | d.getDate();
    for (const e of eintraege) {
      const daten = e.daten instanceof Uint8Array ? e.daten : new Uint8Array(await e.daten.arrayBuffer()), name = enc.encode(e.name), crc = crc32(daten);
      const kopf = new DataView(new ArrayBuffer(30)); kopf.setUint32(0, 0x04034b50, true); kopf.setUint16(4, 20, true); kopf.setUint16(6, 0x0800, true); kopf.setUint16(8, 0, true); kopf.setUint16(10, dosZeit, true); kopf.setUint16(12, dosDatum, true);
      kopf.setUint32(14, crc, true); kopf.setUint32(18, daten.length, true); kopf.setUint32(22, daten.length, true); kopf.setUint16(26, name.length, true); kopf.setUint16(28, 0, true);
      teile.push(new Uint8Array(kopf.buffer), name, daten);
      const z = new DataView(new ArrayBuffer(46)); z.setUint32(0, 0x02014b50, true); z.setUint16(4, 20, true); z.setUint16(6, 20, true); z.setUint16(8, 0x0800, true); z.setUint16(10, 0, true); z.setUint16(12, dosZeit, true); z.setUint16(14, dosDatum, true);
      z.setUint32(16, crc, true); z.setUint32(20, daten.length, true); z.setUint32(24, daten.length, true); z.setUint16(28, name.length, true); z.setUint32(42, pos, true);
      zentral.push(new Uint8Array(z.buffer), name);
      pos += 30 + name.length + daten.length;
    }
    let zl = 0; for (const t of zentral) zl += t.length;
    const ende = new DataView(new ArrayBuffer(22)); ende.setUint32(0, 0x06054b50, true); ende.setUint16(8, eintraege.length, true); ende.setUint16(10, eintraege.length, true); ende.setUint32(12, zl, true); ende.setUint32(16, pos, true);
    return new Blob([...teile, ...zentral, new Uint8Array(ende.buffer)], { type: 'application/zip' });
  }
  S.kmZip = zipBauen;
  async function zipFuer(paket) {
    const ein = [{ name: 'Kommentare.txt', daten: new TextEncoder().encode(paket.text) }];
    const json = paket.rs.map(r => ({ id: r.id, zeit: r.zeit, teil: r.teil, teilName: r.teilName, ansicht: r.ansicht, punkt: r.punkt, text: r.text, eingaben: r.eingaben, adresse: r.adresse,
      audio: r.audio ? { datei: 'audio/' + r.audio.name, dauerMs: r.audio.dauerMs, pegel: r.audio.pegel, mime: r.audio.mime } : null, fotos: r.fotos.map(f => 'fotos/' + f.name), appVersion: r.appVersion, sprache: r.sprache }));
    ein.push({ name: 'kommentare.json', daten: new TextEncoder().encode(JSON.stringify(json, null, 2)) });
    for (const r of paket.rs) { if (r.audio) ein.push({ name: 'audio/' + r.audio.name, daten: r.audio.blob }); for (const f of r.fotos) ein.push({ name: 'fotos/' + f.name, daten: f.blob }); }
    return zipBauen(ein);
  }
  const zipName = () => 'Spengler_Kommentare_' + stempel(jetzt()) + '.zip';

  /** Sendet die Kommentare [rs]. Muss direkt aus einem Tipp aufgerufen werden (Teilen-Menue braucht die Geste). [ui] hat ok(text), info(text), box (fuer die Ausweich-Wege). */
  /** Nach einem Neustart ohne IndexedDB gibt es nur den Text: Sprachdatei und Fotos ohne Daten nicht mitsenden. */
  const lebend = r => (r.audio && !r.audio.blob) || r.fotos.some(f => !f.blob) ? Object.assign({}, r, { audio: r.audio && r.audio.blob ? r.audio : null, fotos: r.fotos.filter(f => f.blob) }) : r;
  S.kmSenden = async function (rs, ui) {
    if (!rs.length) return 'leer';
    rs = rs.map(lebend);
    // Dateien sind schon im Speicher: bis zu 9 Dateien je Teilen-Menue (Chrome erlaubt 10), grosse Mengen in Paketen
    let paketRs = [], n = 0;
    for (const r of rs) { const d = (r.audio ? 1 : 0) + r.fotos.length; if (paketRs.length && n + d > 8) break; paketRs.push(r); n += d; }
    const rest = rs.length - paketRs.length;
    const paket = paketBauen(paketRs), ids = paketRs.map(r => r.id);
    const dateien = dateienFuer(paket);
    const daten = { title: paket.betreff, text: paket.text, files: dateien };
    let erlaubt = false; erst(() => { erlaubt = !!(navigator.share && navigator.canShare && navigator.canShare({ files: dateien })); }, false);
    if (erlaubt) {
      try {
        await navigator.share(daten);
        await KM.setzeGesendet(ids, true);
        ui.ok(KT('geteilt') + (rest ? ' (' + rest + ' weitere warten, tippe nochmal auf Senden.)' : ''));
        return 'geteilt';
      } catch (e) {
        if (e && e.name === 'AbortError') { ui.info(KT('abbruch')); return 'abbruch'; }
        /* anderer Fehler: Ausweich-Wege zeigen */
      }
    }
    ausweichen(paket, ids, ui);
    return 'ausweichen';
  };
  function ausweichen(paket, ids, ui) {
    const box = ui.box; box.textContent = '';
    const meld = h('div', { class: 'kmmeld an', role: 'status' }); meld.style.display = 'none';
    const zeigeM = t => { meld.textContent = t; meld.style.display = t ? 'block' : 'none'; };
    box.append(h('div', { class: 'kmhinweis', text: KT('weitere_wege') }));
    const mailBody = paket.text, mailUrl = 'mailto:' + EMPF + '?subject=' + encodeURIComponent(paket.betreff) + '&body=' + encodeURIComponent(mailBody);
    const mailBtn = S.knopf(KT('mail_text'), false, () => {
      if (mailUrl.length > 6000) { zeigeM(KT('mail_zu_lang')); return; }
      location.href = mailUrl; zeigeM(KT('mail_hinweis', EMPF));
    });
    const zipBtn = S.knopf(KT('zip_laden'), false, async () => { const b = await zipFuer(paket); S.download(b, zipName()); zeigeM(KT('zip_hinweis', EMPF)); });
    box.append(h('div', { class: 'kmweg' }, mailBtn), h('div', { class: 'kmweg' }, zipBtn));
    for (const r of paket.audios) box.append(h('div', { class: 'kmweg' }, S.knopf(KT('audio_laden', dauerText(r.audio.dauerMs)), false, () => S.download(r.audio.blob, r.audio.name))));
    box.append(meld, h('div', { class: 'kmweg' }, S.knopf(KT('ich_gesendet'), false, async () => { await KM.setzeGesendet(ids, true); ui.ok(KT('gemerkt')); box.textContent = ''; })));
  }
  S.kmPaket = { bauen: paketBauen, zip: zipFuer, dateien: dateienFuer };

  // ---------------------------------------------------------------- Blatt: Meine Kommentare (Liste und Senden)
  const listeUrls = [];
  const freiUrls = () => { for (const u of listeUrls.splice(0)) URL.revokeObjectURL(u); };
  function baueListe(blatt, zu) {
    const inhalt = h('div', { class: 'kmliste' });
    const meld = h('div', { class: 'kmmeld', role: 'status', 'aria-live': 'polite' });
    const box = h('div', { class: 'kmausweg' });
    const sendeKnopf = h('button', { class: 'knopf prim kmsenden', type: 'button' });
    const ui = { box, ok: t => { meld.textContent = t; meld.className = 'kmmeld an ok'; }, info: t => { meld.textContent = t; meld.className = 'kmmeld an'; } };
    const zeichne = () => {
      inhalt.textContent = ''; freiUrls();
      const alle = KM.alle().reverse();
      if (!alle.length) inhalt.append(h('div', { class: 'kmhinweis', text: KT('liste_leer') }));
      for (const r of alle) {
        const kopf = h('div', { class: 'kmitkopf' }, h('span', { class: 'kmittitel', text: r.teilName + (r.ansicht ? ', ' + r.ansicht : '') + (r.punkt ? ', ' + r.punkt : '') }),
          h('span', { class: 'kmstatus' + (r.gesendet ? ' ok' : ''), text: r.gesendet ? KT('gesendet') : KT('neu_gesendet') }));
        const k = h('div', { class: 'kmitem', 'data-id': r.id }, kopf, h('div', { class: 'kmitzeit', text: r.zeit.replace('T', ' ').slice(0, 16) }));
        if (r.text) k.append(h('div', { class: 'kmittext', text: r.text }));
        if (r.audio) {
          if (r.audio.blob) { const u = URL.createObjectURL(r.audio.blob); listeUrls.push(u); k.append(h('div', { class: 'kmitaudio' }, icoMic(18, 'var(--pri)'), h('span', { text: KT('sprachn', dauerText(r.audio.dauerMs)) })), h('audio', { controls: true, preload: 'metadata', src: u })); }
          else k.append(h('div', { class: 'kmitaudio' }, icoMic(18, 'var(--text2)'), h('span', { text: KT('sprachn', dauerText(r.audio.dauerMs)) + ' (nicht mehr gespeichert)' })));
        }
        if (r.fotos.length) k.append(h('div', { class: 'kmitzeit', text: KT('fotos_zahl', r.fotos.length) }));
        const weg = h('button', { class: 'kmwegbtn', type: 'button', text: KT('entfernen') });
        weg.addEventListener('click', () => {
          weg.replaceWith(h('span', { class: 'kmfrage' }, h('span', { text: KT('entfernen_frage') }), h('button', { class: 'kmwegbtn ja', type: 'button', text: KT('ja_entfernen'), onclick: async () => { await KM.entferne(r.id); } }), h('button', { class: 'kmwegbtn', type: 'button', text: KT('abbrechen'), onclick: () => zeichne() })));
        });
        k.append(weg); inhalt.append(k);
      }
      const n = KM.neue().length, alleN = KM.anzahl();
      sendeKnopf.textContent = n ? KT('senden_n', n) : (alleN ? KT('senden_alle') : KT('senden'));
      sendeKnopf.disabled = !alleN;
    };
    const abo = KM.beiAenderung(() => { if (blatt.isConnected) zeichne(); else abo(); });
    sendeKnopf.addEventListener('click', () => { box.textContent = ''; meld.textContent = ''; meld.className = 'kmmeld'; const n = KM.neue(); S.kmSenden(n.length ? n : KM.alle(), ui); });
    blatt.append(h('div', { class: 'dk kmdk' }, h('div', { class: 'kmkopf' }, icoBlase(26, 'var(--pri)'), h('h2', { text: KT('liste_titel') })), inhalt, meld, box),
      h('div', { class: 'kmfuss' }, S.knopf(KT('schliessen'), false, () => zu()), sendeKnopf));
    zeichne(); KM.init().then(() => { if (blatt.isConnected) zeichne(); });
  }
  S.kmListe = function (ohnePush) { fenster((blatt, zu) => baueListe(blatt, zu), freiUrls, ohnePush); };

  // ---------------------------------------------------------------- Knopf auf jedem Bildschirm
  S.kmKnopf = function (kontext, platz) {
    const b = h('button', { class: 'ov ovi km ' + (platz || 'p3'), type: 'button', 'aria-label': KT('knopf') }, S.svg('<circle cx="18" cy="18" r="16.4" fill="#151515" fill-opacity=".8"/><circle cx="18" cy="18" r="16.4" fill="none" stroke="#5AA7F0" stroke-width="1.5"/><g transform="translate(8.5 8.5) scale(.8)"><path d="M4 4h16a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2h-8l-5 4v-4H4a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2z" fill="none" stroke="#5AA7F0" stroke-width="2.1" stroke-linejoin="round"/><circle cx="8" cy="10.5" r="1.3" fill="#5AA7F0"/><circle cx="12" cy="10.5" r="1.3" fill="#5AA7F0"/><circle cx="16" cy="10.5" r="1.3" fill="#5AA7F0"/></g>', 36, 36, '0 0 36 36'));
    b.addEventListener('click', () => S.kmBlatt(kontext));
    return b;
  };

  /** Kleiner Textknopf fuer eine einzelne Karte (zum Beispiel ein Punkt in "Kurz bestaetigen"). */
  S.kmKnopfKarte = function (kontext, textKey) {
    const b = h('button', { class: 'kmlink', type: 'button' }, icoBlase(18, 'var(--pri)'), h('span', { text: KT(textKey || 'knopf_punkt') }));
    b.addEventListener('click', () => S.kmBlatt(kontext));
    return b;
  };

  /** Zeile fuer das Hauptmenue: Meine Kommentare mit Zaehler. */
  S.kmMenueZeile = function () {
    const sub = h('span', { class: 'kmmsub' });
    const b = h('button', { class: 'kmmenue', type: 'button' }, icoBlase(28, 'var(--pri)'), h('span', { class: 'kmmtext' }, h('b', { text: KT('menue') }), sub));
    const zeige = () => { const a = KM.anzahl(), n = KM.neue().length; sub.textContent = a ? KT('menue_zahl', a, n) : KT('menue_leer'); };
    zeige(); KM.beiAenderung(zeige);
    b.addEventListener('click', () => S.kmListe());
    return b;
  };

  // Test und Direktlinks: Adresse #...+kommentar oeffnet das Blatt, +kommentare die Liste (siehe app.js)
})(window);
