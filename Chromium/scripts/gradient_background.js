(() => {
    'use strict';

    const STORAGE_KEY = 'somtoday_mod_gradient_background_v1';
    const TAB_ID = 'type-gradient';
    const PANEL_ID = 'mod-bg-gradient';
    const RUNTIME_STYLE_ID = 'stm-gradient-runtime-style';
    const defaults = { enabled:false, type:'linear', color1:'#6d28d9', color2:'#ec4899', angle:135, panelTransparency:35 };

    let saved={...defaults}, draft={...defaults}, gradientSelected=false;
    const storageApi=()=>globalThis.browser?.storage?.local||globalThis.chrome?.storage?.local;
    async function storageGet(){try{const r=await storageApi()?.get(STORAGE_KEY);return r?.[STORAGE_KEY]||null}catch{return null}}
    async function storageSet(v){try{await storageApi()?.set({[STORAGE_KEY]:v})}catch(e){console.warn('[Somtoday Mod] Gradient achtergrond opslaan mislukt.',e)}}
    const clamp=(v,min,max)=>Math.max(min,Math.min(max,Number(v)||0));

    function normalizeHex(v){let h=String(v||'').trim().replace('#','');if(/^[0-9a-f]{3}$/i.test(h))h=h.split('').map(c=>c+c).join('');return /^[0-9a-f]{6}$/i.test(h)?`#${h.toLowerCase()}`:'#000000'}
    function hexToRgb(h){h=normalizeHex(h).slice(1);return[parseInt(h.slice(0,2),16),parseInt(h.slice(2,4),16),parseInt(h.slice(4,6),16)]}
    function rgbToHex(r,g,b){return'#'+[r,g,b].map(v=>clamp(Math.round(v),0,255).toString(16).padStart(2,'0')).join('')}
    function rgbToHsv(r,g,b){r/=255;g/=255;b/=255;const max=Math.max(r,g,b),min=Math.min(r,g,b),d=max-min;let h=0;if(d){if(max===r)h=60*(((g-b)/d)%6);else if(max===g)h=60*((b-r)/d+2);else h=60*((r-g)/d+4)}if(h<0)h+=360;return[h,max?d/max:0,max]}
    function hsvToHex(h,s,v){const c=v*s,x=c*(1-Math.abs((h/60)%2-1)),m=v-c;let r=0,g=0,b=0;if(h<60){r=c;g=x}else if(h<120){r=x;g=c}else if(h<180){g=c;b=x}else if(h<240){g=x;b=c}else if(h<300){r=x;b=c}else{r=c;b=x}return rgbToHex((r+m)*255,(g+m)*255,(b+m)*255)}
    function gradientString(c){const a=normalizeHex(c.color1),b=normalizeHex(c.color2);return c.type==='radial'?`radial-gradient(circle at center, ${a} 0%, ${b} 100%)`:`linear-gradient(${clamp(c.angle,0,360)}deg, ${a} 0%, ${b} 100%)`}

    function applyGradient(c=saved){
        document.getElementById(RUNTIME_STYLE_ID)?.remove();
        document.documentElement.classList.toggle('stm-gradient-background-active',!!c.enabled);
        if(!c.enabled)return;
        const opaque=100-clamp(c.panelTransparency,0,100),s=document.createElement('style');
        s.id=RUNTIME_STYLE_ID;
        s.textContent=`html.stm-gradient-background-active{background:${gradientString(c)}!important;background-attachment:fixed!important;background-position:center!important;background-repeat:no-repeat!important;background-size:cover!important;min-height:100%!important}html.stm-gradient-background-active body{background:transparent!important}html.stm-gradient-background-active #mod-background,html.stm-gradient-background-active #mod-backgroundcolor,html.stm-gradient-background-active #mod-backgroundslide,html.stm-gradient-background-active #mod-background-live{display:none!important}html.stm-gradient-background-active sl-rooster-week,html.stm-gradient-background-active sl-studiewijzer-week,html.stm-gradient-background-active sl-studiewijzer-dag,html.stm-gradient-background-active sl-studiewijzer-lijst-dag,html.stm-gradient-background-active sl-home,html.stm-gradient-background-active sl-cijfers .tabs,html.stm-gradient-background-active sl-cijfers .container,html.stm-gradient-background-active sl-berichten .main,html.stm-gradient-background-active sl-berichten .berichten-lijst,html.stm-gradient-background-active sl-registratie-overzicht,html.stm-gradient-background-active .content{background-color:color-mix(in srgb,var(--bg-neutral-none) ${opaque}%,transparent)!important}`;
        document.head.appendChild(s);
    }

    function selectGradientTab(){const bar=document.getElementById('mod-background-type'),panel=document.getElementById(PANEL_ID),tab=document.getElementById(TAB_ID);if(!bar||!panel||!tab)return;bar.querySelectorAll('a').forEach(x=>x.classList.remove('active'));tab.classList.add('active');document.getElementById('category-background')?.querySelectorAll('.mod-background-type-content').forEach(p=>{if(p.id!==PANEL_ID)p.style.display='none'});panel.style.display='block';gradientSelected=true}
    function selectBuiltInTab(tab){if(!tab||tab.id===TAB_ID)return;gradientSelected=false;document.getElementById(PANEL_ID)?.style.setProperty('display','none')}

    function updatePreview(){const p=document.getElementById('stm-gradient-preview');if(p)p.style.background=gradientString(draft);const a=document.getElementById('stm-gradient-angle-wrap');if(a)a.style.display=draft.type==='linear'?'grid':'none';const av=document.getElementById('stm-gradient-angle-value');if(av)av.textContent=`${draft.angle}°`;const tv=document.getElementById('stm-gradient-transparency-value');if(tv)tv.textContent=`${draft.panelTransparency}%`;const label=document.getElementById('stm-gradient-type-label');if(label)label.textContent=draft.type==='radial'?'Radiaal':'Lineair'}

    function setDraftColor(card,hex){const n=normalizeHex(hex),index=Number(card.dataset.colorIndex),[r,g,b]=hexToRgb(n),[h,s,v]=rgbToHsv(r,g,b);card.dataset.h=String(h);card.dataset.s=String(s);card.dataset.v=String(v);card.querySelector('.stm-gradient-color-dot').style.background=n;card.querySelector('.stm-gradient-color-swatch-preview').style.background=n;card.querySelector('.stm-gradient-sv').style.setProperty('--stm-picker-hue',`hsl(${h} 100% 50%)`);card.querySelector('.stm-gradient-sv-cursor').style.left=`${s*100}%`;card.querySelector('.stm-gradient-sv-cursor').style.top=`${(1-v)*100}%`;card.querySelector('.stm-gradient-hue').value=h;if(index===1)draft.color1=n;else draft.color2=n;updatePreview()}

    function updateFromPicker(card,s=null,v=null,h=null){let hue=h??Number(card.dataset.h||0),sat=s??Number(card.dataset.s||0),val=v??Number(card.dataset.v||1);hue=(hue+360)%360;sat=clamp(sat,0,1);val=clamp(val,0,1);card.dataset.h=hue;card.dataset.s=sat;card.dataset.v=val;const hex=hsvToHex(hue,sat,val);const index=Number(card.dataset.colorIndex);card.querySelector('.stm-gradient-color-dot').style.background=hex;card.querySelector('.stm-gradient-color-swatch-preview').style.background=hex;card.querySelector('.stm-gradient-sv').style.setProperty('--stm-picker-hue',`hsl(${hue} 100% 50%)`);card.querySelector('.stm-gradient-sv-cursor').style.left=`${sat*100}%`;card.querySelector('.stm-gradient-sv-cursor').style.top=`${(1-val)*100}%`;if(index===1)draft.color1=hex;else draft.color2=hex;updatePreview()}

    function colorEditorMarkup(i,label,color){return `<div class="stm-gradient-color-card" data-color-index="${i}"><div class="stm-gradient-color-heading"><div><h3>${label}</h3><p>Klik op het kleurvak en sleep om een kleur te kiezen.</p></div><span class="stm-gradient-color-dot" style="background:${color}"></span></div><button type="button" class="stm-gradient-color-swatch"><span class="stm-gradient-color-swatch-preview" style="background:${color}"></span><span>Kleur kiezen</span><span class="stm-gradient-chevron">⌄</span></button><div class="stm-gradient-picker" hidden><div class="stm-gradient-sv"><span class="stm-gradient-sv-cursor"></span></div><input class="stm-gradient-hue" type="range" min="0" max="359" step="1" aria-label="Kleurtint"></div></div>`}

    function bindColorCard(card){
        const swatch=card.querySelector('.stm-gradient-color-swatch'),picker=card.querySelector('.stm-gradient-picker'),sv=card.querySelector('.stm-gradient-sv'),hue=card.querySelector('.stm-gradient-hue');
        const closeOthers=()=>document.querySelectorAll('.stm-gradient-picker').forEach(p=>{if(p!==picker)p.hidden=true});
        swatch.addEventListener('click',e=>{e.preventDefault();e.stopPropagation();closeOthers();picker.hidden=!picker.hidden});
        picker.addEventListener('click',e=>e.stopPropagation());
        picker.addEventListener('pointerdown',e=>e.stopPropagation());
        const setSV=e=>{const r=sv.getBoundingClientRect();updateFromPicker(card,clamp((e.clientX-r.left)/r.width,0,1),1-clamp((e.clientY-r.top)/r.height,0,1));};
        sv.addEventListener('pointerdown',e=>{e.preventDefault();sv.setPointerCapture?.(e.pointerId);setSV(e)});
        sv.addEventListener('pointermove',e=>{if(e.buttons) setSV(e)});
        hue.addEventListener('input',()=>updateFromPicker(card,null,null,Number(hue.value)));
        setDraftColor(card,Number(card.dataset.colorIndex)===1?draft.color1:draft.color2);
    }

    function bindTypePicker(panel){const button=panel.querySelector('#stm-gradient-type-button'),menu=panel.querySelector('#stm-gradient-type-menu');button.addEventListener('click',e=>{e.preventDefault();e.stopPropagation();menu.hidden=!menu.hidden;button.setAttribute('aria-expanded',String(!menu.hidden))});menu.addEventListener('click',e=>e.stopPropagation());menu.querySelectorAll('button[data-type]').forEach(option=>option.addEventListener('click',e=>{e.preventDefault();draft.type=option.dataset.type==='radial'?'radial':'linear';menu.hidden=true;button.setAttribute('aria-expanded','false');updatePreview()}))}

    function injectSettings(){
        const bar=document.getElementById('mod-background-type'),category=document.getElementById('category-background');if(!bar||!category)return;
        if(!document.getElementById(TAB_ID)){const t=document.createElement('a');t.id=TAB_ID;t.tabIndex=0;t.textContent='Gradient';bar.appendChild(t);t.addEventListener('click',selectGradientTab);t.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();selectGradientTab()}})}
        if(!document.getElementById(PANEL_ID)){
            const panel=document.createElement('div');panel.id=PANEL_ID;panel.className='mod-background-type-content stm-gradient-settings';panel.style.display='none';panel.innerHTML=`<div class="stm-gradient-intro"><div><h3>Gradient achtergrond</h3><p>Maak een volledig eigen achtergrond met twee kleuren. De gradient wordt over Somtoday gebruikt, dus ook achter rooster, studiewijzer, huiswerk, cijfers en berichten.</p></div><button type="button" class="mod-button" id="stm-gradient-swap">Kleuren omwisselen</button></div><div id="stm-gradient-preview" class="mod-background-preview stm-gradient-preview"></div><div class="stm-gradient-options-grid"><div class="stm-gradient-option stm-gradient-type-option"><span>Gradienttype</span><button type="button" id="stm-gradient-type-button" class="stm-gradient-type-button" aria-haspopup="listbox" aria-expanded="false"><span id="stm-gradient-type-label">Lineair</span><span>⌄</span></button><div id="stm-gradient-type-menu" class="stm-gradient-type-menu" hidden><button type="button" data-type="linear">Lineair</button><button type="button" data-type="radial">Radiaal</button></div></div><label class="stm-gradient-option" id="stm-gradient-angle-wrap"><span>Richting <b id="stm-gradient-angle-value">${draft.angle}°</b></span><input id="stm-gradient-angle" type="range" min="0" max="360" step="1" value="${draft.angle}"></label><label class="stm-gradient-option"><span>Achtergrond transparantie <b id="stm-gradient-transparency-value">${draft.panelTransparency}%</b></span><input id="stm-gradient-transparency" type="range" min="0" max="100" step="1" value="${draft.panelTransparency}"></label></div><div class="stm-gradient-colors">${colorEditorMarkup(1,'Kleur 1',draft.color1)}${colorEditorMarkup(2,'Kleur 2',draft.color2)}</div><p class="stm-gradient-save-note">Klik bovenaan op <b>Instellingen opslaan</b> om deze gradient definitief toe te passen.</p>`;
            document.getElementById('mod-bg-live')?.insertAdjacentElement('afterend',panel)||category.appendChild(panel);
            bindTypePicker(panel);panel.querySelectorAll('.stm-gradient-color-card').forEach(bindColorCard);
            panel.querySelector('#stm-gradient-angle').addEventListener('input',e=>{draft.angle=clamp(e.target.value,0,360);updatePreview()});
            panel.querySelector('#stm-gradient-transparency').addEventListener('input',e=>{draft.panelTransparency=clamp(e.target.value,0,100);updatePreview()});
            panel.querySelector('#stm-gradient-swap').addEventListener('click',()=>{const old=draft.color1;draft.color1=draft.color2;draft.color2=old;setDraftColor(panel.querySelector('[data-color-index="1"]'),draft.color1);setDraftColor(panel.querySelector('[data-color-index="2"]'),draft.color2)});
            updatePreview();
        }
        bar.querySelectorAll('a:not(#type-gradient)').forEach(tab=>{if(tab.dataset.stmGradientListener==='true')return;tab.dataset.stmGradientListener='true';tab.addEventListener('click',()=>selectBuiltInTab(tab))});
        if(saved.enabled&&gradientSelected)selectGradientTab();
    }

    async function saveGradientFromSettings(){if(gradientSelected){saved={enabled:true,type:draft.type==='radial'?'radial':'linear',color1:normalizeHex(draft.color1),color2:normalizeHex(draft.color2),angle:clamp(draft.angle,0,360),panelTransparency:clamp(draft.panelTransparency,0,100)};await storageSet(saved);applyGradient(saved)}else if(saved.enabled){saved={...saved,enabled:false};await storageSet(saved);applyGradient(saved)}}

    document.addEventListener('click',e=>{document.querySelectorAll('.stm-gradient-picker').forEach(p=>p.hidden=true);const tm=document.getElementById('stm-gradient-type-menu');if(tm)tm.hidden=true;if(e.target.closest?.('#save')){saveGradientFromSettings();return}if(e.target.closest?.('#reset')){saved={...defaults};draft={...defaults};gradientSelected=false;storageSet(saved);applyGradient(saved)}},false);
    new MutationObserver(injectSettings).observe(document.documentElement,{childList:true,subtree:true});
    (async()=>{const stored=await storageGet();saved=stored?{...defaults,...stored}:{...defaults};draft={...saved};gradientSelected=!!saved.enabled;applyGradient(saved);injectSettings();setInterval(injectSettings,1200)})();
})();
