// Tab functionality for leaderboard
let leaderboardData = {};

document.addEventListener("DOMContentLoaded", function () {
  // Load leaderboard data
  loadLeaderboardData();

  // Add filter event listener
  const trialsFilter = document.getElementById("trials-filter");
  if (trialsFilter) {
    trialsFilter.addEventListener("change", function() {
      filterAndPopulateTables();
    });
  }
});

async function loadLeaderboardData() {
  try {
    const response = await fetch("assets/results/leaderboard.json");
    if (!response.ok) {
      throw new Error("Failed to load results");
    }
    leaderboardData = await response.json();

    // Populate trials filter options
    populateTrialsFilter();

    // Populate each level's table
    filterAndPopulateTables();

    // Render the time vs success chart
    renderTimeVsSuccessChart();
  } catch (error) {
    console.error("Error loading leaderboard data:", error);
    // Show error message in all tables
    ["level1"].forEach((level) => {
      const tbody = document.getElementById(`${level}-tbody`);
      tbody.innerHTML =
        '<tr><td colspan="7" class="has-text-centered has-text-danger">Failed to load data</td></tr>';
    });
  }
}

function populateTrialsFilter() {
  const trialsFilter = document.getElementById("trials-filter");
  if (!trialsFilter) return;

  // Get unique trials values from level1 data
  const level1Data = leaderboardData["level1"] || [];
  const uniqueTrials = [...new Set(level1Data.map(result => result.trials))].sort((a, b) => a - b);

  // Clear existing options except "All"
  trialsFilter.innerHTML = '<option value="all">All Trials</option>';

  // Add options for each unique trials value
  uniqueTrials.forEach(trials => {
    const option = document.createElement("option");
    option.value = trials;
    option.textContent = `${trials} Trial${trials > 1 ? 's' : ''}`;
    trialsFilter.appendChild(option);
  });

  // Set default filter to 1 trial if it exists
  if (uniqueTrials.includes(1)) {
    trialsFilter.value = "1";
  }
}

function filterAndPopulateTables() {
  const trialsFilter = document.getElementById("trials-filter");
  const selectedTrials = trialsFilter ? trialsFilter.value : "all";

  ["level1"].forEach((level) => {
    let filteredData = leaderboardData[level] || [];

    // Apply trials filter
    if (selectedTrials !== "all") {
      const trialsValue = parseInt(selectedTrials);
      filteredData = filteredData.filter(result => result.trials === trialsValue);
    }

    populateTable(level, filteredData);
  });
}

