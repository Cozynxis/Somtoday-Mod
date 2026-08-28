(() => {
    'use strict';

    const STORAGE_KEY = 'somtoday_mod_sticky_notes_v1';
    const INIT_KEY = 'somtoday_mod_sticky_notes_setting_initialized_v2';
    const BOOL_INDEX = 18;
    const ROOT_ID = 'stm-sticky-notes';
    const MODAL_ID = 'stm-sticky-modal';
    const SETTING_ID = 'stm-sticky-notes-setting';
    const HOME_CLASS = 'stm-sticky-home-host';
    const storage = () => globalThis.browser?.storage?.local || globalThis.chrome?.storage?.local;

    async function loadNotes(){try{return(await storage().get(STORAGE_KEY))[STORAGE_KEY]||[]}catch{return[]}}
    async function saveNotes(notes){try{await storage().set({[STORAGE_KEY]:notes})}catch{}}
    function replaceBool(index,value){let bools=get('bools')||'110001110111101111100000000000';while(bools.length<=index)bools+='0';set('bools',bools.substring(0,index)+(value?'1':'0')+bools.substring(index+1))}
    function isEnabled(){const bools=get('bools');return !bools||bools.charAt(BOOL_INDEX)!=='0'}
    async function ensureDefaultEnabled(){try{const result=await storage().get(INIT_KEY);if(result[INIT_KEY])return;replaceBool(BOOL_INDEX,true);await storage().set({[INIT_KEY]:true})}catch{}}
    function esc(value=''){const div=document.createElement('div');div.textContent=value;return div.innerHTML}
    function isVisible(element){if(!element)return false;const rect=element.getBoundingClientRect(),style=getComputedStyle(element);return rect.width>0&&rect.height>0&&style.display!=='none'&&style.visibility!=='hidden'}
    function getVisibleHome(){return[...document.querySelectorAll('sl-home')].find(isVisible)||null}
    function findLastGradeCard(home){const textNodes=[...home.querySelectorAll('h1,h2,h3,h4,h5,p,span,div,a')].filter(el=>isVisible(el)&&/laatste\s+cijfer/i.test((el.textContent||'').trim()));for(const textNode of textNodes){let node=textNode;while(node&&node!==home){const rect=node.getBoundingClientRect();if(rect.width>=320&&rect.height>=100&&rect.height<=260)return node;node=node.parentElement}}return null}
    function positionPanel(home,root){const gradeCard=findLastGradeCard(home);if(!gradeCard)return false;const homeRect=home.getBoundingClientRect(),cardRect=gradeCard.getBoundingClientRect(),gap=34,viewportPadding=18,available=window.innerWidth-cardRect.right-gap-viewportPadding;if(available<240){root.hidden=true;return true}const width=Math.min(360,Math.max(250,available));root.hidden=false;root.style.setProperty('--stm-sticky-left',`${Math.round(cardRect.right-homeRect.left+gap)}px`);root.style.setProperty('--stm-sticky-top',`${Math.round(cardRect.top-homeRect.top)}px`);root.style.setProperty('--stm-sticky-width',`${Math.round(width)}px`);return true}

    const pencilIcon='<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 16.5V20h3.5L18.1 9.4l-3.5-3.5L4 16.5Zm16.7-9.8a1 1 0 0 0 0-1.4l-2-2a1 1 0 0 0-1.4 0l-1.6 1.6 3.5 3.5 1.5-1.7Z"/></svg>';
    const trashIcon='<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 4h8l1 2h4v2H3V6h4l1-2Zm1 6h2v7H9v-7Zm4 0h2v7h-2v-7Zm4 0h2v9a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2v-9h2v9h10v-9Z"/></svg>';

    async function renderNotes(){const list=document.querySelector('#stm-sticky-list');if(!list)return;const notes=await loadNotes();list.innerHTML=notes.length?notes.map(note=>`<article class="stm-sticky-note" data-id="${esc(note.id)}"><div class="stm-sticky-note-actions"><button class="stm-sticky-edit" type="button" title="Sticky note bewerken" aria-label="Sticky note bewerken">${pencilIcon}</button><button class="stm-sticky-delete" type="button" title="Sticky note verwijderen" aria-label="Sticky note verwijderen">${trashIcon}</button></div><div class="stm-sticky-text">${esc(note.text).replace(/\n/g,'<br>')}</div>${(note.subject||note.date||note.time)?`<div class="stm-sticky-meta">${note.subject?`<span>${esc(note.subject)}</span>`:''}${note.date?`<span>${esc(note.date)}${note.time?` · ${esc(note.time)}`:''}</span>`:(note.time?`<span>${esc(note.time)}</span>`:'')}</div>`:''}</article>`).join(''):'<div class="stm-sticky-empty">Nog geen sticky notes.<br>Maak er eentje voor iets dat je niet wilt vergeten.</div>';list.querySelectorAll('.stm-sticky-delete').forEach(button=>button.addEventListener('click',async event=>{event.stopPropagation();const id=button.closest('.stm-sticky-note')?.dataset.id,current=await loadNotes();await saveNotes(current.filter(note=>note.id!==id));renderNotes()}));list.querySelectorAll('.stm-sticky-edit').forEach(button=>button.addEventListener('click',event=>{event.stopPropagation();openModal(button.closest('.stm-sticky-note')?.dataset.id||null)}))}
    function closeModal(){const modal=document.getElementById(MODAL_ID);if(!modal)return;modal.classList.add('stm-sticky-modal-closing');setTimeout(()=>modal.remove(),160)}
    async function openModal(editId=null){if(document.getElementById(MODAL_ID))return;const notes=await loadNotes(),editing=editId?notes.find(note=>note.id===editId):null,modal=document.createElement('div');modal.id=MODAL_ID;modal.className='stm-sticky-modal-backdrop';modal.innerHTML=`<section class="stm-sticky-modal" role="dialog" aria-modal="true" aria-labelledby="stm-sticky-modal-title"><div class="stm-sticky-modal-header"><div><span class="stm-sticky-kicker">Somtoday Mod</span><h2 id="stm-sticky-modal-title">${editing?'Sticky note bewerken':'Sticky note maken'}</h2><p>${editing?'Pas je notitie aan.':'Zet iets belangrijks direct op je startpagina.'}</p></div><button class="stm-sticky-close" type="button" aria-label="Sluiten">×</button></div><label class="stm-sticky-field"><span>Notitie</span><textarea id="stm-sticky-input" maxlength="600" rows="5" placeholder="Bijv. hoofdstuk 4 leren voor vrijdag...">${editing?esc(editing.text):''}</textarea></label><div class="stm-sticky-fields-row"><label class="stm-sticky-field"><span>Datum <small>optioneel</small></span><input id="stm-sticky-date" type="date" value="${editing?esc(editing.date||''):''}"></label><label class="stm-sticky-field"><span>Tijd <small>optioneel</small></span><input id="stm-sticky-time" type="time" value="${editing?esc(editing.time||''):''}"></label></div><label class="stm-sticky-field"><span>Vak <small>optioneel</small></span><input id="stm-sticky-subject" type="text" maxlength="60" placeholder="Bijv. Wiskunde" value="${editing?esc(editing.subject||''):''}"></label><div class="stm-sticky-modal-actions"><button class="stm-sticky-cancel" type="button">Annuleren</button><button class="stm-sticky-create" type="button">${editing?'Wijzigingen opslaan':'Sticky note maken'}</button></div></section>`;document.body.appendChild(modal);requestAnimationFrame(()=>modal.classList.add('stm-sticky-modal-visible'));modal.querySelector('.stm-sticky-close').addEventListener('click',closeModal);modal.querySelector('.stm-sticky-cancel').addEventListener('click',closeModal);modal.addEventListener('click',event=>{if(event.target===modal)closeModal()});modal.querySelector('.stm-sticky-create').addEventListener('click',async()=>{const text=modal.querySelector('#stm-sticky-input').value.trim();if(!text){modal.querySelector('#stm-sticky-input').focus();return}const latest=await loadNotes(),payload={id:editing?.id||`${Date.now()}-${Math.random().toString(36).slice(2,7)}`,text,date:modal.querySelector('#stm-sticky-date').value,time:modal.querySelector('#stm-sticky-time').value,subject:modal.querySelector('#stm-sticky-subject').value.trim()};if(editing){const index=latest.findIndex(note=>note.id===editing.id);if(index!==-1)latest[index]=payload}else latest.unshift(payload);await saveNotes(latest);closeModal();renderNotes()});setTimeout(()=>modal.querySelector('#stm-sticky-input')?.focus(),80)}
    function createPanel(){const root=document.createElement('section');root.id=ROOT_ID;root.className='stm-sticky-panel';root.innerHTML=`<div class="stm-sticky-panel-header"><div><span class="stm-sticky-kicker">Somtoday Mod</span><h3>Sticky Notes</h3></div><span class="stm-sticky-pin">●</span></div><button type="button" class="stm-sticky-add">+ <span>Sticky Note Maken</span></button><div id="stm-sticky-list" class="stm-sticky-list"></div>`;root.querySelector('.stm-sticky-add').addEventListener('click',()=>openModal());return root}
    function cleanup(){document.getElementById(ROOT_ID)?.remove();document.querySelectorAll(`.${HOME_CLASS}`).forEach(el=>el.classList.remove(HOME_CLASS))}

    function injectSetting(){
        const category=document.getElementById('category-extra');
        if(!category||document.getElementById(SETTING_ID))return;
        const tasksCheckbox=category.querySelector('#bools16');
        if(!tasksCheckbox)return;
        const tasksRow=tasksCheckbox.closest('div');
        if(!tasksRow)return;
        const row=tasksRow.cloneNode(true);
        row.id=SETTING_ID;
        const title=row.querySelector('h3');
        const checkbox=row.querySelector('input[type="checkbox"]');
        const label=row.querySelector('label.switch');
        if(!checkbox||!label)return;
        if(title)title.textContent='Sticky Notes op startpagina';
        checkbox.id='bools18';
        checkbox.title='Sticky Notes op startpagina';
        checkbox.classList.add('mod-custom-setting');
        checkbox.classList.remove('mod-modified');
        label.setAttribute('for','bools18');
        checkbox.checked=isEnabled();
        tasksRow.insertAdjacentElement('afterend',row);
    }

    function mount(){injectSetting();if(!isEnabled()){cleanup();return}const home=getVisibleHome();if(!home){cleanup();return}document.querySelectorAll(`.${HOME_CLASS}`).forEach(el=>{if(el!==home)el.classList.remove(HOME_CLASS)});home.classList.add(HOME_CLASS);const existing=document.getElementById(ROOT_ID),root=existing||createPanel();if(root.parentElement!==home)home.appendChild(root);if(!positionPanel(home,root)){root.remove();return}if(!existing)renderNotes()}
    let timer;const observer=new MutationObserver(()=>{clearTimeout(timer);timer=setTimeout(mount,100)});observer.observe(document.documentElement,{childList:true,subtree:true});window.addEventListener('hashchange',mount);window.addEventListener('popstate',mount);window.addEventListener('resize',()=>{clearTimeout(timer);timer=setTimeout(mount,80)});setInterval(mount,900);ensureDefaultEnabled().then(mount);setTimeout(mount,200);
})();