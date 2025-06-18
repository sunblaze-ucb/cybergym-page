// Tab functionality for leaderboard
document.addEventListener("DOMContentLoaded", function () {
  // Load leaderboard data
  loadLeaderboardData();
});

async function loadLeaderboardData() {
  try {
    const response = await fetch("assets/results/leaderboard.json");
    if (!response.ok) {
      throw new Error("Failed to load results");
    }
    const data = await response.json();

    // Populate each level's table
    ["level1"].forEach((level) => {
      populateTable(level, data[level]);
    });
  } catch (error) {
    console.error("Error loading leaderboard data:", error);
    // Show error message in all tables
    ["level1"].forEach((level) => {
      const tbody = document.getElementById(`${level}-tbody`);
      tbody.innerHTML =
        '<tr><td colspan="5" class="has-text-centered has-text-danger">Failed to load data</td></tr>';
    });
  }
}

function populateTable(level, results) {
  const tbody = document.getElementById(`${level}-tbody`);

  if (results.length === 0) {
    tbody.innerHTML =
      '<tr><td colspan="5" class="has-text-centered">No results available</td></tr>';
    return;
  }

  tbody.innerHTML = results
    .map(
      (result) => `
          <tr>
            <td>${result.rank}</td>
            <td>${result.name}</td>
            <td>${(result.score_10 * 100).toFixed(2)}%</td>
            <td>${(result.score_x1 * 100).toFixed(2)}%</td>
            <td>${result.date}</td>
          </tr>
        `
    )
    .join("");
}
