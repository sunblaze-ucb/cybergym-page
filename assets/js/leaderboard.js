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
    return "lb-rank";
  }

  /* Shared cell renderers so pages stay declarative. */
  const cells = {
    rank: (row, rank) => `<span class="${rankClass(rank)}">${rank}</span>`,
    // Agent name with an optional "(note)" shown via the native title tooltip
    // (a styled ::after tooltip would be clipped by the table's scroll container).
    agentWithNote: (row) => {
      const a = row.agent || "-";
      const i = a.indexOf(" (");
      if (i === -1) return a;
      const note = a.slice(a.indexOf("(") + 1, a.lastIndexOf(")"));
      return `<span class="note-cue" data-note="${esc(note)}">${esc(a.slice(0, i))}</span>`;
    },
    // Model name; "Multi-model (a, b)" collapses to "Multi-model" + note tooltip.
    model: (row) => {
      const m = row.model || "-";
      if (m.startsWith("Multi-model")) {
        return `<span class="note-cue" data-note="${esc(m)}">${esc(m.split(" (")[0])}</span>`;
      }
      return esc(m);
    },
    source: (row) =>
      row.source_url
        ? `<a href="${esc(row.source_url)}" target="_blank" rel="noopener" class="inline-flex items-center gap-1 font-medium text-[color:var(--accent-strong)] underline-offset-2 hover:underline">${esc(row.source || "link")}<svg viewBox="0 0 24 24" class="h-3.5 w-3.5 opacity-70" fill="none" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M7 17 17 7M9 7h8v8"/></svg></a>`
        : `<span class="text-slate-400">${esc(row.source || "-")}</span>`,
    // Percentage score with a thin progress bar.
    percent: (value) => {
      const pct = (value * 100).toFixed(1);
      return `<div class="lb-score">${pct}%</div><div class="lb-bar"><span style="width:${pct}%"></span></div>`;
    },
  };

  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  }

  /* ---------- note tooltip ----------
     One popup element on <body>, shown instantly on hover of any [data-note].
     Clamped to the viewport so it never goes out of bounds. */
  function initNoteTooltips() {
    if (window.__cgTooltipInit) return;
    window.__cgTooltipInit = true;
    const tip = document.createElement("div");
    tip.className = "cg-tooltip";
    tip.setAttribute("role", "tooltip");
    document.body.appendChild(tip);
    let current = null;

    function position(el) {
      const r = el.getBoundingClientRect();
      const t = tip.getBoundingClientRect();
      const margin = 8;
      let left = r.left + r.width / 2 - t.width / 2;
      left = Math.max(margin, Math.min(left, window.innerWidth - t.width - margin));
      let top = r.top - t.height - 8;
      if (top < margin) top = r.bottom + 8; // not enough room above → flip below
      tip.style.left = left + "px";
      tip.style.top = top + "px";
    }
    function show(el) {
      current = el;
      const html = el.getAttribute("data-note-html");
      if (html != null) tip.innerHTML = html;
      else tip.textContent = el.getAttribute("data-note") || "";
      position(el); // measure & place before fading in (avoids 0,0 flash)
      tip.classList.add("is-visible");
    }
    function hide() {
      current = null;
      tip.classList.remove("is-visible");
    }

    const SEL = "[data-note], [data-note-html]";
    document.addEventListener("mouseover", (e) => {
      const el = e.target.closest(SEL);
      if (el && el !== current) show(el);
    });
    document.addEventListener("mouseout", (e) => {
      const el = e.target.closest(SEL);
      if (el && (!e.relatedTarget || !el.contains(e.relatedTarget))) hide();
    });
    document.addEventListener("scroll", () => { if (current) position(current); }, true);
    window.addEventListener("resize", () => { if (current) position(current); });
  }

  /* ---------- table rendering ---------- */
  // Current filter selections, keyed by each filter's `key`.
  function filterState(cfg) {
    const state = {};
    (cfg.filters || []).forEach((f) => {
      if (f.key) state[f.key] = f._select ? f._select.value : f.default;
    });
    return state;
  }
  // Columns visible for the current filter state (a column may define visible(state)).
  function visibleColumns(cfg) {
    const state = filterState(cfg);
    return cfg.columns.filter((c) => (c.visible ? c.visible(state) : true));
  }

  function renderTable(cfg, rows) {
    const tbody = document.getElementById(cfg._tbodyId);
    const thead = document.getElementById(cfg._theadId);
    if (!tbody) return;
    const cols = visibleColumns(cfg);
    if (thead) {
      thead.innerHTML = `<tr>${cols
        .map((c) => {
          const cls = c.thClass ? ` class="${c.thClass}"` : "";
          if (!c.sortBy) return `<th${cls}>${c.header}</th>`;
          const i = cfg.columns.indexOf(c);
          const active = cfg._sortCol === i;
          const caret = active
            ? (cfg._sortDir === 1
                ? `<svg viewBox="0 0 24 24" class="lb-caret" fill="none" stroke="currentColor" stroke-width="2.5"><path stroke-linecap="round" stroke-linejoin="round" d="m6 15 6-6 6 6"/></svg>`
                : `<svg viewBox="0 0 24 24" class="lb-caret" fill="none" stroke="currentColor" stroke-width="2.5"><path stroke-linecap="round" stroke-linejoin="round" d="m6 9 6 6 6-6"/></svg>`)
            : `<svg viewBox="0 0 24 24" class="lb-caret lb-caret-idle" fill="none" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="m8 10 4-4 4 4M8 14l4 4 4-4"/></svg>`;
          return `<th${cls}><button type="button" class="lb-sort${active ? " is-active" : ""}" data-col="${i}">${c.header}${caret}</button></th>`;
        })
        .join("")}</tr>`;
    }
    if (!rows.length) {
      tbody.innerHTML = `<tr><td colspan="${cols.length}" class="px-4 py-6 text-center text-slate-400">No results available</td></tr>`;
      return;
    }
    let sorted;
    const activeCol = cfg._sortCol != null ? cfg.columns[cfg._sortCol] : null;
    if (activeCol && activeCol.sortBy) {
      const dir = cfg._sortDir;
      sorted = [...rows].sort((a, b) => {
        const d = activeCol.sortBy(a) - activeCol.sortBy(b);
        return d !== 0 ? d * dir : 0;
      });
    } else {
      sorted = cfg.sort ? [...rows].sort(cfg.sort) : rows;
    }
    tbody.innerHTML = sorted
      .map((row, idx) => {
        const rank = idx + 1;
        const tds = cols
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
    cfg._theadId = cfg.rootId + "-thead";

    // Scaffold: filter bar + scrollable table. Header is filled in on each
    // update so columns can appear/disappear with the active filter.
    root.innerHTML = `
      <div id="${cfg._filtersId}" class="mb-4 flex flex-wrap items-center gap-4"></div>
      <div class="lb-wrap" style="max-height:${cfg.maxHeight || "70vh"}">
        <table class="lb-table">
          <thead id="${cfg._theadId}"></thead>
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

    // Initial sort: a column flagged defaultSort starts active (descending).
    if (cfg._sortCol === undefined) {
      const di = cfg.columns.findIndex((c) => c.defaultSort);
      cfg._sortCol = di >= 0 ? di : null;
      cfg._sortDir = -1;
    }

    const update = () => renderTable(cfg, applyFilters(cfg, allRows));

    // Click a sortable header to sort by it; click again to flip direction.
    const thead = document.getElementById(cfg._theadId);
    if (thead) {
      thead.addEventListener("click", (e) => {
        const btn = e.target.closest("[data-col]");
        if (!btn) return;
        const i = parseInt(btn.dataset.col, 10);
        if (cfg._sortCol === i) cfg._sortDir = -cfg._sortDir;
        else { cfg._sortCol = i; cfg._sortDir = -1; }
        update();
      });
    }

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
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.onload = () => {
        // Fit within `size` preserving the source aspect ratio (avoids squished non-square icons).
        const nw = img.naturalWidth || size;
        const nh = img.naturalHeight || size;
        const s = size / Math.max(nw, nh);
        img.width = Math.round(nw * s);
        img.height = Math.round(nh * s);
        resolve(img);
      };
      img.onerror = () => resolve(null);
      img.src = url;
    });
  }

  // Theme-aware chart colors (canvas can't be styled by CSS).
  function chartColors() {
    const dark = document.documentElement.getAttribute("data-theme") === "dark";
    return dark
      ? { tick: "#94a3b8", grid: "rgba(148,163,184,0.16)", title: "#cbd5e1", label: "#e2e8f0", line: "#64748b" }
      : { tick: "#666", grid: "rgba(0,0,0,0.08)", title: "#333", label: "#0f172a", line: "#aaa" };
  }

  // A point is "active" (fully opaque) on hover if it's the hovered icon or linked to/from it.
  function activeOnHover(chart, i) {
    const h = chart.hoverIndex;
    if (h == null) return true;
    const data = chart.data.datasets[0].data;
    const hLinks = data[h].links || [];
    const iLinks = data[i].links || [];
    return i === h || hLinks.includes(i) || iLinks.includes(h);
  }

  async function renderScatterChart(chartCfg, allRows) {
    const canvas = document.getElementById(chartCfg.canvasId);
    if (!canvas || typeof Chart === "undefined") return;

    const plotData = allRows.filter(chartCfg.include || ((d) => d.include_in_plot));
    if (!plotData.length) return;

    const ICON_SIZE = 14;
    // Model-focused points are labeled with the model; agent-focused with the agent name.
    // Icon resolution: a per-row `icon` (path/URL) wins; else the model-name rules. `icon_scale` resizes.
    const points = plotData.map((d) => {
      const isAgent = d.focus === "agent";
      const modelLabel = d.model && d.model.startsWith("Multi-model") ? `${d.agent} (Multi-model)` : d.model;
      const agentLabel = (d.agent || "").split(" (")[0];
      const label = isAgent ? agentLabel : modelLabel;
      return {
        // Model-focused: model release date. Agent-focused: submission date.
        x: new Date(isAgent ? d.date : d[chartCfg.xField || "model_release_date"]),
        y: d[chartCfg.yField || "score_10"] * 100,
        label: label,
        focus: isAgent ? "agent" : "model",
        model: d.model,
        baseModel: d.base_model || d.model,
        icon: d.icon || getModelIconUrl(label),
        size: Math.max(6, Math.round(ICON_SIZE * (d.icon_scale || 1))),
      };
    });
    // Agent-focused points link (dashed) to the model-focused point(s) they build on.
    // A row may list multiple base models via `plot_links` (e.g. a multi-model agent);
    // otherwise we fall back to its single `base_model`/`model`.
    points.forEach((p, idx) => {
      p.links = [];
      if (p.focus !== "agent") return;
      const names = plotData[idx].plot_links || [p.baseModel];
      names.forEach((name) => {
        const i = points.findIndex((q) => q.focus === "model" && q.model === name);
        if (i >= 0 && !p.links.includes(i)) p.links.push(i);
      });
    });

    const iconCache = {};
    await Promise.all(
      points.filter((p) => p.icon).map(async (p) => {
        const key = p.icon + "@" + p.size;
        if (!iconCache[key]) iconCache[key] = await loadIcon(p.icon, p.size);
      })
    );
    const pointImages = points.map((p) => (p.icon && iconCache[p.icon + "@" + p.size]) || "circle");
    const pointRadii = points.map((p) => p.size / 2);

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

    const col = chartColors();
    points.forEach((p, i) => { p.img = pointImages[i] === "circle" ? null : pointImages[i]; });
    const chart = new Chart(canvas, {
      type: "scatter",
      // Positions only — icons/labels/links are drawn by our plugins so we control per-point alpha.
      data: { datasets: [{ data: points, pointStyle: "circle", pointRadius: 0, pointHoverRadius: 0 }] },
      options: {
        responsive: false,
        animation: false,
        events: [],
        plugins: {
          legend: { display: false },
          tooltip: { enabled: false },
        },
        scales: {
          x: {
            type: "time",
            min: new Date(minTime - 30 * 86400000).toISOString(),
            max: new Date(maxTime + 60 * 86400000).toISOString(),
            time: { unit: "month", displayFormats: { month: "MMM yyyy" } },
            title: { display: true, text: chartCfg.xTitle || "Release Date", font: { size: 14 }, color: col.title },
            ticks: { color: col.tick },
            grid: { color: col.grid },
            border: { color: col.grid },
          },
          y: {
            min: minY, max: maxY,
            title: { display: true, text: chartCfg.yTitle || "Success Rate (%)", font: { size: 14 }, color: col.title },
            ticks: { color: col.tick },
            grid: { color: col.grid },
            border: { color: col.grid },
          },
        },
        layout: { padding: { top: 30, right: 20 } },
      },
      plugins: [linkPlugin(), iconPlugin(), labelPlugin(), hoverInfoPlugin()],
    });
    chart.hoverIndex = null;

    // Hover a point's icon → highlight it and the model it links to; dim the rest.
    function hitTest(mx, my) {
      const meta = chart.getDatasetMeta(0);
      let found = null, best = Infinity;
      meta.data.forEach((el, i) => {
        const img = points[i].img;
        const hw = (img ? img.width : points[i].size) / 2 + 3;
        const hh = (img ? img.height : points[i].size) / 2 + 3;
        if (Math.abs(mx - el.x) <= hw && Math.abs(my - el.y) <= hh) {
          const d = Math.hypot(mx - el.x, my - el.y);
          if (d < best) { best = d; found = i; }
        }
      });
      return found;
    }
    canvas.addEventListener("mousemove", (e) => {
      const rect = canvas.getBoundingClientRect();
      // Map display px → Chart.js logical space (chart.width/height), which is what
      // el.x/el.y use. Using canvas.width would be off by devicePixelRatio on HiDPI.
      const mx = (e.clientX - rect.left) * (chart.width / rect.width);
      const my = (e.clientY - rect.top) * (chart.height / rect.height);
      const idx = hitTest(mx, my);
      canvas.style.cursor = idx == null ? "" : "pointer";
      if (idx !== chart.hoverIndex) { chart.hoverIndex = idx; chart.draw(); }
    });
    canvas.addEventListener("mouseleave", () => {
      if (chart.hoverIndex != null) { chart.hoverIndex = null; chart.draw(); }
    });

    // Re-theme axes (and labels, via the plugin) when the user toggles theme.
    document.addEventListener("themechange", () => {
      const c = chartColors();
      ["x", "y"].forEach((ax) => {
        const s = chart.options.scales[ax];
        s.ticks.color = c.tick;
        s.grid.color = c.grid;
        s.border.color = c.grid;
        s.title.color = c.title;
      });
      chart.update();
    });
  }

  /* Draws the point icons (or a fallback dot), dimming non-active ones on hover. */
  function iconPlugin() {
    return {
      id: "iconPlugin",
      afterDatasetsDraw(chart) {
        const ctx = chart.ctx;
        const meta = chart.getDatasetMeta(0);
        const data = chart.data.datasets[0].data;
        const dot = chartColors().tick;
        meta.data.forEach((el, i) => {
          const img = data[i].img;
          ctx.globalAlpha = activeOnHover(chart, i) ? 1 : 0.15;
          if (img) {
            ctx.drawImage(img, el.x - img.width / 2, el.y - img.height / 2, img.width, img.height);
          } else {
            ctx.fillStyle = dot;
            ctx.beginPath();
            ctx.arc(el.x, el.y, (data[i].size || 10) / 2, 0, Math.PI * 2);
            ctx.fill();
          }
        });
        ctx.globalAlpha = 1;
      },
    };
  }

  /* Dashed connector from an agent-focused point to the model-focused point it builds on. */
  function linkPlugin() {
    return {
      id: "linkPlugin",
      beforeDatasetsDraw(chart) {
        // Connector lines are only shown for the hovered icon (and its links).
        if (chart.hoverIndex == null) return;
        const ctx = chart.ctx;
        const meta = chart.getDatasetMeta(0);
        const data = chart.data.datasets[0].data;
        ctx.save();
        ctx.setLineDash([3, 3]);
        ctx.strokeStyle = chartColors().line;
        ctx.lineWidth = 1;
        data.forEach((p, i) => {
          const a = meta.data[i];
          if (!a || !p.links || !p.links.length || !activeOnHover(chart, i)) return;
          p.links.forEach((j) => {
            const b = meta.data[j];
            if (!b) return;
            ctx.beginPath();
            ctx.moveTo(a.x, a.y);
            ctx.lineTo(b.x, b.y);
            ctx.stroke();
          });
        });
        ctx.restore();
      },
    };
  }

  /* On hover, show the exact score (and date) for the hovered icon in a small box. */
  function hoverInfoPlugin() {
    return {
      id: "hoverInfoPlugin",
      afterDatasetsDraw(chart) {
        const h = chart.hoverIndex;
        if (h == null) return;
        const ctx = chart.ctx;
        const el = chart.getDatasetMeta(0).data[h];
        const d = chart.data.datasets[0].data[h];
        if (!el) return;
        const text = d.y.toFixed(1) + "%  ·  " + d.x.toISOString().slice(0, 10);
        ctx.save();
        ctx.font = "600 12px sans-serif";
        const pad = 6, bh = 22, tw = ctx.measureText(text).width, bw = tw + pad * 2;
        const area = chart.chartArea;
        let bx = el.x + 12, by = el.y - bh - 6;
        if (bx + bw > area.right) bx = el.x - bw - 12;
        if (bx < area.left) bx = area.left + 2;
        if (by < area.top) by = el.y + 8;
        ctx.fillStyle = "rgba(15,23,42,0.92)";
        if (ctx.roundRect) { ctx.beginPath(); ctx.roundRect(bx, by, bw, bh, 5); ctx.fill(); }
        else ctx.fillRect(bx, by, bw, bh);
        ctx.fillStyle = "#fff";
        ctx.textBaseline = "middle";
        ctx.textAlign = "left";
        ctx.fillText(text, bx + pad, by + bh / 2 + 1);
        ctx.restore();
      },
    };
  }

  /* Non-overlapping label placement plugin (unchanged logic). */
  function labelPlugin() {
    return {
      id: "labelPlugin",
      afterDatasetsDraw(chart) {
        const ctx = chart.ctx;
        const col = chartColors();
        const area = chart.chartArea;
        const meta = chart.getDatasetMeta(0);
        const data = chart.data.datasets[0].data;
        const GAP = 7; // point-to-label gap
        const LH = 14; // line height used for vertical de-overlap
        ctx.font = "12px sans-serif";
        ctx.textBaseline = "middle";

        // Place each label beside its point (default right; flip left near the right edge or
        // when forced), then push down past any already-placed label it would overlap.
        const placed = [];
        const order = meta.data.map((_, i) => i).sort((a, b) => meta.data[a].y - meta.data[b].y);
        order.forEach((i) => {
          const pt = meta.data[i];
          const text = data[i].label;
          if (!text) return;
          const w = ctx.measureText(text).width;
          const force = FORCE_LABEL_SIDE[text];
          const right = force ? force.startsWith("right") : pt.x + GAP + w <= area.right;
          const x = right ? pt.x + GAP : pt.x - GAP - w;
          let y = pt.y;
          for (let guard = 0; guard < 50; guard++) {
            const hit = placed.find((q) => q.right === right && Math.abs(q.y - y) < LH && x < q.x + q.w && x + w > q.x);
            if (!hit) break;
            y = hit.y + LH;
          }
          y = Math.max(area.top + LH / 2, Math.min(area.bottom - LH / 2, y));
          placed.push({ x, y, w, right, text, px: pt.x, py: pt.y, idx: i });
        });

        placed.forEach((l) => {
          ctx.globalAlpha = activeOnHover(chart, l.idx) ? 1 : 0.15;
          if (Math.abs(l.y - l.py) > 3) {
            ctx.strokeStyle = col.line;
            ctx.lineWidth = 0.8;
            ctx.beginPath();
            ctx.moveTo(l.px, l.py);
            ctx.lineTo(l.right ? l.x : l.x + l.w, l.y);
            ctx.stroke();
          }
          ctx.fillStyle = col.label;
          ctx.textAlign = "left";
          ctx.fillText(l.text, l.x, l.y);
        });
        ctx.globalAlpha = 1;
      },
    };
  }

  window.CyberGymLeaderboard = { render, cells };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initNoteTooltips);
  } else {
    initNoteTooltips();
  }
})();
