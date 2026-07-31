/* Персоны и путь ученика · Школа «Архитектор смыслов»
   Vanilla JS, без зависимостей. Данные: data.js (window.CJM_DATA). */
"use strict";

const D = window.CJM_DATA;
const PIDS = ["P1", "P2", "P3", "P4", "P5"];
const COLOR = { P1: "var(--s1)", P2: "var(--s2)", P3: "var(--s3)", P4: "var(--s4)", P5: "var(--s5)" };
const personaById = Object.fromEntries(D.personas.map(p => [p.id, p]));
const stageById = Object.fromEntries(D.stages.map(s => [s.id, s]));
const MATURITY = { 1: "новичок", 1.5: "новичок-продолжающий", 2: "продолжающий", 3: "продвинутая" };
const EMO = { "2": "😄", "1": "🙂", "0": "😐", "-1": "🙁", "-2": "😣" };
const emoji = v => (v == null ? "" : EMO[String(v)] || "");
const STATUS = {
  red:    { label: "критический разрыв", glyph: "✕", cls: "m-red",    color: "var(--st-critical)" },
  orange: { label: "частично решено / в работе", glyph: "◐", cls: "m-orange", color: "var(--st-serious)" },
  yellow: { label: "трение", glyph: "!", cls: "m-yellow", color: "var(--st-warning)" },
  green:  { label: "работает / сделано", glyph: "✓", cls: "m-green",  color: "var(--st-good)" },
  gray:   { label: "малозначимо для персоны", glyph: "—", cls: "m-gray",   color: "var(--muted)" },
};
const SECTIONS = [
  { key: "goal",          label: "Цель персоны",        tier: 1 },
  { key: "action",        label: "Действие",            tier: 1 },
  { key: "channels",      label: "Каналы и точки",      tier: 2 },
  { key: "pains",         label: "Боли",                tier: 1 },
  { key: "aha",           label: "A-HA · Момент истины", tier: 1 },
  { key: "data",          label: "Данные",              tier: 3 },
  { key: "voice",         label: "Голос",               tier: 3 },
  { key: "opportunities", label: "Возможности (TO-BE)", tier: 1 },
  { key: "tasks",         label: "Задачи (TO-BE)",      tier: 3 },
];
const ZONES = [
  { from: 1, to: 2, label: "ОРБИТА → САЙТ" },
  { from: 3, to: 7, label: "САЙТ (Wix)" },
  { from: 8, to: 8, label: "ШОВ · оплата", seam: true },
  { from: 9, to: 13, label: "CIRCLE" },
];

/* ---------- DOM-хелперы ---------- */
function h(tag, props = {}, ...kids) {
  const e = document.createElement(tag);
  for (const [k, v] of Object.entries(props)) {
    if (v == null) continue;
    if (k === "class") e.className = v;
    else if (k === "text") e.textContent = v;
    else if (k === "html") e.innerHTML = v; // только авторские статические строки
    else if (k.startsWith("on")) e.addEventListener(k.slice(2).toLowerCase(), v);
    else e.setAttribute(k, v);
  }
  for (const kd of kids.flat(9)) {
    if (kd == null) continue;
    e.append(kd.nodeType ? kd : document.createTextNode(kd));
  }
  return e;
}
function sv(tag, attrs = {}, ...kids) {
  const e = document.createElementNS("http://www.w3.org/2000/svg", tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (v == null) continue;
    if (k === "text") e.textContent = v;
    else if (k.startsWith("on")) e.addEventListener(k.slice(2).toLowerCase(), v);
    else e.setAttribute(k, v);
  }
  for (const kd of kids.flat(9)) if (kd != null) e.append(kd);
  return e;
}
const fmtVal = v => (v > 0 ? "+" + v : v === 0 ? "0" : "−" + Math.abs(v));

/* ---------- Подсказка ---------- */
const tip = document.getElementById("tooltip");
function showTip(evt, node) {
  tip.replaceChildren(node);
  tip.hidden = false;
  const r = tip.getBoundingClientRect();
  let x = evt.clientX + 14, y = evt.clientY + 12;
  if (x + r.width > innerWidth - 8) x = evt.clientX - r.width - 12;
  if (y + r.height > innerHeight - 8) y = evt.clientY - r.height - 10;
  tip.style.left = Math.max(6, x) + "px";
  tip.style.top = Math.max(6, y) + "px";
}
function hideTip() { tip.hidden = true; }
addEventListener("scroll", hideTip, true);
function ttNode(title, lines, muted) {
  const n = h("div", {});
  if (title) n.append(h("div", { class: "tt-title", text: title }));
  for (const l of [].concat(lines || [])) {
    if (l == null) continue;
    n.append(l.nodeType ? l : h("div", { text: String(l) }));
  }
  if (muted) n.append(h("div", { class: "tt-muted", text: muted }));
  return n;
}

