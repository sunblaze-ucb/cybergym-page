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
  } catch (error) {
    console.error("Error loading leaderboard data:", error);
    // Show error message in all tables
    ["level1"].forEach((level) => {
      const tbody = document.getElementById(`${level}-tbody`);
      tbody.innerHTML =
        '<tr><td colspan="6" class="has-text-centered has-text-danger">Failed to load data</td></tr>';
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

function populateTable(level, results) {
  const tbody = document.getElementById(`${level}-tbody`);

  if (results.length === 0) {
    tbody.innerHTML =
      '<tr><td colspan="6" class="has-text-centered">No results available</td></tr>';
    return;
  }

  // Sort by score_10 in descending order
  const sortedResults = [...results].sort((a, b) => b.score_10 - a.score_10);

  tbody.innerHTML = sortedResults
    .map(
      (result, index) => `
          <tr>
            <td>${index + 1}</td>
            <td>${result.name}</td>
            <td>${result.trials}</td>
            <td>${(result.score_10 * 100).toFixed(2)}%</td>
            <td>${result.date}</td>
            <td>${result.source_url ? `<a href="${result.source_url}" target="_blank">${result.source}</a>` : result.source}</td>
          </tr>
        `
    )
    .join("");
}
