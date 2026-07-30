# -*- coding: utf-8 -*-
"""Сборка data.js из канона persona-map/data/*.csv.
Запуск:  python persona-map/tools/build_data.py
Позже сюда добавится режим --sheets <url> для загрузки тех же вкладок из Google-таблицы."""
import csv, json, os, datetime

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATA = os.path.join(ROOT, "data")

def read(name):
    with open(os.path.join(DATA, name), encoding="utf-8-sig", newline="") as f:
        return list(csv.DictReader(f))

personas = read("personas.csv")
stages = read("stages.csv")
cjm_rows = read("cjm.csv")
matrix_rows = read("matrix.csv")
try:
    quiz_rows = read("quiz_funnel.csv")
    for q in quiz_rows:
        q["step_id"] = int(q["step_id"])
except FileNotFoundError:
    quiz_rows = []

for s in stages:
    s["id"] = int(s["id"])
for p in personas:
    p["size_pct"] = int(p["size_pct"])
    for k in ("axis_teacher", "axis_community", "axis_maturity"):
        p[k] = float(p[k])

cjm = {}
for r in cjm_rows:
    pid, sid = r.pop("persona_id"), int(r.pop("stage_id"))
    r["emotion_value"] = int(r["emotion_value"]) if r["emotion_value"] != "" else None
    r["emotion_value2"] = int(r["emotion_value2"]) if r["emotion_value2"] != "" else None
    cjm.setdefault(pid, {})[sid] = r

matrix = {}
for r in matrix_rows:
    matrix.setdefault(r["persona_id"], {})[int(r["stage_id"])] = {
        "status": r["status"], "text": r["text"]}

payload = {
    "meta": {
        "built": datetime.date.today().isoformat(),
        "source": "CJM_матрица_решений_встреча.xlsx · опрос учеников R1–R28 · GA4 · Clarity · интервью",
    },
    "stages": stages,
    "personas": personas,
    "cjm": cjm,
    "matrix": matrix,
    "quiz": quiz_rows,
}

out = os.path.join(ROOT, "data.js")
with open(out, "w", encoding="utf-8") as f:
    f.write("// Сгенерировано build_data.py из data/*.csv — не редактировать руками.\n")
    f.write("window.CJM_DATA = ")
    json.dump(payload, f, ensure_ascii=False, separators=(",", ":"))
    f.write(";\n")
print("data.js:", os.path.getsize(out), "байт ·", len(personas), "персон ·",
      len(stages), "этапов ·", sum(len(v) for v in cjm.values()), "ячеек CJM")

# cache-buster: ?v=<метка> для data.js / app.js / style.css в index.html
import re
idx = os.path.join(ROOT, "index.html")
html = open(idx, encoding="utf-8").read()
stamp = datetime.datetime.now().strftime("%Y%m%d%H%M")
html2 = html
for name in ("data.js", "app.js", "style.css"):
    html2 = re.sub(name.replace(".", r"\.") + r'\?v=[^"]*"', f'{name}?v={stamp}"', html2)
if html2 != html:
    open(idx, "w", encoding="utf-8").write(html2)
    print("index.html: assets ?v=" + stamp)
