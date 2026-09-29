/* WorkForce AI website (D24).
   Reads data/data.json (built from results/ by site/build_data.py): aggregated
   results only, never raw job data. Each page's <body data-page="..."> picks
   which function below draws it. Charts: Apache ECharts. */

"use strict";

// ---------- design tokens for charts (dataviz reference palette, light mode) ----------
const C = {
  blue: "#2a78d6", orange: "#eb6834", aqua: "#1baf7a", yellow: "#eda100", magenta: "#e87ba4", green: "#008300",
  red: "#e34948", neutral: "#b4b6b0", ink: "#15171a", ink2: "#4a4e52", muted: "#7d8280", grid: "rgba(20,24,20,.07)",
  accent: "#4b7d2b",
};
const SEQ = ["#f2f6fb", "#cde2fb", "#9ec5f4", "#6da7ec", "#3987e5", "#256abf", "#184f95"];
const JOB_TYPE_COLOR = {
  "BI / dashboard analyst": C.blue, "Business-facing analyst": C.orange, "Python + SQL analyst": C.aqua,
  "Excel / reporting analyst": C.yellow, "Cloud data analyst": C.magenta, "Few skills listed": C.green,
};
const REDUCED = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const FONT = "Geist, ui-sans-serif, system-ui, -apple-system, Segoe UI, sans-serif";

// ---------- small helpers ----------
const $ = (sel, root = document) => root.querySelector(sel);
const esc = (s) => String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
const pct = (x, d = 0) => (x == null ? "–" : `${(100 * x).toFixed(d)}%`);
const signed = (x) => (x == null ? "–" : `${x > 0 ? "+" : ""}${Math.round(x)}%`);
const lakh = (x) => (x == null ? "–" : `₹${(x / 1e5).toFixed(1)}L`);
const num = (x) => (x == null ? "–" : Math.round(x).toLocaleString("en-IN"));

// Line icons (simple 24px strokes, drawn for this site).
const ICON = {
  home: '<path d="M3 11.5 12 4l9 7.5"/><path d="M5.5 10v9.5h13V10"/>',
  skills: '<path d="M12 3.5 14.5 9l6 .6-4.5 4 1.3 5.9L12 16.4l-5.3 3.1L8 13.6 3.5 9.6l6-.6z"/>',
  salary: '<path d="M7 5h10M7 9.5h10M7 5c5 0 5 9 0 9l8 5.5"/>',
  types: '<rect x="4" y="4" width="7" height="7" rx="2"/><rect x="13" y="4" width="7" height="7" rx="2"/><rect x="4" y="13" width="7" height="7" rx="2"/><circle cx="16.5" cy="16.5" r="3.5"/>',
  places: '<path d="M12 21s-6.5-6.2-6.5-11a6.5 6.5 0 0 1 13 0C18.5 14.8 12 21 12 21z"/><circle cx="12" cy="10" r="2.3"/>',
  market: '<path d="M4 19V5M4 19h16"/><path d="m7 15 4-4 3 3 5-6"/>',
  explore: '<circle cx="10.5" cy="10.5" r="6.5"/><path d="m20 20-4.5-4.5"/>',
  about: '<circle cx="12" cy="12" r="8.5"/><path d="M12 11v5.5M12 7.6v.1"/>',
  arrow: '<path d="M5 12h14M13 6l6 6-6 6"/>',
  question: '<circle cx="12" cy="12" r="8.5"/><path d="M9.6 9.3a2.5 2.5 0 1 1 3.4 2.3c-.6.3-1 .9-1 1.6v.5M12 16.6v.1"/>',
  flask: '<path d="M9.5 3.5h5M10.5 3.5V9L5 18.5A1.5 1.5 0 0 0 6.3 20.7h11.4A1.5 1.5 0 0 0 19 18.5L13.5 9V3.5"/><path d="M7.5 14.5h9"/>',
  target: '<circle cx="12" cy="12" r="8.5"/><circle cx="12" cy="12" r="4.5"/><circle cx="12" cy="12" r=".8"/>',
};
const icon = (name) => `<svg viewBox="0 0 24 24" fill="none" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICON[name]}</svg>`;
const LOGO = `<svg width="26" height="26" viewBox="0 0 26 26" aria-hidden="true"><rect x="1" y="10" width="10" height="15" rx="3" fill="#365e1c"/><rect x="14" y="1" width="11" height="11" rx="3" fill="#5b9234"/><rect x="14" y="15" width="11" height="10" rx="3" fill="#a9c98a"/></svg>`;

const PAGES = [
  ["home", "index.html", "Home"], ["skills", "skills.html", "Skills"], ["salary", "salary.html", "Salary"],
  ["types", "job-types.html", "Job types"], ["places", "places.html", "Cities & companies"],
  ["market", "market.html", "Market"], ["explore", "explorer.html", "Explorer"], ["about", "about.html", "About"],
];
const ICON_FOR = { home: "home", skills: "skills", salary: "salary", types: "types", places: "places", market: "market", explore: "explore", about: "about" };

// ---------- chrome: header + footer on every page ----------
function renderChrome(page, data) {
  const nav = PAGES.map(([id, href, label]) =>
    `<a href="${href}"${id === page ? ' aria-current="page"' : ""}>${icon(ICON_FOR[id])}<span>${label}</span></a>`).join("");
  document.body.insertAdjacentHTML("afterbegin",
    `<a class="skip" href="#main">Skip to content</a>
     <header class="site-head"><a class="brand" href="index.html">${LOGO}<span>WorkForce AI</span></a>
     <nav class="nav" aria-label="Pages">${nav}</nav></header>`);
  const w = data.meta.data_window;
  document.body.insertAdjacentHTML("beforeend",
    `<footer class="site-foot glass">
       <div>Built by <strong>Dipayan &amp; Sayak</strong>. Data collected ${w.first_run.slice(0, 10)} → ${w.last_run.slice(0, 10)}.</div>
       <div>Job &amp; salary data: <a href="https://www.adzuna.in" target="_blank" rel="noopener">The Adzuna API</a>. Aggregated results only; no job listings are published.</div>
     </footer>`);
}

