"""
ringkas.py - Menyusun "Pokok Berita" (1-3 poin singkat) dari cuplikan RSS.

Sumbernya HANYA kolom `excerpt` (deskripsi resmi dari feed RSS yang memang
disediakan penerbit untuk dikutip), bukan isi lengkap artikel. Tidak ada
scraping halaman sumber. Link ke sumber asli tetap ditampilkan di situs.

Aturan penyederhanaan (tanpa AI, gratis):
  - rapikan spasi & kalimat yang menempel ("digital.Wali Kota")
  - buang fragmen terpotong di akhir ("... Menteri mengatakan ...")
  - buang kata basa-basi (adapun, bahwa, dalam rangka -> untuk, ...)
  - pecah kalimat panjang di "sehingga" / ";" jadi poin terpisah
  - buang ajakan klik ("Simak...", "Baca selengkapnya...") & pertanyaan retoris
  - maksimal 3 poin, tiap poin maksimal ~25 kata
  - lewati poin yang isinya sama dengan judul

Pemakaian:
  python ringkas.py                   # proses artikel yg belum diringkas (butuh env)
  python ringkas.py --semua           # ringkas ulang semua artikel RSS
  python ringkas.py --json in.json    # mode offline: cetak SQL UPDATE ke stdout

Env yang dibutuhkan (mode default):
  SUPABASE_URL               mis. https://xxxx.supabase.co
  SUPABASE_SERVICE_ROLE_KEY  service role key (simpan sebagai GitHub Secret)
"""

from __future__ import annotations

import json
import os
import re
import sys
import urllib.parse
import urllib.request

MAKS_POIN = 3
MAKS_KATA = 25

# (pola regex, pengganti) - diterapkan berurutan, tidak peka huruf besar/kecil.
PENGGANTI: list[tuple[str, str]] = [
    # pembuka kalimat yang tidak menambah informasi
    (r"^(adapun|sementara itu|selain itu|dalam hal ini|sebagaimana diketahui|"
     r"perlu diketahui|diketahui|seperti diketahui),?\s+", ""),
    # kata sambung bertele-tele
    (r"\b(mengatakan|menyatakan|menjelaskan|menegaskan|menyebutkan|mengungkapkan) bahwa\b", r"\1"),
    (r"\byang mana\b", "yang"),
    (r"\bdalam rangka\b", "untuk"),
    (r"\bguna\b", "untuk"),
    (r"\bapabila\b", "jika"),
    (r"\bbukan merupakan\b", "bukan"),
    (r"\bmerupakan\b", "adalah"),
    (r"\bRp\s+(?=\d)", "Rp"),
    (r"\boleh karena itu\b", "karena itu"),
    (r"\bpada saat\b", "saat"),
    (r"\bpada waktu\b", "saat"),
    (r"\bbertempat di\b", "di"),
    (r"\bsebesar (?=Rp|\d)", ""),
    # "melakukan + kata benda" -> kata kerja langsung
    (r"\bmelakukan pemeriksaan\b", "memeriksa"),
    (r"\bmelakukan kunjungan\b", "berkunjung"),
    (r"\bmelakukan pembahasan\b", "membahas"),
    (r"\bmelakukan penangkapan\b", "menangkap"),
    (r"\bmelakukan penyelidikan\b", "menyelidiki"),
    (r"\bmelakukan evaluasi\b", "mengevaluasi"),
    (r"\bmemberikan bantuan\b", "membantu"),
    (r"\bmemberikan penjelasan\b", "menjelaskan"),
]

# Titik akhir kalimat: huruf/angka/penutup + ".!?" lalu (spasi opsional) huruf
# besar. Tidak memecah "Rp17.894" / "0,48" karena setelah titik ada angka.
_BATAS_KALIMAT = re.compile(r'(?<=[a-z0-9%)"”])([.!?])\s*(?=[A-Z“"])')


def _rapikan_spasi(teks: str) -> str:
    teks = re.sub(r"\s+", " ", teks).strip()
    teks = re.sub(r"\(\s+", "(", teks)
    teks = re.sub(r"\s+\)", ")", teks)
    teks = re.sub(r"\s+([,.;:!?])", r"\1", teks)
    return teks


def _kapital(teks: str) -> str:
    return teks[:1].upper() + teks[1:] if teks else teks


def pecah_kalimat(teks: str) -> list[str]:
    teks = _rapikan_spasi(teks)
    if not teks:
        return []
    teks = _BATAS_KALIMAT.sub(r"\1\n", teks)
    kalimat = [k.strip() for k in teks.split("\n") if k.strip()]

    # Fragmen terakhir terpotong feed ("Wali Kota ...")? Kalau ada kalimat
    # utuh sebelumnya: selamatkan bagian sebelum koma terakhir bila masih
    # bermakna (>= 5 kata), selain itu buang. Kalau cuma itu satu-satunya,
    # pertahankan dengan tanda "…".
    if kalimat and re.search(r"(\.\.\.|…)$", kalimat[-1]):
        if len(kalimat) > 1:
            fragmen = kalimat.pop()
            # lanjutan dari pertanyaan retoris ("...? Atau ...") tidak berdiri sendiri
            if "," in fragmen and not kalimat[-1].endswith("?"):
                depan = fragmen[: fragmen.rfind(",")].strip()
                if len(depan.split()) >= 5:
                    kalimat.append(depan + ".")
        else:
            kalimat[-1] = re.sub(r"\s*(\.\.\.|…)$", "…", kalimat[-1])
    return kalimat


