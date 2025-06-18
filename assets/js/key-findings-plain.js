const keyFindings = [
  {
    title: "Thinking Mode Slightly Improves Reproduction Performance",
    img: "assets/images/thinking_vs_nonthinking.png",
    alt: "thinking vs non-thinking mode",
    content: `We evaluate the performance difference between thinking and non-thinking modes on a randomly selected subset of 300 tasks (~20% of the entire benchmark) using Qwen3-235B-A22B and Claude-3.7-Sonnet. The thinking mode yields modest performance improvements on vulnerability reproduction for both models, with success rates increasing by 2-3%. However, for finding post-patch vulnerabilities, enabling thinking does not always yield improvement.`,
  },
  {
    title: "Richer Input Information Enhances Reproduction Performance",
    img: "assets/images/different_levels.png",
    alt: "different levels",
    content: `We design four difficulty levels based on input information amount. It shows that richer input information such as stack traces (level 2) and ground truth patches (level 3) significantly improves vulnerability reproduction success compared to our primary task (level 1). Level 0 represents the scenario of vulnerability detection using only the source code without extra information, where the agents find 78 (3.5%+1.7%) vulnerabilities out of 1,507 instances.`,
  },
  {
    title: "Ineffectiveness in Handling Longer PoCs",
    img: "assets/images/poc_len.png",
    alt: "different poc lengths",
    content: `Longer ground truth PoCs indicate more complex input parsing logic, making it harder for agents to manipulate inputs and trigger vulnerability conditions. It shows the performance of agents decreases as PoC length increases, highlighting the major challenge agents face when analyzing complex programs and generating effective long inputs.`,
  },
  {
    title: "Successes are Often Achieved in Earlier Steps",
    img: "assets/images/success_vs_steps.png",
    alt: "different levels",
    content: `Agents require varying steps to solve tasks iteratively. The figure shows OpenHands with GPT4.1 results across execution steps (max 100). Successful outcomes concentrate between steps 20-80, peaking at 20-40, while nearly half of runs fail at the 90-100 step limit. This suggests agents solve simple instances early but struggle with complex cases, often unsuccessfully iterating through testcases and code analysis in later steps.`,
  },
];

function renderCarousel() {
  const container = document.getElementById("key-findings-carousel");
  
  // Generate all findings as individual cards
  const findingsHTML = keyFindings.map((finding, index) => {
    const isEven = index % 2 === 0;
    const imageColumn = `
      <div class="column is-half" style="display:flex;align-items:center;justify-content:center;">
        <figure class="image" style="margin:auto;">
          <img src="${finding.img}" alt="${finding.alt}" style="max-width:100%;height:auto;" />
        </figure>
      </div>
    `;
    const contentColumn = `
      <div class="column is-half" style="display:flex;align-items:center;">
        <div class="content has-text-justified">
          <p>${finding.content}</p>
        </div>
      </div>
    `;

    return `
      <div class="card" style="margin-bottom: 2rem;">
        <div class="card-content" style="background-color:rgba(255, 255, 255, 0.2)">
          <h3 class="title is-4 key-finding-title" style="text-align:center; margin-bottom: 1.5rem;">${finding.title}</h3>
          <div class="columns is-vcentered" style="align-items:center; min-height: 220px;">
            ${isEven ? imageColumn + contentColumn : contentColumn + imageColumn}
          </div>
        </div>
      </div>
    `;
  }).join('');

  container.innerHTML = `
    <div style="max-width: 100%;">
      ${findingsHTML}
    </div>
  `;
}

document.addEventListener("DOMContentLoaded", () => renderCarousel());