// ---------- motion ----------
function countUp(el) {
  const target = parseFloat(el.dataset.count);
  const fmt = el.dataset.fmt || "int";
  const show = (v) => {
    if (fmt === "lakh") return `₹${v.toFixed(1)}<small>L</small>`;
    if (fmt === "pct") return `${Math.round(v)}<small>%</small>`;
    return Math.round(v).toLocaleString("en-IN");
  };
  if (REDUCED) { el.innerHTML = show(target); return; }
  const start = performance.now(), dur = 1400;
  const tick = (t) => {
    const p = Math.min(1, (t - start) / dur), eased = 1 - Math.pow(1 - p, 3);
    el.innerHTML = show(target * eased);
    if (p < 1) requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
}

const onVisible = (() => {
  const jobs = new Map();
  const io = "IntersectionObserver" in window ? new IntersectionObserver((entries) => {
    for (const e of entries) if (e.isIntersecting) { io.unobserve(e.target); jobs.get(e.target)?.(); jobs.delete(e.target); }
  }, { rootMargin: "0px 0px -8% 0px" }) : null;
  return (el, fn) => { if (!io) return fn(); jobs.set(el, fn); io.observe(el); };
})();

function wireMotion() {
  document.querySelectorAll(".reveal").forEach((el, i) => {
    el.style.transitionDelay = `${Math.min(i % 4, 3) * 70}ms`;
    onVisible(el, () => el.classList.add("in"));
  });
  document.querySelectorAll("[data-count]").forEach((el) => onVisible(el, () => countUp(el)));
}

// ---------- charts ----------
const charts = [];
window.addEventListener("resize", () => charts.forEach((c) => c.resize()));

function base(extra = {}) {
  return {
    animation: !REDUCED, animationDuration: 1100, animationEasing: "cubicOut",
    textStyle: { fontFamily: FONT, color: C.ink2 },
    aria: { enabled: true },
    tooltip: {
      backgroundColor: "rgba(255,255,255,.96)", borderColor: "rgba(20,24,20,.08)", borderWidth: 1,
      textStyle: { color: C.ink, fontFamily: FONT, fontSize: 13 }, extraCssText: "border-radius:12px;box-shadow:0 10px 30px rgba(0,0,0,.1);",
    },
    grid: { left: 12, right: 24, top: 18, bottom: 12, containLabel: true },
    ...extra,
  };
}
const axisStyle = {
  axisLine: { lineStyle: { color: "rgba(20,24,20,.15)" } }, axisTick: { show: false },
  splitLine: { lineStyle: { color: C.grid } }, axisLabel: { color: C.muted },
};

// Draw the chart only when it scrolls into view, so its entrance animation is seen.
// `option` can be a function of the box width, for charts that change layout when narrow.
function chart(id, option, onReady) {
  const el = document.getElementById(id);
  if (!el) return;
  onVisible(el, () => {
    const c = echarts.init(el, null, { renderer: "svg" });
    c.setOption(typeof option === "function" ? option(el.clientWidth) : option);
    charts.push(c);
    onReady?.(c);
  });
}

function numbersTable(id, rows, cols) {
  const el = document.getElementById(id);
  if (!el || !rows.length) return;
  cols = cols || Object.keys(rows[0]);
  const fmt = (v) => (typeof v === "number" ? (Math.abs(v) < 1 && v !== 0 ? v.toFixed(3) : v.toLocaleString("en-IN")) : esc(v ?? "–"));
  el.innerHTML = `<details class="numbers"><summary>Show the numbers</summary><div class="table-scroll"><table>
    <thead><tr>${cols.map((c) => `<th scope="col">${esc(c)}</th>`).join("")}</tr></thead>
    <tbody>${rows.map((r) => `<tr>${cols.map((c) => `<td>${fmt(r[c])}</td>`).join("")}</tr>`).join("")}</tbody></table></div></details>`;
}

// Horizontal bars: biggest on top, one colour, value label at the bar end.
function hbarOption(rows, labelKey, valueKey, { money = false, fmt = "pct", color = C.blue } = {}) {
  const d = [...rows].sort((a, b) => a[valueKey] - b[valueKey]);
  const show = (v) => (money ? `₹${(v / 1e5).toFixed(1)}L` : fmt === "pct" ? pct(v) : num(v));
  return base({
    grid: { left: 12, right: 64, top: 8, bottom: 8, containLabel: true },
    tooltip: { ...base().tooltip, trigger: "item", formatter: (p) => `${esc(p.name)}<br><b>${show(p.value)}</b>` },
    xAxis: { type: "value", ...axisStyle, splitNumber: 4,
             axisLabel: { color: C.muted, hideOverlap: true, formatter: (v) => (money ? `${v / 1e5}L` : fmt === "pct" ? pct(v) : num(v)) } },
    yAxis: { type: "category", data: d.map((r) => r[labelKey]), ...axisStyle, splitLine: { show: false }, axisLabel: { color: C.ink2 } },
    series: [{ type: "bar", data: d.map((r) => r[valueKey]), barMaxWidth: 18, itemStyle: { color, borderRadius: [0, 6, 6, 0] },
               label: { show: true, position: "right", color: C.ink2, formatter: (p) => show(p.value) } }],
  });
}

// width = the chart box's width: narrow boxes (3-column cards, phones) stack the legend under the ring.
function donutOption(items, colorOf, width = 800) {
  const total = items.reduce((s, i) => s + i.value, 0) || 1;
  const palette = [C.blue, C.orange, C.aqua, C.yellow, C.magenta, C.green];
  const narrow = width < 560;
  return base({
    tooltip: { ...base().tooltip, trigger: "item", formatter: (p) => `${esc(p.name)}<br><b>${num(p.value)}</b> postings (${p.percent}%)` },
    legend: { orient: "vertical", icon: "circle", itemWidth: 10, textStyle: { color: C.ink2 },
              ...(narrow ? { left: "center", bottom: 0 } : { right: 0, top: "middle" }),
              formatter: (name) => `${name}  ${pct(items.find((i) => i.name === name).value / total)}` },
    series: [{ type: "pie", radius: narrow ? ["38%", "54%"] : ["56%", "78%"], center: narrow ? ["50%", "30%"] : ["32%", "50%"],
               avoidLabelOverlap: true, padAngle: 1,
               itemStyle: { borderRadius: 8, borderColor: "rgba(255,255,255,.9)", borderWidth: 2 },
               label: { show: false }, labelLine: { show: false },
               data: items.map((it, i) => ({ ...it, itemStyle: { color: colorOf ? colorOf(it.name) : palette[i % palette.length] } })) }],
  });
}

function heatOption(rowNames, colNames, matrix) {
  // White text on the dark (high) cells, dark text on the light ones, so every label stays readable.
  const data = [];
  matrix.forEach((row, y) => row.forEach((v, x) => data.push({ value: [x, y, v], label: { color: v > 0.5 ? "#fff" : C.ink } })));
  return base({
    grid: { left: 12, right: 12, top: 8, bottom: 8, containLabel: true },
    tooltip: { ...base().tooltip, formatter: (p) => `${esc(rowNames[p.value[1]])} · ${esc(colNames[p.value[0]])}<br><b>${pct(p.value[2])}</b>` },
    xAxis: { type: "category", data: colNames, ...axisStyle, splitLine: { show: false }, axisLabel: { color: C.ink2, rotate: 35, interval: 0 } },
    yAxis: { type: "category", data: rowNames, inverse: true, ...axisStyle, splitLine: { show: false }, axisLabel: { color: C.ink2 } },
    visualMap: { show: false, min: 0, max: 1, inRange: { color: SEQ } },
    series: [{ type: "heatmap", data, itemStyle: { borderColor: "rgba(255,255,255,.9)", borderWidth: 2, borderRadius: 4 },
               label: { show: true, formatter: (p) => pct(p.value[2]), color: C.ink, fontSize: 11 } }],
  });
}

function groupedOption(categories, series) {
  return base({
    grid: { left: 12, right: 12, top: 40, bottom: 8, containLabel: true },
    legend: { top: 0, left: 0, icon: "circle", itemWidth: 10, textStyle: { color: C.ink2 } },
    tooltip: { ...base().tooltip, trigger: "axis", axisPointer: { type: "shadow" }, valueFormatter: (v) => pct(v) },
    xAxis: { type: "category", data: categories, ...axisStyle, splitLine: { show: false }, axisLabel: { color: C.ink2, rotate: 35, interval: 0 } },
    yAxis: { type: "value", ...axisStyle, axisLabel: { color: C.muted, formatter: (v) => pct(v) } },
    series: series.map((s) => ({ type: "bar", name: s.name, data: s.data, barMaxWidth: 14, barGap: "20%",
                                 itemStyle: { color: s.color, borderRadius: [5, 5, 0, 0] } })),
  });
}

// ---------- home ----------
const METROS = {
  "Bengaluru": [12.97, 77.59], "Hyderabad": [17.39, 78.49], "Mumbai": [19.08, 72.88],
  "Pune": [18.52, 73.86], "Chennai": [13.08, 80.27], "Delhi NCR": [28.61, 77.21],
};
// Other Indian cities, drawn as faint dots only (no borders are drawn).
const OTHER_CITIES = [[34.08,74.8],[32.73,74.86],[31.63,74.87],[30.9,75.85],[30.73,76.78],[30.32,78.03],[26.91,75.79],[26.24,73.02],
  [26.85,80.95],[26.45,80.33],[27.18,78.01],[25.32,82.97],[25.59,85.14],[26.14,91.74],[25.58,91.89],[24.82,93.94],[22.57,88.36],
  [23.34,85.31],[20.3,85.82],[21.25,81.63],[21.15,79.09],[23.26,77.41],[22.72,75.86],[23.02,72.57],[21.17,72.83],[22.31,73.18],
  [22.3,70.8],[20.0,73.79],[19.88,75.34],[17.69,83.22],[16.51,80.65],[15.5,73.83],[15.36,75.12],[12.91,74.86],[12.3,76.64],
  [11.02,76.96],[9.93,78.12],[9.93,76.27],[8.52,76.94],[11.94,79.81],[10.79,78.7],[26.73,88.4],[27.33,88.61],[24.58,73.71],
  [26.22,78.18],[23.18,79.99],[25.21,75.86],[25.44,81.85],[26.76,83.37],[23.8,86.43],[20.46,85.88],[17.97,79.59],[15.83,78.04],
  [15.85,74.5],[17.66,75.91],[16.7,74.24],[8.71,77.76],[29.39,76.97],[28.98,77.71],[27.88,78.08],[24.63,77.3],[21.76,72.15]];
const LINKS = [["Delhi NCR", "Mumbai"], ["Delhi NCR", "Hyderabad"], ["Mumbai", "Pune"], ["Pune", "Hyderabad"],
  ["Pune", "Bengaluru"], ["Hyderabad", "Bengaluru"], ["Hyderabad", "Chennai"], ["Bengaluru", "Chennai"]];

function indiaMap(demand) {
  // Simple equirectangular projection (longitude squeezed by cos 22°) into a 560 x 640 box.
  const P = ([lat, lon]) => [(lon - 68) * 0.93 * 20 + 10, (37 - lat) * 20 + 10];
  const counts = Object.fromEntries(demand.map((r) => [r.city, r.all_analyst_postings]));
  const max = Math.max(...Object.keys(METROS).map((m) => counts[m] || 1));
  const bg = OTHER_CITIES.map((c) => { const [x, y] = P(c); return `<circle class="map-bg-dot" cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="2.4"/>`; }).join("");
  const links = LINKS.map(([a, b], i) => {
    const [x1, y1] = P(METROS[a]), [x2, y2] = P(METROS[b]);
    const mx = (x1 + x2) / 2 + (y2 - y1) * 0.18, my = (y1 + y2) / 2 - (x2 - x1) * 0.18;
    return `<path class="map-link" style="animation-delay:${i * -0.2}s" d="M${x1},${y1} Q${mx},${my} ${x2},${y2}"/>`;
  }).join("");
  // Label side per city, chosen so neighbours (Mumbai/Pune, Bengaluru/Chennai) never overlap.
  const SIDE = { "Mumbai": ["end", -1, -10], "Pune": ["start", 1, 26], "Bengaluru": ["end", -1, 0],
                 "Chennai": ["start", 1, 0], "Hyderabad": ["start", 1, -6], "Delhi NCR": ["start", 1, -4] };
  const nodes = Object.entries(METROS).map(([name, ll], i) => {
    const [x, y] = P(ll), n = counts[name] || 0, r = 6 + 16 * Math.sqrt(n / max);
    const [anchor, dir, dy] = SIDE[name], lx = x + dir * (r + 10);
    return `<g><circle class="map-ring" style="animation-delay:${i * 0.45}s" cx="${x}" cy="${y}" r="${r}"/>
      <circle class="map-node" cx="${x}" cy="${y}" r="${r}" opacity=".9"/>
      <text class="map-city" x="${lx}" y="${y + dy - 2}" text-anchor="${anchor}">${name}</text>
      <text class="map-count" x="${lx}" y="${y + dy + 14}" text-anchor="${anchor}">${num(n)} jobs</text></g>`;
  }).join("");
  const label = "Map of Indian cities, dot size = analyst job postings: " +
    Object.keys(METROS).map((m) => `${m} ${num(counts[m] || 0)}`).join(", ");
  // viewBox cropped to where the dots are, so the map fills its card
  return `<svg viewBox="8 40 544 570" role="img" aria-label="${esc(label)}">${bg}${links}${nodes}</svg>`;
}

function pageHome(D) {
  const o = D.overview, t = D.tables;
  $("#hero-map").insertAdjacentHTML("afterbegin", indiaMap(t.city_demand));
  $("#kpi-analyst").dataset.count = o.analyst_postings;
  $("#kpi-da").dataset.count = o.da_postings;
  $("#kpi-companies").dataset.count = o.companies;
  $("#kpi-salary").dataset.count = o.da_median_salary / 1e5;
  $("#kpi-salary-sub").textContent = `median, from ${o.da_salaried} ads that list a salary`;
  $("#float-city").textContent = o.top_city;
  $("#float-city-sub").textContent = `${pct(o.top_city_share_of_known)} of jobs that name a metro`;
  $("#float-skill").textContent = o.top_skill;
  $("#float-skill-sub").textContent = `asked for in ${pct(o.top_skill_share)} of Data Analyst jobs`;

  const jp = Object.fromEntries(t.job_type_pay.map((r) => [r.job_type, r]));
  const lv = {}; t.skill_demand_by_level.forEach((r) => { (lv[r.skill] ||= {})[r.experience_level] = r.share; });
  const ct = Object.fromEntries(t.company_types.map((r) => [r.company_type, r]));
  const leans = t.skill_quadrant.filter((r) => r.pay_signal === "leans higher pay").map((r) => r.skill);
  const cards = [
    [signed(jp["Business-facing analyst"]?.pct_vs_bi_dashboard), "More tools doesn't mean more pay",
     "Business-facing Data Analyst jobs list about 3 skills, yet pay this much more than BI/dashboard jobs listing 6–7 tools, at the same experience level and city.", "job-types.html"],
    [`${pct(lv.Excel?.junior)} → ${pct(lv.Excel?.senior)}`, "Excel gets you in, stakeholder skills move you up",
     `Excel shows up in ${pct(lv.Excel?.junior)} of junior jobs but ${pct(lv.Excel?.senior)} of senior ones. Stakeholder management rises from ${pct(lv["Stakeholder mgmt"]?.junior)} to ${pct(lv["Stakeholder mgmt"]?.senior)}.`, "skills.html"],
    [String(leans.length), "Skills that lean toward higher pay",
     `${leans.join(", ")}: same direction in all 4 versions of our salary model.`, "salary.html"],
    [pct(ct["Pharma & healthcare"]?.share_AWS), "Which cloud depends on the industry",
     `Pharma asks for AWS in ${pct(ct["Pharma & healthcare"]?.share_AWS)} of jobs; IT services ask for Azure in ${pct(ct["IT & analytics services"]?.share_Azure)}, banks in only ${pct(ct["Bank & financial services"]?.share_Azure)}.`, "places.html"],
  ];
  $("#findings").innerHTML = cards.map(([big, h, p, href]) =>
    `<a class="finding glass reveal" href="${href}"><div class="big">${esc(big)}</div><h3>${esc(h)}</h3><p>${esc(p)}</p>
     <span class="go">See the evidence ${icon("arrow")}</span></a>`).join("");
}

// ---------- skills ----------
function pageSkills(D) {
  const t = D.tables;
  const q = t.skill_quadrant.filter((r) => r.pct_effect != null);
  const colorOf = { "leans higher pay": C.blue, "leans lower pay": C.red, unclear: C.neutral };
  chart("c-map", base({
    grid: { left: 12, right: 30, top: 56, bottom: 40, containLabel: true },
    legend: { top: 0, right: 0, icon: "circle", itemWidth: 10, textStyle: { color: C.ink2 } },
    tooltip: { ...base().tooltip, formatter: (p) => `<b>${esc(p.data.name)}</b><br>in ${pct(p.data.value[0])} of jobs<br>pay ${signed(p.data.value[1] * 100)}
      (95% range ${signed(p.data.lo)} to ${signed(p.data.hi)})<br>${p.data.n} salaried jobs have it` },
    xAxis: { type: "value", name: "share of jobs asking for it", nameLocation: "middle", nameGap: 30, nameTextStyle: { color: C.muted }, ...axisStyle, axisLabel: { color: C.muted, formatter: (v) => pct(v) } },
    yAxis: { type: "value", name: "pay difference", nameTextStyle: { color: C.muted }, ...axisStyle, axisLabel: { color: C.muted, formatter: (v) => signed(v * 100) } },
    series: Object.keys(colorOf).map((sig) => ({
      name: sig, type: "scatter", symbolSize: 16,
      itemStyle: { color: colorOf[sig], borderColor: "#fff", borderWidth: 2 },
      label: { show: true, position: "top", color: C.ink2, formatter: (p) => p.data.name },
      data: q.filter((r) => r.pay_signal === sig).map((r) => ({ name: r.skill, value: [r.demand_share, r.pct_effect / 100], lo: r.pct_low, hi: r.pct_high, n: r.postings_with_skill })),
      markLine: sig === "leans higher pay" ? { silent: true, symbol: "none", lineStyle: { color: "rgba(20,24,20,.2)", type: "solid" }, label: { show: false },
        data: [{ yAxis: 0 }, { xAxis: 0.25 }] } : undefined,
    })),
  }));
  numbersTable("n-map", t.skill_quadrant, ["skill", "demand_share", "pct_effect", "pct_low", "pct_high", "pay_signal", "certain", "quadrant"]);
  $("#map-note").textContent = "Not enough salaried jobs to measure pay for: " + t.skill_quadrant.filter((r) => r.pct_effect == null).map((r) => r.skill).join(", ") + ".";

  chart("c-demand", hbarOption(t.skill_demand, "skill", "share"));
  numbersTable("n-demand", t.skill_demand);

  const pairs = t.skill_combinations.filter((r) => r.skills === 2).slice(0, 10);
  const triples = t.skill_combinations.filter((r) => r.skills === 3).slice(0, 10);
  chart("c-combos", hbarOption(pairs, "combination", "share", { color: C.aqua }), (c) => {
    document.querySelectorAll("#combo-toggle .chip").forEach((b) => b.addEventListener("click", () => {
      document.querySelectorAll("#combo-toggle .chip").forEach((x) => x.setAttribute("aria-pressed", String(x === b)));
      c.setOption(hbarOption(b.dataset.k === "3" ? triples : pairs, "combination", "share", { color: C.aqua }), true);
    }));
  });

  numbersTable("n-combos", t.skill_combinations);
  const co = t.skill_cooccurrence, names = co.map((r) => r.skill);
  numbersTable("n-cooc", co);
  chart("c-cooc", heatOption(names, names, co.map((r) => names.map((n) => r[n]))));

  const lv = t.skill_demand_by_level.filter((r) => ["junior", "mid", "senior"].includes(r.experience_level));
  const skills = [...new Set(lv.map((r) => r.skill))];
  const get = (s, l) => lv.find((r) => r.skill === s && r.experience_level === l)?.share ?? 0;
  chart("c-levels", groupedOption(skills, [
    { name: "junior", color: C.blue, data: skills.map((s) => get(s, "junior")) },
    { name: "mid", color: C.orange, data: skills.map((s) => get(s, "mid")) },
    { name: "senior", color: C.aqua, data: skills.map((s) => get(s, "senior")) },
  ]));
  const per = Object.fromEntries(lv.map((r) => [r.experience_level, r.postings]));
  numbersTable("n-levels", lv);
  $("#levels-note").textContent = `Postings per level: junior ${per.junior}, mid ${per.mid}, senior ${per.senior} (the rest don't state a level).`;
}

// ---------- salary ----------
function pageSalary(D) {
  const t = D.tables;
  $("#salary-sample").textContent = D.meta.salaried_postings_main_model;
  const main = t.salary_effects.filter((r) => r.model.startsWith("main") && r.pct_effect != null).sort((a, b) => a.pct_effect - b.pct_effect);
  chart("c-effects", base({
    grid: { left: 12, right: 30, top: 12, bottom: 12, containLabel: true },
    tooltip: { ...base().tooltip, trigger: "item", formatter: (p) => { const r = main[p.dataIndex]; return `<b>${esc(r.skill)}</b>: ${signed(r.pct_effect)}<br>95% range ${signed(r.pct_low)} to ${signed(r.pct_high)}<br>${r.postings_with_skill} salaried jobs have it`; } },
    // Axis sized to the full 95% ranges (not just the dots), so no range runs off the chart.
    xAxis: { type: "value", ...axisStyle, axisLabel: { color: C.muted, formatter: (v) => signed(v) },
             min: Math.floor(Math.min(...main.map((r) => r.pct_low)) / 25) * 25,
             max: Math.ceil(Math.max(...main.map((r) => r.pct_high)) / 25) * 25 },
    yAxis: { type: "category", data: main.map((r) => r.skill), ...axisStyle, splitLine: { show: false }, axisLabel: { color: C.ink2 } },
    series: [
      { type: "custom", silent: true, clip: true, data: main.map((r, i) => [i, r.pct_low, r.pct_high]),
        renderItem: (params, api) => {
          const a = api.coord([api.value(1), api.value(0)]), b = api.coord([api.value(2), api.value(0)]);
          return { type: "line", shape: { x1: a[0], y1: a[1], x2: b[0], y2: b[1] }, style: { stroke: C.neutral, lineWidth: 3, lineCap: "round" } };
        } },
      { type: "scatter", symbolSize: 15, data: main.map((r) => ({ value: r.pct_effect, itemStyle: { color: r.pct_effect > 0 ? C.blue : C.red, borderColor: "#fff", borderWidth: 2 } })),
        markLine: { silent: true, symbol: "none", label: { show: false }, lineStyle: { color: C.muted, type: "solid" }, data: [{ xAxis: 0 }] } },
    ],
  }));
  numbersTable("n-effects", t.salary_effects, ["model", "skill", "postings_with_skill", "pct_effect", "pct_low", "pct_high", "p_value", "verdict"]);

  const dist = t.salary_distribution;
  const distOption = (key) => base({
    tooltip: { ...base().tooltip, trigger: "axis", axisPointer: { type: "shadow" }, valueFormatter: (v) => `${v} jobs` },
    xAxis: { type: "category", data: dist.map((r) => r.band), ...axisStyle, splitLine: { show: false }, axisLabel: { color: C.ink2 } },
    yAxis: { type: "value", ...axisStyle },
    series: [{ type: "bar", data: dist.map((r) => r[key]), barMaxWidth: 36, itemStyle: { color: C.blue, borderRadius: [8, 8, 0, 0] } }],
  });
  chart("c-dist", distOption("all_analyst_roles"), (c) => {
    document.querySelectorAll("#dist-toggle .chip").forEach((b) => b.addEventListener("click", () => {
      document.querySelectorAll("#dist-toggle .chip").forEach((x) => x.setAttribute("aria-pressed", String(x === b)));
      c.setOption(distOption(b.dataset.k), true);
    }));
  });
  numbersTable("n-dist", dist);

  const bt = t.salary_by_company_type.filter((r) => r.salaried_postings >= 5).map((r) => ({ ...r, label: `${r.company_type} (n=${r.salaried_postings})` }));
  chart("c-bytype", hbarOption(bt, "label", "median", { money: true, color: C.orange }));
  numbersTable("n-bytype", t.salary_by_company_type);
}

// ---------- job types ----------
function pageTypes(D) {
  const t = D.tables, pay = Object.fromEntries(t.job_type_pay.map((r) => [r.job_type, r]));
  $("#sep-score").textContent = D.meta.job_type_separation_score;
  $("#type-count").textContent = num(D.meta.postings);
  chart("c-types", (w) => donutOption(t.job_types.map((r) => ({ name: r.job_type, value: r.postings })), (n) => JOB_TYPE_COLOR[n], w));
  numbersTable("n-types", t.job_types.map((r) => ({ job_type: r.job_type, postings: r.postings, avg_skills_listed: r.avg_skills_listed })));
  chart("c-toolspay", base({
    grid: { left: 12, right: 40, top: 48, bottom: 40, containLabel: true },
    tooltip: { ...base().tooltip, formatter: (p) => `<b>${esc(p.data.name)}</b><br>${p.data.value[0].toFixed(1)} skills listed on average<br>pay ${signed(p.data.value[1] * 100)} vs BI/dashboard<br>${p.data.n} salaried jobs` },
    xAxis: { type: "value", name: "average skills a job lists", nameLocation: "middle", nameGap: 30, nameTextStyle: { color: C.muted }, ...axisStyle, min: 0 },
    yAxis: { type: "value", ...axisStyle, axisLabel: { color: C.muted, formatter: (v) => signed(v * 100) } },
    series: [{ type: "scatter", symbolSize: 20,
      label: { show: true, color: C.ink2, formatter: (p) => p.data.name, position: "top" },
      labelLayout: { hideOverlap: false, moveOverlap: "shiftY" },
      data: t.job_types.map((r) => ({ name: r.job_type, value: [r.avg_skills_listed, (pay[r.job_type]?.pct_vs_bi_dashboard ?? 0) / 100], n: pay[r.job_type]?.salaried_postings,
        itemStyle: { color: JOB_TYPE_COLOR[r.job_type], borderColor: "#fff", borderWidth: 2 } })) }],
  }));
  numbersTable("n-toolspay", t.job_type_pay);
  const cols = Object.keys(t.job_types[0]).filter((k) => k.startsWith("share_"));
  chart("c-typeprof", heatOption(t.job_types.map((r) => r.job_type), cols.map((c) => c.slice(6)), t.job_types.map((r) => cols.map((c) => r[c]))));
  numbersTable("n-typeprof", t.job_types);
}

// ---------- cities & companies ----------
function pagePlaces(D) {
  const t = D.tables;
  const cd = t.city_demand.map((r) => ({ ...r, city: r.city === "Other" ? "Other cities" : r.city }));
  chart("c-where", hbarOption(cd.filter((r) => r.city !== "Unknown"), "city", "all_analyst_postings", { fmt: "int", color: C.blue }));
  $("#where-note").textContent = `${num(cd.find((r) => r.city === "Unknown")?.all_analyst_postings)} postings only say "India" (not shown).`;
  numbersTable("n-where", cd);

  const cp = t.city_salary.filter((r) => r.enough_data && r.city !== "Unknown").map((r) => ({ ...r, label: `${r.city === "Other" ? "Other cities" : r.city} (n=${r.salaried_postings})` }));
  chart("c-citypay", hbarOption(cp, "label", "median", { money: true, color: C.orange }));
  numbersTable("n-citypay", t.city_salary);

  const cs = t.city_skills, skillCols = Object.keys(cs[0]).filter((k) => !["city", "postings"].includes(k));
  numbersTable("n-cityskills", cs);
  chart("c-cityskills", heatOption(cs.map((r) => `${r.city} (${r.postings})`), skillCols, cs.map((r) => skillCols.map((k) => r[k]))));

  chart("c-top", hbarOption(t.top_companies, "company", "postings", { fmt: "int", color: C.aqua }));
  numbersTable("n-top", t.top_companies);
  const labelled = t.company_type_mix.filter((r) => !["Unlabelled", "Anonymous"].includes(r.company_type)).sort((a, b) => b.postings - a.postings);
  const top5 = labelled.slice(0, 5).map((r) => ({ name: r.company_type, value: r.postings }));
  const rest = labelled.slice(5).reduce((s, r) => s + r.postings, 0);
  chart("c-industry", (w) => donutOption(rest ? [...top5, { name: "Other types", value: rest }] : top5, null, w));
  numbersTable("n-industry", t.company_type_mix);

  const ct = t.company_types;
  chart("c-cloud", groupedOption(ct.map((r) => r.company_type), [
    { name: "Azure", color: C.blue, data: ct.map((r) => r.share_Azure) },
    { name: "AWS", color: C.orange, data: ct.map((r) => r.share_AWS) },
  ]));
  numbersTable("n-cloud", ct.map((r) => ({ company_type: r.company_type, postings: r.postings, Azure: r.share_Azure, AWS: r.share_AWS })));
  const icols = Object.keys(ct[0]).filter((k) => k.startsWith("share_") && k !== "share_product_pattern");
  chart("c-indprof", heatOption(ct.map((r) => r.company_type), icols.map((c) => c.slice(6)), ct.map((r) => icols.map((c) => r[c]))));
  numbersTable("n-indprof", ct);
}

// ---------- market ----------
function pageMarket(D) {
  const t = D.tables;
  chart("c-levelmix", (w) => donutOption(t.experience_mix.map((r) => ({ name: r.experience_level[0].toUpperCase() + r.experience_level.slice(1), value: r.postings })), null, w));
  numbersTable("n-levelmix", t.experience_mix);
  const yrs = t.experience_years;
  numbersTable("n-years", yrs);
  chart("c-years", base({
    tooltip: { ...base().tooltip, trigger: "axis", axisPointer: { type: "shadow" }, valueFormatter: (v) => `${v} jobs` },
    xAxis: { type: "category", data: yrs.map((r) => r.years_required), ...axisStyle, splitLine: { show: false }, axisLabel: { color: C.ink2 } },
    yAxis: { type: "value", ...axisStyle },
    series: [{ type: "bar", data: yrs.map((r) => r.postings), barMaxWidth: 44, itemStyle: { color: C.blue, borderRadius: [8, 8, 0, 0] } }],
  }));
  $("#years-note").textContent = `Only where the ad states years: ${yrs[0]?.coverage_note}.`;
  const fr = [...t.fresher_skills].sort((a, b) => b.junior_share - a.junior_share);
  chart("c-fresher", groupedOption(fr.map((r) => r.skill), [
    { name: "Junior jobs", color: C.blue, data: fr.map((r) => r.junior_share) },
    { name: "All Data Analyst jobs", color: C.neutral, data: fr.map((r) => r.all_share) },
  ]));
  numbersTable("n-fresher", fr);
  $("#fresher-note").textContent = `Based on ${fr[0]?.junior_postings} junior Data Analyst jobs, a small sample.`;

  chart("c-mode", (w) => donutOption(t.work_mode.map((r) => ({ name: r.work_mode, value: r.postings })), null, w));
  numbersTable("n-mode", t.work_mode);
  chart("c-ai", hbarOption(t.ai_demand, "term", "share", { color: C.magenta }));
  numbersTable("n-ai", t.ai_demand);
  chart("c-edu", hbarOption(t.education, "requirement", "share", { color: C.aqua }));
  numbersTable("n-edu", t.education);

  const tr = t.trends;
  chart("c-trend", base({
    tooltip: { ...base().tooltip, trigger: "axis", valueFormatter: (v) => `${num(v)} open postings` },
    xAxis: { type: "category", data: tr.map((r) => r.date), ...axisStyle, splitLine: { show: false }, axisLabel: { color: C.ink2 } },
    yAxis: { type: "value", min: 0, ...axisStyle },
    series: [{ type: "line", data: tr.map((r) => r.open_postings), smooth: true, symbolSize: 9, lineStyle: { width: 2.5, color: C.blue },
      itemStyle: { color: C.blue, borderColor: "#fff", borderWidth: 2 },
      areaStyle: { color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [{ offset: 0, color: "rgba(42,120,214,.22)" }, { offset: 1, color: "rgba(42,120,214,0)" }]) } }],
  }));
  numbersTable("n-trend", tr);
  const fresh = t.freshness;
  numbersTable("n-fresh", fresh);
  chart("c-fresh", base({
    tooltip: { ...base().tooltip, trigger: "axis", axisPointer: { type: "shadow" }, valueFormatter: (v) => `${num(v)} postings` },
    xAxis: { type: "category", data: fresh.map((r) => r.posted), ...axisStyle, splitLine: { show: false }, axisLabel: { color: C.ink2 } },
    yAxis: { type: "value", ...axisStyle },
    series: [{ type: "bar", data: fresh.map((r) => r.postings), barMaxWidth: 44, itemStyle: { color: C.accent, borderRadius: [8, 8, 0, 0] } }],
  }));
}

