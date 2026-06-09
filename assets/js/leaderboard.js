/* ============================================================
   Config-driven leaderboard for the CyberGym series.

   Usage (per page):
     CyberGymLeaderboard.render({
       dataUrl: "/assets/data/cybergym.json",
       rootId: "leaderboard",
       rows: (json) => json.level1,          // -> array of row objects
       columns: [ { header, cell(row, rank) } ],
       sort: (a, b) => b.score_10 - a.score_10,
       filters: [ ... ],                       // optional
       chart: { canvasId, ... },               // optional (CyberGym scatter)
     });
   ============================================================ */
(function () {
  "use strict";

  /* ---------- small helpers ---------- */
  function el(html) {
    const t = document.createElement("template");
    t.innerHTML = html.trim();
    return t.content.firstElementChild;
  }
  function rankClass(rank) {
    return rank === 1 ? "lb-rank lb-rank-1" : rank === 2 ? "lb-rank lb-rank-2" : rank === 3 ? "lb-rank lb-rank-3" : "lb-rank";
  }

  /* Shared cell renderers so pages stay declarative. */
  const cells = {
    rank: (row, rank) => `<span class="${rankClass(rank)}">${rank}</span>`,
    // Agent name with an optional "(note)" rendered as a hover tooltip.
    agentWithNote: (row) => {
      const a = row.agent || "-";
      const i = a.indexOf(" (");
      if (i === -1) return a;
      const note = a.slice(a.indexOf("(") + 1, a.lastIndexOf(")"));
      return `<span class="tooltip tooltip-wrap" data-tooltip="${esc(note)}">${esc(a.slice(0, i))}</span>`;
    },
    // Model name; "Multi-model (a, b)" collapses to "Multi-model" + tooltip.
    model: (row) => {
      const m = row.model || "-";
      if (m.startsWith("Multi-model")) {
        return `<span class="tooltip" data-tooltip="${esc(m)}">${esc(m.split(" (")[0])}</span>`;
      }
      return esc(m);
    },
    source: (row) =>
      row.source_url
        ? `<a href="${esc(row.source_url)}" target="_blank" rel="noopener">${esc(row.source || "link")}</a>`
        : esc(row.source || "-"),
    // Percentage score with a thin progress bar.
    percent: (value) => {
      const pct = (value * 100).toFixed(1);
      return `<div class="lb-score">${pct}%</div><div class="lb-bar"><span style="width:${pct}%"></span></div>`;
    },
  };

  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  }

  /* ---------- table rendering ---------- */
  function renderTable(cfg, rows) {
    const tbody = document.getElementById(cfg._tbodyId);
    if (!tbody) return;
    if (!rows.length) {
      tbody.innerHTML = `<tr><td colspan="${cfg.columns.length}" class="px-4 py-6 text-center text-slate-400">No results available</td></tr>`;
      return;
    }
    const sorted = cfg.sort ? [...rows].sort(cfg.sort) : rows;
    tbody.innerHTML = sorted
      .map((row, idx) => {
        const rank = idx + 1;
        const tds = cfg.columns
          .map((c) => `<td${c.tdClass ? ` class="${c.tdClass}"` : ""}>${c.cell(row, rank, sorted)}</td>`)
          .join("");
        return `<tr>${tds}</tr>`;
      })
      .join("");
  }

  /* ---------- filters ---------- */
  function buildFilters(cfg, allRows, onChange) {
    const bar = document.getElementById(cfg._filtersId);
    if (!bar || !cfg.filters || !cfg.filters.length) return;
    bar.innerHTML = "";
    cfg.filters.forEach((f) => {
      const wrap = el(`<label class="inline-flex items-center gap-2 text-sm text-slate-600"><span>${esc(f.label)}</span></label>`);
      const sel = el(`<select class="filter-select"></select>`);
      f.options(allRows).forEach((o) => {
        const opt = el(`<option value="${esc(o.value)}">${esc(o.label)}</option>`);
        sel.appendChild(opt);
      });
      sel.value = f.default != null ? String(f.default) : sel.value;
      sel.addEventListener("change", onChange);
      f._select = sel;
      wrap.appendChild(sel);
      bar.appendChild(wrap);
    });
  }

  function applyFilters(cfg, allRows) {
    let rows = allRows;
    (cfg.filters || []).forEach((f) => {
      const v = f._select ? f._select.value : f.default;
      if (v !== "all" && v != null) rows = rows.filter((r) => f.predicate(r, v));
    });
    return rows;
  }

  /* ---------- public entry ---------- */
  async function render(cfg) {
    const root = document.getElementById(cfg.rootId);
    if (!root) return;
    cfg._filtersId = cfg.rootId + "-filters";
    cfg._tbodyId = cfg.rootId + "-tbody";

    // Scaffold: filter bar + scrollable table.
    root.innerHTML = `
      <div id="${cfg._filtersId}" class="mb-4 flex flex-wrap items-center gap-4"></div>
      <div class="lb-wrap" style="max-height:${cfg.maxHeight || "70vh"}">
        <table class="lb-table">
          <thead><tr>${cfg.columns.map((c) => `<th${c.thClass ? ` class="${c.thClass}"` : ""}>${c.header}</th>`).join("")}</tr></thead>
          <tbody id="${cfg._tbodyId}"><tr><td colspan="${cfg.columns.length}" class="px-4 py-6 text-center text-slate-400">Loading…</td></tr></tbody>
        </table>
      </div>`;

    let json;
    try {
      const res = await fetch(cfg.dataUrl);
      if (!res.ok) throw new Error("HTTP " + res.status);
      json = await res.json();
    } catch (e) {
      document.getElementById(cfg._tbodyId).innerHTML =
        `<tr><td colspan="${cfg.columns.length}" class="px-4 py-6 text-center text-rose-500">Failed to load data</td></tr>`;
      console.error("Leaderboard load error:", e);
      return;
    }

    const allRows = cfg.rows ? cfg.rows(json) || [] : json;
    const update = () => renderTable(cfg, applyFilters(cfg, allRows));
    buildFilters(cfg, allRows, update);
    update();

    if (cfg.chart) {
      try {
        await renderScatterChart(cfg.chart, allRows);
      } catch (e) {
        console.error("Chart error:", e);
      }
    }
  }

  /* ============================================================
     Time-vs-success scatter chart (CyberGym hero).
     Ported from the original load-leaderboard.js, parameterised.
     ============================================================ */
  const ICON_BASE = "https://cdn.jsdelivr.net/npm/@lobehub/icons-static-svg@1.86.0/icons/";
  const MODEL_ICON_MAP = [
    { match: (m) => /^Claude/i.test(m), icon: "claude-color.svg" },
    { match: (m) => /^GPT|^o\d/i.test(m), icon: "openai.svg" },
    { match: (m) => /^Gemini/i.test(m), icon: "gemini-color.svg" },
    { match: (m) => /^DeepSeek/i.test(m), icon: "deepseek-color.svg" },
    { match: (m) => /^GLM/i.test(m), icon: "zai.svg" },
    { match: (m) => /^Kimi/i.test(m), icon: "kimi.svg" },
    { match: (m) => /^Qwen/i.test(m), icon: "qwen-color.svg" },
    { match: (m) => /^Muse/i.test(m), icon: "https://upload.wikimedia.org/wikipedia/commons/2/2f/Meta_AI_Logo_%282026%29.svg" },
    { match: (m) => /^MDASH/i.test(m), icon: "microsoft-color.svg" },
  ];
  const FORCE_LABEL_SIDE = { "Kimi K2.5": "left", "Claude Mythos Preview": "left", "GPT-5.5": "right-down" };

  function getModelIconUrl(modelName) {
    for (const entry of MODEL_ICON_MAP) {
      if (entry.match(modelName)) return /^https?:/.test(entry.icon) ? entry.icon : ICON_BASE + entry.icon;
    }
    return null;
  }
  function loadIcon(url, size) {
    return new Promise((resolve) => {
      const img = new Image(size, size);
      img.crossOrigin = "anonymous";
      img.onload = () => resolve(img);
      img.onerror = () => resolve(null);
      img.src = url;
    });
  }

  async function renderScatterChart(chartCfg, allRows) {
    const canvas = document.getElementById(chartCfg.canvasId);
    if (!canvas || typeof Chart === "undefined") return;

    const plotData = allRows.filter(chartCfg.include || ((d) => d.include_in_plot));
    if (!plotData.length) return;

    const points = plotData.map((d) => ({
      x: new Date(d[chartCfg.xField || "model_release_date"]),
      y: d[chartCfg.yField || "score_10"] * 100,
      label: d.model && d.model.startsWith("Multi-model") ? `${d.agent} (Multi-model)` : d.model,
    }));

    const ICON_SIZE = 14;
    const iconUrls = [...new Set(points.map((p) => getModelIconUrl(p.label)).filter(Boolean))];
    const iconCache = {};
    await Promise.all(iconUrls.map(async (url) => { iconCache[url] = await loadIcon(url, ICON_SIZE); }));
    const pointImages = points.map((p) => {
      const url = getModelIconUrl(p.label);
      return url && iconCache[url] ? iconCache[url] : "circle";
    });

    const PX_PER_MONTH = 45, PX_PER_10PCT = 40, AXIS_PADDING = 80;
    const minTime = Math.min(...points.map((p) => p.x.getTime()));
    const maxTime = Math.max(...points.map((p) => p.x.getTime()));
    const monthsSpan = (maxTime - minTime) / (30 * 86400000) + 3;
    const maxY = 100, minY = 0, ySpan = (maxY - minY) / 10;
    const chartWidth = Math.round(monthsSpan * PX_PER_MONTH + AXIS_PADDING);
    const chartHeight = Math.round(ySpan * PX_PER_10PCT + AXIS_PADDING);

    const container = canvas.parentElement;
    canvas.width = chartWidth;
    canvas.height = chartHeight;
    function scaleChart() {
      const availWidth = container.clientWidth;
      const scale = Math.min(1, availWidth / chartWidth);
      canvas.style.width = Math.round(chartWidth * scale) + "px";
      canvas.style.height = Math.round(chartHeight * scale) + "px";
    }
    scaleChart();
    window.addEventListener("resize", scaleChart);

    new Chart(canvas, {
      type: "scatter",
      data: { datasets: [{ data: points, pointStyle: pointImages, pointRadius: ICON_SIZE / 2, pointHoverRadius: ICON_SIZE / 2 + 2 }] },
      options: {
        responsive: false,
        animation: false,
        plugins: {
          legend: { display: false },
          tooltip: { displayColors: false, callbacks: { label: (ctx) => `${ctx.raw.label}: ${ctx.raw.y.toFixed(1)}%` } },
        },
        scales: {
          x: {
            type: "time",
            min: new Date(minTime - 30 * 86400000).toISOString(),
            max: new Date(maxTime + 60 * 86400000).toISOString(),
            time: { unit: "month", displayFormats: { month: "MMM yyyy" } },
            title: { display: true, text: chartCfg.xTitle || "Release Date", font: { size: 14 } },
          },
          y: { min: minY, max: maxY, title: { display: true, text: chartCfg.yTitle || "Success Rate (%)", font: { size: 14 } } },
        },
        layout: { padding: { top: 30, right: 20 } },
      },
      plugins: [labelPlugin()],
    });
  }

  /* Non-overlapping label placement plugin (unchanged logic). */
  function labelPlugin() {
    return {
      id: "labelPlugin",
      afterDatasetsDraw(chart) {
        const ctx = chart.ctx;
        ctx.font = "12px sans-serif";
        ctx.fillStyle = "#000";
        const chartArea = chart.chartArea;
        const meta = chart.getDatasetMeta(0);
        const H = 12, pad = 6;

        function overlaps(a, b) {
          return a.x < b.x + b.w + 1 && a.x + a.w + 1 > b.x && a.y < b.y + b.h + 1 && a.y + a.h + 1 > b.y;
        }
        function overlapArea(a, obstacles) {
          let total = 0;
          for (const b of obstacles) {
            if (overlaps(a, b)) {
              const ox = Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x);
              const oy = Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y);
              total += ox * oy;
            }
          }
          return total;
        }

        const indices = meta.data.map((_, i) => i);
        indices.sort((a, b) => chart.data.datasets[0].data[b].y - chart.data.datasets[0].data[a].y);

        const r = 6;
        const obstacles = meta.data.map((pt) => ({ x: pt.x - r, y: pt.y - r, w: r * 2, h: r * 2 }));
        const labels = [];

        indices.forEach((i) => {
          const point = meta.data[i];
          const p = chart.data.datasets[0].data[i];
          const text = p.label;
          const tw = ctx.measureText(text).width;
          const offsets = [
            [1, -1], [1, 1], [-1, -1], [-1, 1], [1, -2], [1, 2], [-1, -2], [-1, 2],
            [1, -3], [1, 3], [-1, -3], [-1, 3], [0, -2], [0, 2], [0, -3], [0, 3],
          ];
          const candidates = offsets.map(([dx, dy]) => ({
            x: dx >= 0 ? point.x + pad * dx : point.x + pad * dx - tw,
            y: point.y + pad * dy - (dy < 0 ? H : 0),
            w: tw, h: H, rightSide: dx >= 0, below: dy > 0,
          }));
          let valid = candidates.filter(
            (c) => c.x >= chartArea.left - 5 && c.x + c.w <= chartArea.right + 5 && c.y >= chartArea.top - 5 && c.y + c.h <= chartArea.bottom + 5
          );
          const forceSide = FORCE_LABEL_SIDE[text];
          if (forceSide) {
            const parts = forceSide.split("-");
            const wantRight = parts[0] === "right";
            let filtered = valid.filter((c) => c.rightSide === wantRight);
            if (parts[1] === "down") filtered = filtered.filter((c) => c.below);
            else if (parts[1] === "up") filtered = filtered.filter((c) => !c.below);
            if (filtered.length) valid = filtered;
          }
          const LEFT_PENALTY = 50;
          const allObstacles = obstacles.concat(labels);
          const pool = valid.length ? valid : candidates;
          let best = pool[0];
          let bestScore = overlapArea(best, allObstacles) + (best.rightSide ? 0 : LEFT_PENALTY);
          for (const c of pool) {
            const score = overlapArea(c, allObstacles) + (c.rightSide ? 0 : LEFT_PENALTY);
            if (score < bestScore) { best = c; bestScore = score; if (score === 0) break; }
          }
          labels.push({ ...best, text, idx: i, px: point.x, py: point.y });
        });

        labels.forEach((l) => {
          const labelCx = l.x + l.w / 2, labelCy = l.y + l.h / 2;
          if (Math.hypot(labelCx - l.px, labelCy - l.py) > pad * 2) {
            ctx.beginPath();
            ctx.strokeStyle = "#aaa";
            ctx.lineWidth = 0.8;
            ctx.moveTo(l.px, l.py);
            const tx = labelCx < l.px ? l.x + l.w : labelCx > l.px ? l.x : labelCx;
            const ty = labelCy < l.py ? l.y + l.h : labelCy > l.py ? l.y : labelCy;
            ctx.lineTo(tx, ty);
            ctx.stroke();
          }
          ctx.textAlign = "left";
          ctx.textBaseline = "top";
          ctx.fillStyle = "#000";
          ctx.fillText(l.text, l.x, l.y);
        });
      },
    };
  }

  window.CyberGymLeaderboard = { render, cells };
})();
