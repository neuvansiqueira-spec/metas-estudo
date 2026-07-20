(() => {
  "use strict";

  const STORAGE_KEY = "aldusSideNavCollapsed";
  const DESKTOP_QUERY = "(min-width: 1051px)";
  const root = document.documentElement;
  const sideNav = document.querySelector("[data-side-nav]");
  const toggle = document.getElementById("sideNavToggle");
  const icon = toggle?.querySelector(".side-nav-toggle-icon");
  const desktop = window.matchMedia(DESKTOP_QUERY);

  if (!sideNav || !toggle || !icon) return;

  function storedPreference() {
    try {
      return localStorage.getItem(STORAGE_KEY) === "true";
    } catch {
      return false;
    }
  }

  function applyCollapsed(collapsed, persist = false) {
    const active = desktop.matches && Boolean(collapsed);
    root.dataset.sideNavCollapsed = active ? "true" : "false";
    sideNav.dataset.collapsed = active ? "true" : "false";
    toggle.setAttribute("aria-expanded", active ? "false" : "true");
    toggle.setAttribute("aria-label", active ? "Abrir navegação" : "Recolher navegação");
    toggle.title = active ? "Abrir navegação" : "Recolher navegação";
    icon.textContent = active ? "›" : "‹";

    if (persist && desktop.matches) {
      try {
        localStorage.setItem(STORAGE_KEY, active ? "true" : "false");
      } catch {}
    }
  }

  toggle.addEventListener("click", () => {
    applyCollapsed(root.dataset.sideNavCollapsed !== "true", true);
  });

  const handleViewportChange = () => applyCollapsed(storedPreference());
  if (typeof desktop.addEventListener === "function") desktop.addEventListener("change", handleViewportChange);
  else desktop.addListener?.(handleViewportChange);
  applyCollapsed(storedPreference());
})();