// ---------- explorer ----------
function pageExplore(D) {
  const ex = D.tables.explorer, skills = Object.values(D.meta.skills);
  const state = { city: new Set(), experience_level: new Set(), company_type: new Set(), skills: new Set() };
  const uniq = (k) => [...new Set(ex.map((r) => r[k]))].sort();
  const groups = [["city", "City", uniq("city")], ["experience_level", "Experience level", ["junior", "mid", "senior", "unspecified"]],
                  ["company_type", "Company type", uniq("company_type")], ["skills", "Must mention ALL of these skills", skills]];
  $("#filters").innerHTML = groups.map(([key, label, opts]) => `<div class="filter-row"><div class="label" id="lbl-${key}">${label}</div>
    <div class="chips" role="group" aria-labelledby="lbl-${key}">${opts.map((o) => `<button type="button" class="chip" aria-pressed="false" data-k="${key}" data-v="${esc(o)}">${esc(o)}</button>`).join("")}</div></div>`).join("");

  let skillChart, typeChart;
  const update = () => {
    let sub = ex.filter((r) => ["city", "experience_level", "company_type"].every((k) => !state[k].size || state[k].has(r[k])));
    for (const s of state.skills) sub = sub.filter((r) => r[s] === 1);
    const salaried = sub.filter((r) => r.salary_lakh != null).map((r) => r.salary_lakh).sort((a, b) => a - b);
    const median = salaried.length ? (salaried[(salaried.length - 1) >> 1] + salaried[salaried.length >> 1]) / 2 : null;
    $("#x-count").textContent = num(sub.length);
    $("#x-share").textContent = `${pct(sub.length / ex.length)} of all Data Analyst jobs`;
    $("#x-salaried").textContent = num(salaried.length);
    $("#x-median").innerHTML = salaried.length >= 5 ? `₹${median.toFixed(1)}<small>L</small>` : "–";
    $("#x-remote").innerHTML = sub.length ? `${Math.round(100 * sub.filter((r) => r.remote_mentioned).length / sub.length)}<small>%</small>` : "–";
    const enough = sub.length >= 10;
    $("#x-results").hidden = !enough;
    $("#x-empty").hidden = enough;
    if (!enough) return;
    const prof = skills.map((s) => ({ skill: s, share: sub.filter((r) => r[s] === 1).length / sub.length }));
    const counts = {}; sub.forEach((r) => { counts[r.job_type] = (counts[r.job_type] || 0) + 1; });
    const types = Object.entries(counts).sort((a, b) => b[1] - a[1]).map(([name, value]) => ({ name, value }));
    if (skillChart) { skillChart.setOption(hbarOption(prof, "skill", "share"), true); typeChart.setOption(donutOption(types, (n) => JOB_TYPE_COLOR[n], typeChart.getWidth()), true); }
    else {
      chart("c-xskills", hbarOption(prof, "skill", "share"), (c) => { skillChart = c; });
      chart("c-xtypes", (w) => donutOption(types, (n) => JOB_TYPE_COLOR[n], w), (c) => { typeChart = c; });
    }
  };
  $("#filters").addEventListener("click", (e) => {
    const b = e.target.closest(".chip"); if (!b) return;
    const set = state[b.dataset.k], v = b.dataset.v;
    set.has(v) ? set.delete(v) : set.add(v);
    b.setAttribute("aria-pressed", String(set.has(v)));
    update();
  });
  update();
}

