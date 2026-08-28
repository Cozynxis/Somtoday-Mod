(() => {
    'use strict';

    // ==============================
    // UPDATE LOG CONFIGURATION
    // Edit this object for every release.
    // ==============================
    const UPDATE_LOG = {
        enabled: true,
        version: '5.6',
        badge: 'Nieuwe update',
        title: 'Somtoday Mod is bijgewerkt',
        subtitle: 'Dit is er nieuw in versie 5.6',
        items: [
            { icon: 'sparkles', title: 'Nieuwe mod developer', description: 'Levi Wassink is toegevoegd als nieuwe Somtoday Mod developer.' },
            { icon: 'palette', title: 'Gradient achtergronden', description: 'Maak nu een volledig eigen achtergrond met twee kleuren, richting en transparantie.' },
            { icon: 'wand-magic-sparkles', title: 'Verbeteringen en fixes', description: 'Diverse kleine UI-verbeteringen en fixes voor een soepelere Somtoday Mod ervaring.' }
        ]
    };

    const STORAGE = {
        pending: 'somtoday_mod_update_log_pending',
        pendingVersion: 'somtoday_mod_update_log_pending_version',
        disabled: 'somtoday_mod_update_log_disabled',
        lastShown: 'somtoday_mod_update_log_last_shown'
    };
    const ROOT_ID = 'stm-update-log-root';
    const api = () => globalThis.browser?.storage?.local || globalThis.chrome?.storage?.local;
    async function getStorage(keys){try{return await api()?.get(keys)||{}}catch{return{}}}
    async function setStorage(values){try{await api()?.set(values)}catch(error){console.warn('[Somtoday Mod] Update log opslag mislukt.',error)}}
    function iconMarkup(name){try{if(typeof window.getIcon==='function')return window.getIcon(name,null,'currentColor')}catch{}return '<span class="stm-update-log-fallback-icon">•</span>'}
    async function closePopup(disableForever=false){const root=document.getElementById(ROOT_ID);if(root){root.classList.add('stm-update-log-closing');setTimeout(()=>root.remove(),180)}await setStorage({[STORAGE.pending]:false,[STORAGE.pendingVersion]:'',[STORAGE.lastShown]:UPDATE_LOG.version,...(disableForever?{[STORAGE.disabled]:true}:{})})}
    function createPopup(){if(document.getElementById(ROOT_ID))return;const root=document.createElement('div');root.id=ROOT_ID;root.className='stm-update-log-backdrop';root.innerHTML=`<section class="stm-update-log-modal" role="dialog" aria-modal="true" aria-labelledby="stm-update-log-title"><div class="stm-update-log-accent"></div><header class="stm-update-log-header"><div class="stm-update-log-brand"><div class="stm-update-log-logo">${iconMarkup('sparkles')}</div><div><span class="stm-update-log-badge">${UPDATE_LOG.badge}</span><h2 id="stm-update-log-title">${UPDATE_LOG.title}</h2><p>${UPDATE_LOG.subtitle}</p></div></div><span class="stm-update-log-version">v${UPDATE_LOG.version}</span></header><div class="stm-update-log-list">${UPDATE_LOG.items.map(item=>`<article class="stm-update-log-item"><div class="stm-update-log-item-icon">${iconMarkup(item.icon)}</div><div><h3>${item.title}</h3><p>${item.description}</p></div></article>`).join('')}</div><footer class="stm-update-log-actions"><button type="button" class="stm-update-log-secondary" data-action="never">Sluiten en nooit meer weergeven</button><button type="button" class="stm-update-log-primary" data-action="close">Sluiten</button></footer></section>`;document.body.appendChild(root);requestAnimationFrame(()=>root.classList.add('stm-update-log-visible'));root.querySelector('[data-action="close"]').addEventListener('click',()=>closePopup(false));root.querySelector('[data-action="never"]').addEventListener('click',()=>closePopup(true))}
    async function checkForUpdateLog(){if(!UPDATE_LOG.enabled||!document.body)return;const data=await getStorage([STORAGE.pending,STORAGE.pendingVersion,STORAGE.disabled,STORAGE.lastShown]);if(data[STORAGE.disabled]===true||data[STORAGE.pending]!==true)return;const pendingVersion=String(data[STORAGE.pendingVersion]||'');if(pendingVersion&&pendingVersion!==UPDATE_LOG.version)return;if(data[STORAGE.lastShown]===UPDATE_LOG.version){await setStorage({[STORAGE.pending]:false,[STORAGE.pendingVersion]:''});return}createPopup()}
    if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(checkForUpdateLog,350),{once:true});else setTimeout(checkForUpdateLog,350);
})();