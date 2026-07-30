# -*- coding: utf-8 -*-
"""Одноразовый фикс канона данных (30.07.2026):
1) R-номера респондентов в data/*.csv сдвинуты из контент-пака на +1 относительно
   золотого стандарта (канон = «Работа над сайтом/опрос учеников 04 2026.csv», R1–R28).
   Скрипт применяет R(n) -> R(n-1). Проверено спот-чеком: R9→R8, R13→R12, R23→R22, R29→R28.
2) Ось P5 Александры: сообщество НЕ низкая — высокая потребность в общении равных
   (коррекция канона 29.07 по интервью). axis_community 1.0 -> 3.0 + текст осей.
3) Добавляет колонку emotion_note в cjm.csv (комментарий «почему такая эмоция»).
Запуск: python persona-map/tools/fix_r_shift.py  (повторный запуск сдвинет номера ещё раз — НЕ запускать дважды!)"""
import csv, os, re, collections

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATA = os.path.join(ROOT, "data")
RX = re.compile(r"R(\d{1,2})\b")
stats = collections.Counter()

def shift(text):
    def rep(m):
        n = int(m.group(1))
        if n < 2 or n > 29:
            stats[f"!skip R{n}"] += 1
            return m.group(0)
        stats[f"R{n}->R{n-1}"] += 1
        return "R" + str(n - 1)
    return RX.sub(rep, text)

def process(name, transform_row, fieldnames_fn=None):
    path = os.path.join(DATA, name)
    with open(path, encoding="utf-8-sig", newline="") as f:
        r = csv.DictReader(f)
        rows = list(r)
        cols = list(r.fieldnames)
    if fieldnames_fn:
        cols = fieldnames_fn(cols)
    for row in rows:
        transform_row(row)
    with open(path, "w", encoding="utf-8-sig", newline="") as f:
        w = csv.DictWriter(f, fieldnames=cols)
        w.writeheader()
        for row in rows:
            w.writerow({c: row.get(c, "") for c in cols})
    print(name, "обновлён")

TEXT_COLS_P = ["type", "size", "background", "demographics", "personality", "goals", "motivations",
               "expectations", "frustrations", "skills", "quote", "olga", "axes_text", "economy",
               "confidence", "scenario"]
def fix_persona(row):
    for c in TEXT_COLS_P:
        row[c] = shift(row.get(c, ""))
    if row["id"] == "P5":
        row["axis_community"] = "3.0"
        row["axes_text"] = re.sub(
            r"Сообщество:.*?(?=\n|$)",
            "Сообщество: ВЫСОКАЯ потребность — но в спонтанном неформальном общении равных по глубине; "
            "отвергает форматы (клубы), не людей (коррекция 29.07 по интервью).",
            row["axes_text"], count=1)

TEXT_COLS_C = ["goal", "action", "channels", "pains", "emotion_term", "aha", "data", "voice",
               "opportunities", "tasks"]
def fix_cjm(row):
    for c in TEXT_COLS_C:
        row[c] = shift(row.get(c, ""))
    row.setdefault("emotion_note", "")

def add_note_col(cols):
    if "emotion_note" not in cols:
        cols.insert(cols.index("emotion_term") + 1, "emotion_note")
    return cols

process("personas.csv", fix_persona)
process("cjm.csv", fix_cjm, add_note_col)
print("\nЗамены:")
for k, v in sorted(stats.items(), key=lambda x: (x[0].startswith("!"), x[0])):
    print(" ", k, "×", v)
