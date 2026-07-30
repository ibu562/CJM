# -*- coding: utf-8 -*-
"""Импорт «UXPeria/CMJ опросы и решения - Персоны в воронке квиза.csv» (30.07.2026):
1) data/quiz_funnel.csv — канон вкладки «Реклама → квиз» (шаги × ядро × персоны × майлстоун);
2) personas.csv — новая колонка ad_top «Верх воронки: реклама → квиз» (выжимка по персоне).
Запуск: python persona-map/tools/import_quiz_funnel.py"""
import csv, os, re

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATA = os.path.join(ROOT, "data")
SRC = os.path.join(os.path.dirname(ROOT), "UXPeria", "CMJ опросы и решения - Персоны в воронке квиза.csv")

rows = list(csv.reader(open(SRC, encoding="utf-8-sig")))

def cell(r, c):
    return rows[r][c].strip() if len(rows) > r and len(rows[r]) > c else ""

def parse_head(text):
    """'ШАГ 1 · ТРИГГЕР\nРеклама попала в запрос\n[этап 1 · ОРБИТА]' -> (id, title, sub, map)"""
    lines = [l.strip() for l in text.split("\n") if l.strip()]
    m = re.match(r"ШАГ (\d+) · (.+)", lines[0])
    if m:
        sid, title = int(m.group(1)), m.group(2).strip()
    else:  # «ПОСЛЕ ШАГА 5 · ОПЛАТА»
        sid, title = 6, lines[0].split("·")[-1].strip()
    sub = next((l for l in lines[1:] if not l.startswith("[")), "")
    mp = next((l for l in lines if l.startswith("[")), "").strip("[]")
    return sid, title, sub, mp

out = []
for r in range(2, 8):
    head = cell(r, 0)
    if not head:
        continue
    sid, title, sub, mp = parse_head(head)
    out.append({
        "step_id": sid, "title": title, "sub": sub, "map_stages": mp,
        "core": cell(r, 1), "p1": cell(r, 2), "p2": cell(r, 3), "p3": cell(r, 4),
        "p4": cell(r, 5), "p5": cell(r, 6), "milestone": cell(r, 7), "extra": cell(r, 8),
    })
prelaunch = cell(9, 0)
out.append({"step_id": 0, "title": "ДО СТАРТА РЕКЛАМЫ", "sub": "чек-лист", "map_stages": "",
            "core": prelaunch, "p1": "", "p2": "", "p3": "", "p4": "", "p5": "",
            "milestone": "", "extra": ""})

with open(os.path.join(DATA, "quiz_funnel.csv"), "w", encoding="utf-8-sig", newline="") as f:
    w = csv.DictWriter(f, fieldnames=["step_id", "title", "sub", "map_stages", "core",
                                      "p1", "p2", "p3", "p4", "p5", "milestone", "extra"])
    w.writeheader()
    w.writerows(sorted(out, key=lambda x: x["step_id"]))
print("quiz_funnel.csv:", len(out), "строк (шаги 1–6 + чек-лист)")

# ---- ad_top: выжимка «верх воронки» в досье персон ----
AD_TOP = {
    "P1": "Реклама: Instagram-баннер цепляет строгой рамкой — «системное образование», «основания», без мотивационной подачи 🟡; вероятнее линия Б (Школа). Риск: маршрут «Самопознание» прочтёт как «психологию» — не кликнет.\n"
          "Квиз: шкалы и баллы — его язык; В7-B «научиться думать системно» → дверь ШКОЛА; вероятный вердикт «Нет единой картины» 🟡.\n"
          "Письма: L3 «Мышлению нужен собеседник» (свой вопрос — АО на живой встрече); сверяет School vs курс, сомнение «куплю и заброшу» 🟡.",
    "P2": "Реклама ⭐ ГЛАВНЫЙ адресат: Instagram — понятная ей сеть; «не своя жизнь / инерция» — её сообщение; линия А (/samopoznanie); родительский мотив (В8-D «передать близким») — чаще всего её 🟡.\n"
          "Квиз: самый высокий отклик — «8 вопросов о вашей жизни» = приглашение поговорить о ней; без логина — для неё важно. В7-A «разобраться в себе» → дверь САМОПОЗНАНИЕ; вероятный вердикт «Шаткие основания» 🟡.\n"
          "Письма: L3 «Маршрут изнутри» — год, свой темп, малая группа = ответ на «потяну ли»; €600 в рассрочку (Klarna); родительская вставка перед CTA — её дедлайн.",
    "P3": "Реклама: Instagram — её сеть; издалека цепляют русская речь и слово «сообщество» 🟡; кликает реже — ей нужно увидеть жизнь, а баннер продаёт программу.\n"
          "На странице ищет живых людей: лица, встречи; держится на слове «сообщество»; отзывы — критичны 🔴.\n"
          "Квиз: проходит из любопытства; В7-C «найти своих» → дверь ПОЛИС; вероятный вердикт «Не хватает слов» 🟡.\n"
          "Письма: L3 «Когда не с кем обсудить» — вход «гостем» и есть её первый шаг внутрь; ищет календарь встреч и лица.",
    "P4": "Реклама его НЕ ловит: Instagram почти не листает — его каналы YouTube и почта 🟢. Входит прежним путём: тематическое видео → сайт → тот же квиз B1.\n"
          "Квизы недолюбливает («мне нужен курс, а не тест» 🟡); В7-D «взять тему» → дверь КУРСЫ; вердикт вторичен — идёт за темой, тетрадь = проба формата.\n"
          "Письма: L3 «Одна тема, разобранная до основания»; решает по фактам: цена, программа, старт 🟢.",
    "P5": "Реклама: соцсети — минимум 🟢, баннером её не поймать. В воронке появляется, когда квиз её распознаёт: все три шкалы ≥ 6 → вердикт «Всё стоит» = тег P5 — воронка ВПЕРВЫЕ видит продвинутых 🟢.\n"
          "Вводная лексика страниц может оттолкнуть 🟡; захочет фрагмент тетради.\n"
          "Письма: ветка L3 «Для тех, кто прошёл основы»; читает подробную программу, решает по количеству общения с экспертом 🟢.",
}
path = os.path.join(DATA, "personas.csv")
with open(path, encoding="utf-8-sig", newline="") as f:
    rd = csv.DictReader(f)
    prow, cols = list(rd), list(rd.fieldnames)
if "ad_top" not in cols:
    cols.append("ad_top")
for row in prow:
    row["ad_top"] = AD_TOP[row["id"]]
with open(path, "w", encoding="utf-8-sig", newline="") as f:
    w = csv.DictWriter(f, fieldnames=cols)
    w.writeheader()
    for row in prow:
        w.writerow({c: row.get(c, "") for c in cols})
print("personas.csv: колонка ad_top добавлена для", len(prow), "персон")
