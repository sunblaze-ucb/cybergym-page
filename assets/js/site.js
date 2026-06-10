/* ============================================================
   Shared site chrome (nav + footer) for the CyberGym series.
   Injected into every page so the series stays consistent as
   more benchmarks are added. Uses absolute paths (site is served
   from the domain root, cybergym.io).
   ============================================================ */
(function () {
  const BENCHMARKS = [
    { key: "cybergym", label: "CyberGym", href: "/cybergym/" },
    { key: "exploitgym", label: "ExploitGym", href: "/exploitgym/" },
    { key: "cybergym-e2e", label: "CyberGym-E2E", href: "/cybergym-e2e/", tag: "soon" },
  ];
  const GITHUB_ORG = "https://github.com/sunblaze-ucb";

  const ICON_SUN = '<svg viewBox="0 0 24 24" class="h-5 w-5" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></svg>';
  const ICON_MOON = '<svg viewBox="0 0 24 24" class="h-5 w-5" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z"/></svg>';

  // Active benchmark: page sets <html data-benchmark="...">, else infer from path.
  const active =
    document.documentElement.dataset.benchmark ||
    (BENCHMARKS.find((b) => location.pathname.startsWith(b.href)) || {}).key ||
    "";

  function navLinks(mobile) {
    return BENCHMARKS.map((b) => {
      const isActive = b.key === active;
      const base = mobile
        ? "block rounded-lg px-3 py-2 text-base font-medium"
        : "relative px-3 py-2 text-sm font-medium transition";
      const state = isActive
        ? "text-[color:var(--accent-strong)]"
        : "text-slate-600 hover:text-slate-900";
      const tag = b.tag
        ? `<span class="ml-1.5 rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide" style="background:var(--accent-soft);color:var(--accent-strong)">${b.tag}</span>`
        : "";
      const underline =
        isActive && !mobile
          ? `<span class="absolute inset-x-3 -bottom-px h-0.5 rounded-full" style="background:var(--accent)"></span>`
          : "";
      return `<a href="${b.href}" class="${base} ${state}">${b.label}${tag}${underline}</a>`;
    }).join("");
  }

  const headerHTML = `
    <div id="site-nav-bar" class="sticky top-0 z-50 px-4 py-2.5">
      <nav class="nav-island mx-auto flex h-14 max-w-6xl items-center justify-between px-4 sm:px-6">
        <a href="/" class="flex items-center font-bold tracking-tight text-slate-900">
          <span class="text-lg">Home</span>
        </a>
        <div class="hidden items-center gap-1 md:flex">
          ${navLinks(false)}
          <span class="mx-2 h-5 w-px bg-slate-200"></span>
          <a href="${GITHUB_ORG}" target="_blank" rel="noopener" aria-label="GitHub"
             class="rounded-lg p-2 text-slate-500 transition hover:bg-slate-100 hover:text-slate-900">
            <svg viewBox="0 0 24 24" class="h-5 w-5" fill="currentColor" aria-hidden="true"><path d="M12 .5C5.7.5.5 5.7.5 12c0 5.1 3.3 9.4 7.9 10.9.6.1.8-.2.8-.6v-2c-3.2.7-3.9-1.4-3.9-1.4-.5-1.3-1.3-1.7-1.3-1.7-1.1-.7.1-.7.1-.7 1.2.1 1.8 1.2 1.8 1.2 1 1.8 2.7 1.3 3.4 1 .1-.8.4-1.3.7-1.6-2.6-.3-5.3-1.3-5.3-5.7 0-1.3.4-2.3 1.2-3.1-.1-.3-.5-1.5.1-3.1 0 0 1-.3 3.2 1.2a11 11 0 0 1 5.8 0c2.2-1.5 3.2-1.2 3.2-1.2.6 1.6.2 2.8.1 3.1.8.8 1.2 1.8 1.2 3.1 0 4.4-2.7 5.4-5.3 5.7.4.4.8 1.1.8 2.2v3.3c0 .4.2.7.8.6 4.6-1.5 7.9-5.8 7.9-10.9C23.5 5.7 18.3.5 12 .5z"/></svg>
          </a>
          <button data-theme-toggle aria-label="Toggle theme"
             class="rounded-lg p-2 text-slate-500 transition hover:bg-slate-100 hover:text-slate-900"><span data-theme-icon class="block"></span></button>
        </div>
        <div class="flex items-center gap-1 md:hidden">
          <button data-theme-toggle aria-label="Toggle theme" class="rounded-lg p-2 text-slate-500 hover:bg-slate-100"><span data-theme-icon class="block"></span></button>
          <button id="nav-toggle" aria-label="Menu" class="rounded-lg p-2 text-slate-600 hover:bg-slate-100">
          <svg viewBox="0 0 24 24" class="h-6 w-6" fill="none" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" d="M4 7h16M4 12h16M4 17h16"/></svg>
          </button>
        </div>
      </nav>
      <div id="nav-mobile" class="mx-auto mt-2 hidden max-w-6xl rounded-2xl border border-slate-200 bg-white px-3 py-3 shadow-lg md:hidden">
        ${navLinks(true)}
        <a href="${GITHUB_ORG}" target="_blank" rel="noopener" class="block rounded-lg px-3 py-2 text-base font-medium text-slate-600">GitHub</a>
      </div>
    </div>`;

  const footerHTML = `
    <footer class="border-t border-slate-200 bg-slate-50">
      <div class="container-wide flex flex-col items-center justify-between gap-4 py-8 text-sm text-slate-500 sm:flex-row">
        <div class="flex items-center gap-4">
          <a href="/cybergym/" class="hover:text-slate-900">CyberGym</a>
          <a href="/exploitgym/" class="hover:text-slate-900">ExploitGym</a>
          <a href="${GITHUB_ORG}" target="_blank" rel="noopener" class="hover:text-slate-900">GitHub</a>
        </div>
      </div>
    </footer>`;

  function mount() {
    const header = document.getElementById("site-header");
    if (header) header.innerHTML = headerHTML;
    const footer = document.getElementById("site-footer");
    if (footer) footer.innerHTML = footerHTML;

    const toggle = document.getElementById("nav-toggle");
    const mobile = document.getElementById("nav-mobile");
    if (toggle && mobile) {
      toggle.addEventListener("click", () => mobile.classList.toggle("hidden"));
    }

    // Theme toggle (light/dark). The no-flash <head> script sets the initial value.
    const curTheme = () => (document.documentElement.getAttribute("data-theme") === "dark" ? "dark" : "light");
    const paintIcons = () => {
      const icon = curTheme() === "dark" ? ICON_SUN : ICON_MOON;
      document.querySelectorAll("[data-theme-icon]").forEach((el) => { el.innerHTML = icon; });
    };
    const applyTheme = (t) => {
      document.documentElement.setAttribute("data-theme", t);
      try { localStorage.setItem("theme", t); } catch (e) {}
      paintIcons();
    };
    document.querySelectorAll("[data-theme-toggle]").forEach((btn) => {
      btn.addEventListener("click", () => applyTheme(curTheme() === "dark" ? "light" : "dark"));
    });
    paintIcons();

    // Transparent over the hero gradient at the top; solid bar once scrolled.
    const bar = document.getElementById("site-nav-bar");
    if (bar) {
      const onScroll = () => bar.classList.toggle("is-solid", window.scrollY > 24);
      window.addEventListener("scroll", onScroll, { passive: true });
      onScroll();
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", mount);
  } else {
    mount();
  }
})();
