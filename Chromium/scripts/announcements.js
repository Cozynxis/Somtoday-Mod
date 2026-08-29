(() => {
  if (window.__stmAnnouncementCenterLoaded) return;
  window.__stmAnnouncementCenterLoaded = true;

  const SUPABASE_URL = "https://mkpmpakycvzmzzbqdcjc.supabase.co";
  const SUPABASE_KEY = "sb_publishable_uQob8MpB44n9_kd8OgEeYA_h_alWkBh";
  const READ_KEY = "somtoday_mod_announcements_read_v1";
  const POLL_MS = 5 * 60 * 1000;

  let announcements = [];
  let readIds = new Set();
  let panelOpen = false;
  let activeAnnouncement = null;

  const $ = (sel, root = document) => root.querySelector(sel);
  const bellSvg = () => `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9"/><path d="M10 21h4"/></svg>`;
  const safeText = (value = "") => String(value ?? "");

  function getLayout() {
    try { return String(typeof get === "function" ? (get("layout") || "1") : "1"); }
    catch { return "1"; }
  }

  function detectNavigationMode() {
    const header = document.querySelector("sl-header");
    const bar = header?.querySelector("sl-tab-bar");
    const hr = header?.getBoundingClientRect();
    const br = bar?.getBoundingClientRect();
    const vw = window.innerWidth;
    if (!hr) return { mode: "top", side: "top", header, bar, hr: null, br: null };

    const geometrySidebar = hr.height > Math.max(280, hr.width * 1.25) && hr.width < 360;
    const barSidebar = br && br.height > Math.max(240, br.width * 1.15) && br.width < 340;
    const sidebar = geometrySidebar || barSidebar;
    const side = sidebar ? ((hr.left + hr.width / 2) > vw / 2 ? "right" : "left") : "top";
    return { mode: sidebar ? "sidebar" : "top", side, header, bar, hr, br };
  }

  function applyLayout() {
    const root = $("#stm-ann-root");
    if (!root) return;
    const info = detectNavigationMode();
    root.dataset.layout = getLayout();
    root.dataset.navMode = info.mode;
    root.dataset.navSide = info.side;
    root.classList.toggle("stm-ann-sidebar", info.mode === "sidebar");
    root.classList.toggle("stm-ann-sidebar-left", info.side === "left");
    root.classList.toggle("stm-ann-sidebar-right", info.side === "right");
    root.classList.toggle("stm-ann-topbar", info.mode === "top");
    document.body?.classList.toggle("stm-ann-has-sidebar", info.mode === "sidebar");
    document.body?.classList.toggle("stm-ann-has-sidebar-left", info.side === "left");
    document.body?.classList.toggle("stm-ann-has-sidebar-right", info.side === "right");
    document.body?.classList.toggle("stm-ann-has-topbar", info.mode === "top");
    positionUi(info);
  }

  function positionUi(info = detectNavigationMode()) {
    const bell = $("#stm-ann-bell");
    const panel = $("#stm-ann-panel");
    if (!bell || !panel) return;

    const vw = window.innerWidth;
    const vh = window.innerHeight;

    if (vw <= 720) {
      bell.style.left = "auto";
      bell.style.right = "10px";
      bell.style.top = "10px";
      panel.style.left = "auto";
      panel.style.right = "10px";
      panel.style.top = "52px";
      return;
    }

    if (info.mode === "sidebar" && info.hr) {
      const r = info.hr;
      const bellX = Math.round(r.left + Math.max(8, (r.width - 40) / 2));
      const bellY = Math.max(14, Math.round(r.top + 72));

      bell.style.left = `${bellX}px`;
      bell.style.right = "auto";
      bell.style.top = `${bellY}px`;

      const panelTop = Math.max(12, Math.min(vh - 530, bellY - 8));
      panel.style.top = `${panelTop}px`;

      if (info.side === "right") {
        panel.style.left = "auto";
        panel.style.right = `${Math.max(10, Math.round(vw - r.left + 10))}px`;
      } else {
        panel.style.right = "auto";
        panel.style.left = `${Math.max(10, Math.round(r.right + 10))}px`;
      }
      return;
    }

    const r = info.hr;
    const top = r ? Math.max(8, Math.round(r.top + Math.max(7, (Math.min(r.height, 58) - 38) / 2))) : 12;
    bell.style.left = "auto";
    bell.style.right = "72px";
    bell.style.top = `${top}px`;
    panel.style.left = "auto";
    panel.style.right = "16px";
    panel.style.top = `${Math.min(vh - 80, top + 44)}px`;
  }

  function sanitizeHtml(html = "") {
    const template = document.createElement("template");
    template.innerHTML = String(html);
    const allowed = new Set(["P","BR","STRONG","B","EM","I","U","S","H2","H3","UL","OL","LI","BLOCKQUOTE","A","SPAN","DIV"]);

    for (const el of [...template.content.querySelectorAll("*")]) {
      if (!allowed.has(el.tagName)) {
        el.replaceWith(...el.childNodes);
        continue;
      }
      for (const attr of [...el.attributes]) {
        const name = attr.name.toLowerCase();
        if (el.tagName === "A" && name === "href") {
          try {
            const url = new URL(attr.value, location.href);
            if (!["http:", "https:"].includes(url.protocol)) el.removeAttribute(attr.name);
            else {
              el.setAttribute("href", url.href);
              el.setAttribute("target", "_blank");
              el.setAttribute("rel", "noopener noreferrer");
            }
          } catch { el.removeAttribute(attr.name); }
          continue;
        }
        if (name === "style") {
          const clean = [];
          for (const rule of attr.value.split(";")) {
            const [prop, ...rest] = rule.split(":");
            if (!prop || !rest.length) continue;
            const key = prop.trim().toLowerCase();
            const value = rest.join(":").trim();
            if (key === "text-align" && /^(left|right|center|justify)$/.test(value)) clean.push(`${key}:${value}`);
            if (key === "font-size" && /^([1-9]\d?|100)(px|%|em|rem)$/.test(value)) clean.push(`${key}:${value}`);
          }
          clean.length ? el.setAttribute("style", clean.join(";")) : el.removeAttribute("style");
          continue;
        }
        if (!(el.tagName === "A" && ["target", "rel"].includes(name))) el.removeAttribute(attr.name);
      }
    }
    return template.innerHTML;
  }

  function formatDate(value) {
    if (!value) return "";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "";
    const now = new Date();
    const sameDay = date.toDateString() === now.toDateString();
    return new Intl.DateTimeFormat("nl-NL", sameDay
      ? { hour: "2-digit", minute: "2-digit" }
      : { day: "numeric", month: "short", year: date.getFullYear() !== now.getFullYear() ? "numeric" : undefined }
    ).format(date);
  }

  const storageGet = key => new Promise(resolve => chrome.storage.local.get([key], result => resolve(result[key])));
  const storageSet = obj => new Promise(resolve => chrome.storage.local.set(obj, resolve));

  async function loadReadIds() {
    const stored = await storageGet(READ_KEY);
    const values = Array.isArray(stored) ? stored : (stored && Array.isArray(stored.ids) ? stored.ids : []);
    readIds = new Set(values.map(String));
  }

  async function saveReadIds() {
    const ids = [...readIds].slice(-1000);
    await storageSet({ [READ_KEY]: ids });
  }

  function getUnreadCount() {
    return announcements.filter(item => !readIds.has(String(item.id))).length;
  }

  function ensureUi() {
    if ($("#stm-ann-root")) {
      applyLayout();
      return;
    }

    const root = document.createElement("div");
    root.id = "stm-ann-root";
    root.innerHTML = `
      <button id="stm-ann-bell" type="button" aria-label="Mededelingen" aria-expanded="false">
        ${bellSvg()}
        <span id="stm-ann-count" hidden>0</span>
      </button>
      <section id="stm-ann-panel" aria-hidden="true">
        <header class="stm-ann-panel-head">
          <div class="stm-ann-heading"><span class="stm-ann-heading-icon">${bellSvg()}</span><div><strong>Mededelingen</strong><span>Somtoday Mod</span></div></div>
          <button id="stm-ann-mark-all" type="button">Alles gelezen</button>
        </header>
        <div id="stm-ann-list"><div class="stm-ann-state">Berichten laden…</div></div>
        <footer class="stm-ann-panel-foot"><span id="stm-ann-status">Verbinden…</span><button id="stm-ann-refresh" type="button" aria-label="Vernieuwen" title="Vernieuwen">↻</button></footer>
      </section>
      <div id="stm-ann-overlay" aria-hidden="true">
        <article id="stm-ann-modal" role="dialog" aria-modal="true" aria-labelledby="stm-ann-modal-title">
          <div class="stm-ann-modal-accent"></div>
          <button id="stm-ann-close" type="button" aria-label="Sluiten">×</button>
          <div class="stm-ann-modal-top"><span id="stm-ann-modal-label"></span><span id="stm-ann-modal-date"></span></div>
          <h1 id="stm-ann-modal-title"></h1><div class="stm-ann-modal-divider"></div><div id="stm-ann-modal-body"></div>
        </article>
      </div>`;

    document.body.appendChild(root);
    applyLayout();

    $("#stm-ann-bell").addEventListener("click", event => { event.stopPropagation(); panelOpen ? closePanel() : openPanel(); });
    $("#stm-ann-panel").addEventListener("click", event => event.stopPropagation());
    $("#stm-ann-mark-all").addEventListener("click", markAllRead);
    $("#stm-ann-refresh").addEventListener("click", () => fetchAnnouncements(true));
    $("#stm-ann-close").addEventListener("click", closeModal);
    $("#stm-ann-overlay").addEventListener("click", event => { if (event.target.id === "stm-ann-overlay") closeModal(); });
    document.addEventListener("click", () => { if (panelOpen) closePanel(); });
    document.addEventListener("keydown", event => {
      if (event.key === "Escape") {
        if (activeAnnouncement) closeModal();
        else if (panelOpen) closePanel();
      }
    });
  }

  function openPanel() {
    panelOpen = true;
    positionUi();
    $("#stm-ann-panel")?.classList.add("open");
    $("#stm-ann-panel")?.setAttribute("aria-hidden", "false");
    $("#stm-ann-bell")?.setAttribute("aria-expanded", "true");
  }

  function closePanel() {
    panelOpen = false;
    $("#stm-ann-panel")?.classList.remove("open");
    $("#stm-ann-panel")?.setAttribute("aria-hidden", "true");
    $("#stm-ann-bell")?.setAttribute("aria-expanded", "false");
  }

  function updateBadge() {
    const count = getUnreadCount();
    const badge = $("#stm-ann-count");
    const bell = $("#stm-ann-bell");
    if (!badge || !bell) return;
    badge.textContent = count > 99 ? "99+" : String(count);
    badge.hidden = count === 0;
    bell.classList.toggle("has-unread", count > 0);
    bell.classList.toggle("all-read", count === 0);
  }

  function renderList() {
    const list = $("#stm-ann-list");
    if (!list) return;

    if (!announcements.length) {
      list.innerHTML = `<div class="stm-ann-state"><b>Geen mededelingen</b><span>Nieuwe berichten verschijnen hier automatisch.</span></div>`;
      updateBadge();
      return;
    }

    list.replaceChildren();
    for (const item of announcements) {
      const unread = !readIds.has(String(item.id));
      const row = document.createElement("button");
      row.type = "button";
      row.className = `stm-ann-item${unread ? " unread" : ""}${item.pinned ? " pinned" : ""}${item.important ? " important" : ""}`;

      const label = item.announcement_labels || {};
      const color = /^#[0-9a-f]{6}$/i.test(label.color || "") ? label.color : "#0067c2";
      const holder = document.createElement("div");
      holder.innerHTML = sanitizeHtml(item.content || "");
      const excerpt = (holder.textContent || "").replace(/\s+/g, " ").trim().slice(0, 110);

      row.innerHTML = `<span class="stm-ann-unread-dot"></span><span class="stm-ann-item-main"><span class="stm-ann-item-meta"><span class="stm-ann-label" style="--stm-ann-label:${color}"></span><span>${formatDate(item.publish_at || item.created_at)}</span></span><strong></strong><span class="stm-ann-excerpt"></span></span><span class="stm-ann-chevron">›</span>`;
      $(".stm-ann-label", row).textContent = safeText(label.name || "Nieuws");
      $("strong", row).textContent = safeText(item.title);
      $(".stm-ann-excerpt", row).textContent = excerpt || "Klik om dit bericht te openen.";
      row.addEventListener("click", () => openAnnouncement(item.id));
      list.appendChild(row);
    }
    updateBadge();
  }

  async function openAnnouncement(id) {
    const item = announcements.find(entry => String(entry.id) === String(id));
    if (!item) return;

    activeAnnouncement = item;
    readIds.add(String(item.id));
    await saveReadIds();
    renderList();

    const label = item.announcement_labels || {};
    const color = /^#[0-9a-f]{6}$/i.test(label.color || "") ? label.color : "#0067c2";
    const labelEl = $("#stm-ann-modal-label");
    labelEl.textContent = safeText(label.name || "Nieuws");
    labelEl.style.setProperty("--stm-ann-label", color);
    $("#stm-ann-modal").style.setProperty("--stm-ann-active", color);
    $("#stm-ann-modal-date").textContent = formatDate(item.publish_at || item.created_at);
    $("#stm-ann-modal-title").textContent = safeText(item.title);
    $("#stm-ann-modal-body").innerHTML = sanitizeHtml(item.content || "<p>Dit bericht heeft geen inhoud.</p>");

    closePanel();
    const overlay = $("#stm-ann-overlay");
    overlay.classList.add("open");
    overlay.setAttribute("aria-hidden", "false");
    document.documentElement.classList.add("stm-ann-modal-open");
    $("#stm-ann-close").focus();
  }

  function closeModal() {
    activeAnnouncement = null;
    $("#stm-ann-overlay")?.classList.remove("open");
    $("#stm-ann-overlay")?.setAttribute("aria-hidden", "true");
    document.documentElement.classList.remove("stm-ann-modal-open");
  }

  async function markAllRead() {
    for (const item of announcements) readIds.add(String(item.id));
    await saveReadIds();
    renderList();
  }

  function setStatus(text, error = false) {
    const status = $("#stm-ann-status");
    if (!status) return;
    status.textContent = text;
    status.classList.toggle("error", error);
  }

  async function fetchAnnouncements(manual = false) {
    ensureUi();
    if (manual) setStatus("Vernieuwen…");
    const endpoint = `${SUPABASE_URL}/rest/v1/announcements?select=id,title,content,label_id,status,pinned,important,notify,publish_at,created_at,updated_at,announcement_labels(name,color)&order=pinned.desc,created_at.desc`;

    try {
      const response = await fetch(endpoint, { headers: { apikey: SUPABASE_KEY, Accept: "application/json" }, cache: "no-store" });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const rows = await response.json();
      announcements = Array.isArray(rows) ? rows : [];
      renderList();
      setStatus(`Bijgewerkt ${new Intl.DateTimeFormat("nl-NL", { hour: "2-digit", minute: "2-digit" }).format(new Date())}`);
    } catch (error) {
      console.warn("[Somtoday Mod] Announcement Center:", error);
      if (!announcements.length) {
        const list = $("#stm-ann-list");
        if (list) list.innerHTML = `<div class="stm-ann-state error"><b>Nieuws kon niet laden</b><span>Probeer het zo opnieuw.</span></div>`;
      }
      setStatus("Kon niet verbinden", true);
    }
  }

  async function init() {
    ensureUi();
    await loadReadIds();
    await fetchAnnouncements();
    setInterval(fetchAnnouncements, POLL_MS);
    window.addEventListener("focus", () => fetchAnnouncements());
    window.addEventListener("resize", applyLayout);
    window.addEventListener("scroll", () => positionUi(), { passive: true });
    window.addEventListener("hashchange", () => setTimeout(applyLayout, 50));
    window.addEventListener("popstate", () => setTimeout(applyLayout, 50));

    let queued = false;
    new MutationObserver(() => {
      if (queued) return;
      queued = true;
      requestAnimationFrame(() => { queued = false; applyLayout(); });
    }).observe(document.documentElement, { childList: true, subtree: true, attributes: true, attributeFilter: ["class", "style"] });

    setInterval(applyLayout, 800);
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init, { once: true });
  else init();
})();