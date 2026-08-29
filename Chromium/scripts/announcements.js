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

  function svgBell() {
    return `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9"/><path d="M10 21h4"/></svg>`;
  }

  function safeText(value = "") {
    return String(value ?? "");
  }

  function sanitizeHtml(html = "") {
    const template = document.createElement("template");
    template.innerHTML = String(html);
    const allowed = new Set(["P","BR","STRONG","B","EM","I","U","S","H2","H3","UL","OL","LI","BLOCKQUOTE","A","SPAN","DIV"]);
    const allowedStyle = new Set(["text-align","font-size"]);
    const all = [...template.content.querySelectorAll("*")];

    for (const el of all) {
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
          } catch {
            el.removeAttribute(attr.name);
          }
          continue;
        }
        if (name === "style") {
          const clean = [];
          for (const rule of attr.value.split(";")) {
            const [prop, ...rest] = rule.split(":");
            if (!prop || !rest.length) continue;
            const key = prop.trim().toLowerCase();
            const value = rest.join(":").trim();
            if (!allowedStyle.has(key)) continue;
            if (key === "text-align" && /^(left|right|center|justify)$/.test(value)) clean.push(`${key}:${value}`);
            if (key === "font-size" && /^([1-9]\d?|100)(px|%|em|rem)$/.test(value)) clean.push(`${key}:${value}`);
          }
          if (clean.length) el.setAttribute("style", clean.join(";"));
          else el.removeAttribute("style");
          continue;
        }
        if (!(el.tagName === "A" && ["target","rel"].includes(name))) el.removeAttribute(attr.name);
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

  async function storageGet(key) {
    return new Promise(resolve => chrome.storage.local.get([key], result => resolve(result[key])));
  }

  async function storageSet(obj) {
    return new Promise(resolve => chrome.storage.local.set(obj, resolve));
  }

  async function loadReadIds() {
    const stored = await storageGet(READ_KEY);
    readIds = new Set(Array.isArray(stored) ? stored.map(String) : []);
  }

  async function saveReadIds() {
    const ids = [...readIds].slice(-500);
    await storageSet({ [READ_KEY]: ids });
  }

  function getUnreadCount() {
    return announcements.filter(item => !readIds.has(String(item.id))).length;
  }

  function ensureUi() {
    if ($("#stm-ann-root")) return;

    const root = document.createElement("div");
    root.id = "stm-ann-root";
    root.innerHTML = `
      <button id="stm-ann-bell" type="button" aria-label="Somtoday Mod nieuws" aria-expanded="false">
        ${svgBell()}
        <span id="stm-ann-count" hidden>0</span>
      </button>

      <section id="stm-ann-panel" aria-hidden="true">
        <header class="stm-ann-panel-head">
          <div>
            <strong>Nieuws</strong>
            <span>Somtoday Mod</span>
          </div>
          <button id="stm-ann-mark-all" type="button">Alles gelezen</button>
        </header>
        <div id="stm-ann-list">
          <div class="stm-ann-state">Berichten laden…</div>
        </div>
        <footer class="stm-ann-panel-foot">
          <span id="stm-ann-status">Verbinden…</span>
          <button id="stm-ann-refresh" type="button" aria-label="Vernieuwen" title="Vernieuwen">↻</button>
        </footer>
      </section>

      <div id="stm-ann-overlay" aria-hidden="true">
        <article id="stm-ann-modal" role="dialog" aria-modal="true" aria-labelledby="stm-ann-modal-title">
          <button id="stm-ann-close" type="button" aria-label="Sluiten">×</button>
          <div class="stm-ann-modal-top">
            <span id="stm-ann-modal-label"></span>
            <span id="stm-ann-modal-date"></span>
          </div>
          <h1 id="stm-ann-modal-title"></h1>
          <div id="stm-ann-modal-body"></div>
        </article>
      </div>
    `;
    document.documentElement.appendChild(root);

    $("#stm-ann-bell").addEventListener("click", event => {
      event.stopPropagation();
      togglePanel();
    });
    $("#stm-ann-panel").addEventListener("click", event => event.stopPropagation());
    $("#stm-ann-mark-all").addEventListener("click", markAllRead);
    $("#stm-ann-refresh").addEventListener("click", () => fetchAnnouncements(true));
    $("#stm-ann-close").addEventListener("click", closeModal);
    $("#stm-ann-overlay").addEventListener("click", event => {
      if (event.target.id === "stm-ann-overlay") closeModal();
    });

    document.addEventListener("click", () => {
      if (panelOpen) closePanel();
    });
    document.addEventListener("keydown", event => {
      if (event.key === "Escape") {
        if (activeAnnouncement) closeModal();
        else if (panelOpen) closePanel();
      }
    });
  }

  function togglePanel() {
    panelOpen ? closePanel() : openPanel();
  }

  function openPanel() {
    panelOpen = true;
    const panel = $("#stm-ann-panel");
    const bell = $("#stm-ann-bell");
    panel.classList.add("open");
    panel.setAttribute("aria-hidden", "false");
    bell.setAttribute("aria-expanded", "true");
  }

  function closePanel() {
    panelOpen = false;
    const panel = $("#stm-ann-panel");
    const bell = $("#stm-ann-bell");
    panel?.classList.remove("open");
    panel?.setAttribute("aria-hidden", "true");
    bell?.setAttribute("aria-expanded", "false");
  }

  function updateBadge() {
    const count = getUnreadCount();
    const badge = $("#stm-ann-count");
    if (!badge) return;
    badge.textContent = count > 99 ? "99+" : String(count);
    badge.hidden = count === 0;
    $("#stm-ann-bell")?.classList.toggle("has-unread", count > 0);
  }

  function renderList() {
    const list = $("#stm-ann-list");
    if (!list) return;

    if (!announcements.length) {
      list.innerHTML = `<div class="stm-ann-state"><b>Nog geen nieuws</b><span>Nieuwe berichten verschijnen hier automatisch.</span></div>`;
      updateBadge();
      return;
    }

    list.replaceChildren();
    for (const item of announcements) {
      const unread = !readIds.has(String(item.id));
      const row = document.createElement("button");
      row.type = "button";
      row.className = `stm-ann-item${unread ? " unread" : ""}${item.pinned ? " pinned" : ""}${item.important ? " important" : ""}`;
      row.dataset.id = item.id;

      const label = item.announcement_labels || {};
      const color = /^#[0-9a-f]{6}$/i.test(label.color || "") ? label.color : "#6658e8";
      const excerptHolder = document.createElement("div");
      excerptHolder.innerHTML = sanitizeHtml(item.content || "");
      const excerpt = (excerptHolder.textContent || "").replace(/\s+/g, " ").trim().slice(0, 110);

      row.innerHTML = `
        <span class="stm-ann-unread-dot" aria-hidden="true"></span>
        <span class="stm-ann-item-main">
          <span class="stm-ann-item-meta">
            <span class="stm-ann-label" style="--stm-ann-label:${color}"></span>
            <span>${formatDate(item.publish_at || item.created_at)}</span>
          </span>
          <strong></strong>
          <span class="stm-ann-excerpt"></span>
        </span>
        <span class="stm-ann-chevron">›</span>
      `;
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
    const color = /^#[0-9a-f]{6}$/i.test(label.color || "") ? label.color : "#6658e8";
    const labelEl = $("#stm-ann-modal-label");
    labelEl.textContent = safeText(label.name || "Nieuws");
    labelEl.style.setProperty("--stm-ann-label", color);
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
    const overlay = $("#stm-ann-overlay");
    overlay?.classList.remove("open");
    overlay?.setAttribute("aria-hidden", "true");
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
      const response = await fetch(endpoint, {
        headers: {
          apikey: SUPABASE_KEY,
          Accept: "application/json"
        },
        cache: "no-store"
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const rows = await response.json();
      announcements = Array.isArray(rows) ? rows : [];
      renderList();
      setStatus(`Bijgewerkt ${new Intl.DateTimeFormat("nl-NL",{hour:"2-digit",minute:"2-digit"}).format(new Date())}`);
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
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init, { once: true });
  else init();
})();