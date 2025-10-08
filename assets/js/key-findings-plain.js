const keyFindings = [
  {
    title: "Thinking Mode Improves Success Rate",
    img: "assets/images/thinking_vs_nonthinking.png",
    alt: "thinking vs non-thinking mode",
    content: `We compare thinking and non-thinking modes on a randomly selected subset of 300 tasks (~20% of the entire benchmark) using Qwen3-235B-A22B, GPT-5, Claude-3.7-Sonnet, and Claude-Sonnet-4. As illustrated in Figure 4, while the thinking mode yields modest gains over other models, it increases GPT-5's success rate from 7.7% (with minimal reasoning) to 22.0% (with high reasoning), surpassing Claude-Sonnet-4. This phenomenon is consistent with GPT-5's results for other benchmarks.`,
  },
  {
    title: "Richer Input Information Enhances Reproduction Effort",
    img: "assets/images/different_levels.png",
    alt: "different levels",
    content: `We design four difficulty levels based on the amount of input information provided to the agents. The figure shows how these difficulty levels affect the success rate of OpenHands with GPT-4.1. Richer input information, such as stack trace provided in level 2 and ground truth patch provided in level 3, greatly enhances the vulnerability reproduction success rate compared to level 1 (our primary task). For level 0, only 3.5% instances can be successfully reproduced without access to the text description of the target vulnerability.`,
  },
  {
    title: "Challenges in Handling Longer PoCs",
    img: "assets/images/poc_len.png",
    alt: "different poc lengths",
    content: `A longer ground truth PoC typically implies more complex input parsing logic, making it harder for agents to generate inputs that trigger vulnerability conditions. The figure shows OpenHands with GPT-4.1 and Claude-4-Sonnet performance partitioned by PoC length. Tasks in the [0, 10) byte range achieve the highest success rate. However, success drops significantly as PoC length increases. Agents show only ~10% success on instances with PoCs longer than 100 bytes, which represent 65.7% of the benchmark. This highlights a major challenge for agents in analyzing complex programs and producing effective long inputs.`,
  },
  {
    title: "Marginal Improvement with Higher Step Counts",
    img: "assets/images/success_vs_steps.png",
    alt: "different levels",
    content: `The figure shows OpenHands with Claude-4-Sonnet results across execution steps (max 100). Successful outcomes concentrate between steps 20-80, peaking at 20-50. However, nearly half of runs terminate at 80-100 steps without success, as shown by the grey "Fail" bars. This suggests agents solve simpler instances early but struggle with complex cases, often iterating through test cases and code analysis without success. The 100-step limit offers an effective balance, allowing most solvable problems to complete while efficiently capping resource use on intractable cases.`,
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

