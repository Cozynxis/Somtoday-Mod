(() => {
'use strict';

const PENDING_KEY = 'somtoday_mod_whats_new_pending_v1';
const ROOT_ID = 'stm-whats-new';
const VERSION = chrome.runtime.getManifest().version;

// Zet hier je eigen directe PNG/JPG/WebP URL neer.
// Laat leeg ('') om automatisch het ingebouwde Chromium/icon128.png te gebruiken.
const MOD_ICON_URL = '';
const FALLBACK_ICON_URL = chrome.runtime.getURL('icon128.png');

const CHANGES = [
  ['Apps', 'Een nieuwe Apps-pagina met zoeken, vastpinnen en snelle links. Met apps kun je makkelijk op sites komen zonder steeds linkjes in te typen.'],
  ['Sticky Notes', 'Maak handige notities op je Somtoday-startpagina.'],
  ['Gradient achtergronden', 'Nieuwe gradient achtergronden zijn toegevoegd. Je kunt ze vinden bij achtergronden, en dan gradient in de mod settings.']
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
    #${ROOT_ID}{position:fixed;inset:0;z-index:2147483600;display:flex;align-items:center;justify-content:center;padding:24px;background:rgba(10,20,32,.18);backdrop-filter:blur(0);opacity:0;transition:opacity .35s ease,background .45s ease,backdrop-filter .45s ease;overflow:hidden}
    #${ROOT_ID}.show{opacity:1;background:rgba(10,20,32,.46);backdrop-filter:blur(10px)}#${ROOT_ID}.closing{opacity:0;backdrop-filter:blur(0)}
    #${ROOT_ID}:before,#${ROOT_ID}:after{content:'';position:absolute;border-radius:999px;pointer-events:none;filter:blur(3px);opacity:0;transform:scale(.55)}
    #${ROOT_ID}:before{width:430px;height:430px;left:-150px;top:-170px;background:radial-gradient(circle,rgba(25,135,235,.24),rgba(25,135,235,0) 68%)}
    #${ROOT_ID}:after{width:520px;height:520px;right:-190px;bottom:-240px;background:radial-gradient(circle,rgba(88,188,255,.18),rgba(88,188,255,0) 68%)}
    #${ROOT_ID}.show:before{animation:stmWnOrbA 7s ease-in-out infinite}#${ROOT_ID}.show:after{animation:stmWnOrbB 8s ease-in-out infinite .35s}
    .stm-wn-card{position:relative;width:min(620px,calc(100vw - 30px));max-height:calc(100vh - 32px);overflow:auto;border-radius:22px;background:var(--bg-neutral-none,#fff);color:var(--text-strong,#17212b);border:1px solid rgba(80,110,140,.18);box-shadow:0 30px 90px rgba(0,0,0,.25);transform:translateY(38px) scale(.91) rotateX(5deg);transform-origin:center 65%;opacity:0;transition:transform .58s cubic-bezier(.16,1,.3,1),opacity .38s ease,box-shadow .5s ease}
    .show .stm-wn-card{transform:translateY(0) scale(1) rotateX(0);opacity:1;box-shadow:0 34px 105px rgba(0,0,0,.29)}
    .closing .stm-wn-card{transform:translateY(20px) scale(.96);opacity:0;transition-duration:.2s}
    .stm-wn-hero{position:relative;overflow:hidden;padding:30px;background:linear-gradient(135deg,var(--bg-primary-weak,#eaf4ff),var(--bg-neutral-none,#fff) 65%)}
    .stm-wn-hero:before{content:'';position:absolute;width:230px;height:230px;right:-95px;top:-130px;border-radius:50%;background:linear-gradient(145deg,rgba(0,103,194,.13),rgba(80,190,255,.04));transform:scale(.4);opacity:0}.show .stm-wn-hero:before{animation:stmWnHeroBubble .9s cubic-bezier(.16,1,.3,1) .12s forwards}
    .stm-wn-brand{position:relative;z-index:1;display:flex;align-items:center;gap:15px}.stm-wn-logo-wrap{position:relative;flex:0 0 auto;opacity:0;transform:scale(.5) rotate(-12deg)}.show .stm-wn-logo-wrap{animation:stmWnLogoIn .72s cubic-bezier(.16,1.2,.3,1) .12s forwards}
    .stm-wn-logo-wrap:after{content:'';position:absolute;inset:-6px;border-radius:21px;border:2px solid rgba(0,103,194,.15);opacity:0}.show .stm-wn-logo-wrap:after{animation:stmWnRing 1.1s ease-out .55s}
    .stm-wn-logo{display:block;width:60px;height:60px;object-fit:cover;border-radius:16px;box-shadow:0 8px 24px rgba(0,0,0,.14)}
    .stm-wn-headtext{opacity:0;transform:translateX(-12px)}.show .stm-wn-headtext{animation:stmWnSlide .48s ease .22s forwards}.stm-wn-kicker{font-size:11px;font-weight:800;letter-spacing:.08em;text-transform:uppercase;color:var(--action-primary-normal,#0067c2)}
    .stm-wn-title{margin:3px 0 0;font-size:28px;line-height:1.1}.stm-wn-sub{position:relative;z-index:1;margin:18px 0 0;font-size:13px;line-height:1.5;color:var(--text-moderate,#65717d);opacity:0;transform:translateY(7px)}.show .stm-wn-sub{animation:stmWnSlide .42s ease .32s forwards}
    .stm-wn-body{padding:22px 30px 28px}.stm-wn-body h3{margin:0 0 14px;font-size:15px;opacity:0;transform:translateY(8px)}.show .stm-wn-body h3{animation:stmWnSlide .38s ease .4s forwards}.stm-wn-list{display:grid;gap:9px}
    .stm-wn-item{display:grid;grid-template-columns:34px 1fr;gap:11px;padding:12px;border:1px solid rgba(100,120,140,.15);border-radius:13px;background:var(--bg-elevated-weakest,#fafbfd);opacity:0;transform:translateY(18px) scale(.985)}
    .show .stm-wn-item{animation:stmWnItem .48s cubic-bezier(.16,1,.3,1) forwards}.show .stm-wn-item:nth-child(1){animation-delay:.46s}.show .stm-wn-item:nth-child(2){animation-delay:.54s}.show .stm-wn-item:nth-child(3){animation-delay:.62s}.show .stm-wn-item:nth-child(4){animation-delay:.70s}.show .stm-wn-item:nth-child(5){animation-delay:.78s}
    .stm-wn-item:hover{border-color:rgba(0,103,194,.25);transform:translateY(-1px);box-shadow:0 7px 20px rgba(25,65,100,.07);transition:.18s ease}
    .stm-wn-check{display:flex;align-items:center;justify-content:center;width:34px;height:34px;border-radius:10px;background:var(--bg-primary-weak,#eaf4ff);color:var(--action-primary-normal,#0067c2);font-weight:900}.show .stm-wn-check{animation:stmWnCheck .42s cubic-bezier(.16,1.4,.3,1) both}.show .stm-wn-item:nth-child(1) .stm-wn-check{animation-delay:.66s}.show .stm-wn-item:nth-child(2) .stm-wn-check{animation-delay:.74s}.show .stm-wn-item:nth-child(3) .stm-wn-check{animation-delay:.82s}
    .stm-wn-name{font-size:12px;font-weight:850}.stm-wn-desc{margin-top:3px;font-size:10.5px;line-height:1.45;color:var(--text-moderate,#65717d)}
    .stm-wn-actions{display:flex;justify-content:flex-end;margin-top:20px;opacity:0;transform:translateY(8px)}.show .stm-wn-actions{animation:stmWnSlide .38s ease .76s forwards}.stm-wn-done{height:42px;padding:0 19px;border:0;border-radius:11px;background:var(--action-primary-normal,#0067c2);color:#fff;font:inherit;font-size:12px;font-weight:850;cursor:pointer;box-shadow:0 7px 20px rgba(0,103,194,.17);transition:transform .16s ease,box-shadow .16s ease,filter .16s ease}.stm-wn-done:hover{transform:translateY(-2px) scale(1.015);box-shadow:0 10px 25px rgba(0,103,194,.24);filter:brightness(1.04)}.stm-wn-done:active{transform:translateY(0) scale(.98)}
    @keyframes stmWnItem{to{opacity:1;transform:none}}@keyframes stmWnSlide{to{opacity:1;transform:none}}@keyframes stmWnLogoIn{0%{opacity:0;transform:scale(.5) rotate(-12deg)}70%{opacity:1;transform:scale(1.07) rotate(2deg)}100%{opacity:1;transform:none}}@keyframes stmWnRing{0%{opacity:.7;transform:scale(.75)}100%{opacity:0;transform:scale(1.4)}}@keyframes stmWnCheck{0%{transform:scale(.4) rotate(-16deg)}100%{transform:none}}@keyframes stmWnHeroBubble{to{opacity:1;transform:scale(1)}}@keyframes stmWnOrbA{0%{opacity:0;transform:translate(0,0) scale(.65)}25%{opacity:1}50%{opacity:.75;transform:translate(45px,30px) scale(1.05)}100%{opacity:0;transform:translate(0,0) scale(.65)}}@keyframes stmWnOrbB{0%{opacity:0;transform:translate(0,0) scale(.7)}25%{opacity:.8}55%{opacity:.65;transform:translate(-35px,-28px) scale(1.04)}100%{opacity:0;transform:translate(0,0) scale(.7)}}
    @media(prefers-reduced-motion:reduce){#${ROOT_ID},.stm-wn-card,.stm-wn-logo-wrap,.stm-wn-headtext,.stm-wn-sub,.stm-wn-body h3,.stm-wn-item,.stm-wn-actions{animation:none!important;transition:none!important;transform:none!important;opacity:1!important}}
    @media(max-width:620px){#${ROOT_ID}{padding:8px}.stm-wn-card{width:100%;max-height:calc(100vh - 16px);border-radius:17px}.stm-wn-hero,.stm-wn-body{padding-left:19px;padding-right:19px}.stm-wn-title{font-size:23px}.stm-wn-logo{width:50px;height:50px}}
  `;
  document.head.appendChild(style);
}

function closePopup(root) {
  root.classList.add('closing');
  setTimeout(() => root.remove(), 230);
}

async function showWhatsNew() {
  if (document.getElementById(ROOT_ID) || !document.body) return;

  let data;
  try { data = await chrome.storage.local.get(PENDING_KEY); } catch { return; }

  const pending = data?.[PENDING_KEY];
  if (!pending || pending.version !== VERSION) return;

  // De marker wordt vóór het tonen verwijderd. Daardoor verschijnt deze
  // versie nooit opnieuw bij refresh, opnieuw inloggen of opnieuw openen.
  try { await chrome.storage.local.remove(PENDING_KEY); } catch { return; }

  addStyles();
  const iconUrl = MOD_ICON_URL.trim() || FALLBACK_ICON_URL;
  const root = document.createElement('div');
  root.id = ROOT_ID;
  root.innerHTML = `
    <section class="stm-wn-card" role="dialog" aria-modal="true" aria-labelledby="stm-wn-title">
      <div class="stm-wn-hero">
        <div class="stm-wn-brand">
          <div class="stm-wn-logo-wrap"><img class="stm-wn-logo" src="${esc(iconUrl)}" alt="Somtoday-Mod"></div>
          <div class="stm-wn-headtext">
            <div class="stm-wn-kicker">${pending.reason === 'install' ? 'Welkom bij Somtoday-Mod' : 'Wat is er nieuw?'}</div>
            <h2 class="stm-wn-title" id="stm-wn-title">Somtoday-Mod V${esc(VERSION)}</h2>
          </div>
        </div>
        <p class="stm-wn-sub">${pending.reason === 'install' ? 'Somtoday-Mod is geïnstalleerd. Dit zijn een paar van de nieuwste mogelijkheden.' : 'Somtoday-Mod is bijgewerkt. Bekijk wat er nieuw is in deze versie.'}</p>
      </div>
      <div class="stm-wn-body">
        <h3>Nieuw in deze update</h3>
        <div class="stm-wn-list">${CHANGES.map(([name, desc]) => `<div class="stm-wn-item"><div class="stm-wn-check">✓</div><div><div class="stm-wn-name">${esc(name)}</div><div class="stm-wn-desc">${esc(desc)}</div></div></div>`).join('')}</div>
        <div class="stm-wn-actions"><button class="stm-wn-done" type="button">Begrepen</button></div>
      </div>
    </section>`;

  const logo = root.querySelector('.stm-wn-logo');
  if (MOD_ICON_URL.trim()) logo.addEventListener('error', () => { if (logo.src !== FALLBACK_ICON_URL) logo.src = FALLBACK_ICON_URL; }, { once: true });

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
