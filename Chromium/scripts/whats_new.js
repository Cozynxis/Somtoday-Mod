(() => {
'use strict';

const PENDING_KEY = 'somtoday_mod_whats_new_pending_v1';
const ROOT_ID = 'stm-whats-new';
const VERSION = chrome.runtime.getManifest().version;

const CHANGES = [
  ['Apps', 'Een vernieuwde Apps-pagina met zoeken, vastpinnen en snelle links.'],
  ['Appbibliotheek', 'Meer dan 100 handige school-, leer- en productiviteitsapps.'],
  ['Slimme app-iconen', 'Apps krijgen automatisch het herkenbare logo van de website.'],
  ['Sticky Notes', 'Maak handige notities op je Somtoday-startpagina.'],
  ['Personalisatie', 'Meer mogelijkheden om Somtoday-Mod naar jouw smaak in te richten.']
];

function esc(value = '') {
  const el = document.createElement('div');
  el.textContent = value;
  return el.innerHTML;
}

function addStyles() {
  if (document.getElementById('stm-whats-new-style')) return;
  const style = document.createElement('style');
  style.id = 'stm-whats-new-style';
  style.textContent = `
    #${ROOT_ID}{position:fixed;inset:0;z-index:2147483600;display:flex;align-items:center;justify-content:center;padding:24px;background:rgba(10,20,32,.42);backdrop-filter:blur(9px);opacity:0;transition:opacity .25s ease}
    #${ROOT_ID}.show{opacity:1}#${ROOT_ID}.closing{opacity:0}
    .stm-wn-card{width:min(620px,calc(100vw - 30px));max-height:calc(100vh - 32px);overflow:auto;border-radius:22px;background:var(--bg-neutral-none,#fff);color:var(--text-strong,#17212b);border:1px solid rgba(80,110,140,.18);box-shadow:0 30px 90px rgba(0,0,0,.25);transform:translateY(18px) scale(.97);opacity:.45;transition:.34s cubic-bezier(.2,.9,.25,1.15)}
    .show .stm-wn-card{transform:none;opacity:1}
    .stm-wn-hero{padding:30px;background:linear-gradient(135deg,var(--bg-primary-weak,#eaf4ff),var(--bg-neutral-none,#fff) 65%)}
    .stm-wn-brand{display:flex;align-items:center;gap:15px}.stm-wn-logo{width:60px;height:60px;border-radius:16px;box-shadow:0 8px 24px rgba(0,0,0,.14)}
    .stm-wn-kicker{font-size:11px;font-weight:800;letter-spacing:.08em;text-transform:uppercase;color:var(--action-primary-normal,#0067c2)}
    .stm-wn-title{margin:3px 0 0;font-size:28px;line-height:1.1}.stm-wn-sub{margin:18px 0 0;font-size:13px;line-height:1.5;color:var(--text-moderate,#65717d)}
    .stm-wn-body{padding:22px 30px 28px}.stm-wn-body h3{margin:0 0 14px;font-size:15px}.stm-wn-list{display:grid;gap:9px}
    .stm-wn-item{display:grid;grid-template-columns:34px 1fr;gap:11px;padding:12px;border:1px solid rgba(100,120,140,.15);border-radius:13px;background:var(--bg-elevated-weakest,#fafbfd);opacity:0;transform:translateY(8px);animation:stmWnIn .38s ease forwards}
    .stm-wn-item:nth-child(2){animation-delay:.05s}.stm-wn-item:nth-child(3){animation-delay:.1s}.stm-wn-item:nth-child(4){animation-delay:.15s}.stm-wn-item:nth-child(5){animation-delay:.2s}
    .stm-wn-check{display:flex;align-items:center;justify-content:center;width:34px;height:34px;border-radius:10px;background:var(--bg-primary-weak,#eaf4ff);color:var(--action-primary-normal,#0067c2);font-weight:900}.stm-wn-name{font-size:12px;font-weight:850}.stm-wn-desc{margin-top:3px;font-size:10.5px;line-height:1.45;color:var(--text-moderate,#65717d)}
    .stm-wn-actions{display:flex;justify-content:flex-end;margin-top:20px}.stm-wn-done{height:42px;padding:0 19px;border:0;border-radius:11px;background:var(--action-primary-normal,#0067c2);color:#fff;font:inherit;font-size:12px;font-weight:850;cursor:pointer;transition:.15s}.stm-wn-done:hover{transform:translateY(-1px)}
    @keyframes stmWnIn{to{opacity:1;transform:none}}@media(max-width:620px){#${ROOT_ID}{padding:8px}.stm-wn-card{width:100%;max-height:calc(100vh - 16px);border-radius:17px}.stm-wn-hero,.stm-wn-body{padding-left:19px;padding-right:19px}.stm-wn-title{font-size:23px}.stm-wn-logo{width:50px;height:50px}}
  `;
  document.head.appendChild(style);
}

function closePopup(root) {
  root.classList.add('closing');
  setTimeout(() => root.remove(), 220);
}

async function showWhatsNew() {
  if (document.getElementById(ROOT_ID) || !document.body) return;

  let data;
  try {
    data = await chrome.storage.local.get(PENDING_KEY);
  } catch {
    return;
  }

  const pending = data?.[PENDING_KEY];
  if (!pending || pending.version !== VERSION) return;

  // Meteen verwijderen: deze versie kan dus maar één keer verschijnen.
  try {
    await chrome.storage.local.remove(PENDING_KEY);
  } catch {
    return;
  }

  addStyles();
  const root = document.createElement('div');
  root.id = ROOT_ID;
  root.innerHTML = `
    <section class="stm-wn-card" role="dialog" aria-modal="true" aria-labelledby="stm-wn-title">
      <div class="stm-wn-hero">
        <div class="stm-wn-brand">
          <img class="stm-wn-logo" src="${chrome.runtime.getURL('icon128.png')}" alt="Somtoday-Mod">
          <div>
            <div class="stm-wn-kicker">${pending.reason === 'install' ? 'Welkom bij Somtoday-Mod' : 'Wat is er nieuw?'}</div>
            <h2 class="stm-wn-title" id="stm-wn-title">Somtoday-Mod V${esc(VERSION)}</h2>
          </div>
        </div>
        <p class="stm-wn-sub">${pending.reason === 'install' ? 'Somtoday-Mod is geïnstalleerd. Dit zijn een paar van de nieuwste mogelijkheden.' : 'Somtoday-Mod is bijgewerkt. Bekijk wat er nieuw is in deze versie.'}</p>
      </div>
      <div class="stm-wn-body">
        <h3>Nieuw in deze update</h3>
        <div class="stm-wn-list">
          ${CHANGES.map(([name, desc]) => `<div class="stm-wn-item"><div class="stm-wn-check">✓</div><div><div class="stm-wn-name">${esc(name)}</div><div class="stm-wn-desc">${esc(desc)}</div></div></div>`).join('')}
        </div>
        <div class="stm-wn-actions"><button class="stm-wn-done" type="button">Begrepen</button></div>
      </div>
    </section>`;

  document.body.appendChild(root);
  requestAnimationFrame(() => requestAnimationFrame(() => root.classList.add('show')));
  root.querySelector('.stm-wn-done').addEventListener('click', () => closePopup(root));

  const onKey = event => {
    if (event.key === 'Escape' && document.getElementById(ROOT_ID)) {
      closePopup(root);
      document.removeEventListener('keydown', onKey);
    }
  };
  document.addEventListener('keydown', onKey);
}

setTimeout(showWhatsNew, 450);
})();