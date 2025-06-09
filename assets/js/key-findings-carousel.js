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
    content: `We design four difficulty levels based on input information amount. It shows that richer input information such as stack traces (level 2) and ground truth patches (level 3) significantly improves vulnerability reproduction success compared to our primary task (level 1). Level 0 shows reduced reproduction rates due to missing vulnerability descriptions, though it discovers slightly more post-patch vulnerabilities through increased exploration.`,
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

function renderCarousel(currentIdx) {
  const finding = keyFindings[currentIdx];
  const total = keyFindings.length;

  // Dots navigation
  const dots = Array.from(
    { length: total },
    (_, i) =>
      `<span class="kf-dot${
        i === currentIdx ? " active" : ""
      }" data-idx="${i}"></span>`
  ).join("");

  document.getElementById("key-findings-carousel").innerHTML = `
    <div style="display: flex; align-items: center; gap: 10px;">
      <!-- Previous Arrow -->
      <div class="kf-arrow kf-arrow-prev" data-direction="prev">
        <i class="hgi hgi-stroke hgi-arrow-left-01"></i>
      </div>
      
      <div class="card" style="min-height: 360px; position: relative; display: flex; flex-direction: column; justify-content: center; flex: 1;">
        <div class="card-content" style="flex:1;display:flex;flex-direction:column;justify-content:center;">
          <h3 class="title is-4 key-finding-title" style="text-align:center;">${finding.title}</h3>
          <div class="columns is-vcentered" style="align-items:center; min-height: 220px;">
            <div class="column is-half" style="display:flex;align-items:center;justify-content:center;">
              <figure class="image" style="margin:auto;">
                <img src="${finding.img}" alt="${finding.alt}" style="max-width:100%;height:auto;" />
              </figure>
            </div>
            <div class="column is-half" style="display:flex;align-items:center;">
              <div class="content has-text-justified">
                <p>${finding.content}</p>
              </div>
            </div>
          </div>
        </div>
        <div style="width:100%;position:absolute;left:0;bottom:18px;display:flex;justify-content:center;align-items:center;">
          ${dots}
        </div>
      </div>
      
      <!-- Next Arrow -->
      <div class="kf-arrow kf-arrow-next" data-direction="next">
        <i class="hgi hgi-stroke hgi-arrow-right-01"></i>
      </div>
    </div>
    <style>
      .kf-arrow {
        width: 40px;
        height: 40px;
        background: rgba(255, 255, 255, 0.9);
        border: 1px solid #ddd;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        cursor: pointer;
        transition: all 0.3s ease;
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
        flex-shrink: 0;
      }
      
      .kf-arrow:hover {
        background: #3273dc;
        color: white;
        border-color: #3273dc;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
      }
      
      .kf-arrow i {
        font-size: 20px;
      }
      
      .kf-dot {
        display: inline-block;
        width: 12px;
        height: 12px;
        margin: 0 6px;
        border-radius: 50%;
        background: #bbb;
        cursor: pointer;
        transition: background 0.2s;
        border: 2px solid transparent;
      }
      .kf-dot.active {
        background: #3273dc;
        border-color: #3273dc;
      }
      .kf-dot:hover:not(.active) {
        background: #888;
      }
    </style>
  `;

  // Arrow click events
  document.querySelectorAll(".kf-arrow").forEach((arrow) => {
    arrow.onclick = (e) => {
      const direction = e.currentTarget.getAttribute("data-direction");
      let newIdx;
      if (direction === "prev") {
        newIdx = currentIdx === 0 ? total - 1 : currentIdx - 1;
      } else {
        newIdx = currentIdx === total - 1 ? 0 : currentIdx + 1;
      }
      renderCarousel(newIdx);
    };
  });

  // Dot click event
  document.querySelectorAll(".kf-dot").forEach((dot) => {
    dot.onclick = (e) => {
      const idx = parseInt(e.target.getAttribute("data-idx"));
      if (idx !== currentIdx) renderCarousel(idx);
    };
  });
}

document.addEventListener("DOMContentLoaded", () => renderCarousel(0));