function renderTimeVsSuccessChart() {
  const canvas = document.getElementById("time-vs-success-chart");
  if (!canvas) return;

  const level1Data = leaderboardData["level1"] || [];
  const plotData = level1Data.filter((d) => d.include_in_plot);

  const points = plotData.map((d) => ({
    x: new Date(d.model_release_date),
    y: d.score_10 * 100,
    label: d.model,
    agent: d.agent,
    trials: d.trials,
  }));

  // Compute data range
  const PX_PER_MONTH = 45;
  const PX_PER_10PCT = 40;
  const AXIS_PADDING = 80; // approximate space for axis labels

  const minTime = Math.min(...points.map((p) => p.x.getTime()));
  const maxTime = Math.max(...points.map((p) => p.x.getTime()));
  const monthsSpan = (maxTime - minTime) / (30 * 86400000) + 2; // +2 for padding

  const maxY = Math.ceil(Math.max(...points.map((p) => p.y)) / 10) * 10;
  const minY = 0;
  const ySpan = (maxY - minY) / 10;

  const chartWidth = Math.round(monthsSpan * PX_PER_MONTH + AXIS_PADDING);
  const chartHeight = Math.round(ySpan * PX_PER_10PCT + AXIS_PADDING);

  canvas.parentElement.style.maxWidth = chartWidth + "px";
  canvas.style.height = chartHeight + "px";

  new Chart(canvas, {
    type: "scatter",
    data: {
      datasets: [
        {
          data: points,
          backgroundColor: points.map((p) => {
            if (p.label.startsWith("Claude")) return "#c1440e";
            if (p.label.startsWith("GPT")) return "#666";
            if (p.label.startsWith("Gemini")) return "#9b59b6";
            return "#3498db";
          }),
          pointRadius: 6,
          pointHoverRadius: 8,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      animation: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            label: (ctx) => {
              const p = ctx.raw;
              return `${p.label}: ${p.y.toFixed(1)}%`;
            },
          },
        },
      },
      scales: {
        x: {
          type: "time",
          min: new Date(Math.min(...points.map((p) => p.x.getTime())) - 30 * 86400000).toISOString(),
          max: new Date(Math.max(...points.map((p) => p.x.getTime())) + 30 * 86400000).toISOString(),
          time: { unit: "month", displayFormats: { month: "MMM yyyy" } },
          title: { display: true, text: "Release Date", font: { size: 14 } },
        },
        y: {
          min: minY,
          max: maxY,
          title: {
            display: true,
            text: "Success Rate (%)",
            font: { size: 14 },
          },
        },
      },
      layout: { padding: { top: 30, right: 20 } },
    },
    plugins: [
      {
        id: "labelPlugin",
        afterDatasetsDraw(chart) {
          const ctx = chart.ctx;
          ctx.font = "12px sans-serif";
          ctx.fillStyle = "#000";

          const chartArea = chart.chartArea;
          const meta = chart.getDatasetMeta(0);
          const H = 12;
          const pad = 6;

          function overlaps(a, b) {
            return a.x < b.x + b.w + 1 && a.x + a.w + 1 > b.x &&
                   a.y < b.y + b.h + 1 && a.y + a.h + 1 > b.y;
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

          // Sort by score (higher y value = lower on screen in canvas) so top points get priority
          const indices = meta.data.map((_, i) => i);
          indices.sort((a, b) => {
            const da = chart.data.datasets[0].data[a];
            const db = chart.data.datasets[0].data[b];
            return db.y - da.y;
          });

          // Add all data points as obstacles (small rects around each dot)
          const r = 4;
          const obstacles = meta.data.map((pt) => ({
            x: pt.x - r, y: pt.y - r, w: r * 2, h: r * 2,
          }));
          const labels = [];

          indices.forEach((i) => {
            const point = meta.data[i];
            const p = chart.data.datasets[0].data[i];
            const text = p.label;
            const tw = ctx.measureText(text).width;

            // Generate candidate positions at various offsets around the point
            const offsets = [
              [1, -1], [1, 1], [-1, -1], [-1, 1],
              [1, -2], [1, 2], [-1, -2], [-1, 2],
              [1, -3], [1, 3], [-1, -3], [-1, 3],
              [0, -2], [0, 2], [0, -3], [0, 3],
            ];
            const candidates = offsets.map(([dx, dy]) => ({
              x: dx >= 0 ? point.x + pad * dx : point.x + pad * dx - tw,
              y: point.y + pad * dy - (dy < 0 ? H : 0),
              w: tw,
              h: H,
            }));

            // Filter out candidates that go outside chart area
            const valid = candidates.filter(
              (c) => c.x >= chartArea.left - 5 && c.x + c.w <= chartArea.right + 5 &&
                     c.y >= chartArea.top - 5 && c.y + c.h <= chartArea.bottom + 5
            );

            // Pick the candidate with least overlap
            const allObstacles = obstacles.concat(labels);
            let best = (valid.length ? valid : candidates)[0];
            let bestOverlap = overlapArea(best, allObstacles);
            for (const c of (valid.length ? valid : candidates)) {
              const o = overlapArea(c, allObstacles);
              if (o < bestOverlap) {
                best = c;
                bestOverlap = o;
                if (o === 0) break;
              }
            }

            labels.push({ ...best, text, idx: i, px: point.x, py: point.y });
          });

          // Draw connector lines and labels
          labels.forEach((l) => {
            // Draw a thin line from point to nearest edge of label
            const labelCx = l.x + l.w / 2;
            const labelCy = l.y + l.h / 2;
            const dist = Math.hypot(labelCx - l.px, labelCy - l.py);
            if (dist > pad * 2) {
              ctx.beginPath();
              ctx.strokeStyle = "#aaa";
              ctx.lineWidth = 0.8;
              ctx.moveTo(l.px, l.py);
              // Connect to the closest edge of the label box
              let tx = labelCx < l.px ? l.x + l.w : (labelCx > l.px ? l.x : labelCx);
              let ty = labelCy < l.py ? l.y + l.h : (labelCy > l.py ? l.y : labelCy);
              ctx.lineTo(tx, ty);
              ctx.stroke();
            }

            ctx.textAlign = "left";
            ctx.textBaseline = "top";
            ctx.fillStyle = "#000";
            ctx.fillText(l.text, l.x, l.y);
          });
        },
      },
    ],
  });
}

function populateTable(level, results) {
  const tbody = document.getElementById(`${level}-tbody`);

  if (results.length === 0) {
    tbody.innerHTML =
      '<tr><td colspan="7" class="has-text-centered">No results available</td></tr>';
    return;
  }

  // Sort by score_10 in descending order
  const sortedResults = [...results].sort((a, b) => b.score_10 - a.score_10);

  tbody.innerHTML = sortedResults
    .map(
      (result, index) => `
          <tr>
            <td>${index + 1}</td>
            <td>${result.agent || "-"}</td>
            <td>${result.model || "-"}</td>
            <td>${result.trials}</td>
            <td>${(result.score_10 * 100).toFixed(1)}%</td>
            <td>${result.date}</td>
            <td>${result.source_url ? `<a href="${result.source_url}" target="_blank">${result.source}</a>` : result.source}</td>
          </tr>
        `
    )
    .join("");
}