function pageAbout(D) {
  const w = D.meta.data_window;
  $("#about-window").textContent = `${w.first_run.slice(0, 10)} to ${w.last_run.slice(0, 10)} (${w.runs} collection runs)`;
  $("#about-pop").textContent = D.meta.population;
}

// ---------- boot ----------
const PAGE_FN = { home: pageHome, skills: pageSkills, salary: pageSalary, types: pageTypes, places: pagePlaces,
                  market: pageMarket, explore: pageExplore, about: pageAbout };

fetch("data/data.json")
  .then((r) => { if (!r.ok) throw new Error(`data/data.json: HTTP ${r.status}`); return r.json(); })
  .then((D) => {
    const page = document.body.dataset.page;
    renderChrome(page, D);
    document.querySelectorAll("[data-window]").forEach((el) => {
      el.textContent = `${D.meta.data_window.first_run.slice(0, 10)} → ${D.meta.data_window.last_run.slice(0, 10)}`;
    });
    PAGE_FN[page]?.(D);
    wireMotion();
  })
  .catch((err) => {
    console.error(err);
    document.body.insertAdjacentHTML("afterbegin",
      `<p class="wrap glass" style="padding:16px;margin-top:16px" role="alert">The data file didn't load (${esc(err.message)}). Refresh the page to try again.</p>`);
  });