/* ---------- Тема ---------- */
(function initTheme() {
  const saved = localStorage.getItem("pm-theme");
  if (saved) document.documentElement.dataset.theme = saved;
  document.getElementById("themeToggle").addEventListener("click", () => {
    const cur = document.documentElement.dataset.theme ||
      (matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light");
    const next = cur === "dark" ? "light" : "dark";
    document.documentElement.dataset.theme = next;
    localStorage.setItem("pm-theme", next);
  });
})();

/* ---------- Кривая эмоций ---------- */
function emotionChart(opts) {
  const { pids, highlight = null, height = 320, showZones = true, annotate = false, visible = null } = opts;
  const W = 980, H = height, padL = 44, padR = 18, padT = showZones ? 40 : 16, padB = 30;
  const step = (W - padL - padR) / 13;
  const x = i => padL + (i + 0.5) * step;
  const y = v => padT + (2.35 - v) * (H - padT - padB) / 4.7;
  const svg = sv("svg", { class: "viz", viewBox: `0 0 ${W} ${H}`, role: "img",
    "aria-label": "Кривые эмоций персон по 13 этапам пути" });

  if (showZones) {
    for (const z of ZONES) {
      const x0 = padL + (z.from - 1) * step, x1 = padL + z.to * step;
      svg.append(sv("rect", { x: x0 + 1, y: 6, width: x1 - x0 - 2, height: 18, rx: 5,
        fill: z.seam ? "var(--tint-critical)" : "var(--tint-gray)" }));
      svg.append(sv("text", { x: (x0 + x1) / 2, y: 19, "text-anchor": "middle",
        "font-size": "10.5", "font-weight": "700", fill: "var(--ink-2)", text: z.label }));
      if (z.from > 1) svg.append(sv("line", { x1: x0, y1: padT, x2: x0, y2: H - padB,
        stroke: "var(--grid)", "stroke-width": 1 }));
    }
  }
  for (let v = -2; v <= 2; v++) {
    svg.append(sv("line", { x1: padL, y1: y(v), x2: W - padR, y2: y(v),
      stroke: v === 0 ? "var(--baseline)" : "var(--grid)", "stroke-width": v === 0 ? 1.5 : 1 }));
    svg.append(sv("text", { x: padL - 8, y: y(v) + 3.5, "text-anchor": "end",
      "font-size": "11", fill: "var(--muted)", text: fmtVal(v) }));
  }
  for (const s of D.stages) {
    svg.append(sv("text", { x: x(s.id - 1), y: H - padB + 16, "text-anchor": "middle",
      "font-size": "11", "font-weight": "600", fill: "var(--muted)", text: s.id }));
  }

  const shown = (visible ? pids.filter(p => visible.has(p)) : pids);
  const ordered = highlight ? shown.filter(p => p !== highlight).concat(shown.includes(highlight) ? [highlight] : []) : shown;
  for (const pid of ordered) {
    const isHi = highlight === pid, dimmed = highlight && !isHi;
    const g = sv("g", { opacity: dimmed ? 0.25 : 1 });
    const pts = D.stages.map(s => ({ s, c: D.cjm[pid][s.id] }));
    g.append(sv("polyline", {
      points: pts.map(p => `${x(p.s.id - 1)},${y(p.c.emotion_value)}`).join(" "),
      fill: "none", stroke: COLOR[pid], "stroke-width": isHi ? 3 : 2,
      "stroke-linejoin": "round", "stroke-linecap": "round" }));
    for (const p of pts) {
      if (p.c.emotion_value2 != null) {
        g.append(sv("line", { x1: x(p.s.id - 1), y1: y(p.c.emotion_value), x2: x(p.s.id - 1),
          y2: y(p.c.emotion_value2), stroke: COLOR[pid], "stroke-width": 1.5, "stroke-dasharray": "3 3" }));
        g.append(sv("circle", { cx: x(p.s.id - 1), cy: y(p.c.emotion_value2), r: 4,
          fill: "var(--surface)", stroke: COLOR[pid], "stroke-width": 2 }));
      }
      g.append(sv("circle", { cx: x(p.s.id - 1), cy: y(p.c.emotion_value), r: isHi ? 4.5 : 4,
        fill: COLOR[pid], stroke: "var(--surface)", "stroke-width": 2 }));
    }
    svg.append(g);
  }

  if (annotate) {
    const notes = [];
    if (shown.includes("P1")) notes.push({ sid: 8, v: -2, dx: -6, anchor: "end", t: "дно P1·P2: оплата" });
    if (shown.includes("P5")) notes.push({ sid: 12, v: -2, dx: 8, anchor: "start", t: "дно P5: «расти некуда»" });
    if (shown.includes("P3")) notes.push({ sid: 9, v: 2, dx: 8, anchor: "start", t: "вилка P3: первая встреча" });
    for (const n of notes) {
      svg.append(sv("text", { x: x(n.sid - 1) + n.dx, y: y(n.v) + (n.v < 0 ? 16 : -10),
        "text-anchor": n.anchor, "font-size": "10.5", "font-style": "italic",
        fill: "var(--ink-2)", text: n.t }));
    }
  }

  const cross = sv("line", { y1: padT, y2: H - padB, stroke: "var(--baseline)",
    "stroke-width": 1, "stroke-dasharray": "2 3", visibility: "hidden" });
  svg.append(cross);
  for (const s of D.stages) {
    svg.append(sv("rect", { x: padL + (s.id - 1) * step, y: padT, width: step,
      height: H - padT - padB, fill: "transparent",
      onmousemove: evt => {
        cross.setAttribute("x1", x(s.id - 1)); cross.setAttribute("x2", x(s.id - 1));
        cross.setAttribute("visibility", "visible");
        const lines = shown.map(pid => {
          const c = D.cjm[pid][s.id];
          const row = h("div", {},
            h("span", { style: `display:inline-block;width:9px;height:9px;border-radius:50%;background:${COLOR[pid]};margin-right:6px` }),
            h("b", { text: personaById[pid].name + ": " }),
            emoji(c.emotion_value) + " " + fmtVal(c.emotion_value) +
            (c.emotion_value2 != null ? " / " + emoji(c.emotion_value2) + " " + fmtVal(c.emotion_value2) : "") +
            " · " + c.emotion_term.split("\n")[0]);
          return row;
        });
        const noteFor = highlight || (shown.length === 1 ? shown[0] : null);
        if (noteFor) {
          const note = (D.cjm[noteFor][s.id].emotion_note || "").trim();
          if (note) lines.push(h("div", {
            style: "margin-top:5px;font-style:italic;color:var(--ink-2);border-top:1px solid var(--grid);padding-top:5px",
            text: note }));
        }
        lines.push(h("div", {
          style: "margin-top:5px;border-top:1px solid var(--grid);padding-top:5px;color:var(--brand);font-weight:650",
          text: "Цель бизнеса: " + s.business_goal }));
        showTip(evt, ttNode(`${s.id} · ${s.title} [${s.zone}]`, lines));
      },
      onmouseleave: () => { cross.setAttribute("visibility", "hidden"); hideTip(); } }));
  }
  return svg;
}

function sparkline(pid) {
  const W = 130, Hh = 38, p = 5;
  const x = i => p + i * (W - 2 * p) / 12;
  const y = v => p + (2.3 - v) * (Hh - 2 * p) / 4.6;
  const svg = sv("svg", { viewBox: `0 0 ${W} ${Hh}`, width: W, height: Hh, "aria-hidden": "true" });
  svg.append(sv("line", { x1: p, y1: y(0), x2: W - p, y2: y(0), stroke: "var(--grid)", "stroke-width": 1 }));
  svg.append(sv("polyline", {
    points: D.stages.map(s => `${x(s.id - 1)},${y(D.cjm[pid][s.id].emotion_value)}`).join(" "),
    fill: "none", stroke: COLOR[pid], "stroke-width": 2, "stroke-linejoin": "round" }));
  return svg;
}

/* ---------- Scatter осей персон ---------- */
function axesScatter() {
  const W = 720, H = 470, padL = 64, padR = 30, padT = 30, padB = 64;
  const dom = [0.5, 4];
  const x = v => padL + (v - dom[0]) * (W - padL - padR) / (dom[1] - dom[0]);
  const y = v => H - padB - (v - dom[0]) * (H - padT - padB) / (dom[1] - dom[0]);
  const svg = sv("svg", { class: "viz", viewBox: `0 0 ${W} ${H}`, role: "img",
    "aria-label": "Персоны по осям: учитель-центричность и мотив сообщества" });
  const ticks = [[1, "низкая"], [2, "средняя"], [3, "высокая"], [3.5, "макс"]];
  for (const [v, lab] of ticks) {
    svg.append(sv("line", { x1: x(v), y1: padT, x2: x(v), y2: H - padB, stroke: "var(--grid)", "stroke-width": 1 }));
    svg.append(sv("line", { x1: padL, y1: y(v), x2: W - padR, y2: y(v), stroke: "var(--grid)", "stroke-width": 1 }));
    svg.append(sv("text", { x: x(v), y: H - padB + 18, "text-anchor": "middle", "font-size": "11", fill: "var(--muted)", text: lab }));
    svg.append(sv("text", { x: padL - 8, y: y(v) + 3.5, "text-anchor": "end", "font-size": "11", fill: "var(--muted)", text: lab }));
  }
  svg.append(sv("line", { x1: padL, y1: H - padB, x2: W - padR, y2: H - padB, stroke: "var(--baseline)", "stroke-width": 1.5 }));
  svg.append(sv("line", { x1: padL, y1: padT, x2: padL, y2: H - padB, stroke: "var(--baseline)", "stroke-width": 1.5 }));
  svg.append(sv("text", { x: W - padR, y: H - padB + 40, "text-anchor": "end", "font-size": "12",
    "font-weight": "600", fill: "var(--ink-2)", text: "Мотив сообщества →" }));
  svg.append(sv("text", { x: padL, y: padT - 12, "font-size": "12", "font-weight": "600",
    fill: "var(--ink-2)", text: "↑ Учитель-центричность" }));

  for (const p of D.personas) {
    const cx = x(p.axis_community), cy = y(p.axis_teacher);
    const r = 9 * Math.sqrt(p.size_pct / 10);
    const g = sv("g", { style: "cursor:pointer",
      onmousemove: evt => showTip(evt, ttNode(`${p.id} ${p.name} · ${p.size_pct}%`, [
        p.type,
        `Учитель: ${p.axis_teacher} · Сообщество: ${p.axis_community} · Зрелость: ${MATURITY[p.axis_maturity]}`,
        `Дверь: ${p.door}`], "Клик — открыть досье")),
      onmouseleave: hideTip,
      onclick: () => { location.hash = "#/persona/" + p.id; } });
    g.append(sv("circle", { cx, cy, r, fill: COLOR[p.id], stroke: "var(--surface)", "stroke-width": 2 }));
    const side = cx < W - 210 ? 1 : -1;
    g.append(sv("text", { x: cx + side * (r + 8), y: cy + 1, "text-anchor": side > 0 ? "start" : "end",
      "font-size": "12.5", "font-weight": "700", fill: "var(--ink)", text: `${p.name} · ${p.size_pct}%` }));
    g.append(sv("text", { x: cx + side * (r + 8), y: cy + 15, "text-anchor": side > 0 ? "start" : "end",
      "font-size": "10.5", fill: "var(--muted)", text: MATURITY[p.axis_maturity] }));
    svg.append(g);
  }
  return svg;
}

/* ---------- Стек статусов по этапам ---------- */
const SEV_ORDER = ["red", "orange", "yellow", "green", "gray"];
function statusBars() {
  const W = 980, H = 250, padL = 44, padR = 18, padT = 16, padB = 30;
  const step = (W - padL - padR) / 13, bw = Math.min(46, step - 18);
  const unit = (H - padT - padB) / 5;
  const svg = sv("svg", { class: "viz", viewBox: `0 0 ${W} ${H}`, role: "img",
    "aria-label": "Число персон в каждом статусе по этапам" });
  for (let v = 0; v <= 5; v++) {
    svg.append(sv("line", { x1: padL, y1: H - padB - v * unit, x2: W - padR, y2: H - padB - v * unit,
      stroke: v === 0 ? "var(--baseline)" : "var(--grid)", "stroke-width": v === 0 ? 1.5 : 1 }));
    svg.append(sv("text", { x: padL - 8, y: H - padB - v * unit + 3.5, "text-anchor": "end",
      "font-size": "11", fill: "var(--muted)", text: v }));
  }
  for (const s of D.stages) {
    const cx = padL + (s.id - 0.5) * step;
    let acc = 0;
    const byStatus = {};
    for (const pid of PIDS) {
      const st = D.matrix[pid][s.id].status;
      (byStatus[st] = byStatus[st] || []).push(pid);
    }
    for (const st of SEV_ORDER) {
      const n = (byStatus[st] || []).length;
      if (!n) continue;
      const hgt = n * unit - 2;
      svg.append(sv("rect", { x: cx - bw / 2, y: H - padB - acc * unit - n * unit + 1,
        width: bw, height: Math.max(2, hgt), rx: 3, fill: STATUS[st].color,
        opacity: st === "gray" ? 0.5 : 1 }));
      acc += n;
    }
    svg.append(sv("text", { x: cx, y: H - padB + 16, "text-anchor": "middle", "font-size": "11",
      "font-weight": "600", fill: "var(--muted)", text: s.id }));
    svg.append(sv("rect", { x: padL + (s.id - 1) * step, y: padT, width: step, height: H - padT - padB,
      fill: "transparent",
      onmousemove: evt => {
        const lines = SEV_ORDER.filter(st => byStatus[st]).map(st =>
          h("div", {},
            h("span", { style: `display:inline-block;width:10px;height:10px;border-radius:3px;background:${STATUS[st].color};margin-right:6px` }),
            `${STATUS[st].label}: ${byStatus[st].map(p => personaById[p].name).join(", ")}`));
        showTip(evt, ttNode(`${s.id} · ${s.title} [${s.zone}]`, lines));
      },
      onmouseleave: hideTip }));
  }
  return svg;
}

/* ---------- Легенда персон (чипы) ---------- */
function personaLegend(visible, onToggle) {
  const wrap = h("div", { class: "chart-legend", role: "group", "aria-label": "Персоны" });
  for (const pid of PIDS) {
    const p = personaById[pid];
    const chip = h("button", { class: "lchip" + (visible.has(pid) ? "" : " off"),
      onclick: () => onToggle(pid) },
      h("span", { class: "dot", style: `background:${COLOR[pid]}` }),
      `${pid} ${p.name}`);
    wrap.append(chip);
  }
  return wrap;
}

/* ---------- Комментарии (Google Форма Ирины) ---------- */
const COMMENTS = {
  action: "https://docs.google.com/forms/d/e/1FAIpQLScvAvXWK8JJvi-0vY1j68Ezk6Ge7Yp2UbshZ2yB5kVrttCcVw/formResponse",
  view: "https://docs.google.com/forms/d/e/1FAIpQLScvAvXWK8JJvi-0vY1j68Ezk6Ge7Yp2UbshZ2yB5kVrttCcVw/viewform",
  entries: { block: "entry.2031502579", comment: "entry.1410629096", name: "entry.1575910865" },
};
function cmtBtn(blockLabel) {
  return h("button", { class: "cmt-btn", title: "Оставить комментарий к этому блоку",
    "aria-label": "Комментировать: " + blockLabel,
    onclick: e => { e.stopPropagation(); e.preventDefault(); openComment(blockLabel); } }, "💬");
}
function closeComment() {
  const m = document.getElementById("cmodal");
  if (m) m.remove();
}
function openComment(blockLabel) {
  closeComment();
  const ta = h("textarea", { placeholder: "Ваш комментарий…" });
  const who = h("input", { type: "text", placeholder: "Имя (необязательно)" });
  const status = h("div", { class: "cmodal-status" });
  const send = h("button", { class: "cmodal-send", text: "Отправить", onclick: async () => {
    const txt = ta.value.trim();
    if (!txt) { ta.focus(); return; }
    send.disabled = true;
    const params = new URLSearchParams();
    params.append(COMMENTS.entries.block, blockLabel);
    params.append(COMMENTS.entries.comment, txt);
    params.append(COMMENTS.entries.name, who.value.trim());
    try {
      await fetch(COMMENTS.action, { method: "POST", mode: "no-cors",
        headers: { "Content-Type": "application/x-www-form-urlencoded" }, body: params.toString() });
      status.textContent = "Отправлено ✓ Спасибо!";
      setTimeout(closeComment, 1100);
    } catch (err) {
      window.open(COMMENTS.view + "?usp=pp_url&" + COMMENTS.entries.block + "=" + encodeURIComponent(blockLabel), "_blank");
      closeComment();
    }
  } });
  const overlay = h("div", { id: "cmodal", class: "cmodal-overlay",
    onclick: e => { if (e.target === overlay) closeComment(); } },
    h("div", { class: "card cmodal" },
      h("h3", { text: "Комментарий" }),
      h("div", { class: "cmodal-block", text: blockLabel }),
      ta, who, status,
      h("div", { class: "cmodal-actions" },
        h("button", { class: "cmodal-cancel", text: "Отмена", onclick: closeComment }),
        send)));
  document.body.append(overlay);
  ta.focus();
}

/* ---------- Виды ---------- */
const view = document.getElementById("view");

function renderOverview() {
  const frag = h("div", {});
  const counts = { red: 0, orange: 0, yellow: 0, green: 0, gray: 0 };
  for (const pid of PIDS) for (const s of D.stages) counts[D.matrix[pid][s.id].status]++;

  frag.append(h("section", { class: "section" },
    h("h2", {}, "Карта персон", cmtBtn("Обзор · Карта персон")),
    h("p", { class: "section-sub", text:
      "Пять персон школы, выведенные из опроса учеников (R1–R28), интервью и поведения на воронке. " +
      "Главный различитель — мотив, а не демография. Клик по карточке — полное досье." }),
    h("div", { class: "persona-grid" }, D.personas.map(p => {
      const card = h("article", { class: "card pcard", onclick: () => location.hash = "#/persona/" + p.id },
        h("div", { class: "pcard-band", style: `background:${COLOR[p.id]}` }),
        h("div", { class: "pcard-body" },
          h("div", { class: "pcard-head" },
            h("span", { class: "pid", text: p.id }),
            h("span", { class: "pname", text: p.name }),
            cmtBtn(`Обзор · карточка ${p.id} ${p.name}`)),
          h("div", { class: "pcard-type", text: p.type }),
          h("div", { class: "pcard-meta" },
            h("span", { html: `Доля: <b>${p.size_pct}%</b>` }),
            h("span", {}, "Дверь: ", h("b", { text: p.door }))),
          h("div", { class: "pcard-quote", text: firstQuote(p.quote) }),
          h("div", { class: "pcard-foot" },
            sparkline(p.id),
            h("div", { class: "pcard-links" },
              h("a", { href: "#/persona/" + p.id, text: "Досье", onclick: e => e.stopPropagation() }),
              h("a", { href: "#/cjm/" + p.id, text: "Путь →", onclick: e => e.stopPropagation() })))));
      return card;
    }))));

  frag.append(h("section", { class: "section" },
    h("h2", {}, "Оси персон: за чем они приходят", cmtBtn("Обзор · Оси персон")),
    h("p", { class: "section-sub", text:
      "Положение по двум главным осям модели. Размер круга — оценка доли базы (🟡). " +
      "Третья ось, зрелость в предмете, подписана под именем." }),
    h("div", { class: "card chart-card" }, axesScatter())));

  frag.append(h("section", { class: "section" },
    h("h2", {}, "Состояние пути сегодня", cmtBtn("Обзор · Состояние пути сегодня")),
    h("p", { class: "section-sub" },
      `По матрице «персона × этап»: `,
      h("b", { text: `${counts.red} критических разрывов` }), ", ",
      `${counts.orange} в работе, ${counts.yellow} точек трения, ${counts.green} работает. `,
      h("a", { href: "#/compare", text: "Смотреть пересечения →", style: "color:var(--brand);font-weight:600" })),
    h("div", { class: "howto" },
      h("div", { class: "card" },
        h("h3", { text: "Как устроена модель" }),
        h("div", { html: "Персона = <b>мотив + оси</b> (учитель-центричность · сообщество · зрелость). Демография вторична. «Тихий новичок» — не персона, а <b>состояние</b>, которое может наложиться на любую из них." })),
      h("div", { class: "card" },
        h("h3", { text: "Как устроен путь" }),
        h("div", { html: "13 этапов, две фазы: <b>САЙТ (1–8)</b> на Wix и <b>ПЛАТФОРМА (9–13)</b> в Circle. Шов между ними — этап 8, оплата: главный момент истины всей воронки." })),
      h("div", { class: "card" },
        h("h3", { text: "Откуда данные" }),
        h("div", { html: "Каждое утверждение несёт маркер достоверности: <b>🟢 данные</b> (GA4, Clarity, опросы), <b>🟡 обоснованный вывод</b>, <b>🔴 гипотеза</b>. Кривые эмоций — термины колеса Плутчика." })))));
  view.replaceChildren(frag);
}

function firstQuote(q) {
  const line = (q || "").split("\n").find(l => l.includes("«")) || (q || "").split("\n")[0] || "";
  const m = line.match(/«[^»]+»/);
  return m ? m[0] : line.slice(0, 120);
}

const DOSSIER_SECTIONS = [
  ["background", "Бэкграунд"], ["demographics", "Демография"], ["personality", "Личность и интересы"],
  ["goals", "Цели"], ["motivations", "Мотивации"], ["expectations", "Ожидания"],
  ["frustrations", "Фрустрации"], ["skills", "Навыки и цифровая среда"], ["quote", "Голос — цитаты"],
  ["olga", "Сегмент по запросу (система Ольги)"], ["olga_ladder", "Ступень лестницы Ольги (1–8)"],
  ["olga_offer", "Оффер по Ольге ↔ реальная дверь"], ["ad_top", "Верх воронки: реклама → квиз"],
  ["axes_text", "Оси: учитель · сообщество · зрелость"],
  ["economy", "Экономика"], ["improvements", "Предложения улучшений (свод)"],
  ["confidence", "Достоверность данных"],
];

function renderPersona(pid) {
  const p = personaById[pid] || personaById.P1;
  const frag = h("div", {});
  frag.append(h("div", { class: "persona-switch" }, PIDS.map(id =>
    h("button", { class: "pchip" + (id === p.id ? " active" : ""), onclick: () => location.hash = "#/persona/" + id },
      h("span", { class: "dot", style: `background:${COLOR[id]}` }),
      `${id} ${personaById[id].name}`))));

  const axisRow = (label, val) => h("div", { class: "axis-row" },
    h("span", { text: label }),
    h("div", { class: "axis-track" },
      h("div", { class: "axis-fill", style: `width:${val / 3.5 * 100}%;background:${COLOR[p.id]}` })));

  const rail = h("aside", { class: "card dossier-rail" },
    h("div", { class: "rail-band", style: `background:${COLOR[p.id]}` }),
    h("div", { class: "rail-body" },
      h("h2", { text: `${p.id} ${p.name}` }),
      h("div", { class: "rail-type", text: p.type }),
      h("dl", { class: "rail-kv" },
        h("dt", { text: "Доля базы" }), h("dd", { text: p.size_pct + "% 🟡" }),
        h("dt", { text: "Дверь" }), h("dd", { text: p.door }),
        h("dt", { text: "Сценарий" }), h("dd", { text: p.scenario })),
      h("div", { class: "axis-bars" },
        axisRow("Учитель", p.axis_teacher),
        axisRow("Сообщество", p.axis_community),
        axisRow("Зрелость", p.axis_maturity)),
      h("div", {}, h("div", { class: "chart-sub", text: "Кривая эмоций по пути:" }), sparkline(p.id)),
      h("div", { class: "rail-actions" },
        h("a", { href: "#/cjm/" + p.id, text: "Карта пути этой персоны →" }), h("br"),
        h("a", { href: "#/compare", text: "Пересечения всех персон →" }))));

  const main = h("div", { class: "dossier-main" }, DOSSIER_SECTIONS.map(([key, label]) => {
    const val = p[key];
    if (!val) return null;
    return h("section", { class: "card dsec" + (key === "quote" ? " quote-sec" : "") },
      h("h3", {}, label, cmtBtn(`Досье ${p.id} ${p.name} · ${label}`)),
      h("div", { class: "txt", text: val }));
  }));

  frag.append(h("div", { class: "dossier" }, rail, main));
  view.replaceChildren(frag);
}

let cjmExec = false, cjmOverlay = false;
function renderCJM(pid) {
  const p = personaById[pid] || personaById.P1;
  const frag = h("div", {});
  frag.append(h("div", { class: "cjm-controls" },
    h("div", { class: "persona-switch", style: "margin:0" }, PIDS.map(id =>
      h("button", { class: "pchip" + (id === p.id ? " active" : ""), onclick: () => location.hash = "#/cjm/" + id },
        h("span", { class: "dot", style: `background:${COLOR[id]}` }),
        `${id} ${personaById[id].name}`))),
    h("button", { class: "toggle-btn" + (cjmExec ? " on" : ""), text: "Executive view",
      title: "Только главные строки: цель · действие · боли · A-HA · возможности",
      onclick: () => { cjmExec = !cjmExec; renderCJM(p.id); } }),
    h("button", { class: "toggle-btn" + (cjmOverlay ? " on" : ""), text: "Кривые всех персон",
      onclick: () => { cjmOverlay = !cjmOverlay; renderCJM(p.id); } })));

  frag.append(h("div", { class: "card chart-card" },
    h("div", { class: "chart-title" }, `Кривая эмоций · ${p.id} ${p.name} — ${p.scenario}`,
      cmtBtn(`CJM ${p.id} ${p.name} · кривая эмоций`)),
    h("p", { class: "chart-sub", text: "Шкала −2…+2 по колесу Плутчика. Пунктир — вилка сценария. Наведите на этап." }),
    emotionChart({ pids: cjmOverlay ? PIDS : [p.id], highlight: cjmOverlay ? p.id : null, annotate: cjmOverlay })));

  const sections = SECTIONS.filter(s => !cjmExec || s.tier === 1);
  const grid = h("div", { class: "cjm-grid",
    style: `grid-template-columns: 150px repeat(13, 250px);` });
  grid.append(h("div", { class: "cell rowlab stagehead", text: "" }));
  for (const s of D.stages) {
    grid.append(h("div", { class: "cell stagehead" },
      h("div", { class: "num" }, "ЭТАП " + s.id, cmtBtn(`CJM ${p.id} ${p.name} · этап ${s.id} ${s.title}`)),
      h("div", { class: "stitle", text: s.title }),
      h("span", { class: "zone-badge" + (s.zone === "ШОВ Wix→Circle" || s.id === 8 ? " z-shov" : ""), text: s.zone }),
      h("div", { class: "emo-chip", title: D.cjm[p.id][s.id].emotion_term +
          ((D.cjm[p.id][s.id].emotion_note || "") ? "\n\n" + D.cjm[p.id][s.id].emotion_note : "") },
        h("span", { text: emoji(D.cjm[p.id][s.id].emotion_value) +
          (D.cjm[p.id][s.id].emotion_value2 != null ? "/" + emoji(D.cjm[p.id][s.id].emotion_value2) : "") }),
        h("span", { class: "val", text: fmtVal(D.cjm[p.id][s.id].emotion_value) +
          (D.cjm[p.id][s.id].emotion_value2 != null ? " / " + fmtVal(D.cjm[p.id][s.id].emotion_value2) : "") ,
          style: `color:${D.cjm[p.id][s.id].emotion_value > 0 ? "var(--st-good)" : D.cjm[p.id][s.id].emotion_value < 0 ? "var(--st-critical)" : "var(--muted)"}` }),
        h("span", { text: shortTerm(D.cjm[p.id][s.id].emotion_term) }))));
  }
  for (const sec of sections) {
    grid.append(h("div", { class: "cell rowlab", text: sec.label }));
    for (const s of D.stages) {
      const val = (D.cjm[p.id][s.id][sec.key] || "").trim();
      const empty = !val || val === "—" || val === "-";
      const isAha = sec.key === "aha" && val.includes("⭐");
      grid.append(h("div", {
        class: "cell" + (empty ? " dim" : "") + (sec.key === "aha" && !empty ? " aha-cell" : "") + (isAha ? " aha-star" : ""),
        text: empty ? "—" : val }));
    }
  }
  frag.append(h("div", { class: "cjm-scroll" }, grid));
  frag.append(h("p", { class: "section-sub", style: "margin-top:10px",
    text: "Строки — оптика персоны (боли и цели — глазами человека); «Задачи (TO-BE)» — что делает школа. Горизонтальная прокрутка — весь путь из 13 этапов." }));
  view.replaceChildren(frag);
}
function shortTerm(t) {
  const first = (t || "").split("\n")[0].replace(/🟢|🟡|🔴/g, "").trim();
  return first.length > 34 ? first.slice(0, 33) + "…" : first;
}

let compareVisible = new Set(PIDS);
let matrixTextMode = false;
function renderCompare() {
  const frag = h("div", {});

  /* 1. Кривые всех персон */
  const chartHolder = h("div", {});
  const legend = personaLegend(compareVisible, pid => {
    if (compareVisible.has(pid)) { if (compareVisible.size > 1) compareVisible.delete(pid); }
    else compareVisible.add(pid);
    renderCompare();
  });
  chartHolder.append(
    h("div", { class: "chart-title", text: "Эмоциональные кривые: где пути сходятся и расходятся" }),
    h("p", { class: "chart-sub", text: "Одна шкала для всех: −2…+2 (Плутчик). Пунктир — вилка сценария. Чипы включают и выключают персон." }),
    legend,
    emotionChart({ pids: PIDS, visible: compareVisible, annotate: true, height: 340 }));
  frag.append(h("section", { class: "section" },
    h("h2", {}, "Пересечения персон", cmtBtn("Пересечения · Эмоциональные кривые")),
    h("p", { class: "section-sub", text:
      "Три взгляда на общее и различное: кривые эмоций, профиль статусов по этапам и матрица «персона × этап»." }),
    h("div", { class: "card chart-card" }, chartHolder)));

  /* 2. Стек статусов */
  frag.append(h("section", { class: "section" },
    h("h2", {}, "Профиль воронки: сколько персон задето на каждом этапе", cmtBtn("Пересечения · Профиль воронки")),
    h("p", { class: "section-sub", text: "Высота столбца — все 5 персон; цвет — статус этапа для каждой из них (из матрицы разрывов)." }),
    h("div", { class: "card chart-card" },
      statusBars(),
      statusLegendRow())));

  /* 3. Матрица */
  const table = buildMatrix();
  frag.append(h("section", { class: "section" },
    h("h2", {}, "Матрица «персона × этап»", cmtBtn("Пересечения · Матрица «персона × этап»")),
    h("p", { class: "section-sub" },
      "Обновлена 05.07 по итогам встречи. Клик по ячейке — подробность; ",
      h("button", { class: "toggle-btn" + (matrixTextMode ? " on" : ""), text: matrixTextMode ? "показать цветом" : "показать текстом",
        style: "margin-left:6px", onclick: () => { matrixTextMode = !matrixTextMode; renderCompare(); } })),
    h("div", { class: "card pad matrix-wrap" }, table, statusLegendRow()),
    h("div", { id: "matrixDetail" })));

  /* 4. Общее ядро и уникальное */
  const { shared, unique } = computeCore();
  frag.append(h("section", { class: "section" },
    h("h2", {}, "Общее ядро и уникальные боли", cmtBtn("Пересечения · Общее ядро и уникальные боли")),
    h("p", { class: "section-sub", text:
      "Считается по матрице: общее — этапы с наибольшим суммарным весом проблем (✕=3, ◐=2, !=1); уникальное — критические разрывы, задевающие ровно одну персону." }),
    h("div", { class: "core-lists" },
      h("div", { class: "card" },
        h("h3", { text: "Болит у многих — чинится один раз" }),
        shared.map(it => coreItem(it))),
      h("div", { class: "card" },
        h("h3", { text: "Болит остро только у одной" }),
        unique.map(it => coreItem(it)))),
    h("p", { class: "section-sub", style: "margin-top:12px", html:
      "<b>Вывод аналитика (из контент-пака, 05.07):</b> три общих разрыва для всех персон — " +
      "<b>оплата РФ/UA + рассрочка</b> (этап 8) · <b>онбординг и навигация Circle</b>: «начни здесь», прогресс (9–10) · " +
      "<b>win-back</b>: 8/8 ушедших хотят вернуться (12). Две кривые рассказывают историю оттока целиком: " +
      "дно Дмитрия — «готов платить и не могу» (8), дно Александры — «выросла, а расти некуда» (12)." })));

  view.replaceChildren(frag);
  if (matrixTextMode) table.classList.add("text-mode");
}

function statusLegendRow() {
  return h("div", { class: "status-legend" }, SEV_ORDER.map(st =>
    h("span", {},
      h("span", { class: "sw", style: `background:${STATUS[st].color};opacity:${st === "gray" ? 0.45 : 1}` }),
      `${STATUS[st].glyph} ${STATUS[st].label}`)));
}

function buildMatrix() {
  const table = h("table", { class: "matrix" + (matrixTextMode ? " text-mode" : "") });
  const trh = h("tr", {}, h("th", { class: "stage-col", text: "Этап" }));
  for (const pid of PIDS) {
    trh.append(h("th", {},
      h("span", { style: `display:inline-block;width:9px;height:9px;border-radius:50%;background:${COLOR[pid]};margin-right:5px` }),
      `${pid} ${personaById[pid].name}`));
  }
  trh.append(h("th", { text: "Общий вывод" }));
  trh.append(h("th", { text: "Пояснения" }));
  table.append(trh);
  for (const s of D.stages) {
    const tr = h("tr", {},
      h("td", { class: "stagelab" },
        h("b", { text: s.id + " · " + s.title }), " ",
        h("span", { class: "zone", text: "[" + s.zone + "]" })));
    for (const pid of PIDS) {
      const cell = D.matrix[pid][s.id];
      const st = STATUS[cell.status] || STATUS.gray;
      const td = h("td", { class: "mcell " + st.cls,
        onmousemove: evt => { if (!matrixTextMode) showTip(evt, ttNode(
          `${personaById[pid].name} · этап ${s.id} ${s.title}`,
          [cell.text], st.glyph + " " + st.label)); },
        onmouseleave: hideTip,
        onclick: () => showMatrixDetail(pid, s.id) });
      td.append(matrixTextMode ? st.glyph + " " + cell.text : st.glyph);
      tr.append(td);
    }
    const allTxt = (D.matrix.ALL && D.matrix.ALL[s.id] || {}).text || "";
    tr.append(h("td", { class: "mcell m-gray", style: "text-align:left;font-size:11.8px;min-width:170px;white-space:pre-line;cursor:default",
      text: matrixTextMode ? allTxt : (allTxt.length > 46 ? allTxt.slice(0, 45) + "…" : allTxt),
      onmousemove: evt => { if (!matrixTextMode) showTip(evt, ttNode("Общий вывод · этап " + s.id, [allTxt])); },
      onmouseleave: hideTip }));
    const explTxt = (D.matrix.EXPL && D.matrix.EXPL[s.id] || {}).text || "";
    const explTd = h("td", { class: "mcell expl-cell" });
    if (explTxt) {
      explTd.append(h("details", {},
        h("summary", { text: "Пояснение ▾" }),
        h("div", { class: "expl-body", text: explTxt }),
        cmtBtn(`Матрица · этап ${s.id} ${s.title} · Пояснение`)));
    } else {
      explTd.append(h("span", { class: "expl-empty", text: "—" }));
    }
    tr.append(explTd);
    table.append(tr);
  }
  return table;
}

function showMatrixDetail(pid, sid) {
  const holder = document.getElementById("matrixDetail");
  if (!holder) return;
  const cell = D.matrix[pid][sid], s = stageById[sid], st = STATUS[cell.status] || STATUS.gray;
  holder.replaceChildren(h("div", { class: "card matrix-detail" },
    h("div", {},
      h("b", { text: `${personaById[pid].name} · этап ${sid} ${s.title} [${s.zone}]` }),
      h("span", { text: `  —  ${st.glyph} ${st.label}`, style: "color:var(--ink-2)" }),
      cmtBtn(`Матрица · этап ${sid} ${s.title} · ${personaById[pid].name}`)),
    h("div", { style: "margin-top:6px", text: cell.text || "—" }),
    h("div", { style: "margin-top:8px" },
      h("a", { href: `#/cjm/${pid}`, text: `Открыть карту пути ${personaById[pid].name} →`,
        style: "color:var(--brand);font-weight:600;text-decoration:none" }))));
  holder.scrollIntoView({ behavior: "smooth", block: "nearest" });
}

function computeCore() {
  const W8 = { red: 3, orange: 2, yellow: 1, green: 0, gray: 0 };
  const scored = D.stages.map(s => {
    const who = PIDS.map(pid => ({ pid, status: D.matrix[pid][s.id].status }));
    return { s, who, score: who.reduce((a, w) => a + W8[w.status], 0) };
  }).sort((a, b) => b.score - a.score);
  const shared = scored.filter(x => x.score >= 5).slice(0, 5).map(x => ({
    title: `${x.s.id} · ${x.s.title}`,
    who: x.who.filter(w => W8[w.status] > 0),
    expl: (D.matrix.ALL && D.matrix.ALL[x.s.id] || {}).text || "",
  }));
  const unique = [];
  for (const s of D.stages) {
    const reds = PIDS.filter(pid => D.matrix[pid][s.id].status === "red");
    if (reds.length === 1) {
      const pid = reds[0];
      unique.push({ title: `${s.id} · ${s.title}`, who: [{ pid, status: "red" }],
        expl: `${personaById[pid].name}: ${D.matrix[pid][s.id].text}` });
    }
  }
  return { shared, unique };
}

function coreItem(it) {
  return h("div", { class: "core-item" },
    h("b", { text: it.title }),
    h("span", { class: "who" }, it.who.map(w =>
      h("i", { style: `background:${COLOR[w.pid]};box-shadow:0 0 0 2px ${STATUS[w.status].color}33`,
        title: `${personaById[w.pid].name} — ${STATUS[w.status].label}` }))),
    h("div", { class: "expl", text: it.expl }));
}

/* ---------- Проекты ---------- */
const PROJECTS = [
  { id: "funnel", title: "Реклама → квиз", build: buildFunnel },
  { id: "app-welcome", title: "App Welcome воронка", build: buildAppWelcome },
];
function buildAppWelcome() {
  const frag = h("div", {});
  frag.append(h("section", { class: "section", style: "margin-bottom:14px" },
    h("h2", {}, "App Welcome воронка: онбординг в приложении Полиса", cmtBtn("Проект «App Welcome воронка» · в целом")),
    h("p", { class: "section-sub", text:
      "Три дорожки бесплатных пользователей приложения — от установки до первой ценности. Документ встроен целиком; комментировать можно кнопкой выше." })));
  const iframe = h("iframe", { class: "proj-frame", src: "projects/onboarding-app.html",
    title: "Онбординг в приложении Полиса — три дорожки",
    onload: function () {
      const fit = () => { try { this.style.height = (this.contentDocument.body.scrollHeight + 40) + "px"; } catch (e) {} };
      fit.call(this);
      setTimeout(() => fit.call(this), 600);
    } });
  frag.append(iframe);
  return frag;
}
function renderProjects(sub) {
  const proj = PROJECTS.find(p => p.id === sub) || PROJECTS[0];
  const frag = h("div", {});
  frag.append(h("div", { class: "persona-switch" }, PROJECTS.map(pr =>
    h("button", { class: "pchip" + (pr.id === proj.id ? " active" : ""),
      onclick: () => location.hash = "#/projects/" + pr.id },
      h("span", { class: "dot", style: "background:var(--brand)" }),
      pr.title))));
  frag.append(proj.build());
  view.replaceChildren(frag);
}

/* ---------- Проект: Реклама → квиз ---------- */
function buildFunnel() {
  const steps = (D.quiz || []).filter(q => q.step_id > 0).sort((a, b) => a.step_id - b.step_id);
  const prelaunch = (D.quiz || []).find(q => q.step_id === 0);
  const frag = h("div", {});
  if (!steps.length) {
    frag.append(h("p", { text: "Данные воронки не загружены." }));
    return frag;
  }
  frag.append(h("section", { class: "section" },
    h("h2", {}, "Реклама → квиз: путь холодного трафика", cmtBtn("Проект «Реклама → квиз» · в целом")),
    h("p", { class: "section-sub", text:
      "Верх воронки, которого не видно в аналитике: новые лендинги, реклама по состояниям (Instagram), " +
      "квиз B1/S1 как мягкий вход и сегментатор. В скобках у шага — этап базовой карты CJM, " +
      "на который он ложится. Клик по шагу схемы — подробности." })));

  /* цепочка шагов */
  const chain = h("div", { class: "fchain" });
  steps.forEach((q, i) => {
    if (i) chain.append(h("span", { class: "farrow", text: "→" }));
    const m1 = (q.milestone.match(/🏁\s*([^·\n.]+)/) || [, ""])[1].trim();
    chain.append(h("button", { class: "fnode" + (q.step_id === 6 ? " fnode-seam" : ""),
      onclick: () => { const el = document.getElementById("fstep-" + q.step_id); if (el) el.scrollIntoView({ behavior: "smooth", block: "start" }); } },
      h("span", { class: "fnum", text: q.step_id === 6 ? "ОПЛАТА" : "ШАГ " + q.step_id }),
      h("span", { class: "fname", text: q.step_id === 6 ? q.map_stages : q.title }),
      h("span", { class: "fmile", text: m1 })));
  });
  frag.append(h("div", { class: "card pad", style: "margin-bottom:22px" }, chain));

  /* секции шагов */
  for (const q of steps) {
    const grid = h("div", { class: "fpersona-grid" }, PIDS.map(pid => {
      const txt = (q["p" + pid[1]] || "").trim();
      if (!txt) return null;
      return h("div", { class: "fpcard" },
        h("div", { class: "fpband", style: `background:${COLOR[pid]}` }),
        h("div", { class: "fpbody" },
          h("div", { class: "fpname", text: `${pid} ${personaById[pid].name}` }),
          h("div", { class: "fptxt", text: txt })));
    }));
    const sec = h("section", { class: "section", id: "fstep-" + q.step_id },
      h("div", { class: "card fstep" },
        h("div", { class: "fstep-head" },
          h("h3", { text: (q.step_id === 6 ? "ОПЛАТА" : `ШАГ ${q.step_id} · ${q.title}`) + (q.sub ? " — " + q.sub : "") }),
          cmtBtn(`Реклама → квиз · ${q.step_id === 6 ? "Оплата" : "Шаг " + q.step_id + " " + q.title}`),
          q.map_stages ? h("span", { class: "zone-badge" + (q.step_id === 6 ? " z-shov" : ""), text: q.map_stages }) : null),
        h("div", { class: "fcore", text: q.core }),
        grid,
        q.milestone ? h("div", { class: "fmilestone", text: q.milestone }) : null,
        q.extra ? h("div", { class: "fextra" },
          h("b", { text: q.step_id === 4 ? "Как квиз сам проверяет персоны: " : "Примечание: " }),
          q.extra) : null));
    frag.append(sec);
  }

  /* чек-лист до старта */
  if (prelaunch) {
    const items = prelaunch.core.replace(/^ДО СТАРТА РЕКЛАМЫ\s*:?\s*/, "")
      .split(/\s*·?\s*(?=\d\)\s)/).map(s => s.replace(/·\s*$/, "").trim()).filter(Boolean);
    frag.append(h("section", { class: "section" },
      h("div", { class: "card fstep", style: "border-left:4px solid var(--st-critical)" },
        h("h3", {}, "До старта рекламы — блокеры 🔴", cmtBtn("Реклама → квиз · чек-лист до старта")),
        h("ul", { class: "fchecklist" }, items.map(it => h("li", { text: it }))))));
  }
  return frag;
}

/* ---------- Роутер ---------- */
function route() {
  hideTip();
  const parts = (location.hash || "#/").replace(/^#\/?/, "").split("/");
  let name = parts[0] || "overview";
  const arg = parts[1];
  if (name === "persona") renderPersona(arg || "P1");
  else if (name === "cjm") renderCJM(arg || "P1");
  else if (name === "projects") renderProjects(arg || "funnel");
  else if (name === "funnel") { location.hash = "#/projects/funnel"; return; }
  else if (name === "compare") renderCompare();
  else { name = "overview"; renderOverview(); }
  for (const a of document.querySelectorAll("#nav a")) {
    a.classList.toggle("active", a.dataset.route === name);
  }
  scrollTo(0, 0);
}
addEventListener("hashchange", route);

/* ---------- Футер и старт ---------- */
document.getElementById("metaSource").textContent = "Источники: " + D.meta.source;
document.getElementById("metaBuilt").textContent =
  "Данные собраны " + D.meta.built + " · матрица обновлена 05.07 · внутренний рабочий документ школы";
route();
