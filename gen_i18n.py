#!/usr/bin/env python3
"""Generate i18n.json for the landing page by translating the English source
strings into every target locale via the free Google Translate endpoint
(same approach the apps use). Token-free: translations come from the API."""
import json, time, urllib.parse, urllib.request
from pathlib import Path

OUT = Path(__file__).resolve().parent / "i18n.json"

# key -> English source. App titles + descriptions included.
SRC = {
    "tag": "Industrial Engineer (BSc) · independent Android developer",
    "bio": "I build small, fast Android tools that do one thing well — and respect your privacy while doing it. No accounts, no tracking, no clutter.",
    "privacy": "Privacy",
    "apps": "Apps",
    "lead": "A growing family of focused utilities for Android.",
    "vTrack": "No tracking", "vAcct": "No accounts", "vLang": "Many languages", "vLight": "Lightweight",
    "t_flashlight": "Flashlight", "d_flashlight": "LED torch, SOS and strobe with a widget and Quick Settings tile.",
    "t_compass": "Compass", "d_compass": "Tilt-compensated true-north compass with GPS coordinates.",
    "t_geofinder": "GeoFinder", "d_geofinder": "Navigate to any coordinate — geocaching, hiking, surveying.",
    "t_bubble": "Bubble Level & Ruler", "d_bubble": "Two-axis spirit level plus an on-screen ruler.",
    "t_protractor": "Protractor", "d_protractor": "Sensor-based angle meter with snap-to-common angles.",
    "t_metal": "Metal Detector", "d_metal": "Magnetometer-based finder with an honest delta meter.",
    "t_sound": "Sound Meter", "d_sound": "A-weighted decibel readout with peak and average.",
    "t_speed": "Speedometer", "d_speed": "HUD-style GPS speed, km/h and mph, with a mirror mode.",
    "t_nfc": "NFC Reader", "d_nfc": "Single-purpose NDEF tag reader with full payload view.",
}
# target locale -> gtx language code. de-CH reuses de.
LOCALES = {
    "de":"de","fr":"fr","it":"it","es":"es","pt":"pt","nl":"nl","pl":"pl","ru":"ru","uk":"uk",
    "cs":"cs","da":"da","sv":"sv","ro":"ro","hu":"hu","el":"el","tr":"tr","ar":"ar","fa":"fa",
    "he":"iw","hi":"hi","bn":"bn","ur":"ur","th":"th","vi":"vi","id":"id","ms":"ms","tl":"tl",
    "ja":"ja","ko":"ko","zh-CN":"zh-CN","zh-TW":"zh-TW",
}

def gtx(text, tl):
    url = "https://translate.googleapis.com/translate_a/single?client=gtx&sl=en&tl=%s&dt=t&q=%s" % (
        tl, urllib.parse.quote(text))
    req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
    data = json.loads(urllib.request.urlopen(req, timeout=20).read().decode("utf-8"))
    return "".join(seg[0] for seg in data[0] if seg[0])

def batch(strings, tl):
    joined = "\n".join(strings)
    full = gtx(joined, tl)
    out = full.split("\n")
    if len(out) == len(strings):
        return [s.strip() for s in out]
    # fallback: per-string
    res = []
    for s in strings:
        res.append(gtx(s, tl).strip()); time.sleep(0.05)
    return res

def main():
    keys = list(SRC.keys())
    vals = [SRC[k] for k in keys]
    result = {"en": dict(SRC)}
    for loc, code in LOCALES.items():
        for attempt in range(3):
            try:
                tr = batch(vals, code)
                result[loc] = {k: v for k, v in zip(keys, tr)}
                print(f"  {loc} ({code}) ok")
                break
            except Exception as e:
                print(f"  {loc} retry {attempt}: {e}"); time.sleep(1.0)
        time.sleep(0.1)
    # Exact German job title (gtx would say "Industrieingenieur").
    result["de"]["tag"] = "Wirtschaftsingenieur BSc · unabhängiger Android-Entwickler"
    result["de-CH"] = dict(result["de"])  # Swiss German = standard German content
    OUT.write_text(json.dumps(result, ensure_ascii=False, indent=1), encoding="utf-8")
    print(f"wrote {OUT} ({len(result)} locales)")

if __name__ == "__main__":
    main()
