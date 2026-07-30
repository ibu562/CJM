# -*- coding: utf-8 -*-
"""Обновление профилей персон из золотого стандарта «UXPeria/Персоны июль3.csv» (30.07.2026).
- Перекрывает текстовые поля personas.csv (R-номера там уже канонические R1–R28).
- Добавляет 3 новые колонки: olga_ladder, olga_offer, improvements.
- Переименовывает обозначение интервью Александры (P5): n=1 / (интервью…) -> R-AM
  (в personas.csv и cjm.csv; «родительский триггер (n=1)» у P2 не трогается).
Запуск: python persona-map/tools/update_from_jul3.py"""
import csv, os, re

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATA = os.path.join(ROOT, "data")
JUL3 = os.path.join(os.path.dirname(ROOT), "UXPeria", "Персоны июль3.csv")

SECTION_MAP = [
    ("Тип", "type"), ("Market size", "size"), ("Background", "background"),
    ("Demographics", "demographics"), ("Личность и интересы", "personality"),
    ("Goals", "goals"), ("Motivations", "motivations"), ("Expectations", "expectations"),
    ("Frustrations", "frustrations"), ("Skills Tips", "skills"), ("Quote", "quote"),
    ("Сегмент по запросу", "olga"), ("Ступень лестницы Ольги", "olga_ladder"),
    ("Оффер по Ольге", "olga_offer"), ("Наши оси", "axes_text"),
    ("Экономика", "economy"), ("Достоверность", "confidence"),
    ("Сценарий карты", "scenario"), ("Предложения улучшений", "improvements"),
]
PIDS = ["P1", "P2", "P3", "P4", "P5"]

rows = list(csv.reader(open(JUL3, encoding="utf-8-sig")))
jul3 = {pid: {} for pid in PIDS}
unmatched = []
for r in rows[1:]:
    if not any(c.strip() for c in r):
        continue
    sec = r[0].strip()
    key = next((k for pref, k in SECTION_MAP if sec.startswith(pref)), None)
    if not key:
        unmatched.append(sec); continue
    for i, pid in enumerate(PIDS):
        jul3[pid][key] = r[1 + i].strip() if len(r) > 1 + i else ""
if unmatched:
    print("!! несопоставленные секции июль3:", unmatched)

def rename_am(text):
    t = text
    t = t.replace("интервью n=1 (05.07.2026)", "интервью R-AM (05.07.2026)")
    t = t.replace("n=1 (05.07.2026)", "R-AM (05.07.2026)")
    t = t.replace("(интервью 05.07.2026)", "(R-AM · интервью 05.07.2026)")
    t = re.sub(r"интервью \(Q", "R-AM (Q", t)
    t = re.sub(r"\(интервью Q(\d)", r"(R-AM, Q\1", t)
    t = t.replace("(интервью)", "(R-AM)")
    t = t.replace("из интервью)", "из интервью R-AM)")
    return t

# ---------- personas.csv ----------
path = os.path.join(DATA, "personas.csv")
with open(path, encoding="utf-8-sig", newline="") as f:
    rd = csv.DictReader(f)
    prows = list(rd)
    cols = list(rd.fieldnames)
for extra in ("olga_ladder", "olga_offer", "improvements"):
    if extra not in cols:
        cols.append(extra)
for row in prows:
    pid = row["id"]
    for _, key in SECTION_MAP:
        if jul3[pid].get(key):
            row[key] = jul3[pid][key]
    if pid == "P5":
        for k in row:
            if k not in ("id", "name"):
                row[k] = rename_am(row[k] or "")
with open(path, "w", encoding="utf-8-sig", newline="") as f:
    w = csv.DictWriter(f, fieldnames=cols)
    w.writeheader()
    for row in prows:
        w.writerow({c: row.get(c, "") for c in cols})
print("personas.csv: перезаписан из июль3, колонок:", len(cols))

# ---------- cjm.csv: R-AM только в строках P5 ----------
path = os.path.join(DATA, "cjm.csv")
with open(path, encoding="utf-8-sig", newline="") as f:
    rd = csv.DictReader(f)
    crows = list(rd)
    ccols = list(rd.fieldnames)
cnt = 0
for row in crows:
    if row["persona_id"] != "P5":
        continue
    for c in ccols:
        if c in ("persona_id", "stage_id"):
            continue
        new = rename_am(row[c] or "")
        if new != row[c]:
            cnt += 1
            row[c] = new
with open(path, "w", encoding="utf-8-sig", newline="") as f:
    w = csv.DictWriter(f, fieldnames=ccols)
    w.writeheader(); w.writerows(crows)
print("cjm.csv: R-AM заменён в", cnt, "ячейках P5")

# контроль: где в P5 ещё осталось голое «интервью» / «n=1»
left = []
for row in crows:
    if row["persona_id"] == "P5":
        for c in ccols:
            v = row[c] or ""
            if "n=1" in v or re.search(r"интервью(?! R-AM)", v):
                left.append((row["stage_id"], c, v[:90]))
p5 = next(r for r in prows if r["id"] == "P5")
for k, v in p5.items():
    if v and ("n=1" in v or re.search(r"интервью(?! R-AM)", v)):
        left.append(("profile", k, v[:90]))
print("Остатки «интервью»/«n=1» в P5 (проверить глазами):", len(left))
for it in left:
    print("  ", it)
