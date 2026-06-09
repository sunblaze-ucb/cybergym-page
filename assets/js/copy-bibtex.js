/* Copy a BibTeX block to the clipboard. Pass the button element:
   <button class="copy-btn" onclick="copyBibtex(this)"> ... </button>
   Reads the <code id="bibtex-code"> within the same .bibtex-box. */
function copyBibtex(btn) {
  const box = btn ? btn.closest(".bibtex-box") : document;
  const code = (box || document).querySelector("#bibtex-code, code");
  if (!code) return;
  const text = code.innerText || code.textContent;
  navigator.clipboard.writeText(text).then(() => {
    if (!btn) return;
    const original = btn.innerHTML;
    btn.innerHTML = "Copied!";
    setTimeout(() => { btn.innerHTML = original; }, 1200);
  });
}
