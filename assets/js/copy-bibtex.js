function copyBibtex() {
  const codeElem = document.getElementById('bibtex-code');
  if (!codeElem) return;
  const text = codeElem.innerText || codeElem.textContent;
  navigator.clipboard.writeText(text).then(() => {
    const btn = document.querySelector('.copy-bibtex-btn');
    if (!btn) return;
    const original = btn.innerHTML;
    btn.innerHTML = '<span style="font-weight:bold;">Copied!</span>';
    setTimeout(() => {
      btn.innerHTML = original;
    }, 1200);
  });
}