def sederhanakan(kalimat: str) -> str:
    hasil = kalimat
    for pola, ganti in PENGGANTI:
        hasil = re.sub(pola, ganti, hasil, flags=re.IGNORECASE)
    return _kapital(_rapikan_spasi(hasil))


def _akhiri(teks: str) -> str:
    teks = teks.rstrip(" ,;:")
    return teks if re.search(r"[.!?…]$", teks) else teks + "."


def _pecah_panjang(kalimat: str) -> list[str]:
    """'A sehingga B' / 'A; B' -> ['A.', 'B.']"""
    bagian = re.split(r",?\s+sehingga\s+|;\s*", kalimat, flags=re.IGNORECASE)
    return [_akhiri(_kapital(b.strip())) for b in bagian if b.strip()]


def _potong(kalimat: str) -> str:
    kata = kalimat.split()
    if len(kata) <= MAKS_KATA:
        return kalimat
    potong = " ".join(kata[:MAKS_KATA])
    # potong di koma terakhir kalau masih menyisakan >= 60% kalimat
    koma = potong.rfind(",")
    if koma > len(potong) * 0.6:
        potong = potong[:koma]
    return potong.rstrip(" ,;:.") + "…"


def _kata_kunci(teks: str) -> set[str]:
    return set(re.findall(r"[a-z0-9]+", teks.lower()))


def _mirip_judul(poin: str, judul: str) -> bool:
    a, b = _kata_kunci(poin), _kata_kunci(judul)
    if not a or not b:
        return False
    return len(a & b) / len(a | b) >= 0.8


# Kalimat ajakan/pancingan klik - bukan pokok berita.
_PANCINGAN = re.compile(
    r"^(simak|baca|cek|yuk|berikut|lihat|klik|intip|ketahui)\b", re.IGNORECASE
)


def _bukan_pokok(kalimat: str) -> bool:
    return bool(_PANCINGAN.match(kalimat)) or kalimat.rstrip().endswith("?")


def ringkas(judul: str, excerpt: str | None) -> list[str]:
    if not excerpt or not excerpt.strip():
        return []
    poin: list[str] = []
    for kalimat in pecah_kalimat(excerpt):
        if _bukan_pokok(kalimat):
            continue
        for bagian in _pecah_panjang(sederhanakan(kalimat)):
            bagian = _potong(bagian)
            if len(bagian.split()) < 3 or _mirip_judul(bagian, judul):
                continue
            if bagian not in poin:
                poin.append(bagian)
    return poin[:MAKS_POIN]


# ---------------------------------------------------------------------------
# I/O: Supabase REST (stdlib saja, tanpa pip install)
# ---------------------------------------------------------------------------

def _request(method: str, url: str, key: str, body: object | None = None) -> object:
    data = json.dumps(body).encode() if body is not None else None
    req = urllib.request.Request(url, data=data, method=method, headers={
        "apikey": key,
        "Authorization": f"Bearer {key}",
        "Content-Type": "application/json",
        "Prefer": "return=minimal",
    })
    with urllib.request.urlopen(req, timeout=30) as resp:
        isi = resp.read()
        return json.loads(isi) if isi else None


def proses_supabase(semua: bool = False, batas: int = 500) -> int:
    base = os.environ["SUPABASE_URL"].rstrip("/") + "/rest/v1/articles"
    key = os.environ["SUPABASE_SERVICE_ROLE_KEY"]
    query = {
        "select": "id,title,excerpt",
        "source_type": "eq.rss",
        "excerpt": "not.is.null",
        "order": "published_at.desc",
        "limit": str(batas),
    }
    if not semua:
        query["summary_points"] = "is.null"
    rows = _request("GET", f"{base}?{urllib.parse.urlencode(query)}", key) or []
    for row in rows:
        poin = ringkas(row["title"], row["excerpt"])
        _request("PATCH", f"{base}?id=eq.{row['id']}", key, {"summary_points": poin})
    return len(rows)


def _sql_literal(teks: str) -> str:
    return "'" + teks.replace("'", "''") + "'"


def cetak_sql(path: str) -> None:
    """Mode offline: baca JSON [{id,title,excerpt}], cetak SQL UPDATE."""
    with open(path, encoding="utf-8") as f:
        rows = json.load(f)
    for row in rows:
        poin = ringkas(row["title"], row.get("excerpt"))
        arr = "array[" + ",".join(_sql_literal(p) for p in poin) + "]::text[]"
        print(f"update articles set summary_points = {arr} where id = {_sql_literal(row['id'])};")


if __name__ == "__main__":
    if "--json" in sys.argv:
        sys.stdout.reconfigure(encoding="utf-8")
        cetak_sql(sys.argv[sys.argv.index("--json") + 1])
    else:
        n = proses_supabase(semua="--semua" in sys.argv)
        print(f"Selesai: {n} artikel diringkas.")
