(() => {
    'use strict';

    const EVENTS_KEY = 'somtoday_mod_custom_schedule_events_v2';
    const ENABLED_KEY = 'somtoday_mod_custom_schedule_enabled';
    const MODAL_ID = 'stm-custom-schedule-modal';
    const EVENT_CLASS = 'stm-custom-schedule-event';
    const SWITCH_ID = 'stm-custom-schedule-toggle';

    const state = {
        enabled: false,
        events: [],
        renderTimer: null,
        settingsTimer: null,
        lastUrl: location.href
    };

    const api = () => globalThis.browser?.storage?.local || globalThis.chrome?.storage?.local;

    async function getStorage(keys) {
        try { return await api()?.get(keys) || {}; } catch { return {}; }
    }

    async function setStorage(value) {
        try { await api()?.set(value); } catch (e) { console.warn('[Somtoday Mod] Opslaan mislukt', e); }
    }

    function dateKey(d) {
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    }

    function mondayOf(date) {
        const d = new Date(date);
        const day = (d.getDay() + 6) % 7;
        d.setHours(0, 0, 0, 0);
        d.setDate(d.getDate() - day);
        return d;
    }

    function addDays(date, amount) {
        const d = new Date(date);
        d.setDate(d.getDate() + amount);
        return d;
    }

    function parseDateFromText(value) {
        const text = String(value || '').toLowerCase().replace(/,/g, ' ').replace(/\s+/g, ' ').trim();
        const months = {jan:0,januari:0,feb:1,februari:1,mrt:2,maart:2,apr:3,april:3,mei:4,jun:5,juni:5,jul:6,juli:6,aug:7,augustus:7,sep:8,sept:8,september:8,okt:9,oktober:9,nov:10,november:10,dec:11,december:11};
        let m = text.match(/\b([0-3]?\d)[\-/. ]+([01]?\d)(?:[\-/. ]+(20\d{2}))?\b/);
        let day, month, year;
        if (m) { day = +m[1]; month = +m[2] - 1; year = m[3] ? +m[3] : new Date().getFullYear(); }
        else {
            m = text.match(/\b([0-3]?\d)\s+(jan(?:uari)?|feb(?:ruari)?|mrt|maart|apr(?:il)?|mei|jun(?:i)?|jul(?:i)?|aug(?:ustus)?|sep(?:t(?:ember)?)?|okt(?:ober)?|nov(?:ember)?|dec(?:ember)?)(?:\s+(20\d{2}))?\b/);
            if (!m) return null;
            day = +m[1]; month = months[m[2]]; year = m[3] ? +m[3] : new Date().getFullYear();
        }
        const d = new Date(year, month, day);
        return d.getDate() === day && d.getMonth() === month ? d : null;
    }

    function isRosterPage() {
        return !!document.querySelector('sl-rooster-weken, sl-rooster-week, sl-rooster-week-header');
    }

    function visible(el) {
        if (!el) return false;
        const r = el.getBoundingClientRect();
        const s = getComputedStyle(el);
        return r.width > 80 && r.height > 80 && s.display !== 'none' && s.visibility !== 'hidden' && r.bottom > 0 && r.top < innerHeight;
    }

    function getActiveWeek() {
        const weeks = [...document.querySelectorAll('sl-rooster-week')].filter(visible);
        if (!weeks.length) return null;
        const explicitlyVisible = weeks.find(w => w.ariaHidden !== 'true' && w.getAttribute('aria-hidden') !== 'true');
        return explicitlyVisible || weeks.sort((a,b) => b.getBoundingClientRect().width * b.getBoundingClientRect().height - a.getBoundingClientRect().width * a.getBoundingClientRect().height)[0];
    }

    function getDayColumns(week) {
        const cells = [...week.querySelectorAll('.uur')].filter(el => {
            const r = el.getBoundingClientRect();
            return r.width > 30 && r.height > 20;
        });
        const centers = [];
        for (const cell of cells) {
            const r = cell.getBoundingClientRect();
            const x = r.left + r.width / 2;
            if (!centers.some(v => Math.abs(v - x) < 8)) centers.push(x);
        }
        centers.sort((a,b) => a-b);
        if (centers.length >= 5) return centers.slice(0, 7);

        const r = week.getBoundingClientRect();
        return Array.from({length:5}, (_, i) => r.left + (r.width / 5) * (i + .5));
    }

    function getWeekDates(columns) {
        const headers = [...document.querySelectorAll('sl-rooster-week-header .dag')].filter(el => {
            const r = el.getBoundingClientRect();
            return r.width > 20 && r.height > 5;
        });
        const parsed = headers.map(h => parseDateFromText(h.textContent)).filter(Boolean);
        if (parsed.length >= columns.length) return parsed.slice(0, columns.length);
        if (parsed.length) {
            const monday = mondayOf(parsed[0]);
            return columns.map((_, i) => addDays(monday, i));
        }
        const monday = mondayOf(new Date());
        return columns.map((_, i) => addDays(monday, i));
    }

    function getTimeGeometry(week) {
        const cells = [...week.querySelectorAll('.uur')].filter(el => {
            const r = el.getBoundingClientRect();
            return r.width > 30 && r.height > 20;
        });
        const rows = [];
        for (const cell of cells) {
            const r = cell.getBoundingClientRect();
            const y = r.top;
            if (!rows.some(v => Math.abs(v.top - y) < 6)) rows.push({top:r.top, height:r.height});
        }
        rows.sort((a,b) => a.top-b.top);

        const timeLabels = [...document.querySelectorAll('sl-rooster-tijden span, sl-rooster-tijden')]
            .map(el => ({el, match:(el.textContent || '').match(/\b([01]?\d|2[0-3]):([0-5]\d)\b/)}))
            .filter(x => x.match)
            .map(x => ({minutes:+x.match[1]*60 + +x.match[2], y:x.el.getBoundingClientRect().top + x.el.getBoundingClientRect().height/2}))
            .filter(x => Number.isFinite(x.y));

        if (timeLabels.length >= 2) {
            timeLabels.sort((a,b) => a.y-b.y);
            return { mode:'labels', marks:timeLabels };
        }
        return { mode:'rows', rows, startMinutes:480 };
    }

    function yToMinutes(y, geometry) {
        if (geometry.mode === 'labels') {
            const marks = geometry.marks;
            let a = marks[0], b = marks[marks.length-1];
            for (let i=0;i<marks.length-1;i++) if (y >= marks[i].y && y <= marks[i+1].y) { a=marks[i]; b=marks[i+1]; break; }
            return Math.round((a.minutes + ((y-a.y)/(b.y-a.y || 1))*(b.minutes-a.minutes))/5)*5;
        }
        const row = geometry.rows.findIndex(r => y >= r.top && y <= r.top+r.height);
        const index = row >= 0 ? row : Math.max(0, geometry.rows.findIndex(r => y < r.top));
        return geometry.startMinutes + index * 60;
    }

    function minutesToY(minutes, geometry, week) {
        if (geometry.mode === 'labels') {
            const marks = geometry.marks;
            let a=marks[0], b=marks[marks.length-1];
            for (let i=0;i<marks.length-1;i++) if (minutes >= marks[i].minutes && minutes <= marks[i+1].minutes) { a=marks[i]; b=marks[i+1]; break; }
            return a.y + ((minutes-a.minutes)/(b.minutes-a.minutes || 1))*(b.y-a.y);
        }
        const first = geometry.rows[0];
        const rowHeight = geometry.rows[1] ? geometry.rows[1].top - first.top : first?.height || 84;
        return (first?.top || week.getBoundingClientRect().top) + ((minutes-geometry.startMinutes)/60)*rowHeight;
    }

    function toTime(minutes) {
        minutes = Math.max(0, Math.min(1435, Math.round(minutes/5)*5));
        return `${String(Math.floor(minutes/60)).padStart(2,'0')}:${String(minutes%60).padStart(2,'0')}`;
    }

    function fromTime(value) {
        const [h,m] = String(value).split(':').map(Number);
        return h*60+m;
    }

    function ensureSettingsSwitch() {
        const extra = document.querySelector('#category-extra');
        if (!extra || document.getElementById(SWITCH_ID)) return;

        const candidates = [...extra.querySelectorAll('*')];
        const tasksText = candidates.find(el => /taken toevoegen/i.test((el.textContent || '').trim()));
        const anchor = tasksText?.closest('div') || tasksText || extra.lastElementChild;

        const wrapper = document.createElement('div');
        wrapper.className = 'stm-custom-schedule-setting';
        wrapper.innerHTML = `
            <div class="stm-custom-schedule-setting-copy">
                <strong>Aangepaste afspraken toevoegen</strong>
                <span>Dubbelklik in je rooster om zelf een afspraak toe te voegen.</span>
            </div>
            <label class="switch" title="Aangepaste afspraken toevoegen">
                <input id="${SWITCH_ID}" type="checkbox" ${state.enabled ? 'checked' : ''}>
                <span class="slider"></span>
            </label>`;

        if (anchor && anchor !== extra) anchor.insertAdjacentElement('afterend', wrapper);
        else extra.appendChild(wrapper);

        wrapper.querySelector('input').addEventListener('change', async e => {
            state.enabled = e.target.checked;
            await setStorage({[ENABLED_KEY]:state.enabled});
            document.documentElement.classList.toggle('stm-custom-schedule-enabled', state.enabled);
            scheduleRender(20);
        });
    }

    function render() {
        document.querySelectorAll(`.${EVENT_CLASS}`).forEach(el => el.remove());
        if (!state.enabled || !isRosterPage()) return;

        const week = getActiveWeek();
        if (!week) return;
        const columns = getDayColumns(week);
        const dates = getWeekDates(columns).map(dateKey);
        const geometry = getTimeGeometry(week);
        if (!columns.length || (geometry.mode === 'rows' && !geometry.rows.length)) return;

        const weekRect = week.getBoundingClientRect();
        const gap = columns.length > 1 ? Math.abs(columns[1]-columns[0]) : weekRect.width/5;

        for (const item of state.events) {
            const dayIndex = dates.indexOf(item.date);
            if (dayIndex < 0) continue;
            const start = fromTime(item.start), end = fromTime(item.end);
            const top = minutesToY(start, geometry, week);
            const bottom = minutesToY(end, geometry, week);
            const card = document.createElement('button');
            card.type = 'button';
            card.className = EVENT_CLASS;
            card.style.setProperty('--stm-event-color', item.color || '#0067c2');
            card.style.left = `${columns[dayIndex]-gap/2+4}px`;
            card.style.top = `${top+2}px`;
            card.style.width = `${Math.max(60,gap-8)}px`;
            card.style.height = `${Math.max(42,bottom-top-4)}px`;
            card.innerHTML = `<span class="stm-custom-schedule-subject"></span><span class="stm-custom-schedule-room"></span><span class="stm-custom-schedule-time"></span>`;
            card.querySelector('.stm-custom-schedule-subject').textContent = item.title;
            card.querySelector('.stm-custom-schedule-room').textContent = item.room || item.description || 'Eigen afspraak';
            card.querySelector('.stm-custom-schedule-time').textContent = `${item.start} - ${item.end}`;
            card.addEventListener('click', e => { e.stopPropagation(); openModal(item); });
            document.body.appendChild(card);
        }
    }

    function scheduleRender(delay=100) {
        clearTimeout(state.renderTimer);
        state.renderTimer = setTimeout(render, delay);
    }

    function openModal(existing=null, defaults={}) {
        if (!state.enabled) return;
        document.getElementById(MODAL_ID)?.remove();
        const item = existing || {title:'',description:'',date:defaults.date||dateKey(new Date()),start:defaults.start||'09:00',end:defaults.end||'10:00',room:'',color:'#0067c2'};
        const shell = document.createElement('div');
        shell.id = MODAL_ID;
        shell.className = 'stm-custom-schedule-modal-backdrop';
        shell.innerHTML = `
            <div class="stm-custom-schedule-modal" role="dialog" aria-modal="true">
                <div class="stm-custom-schedule-modal-header">
                    <div><span class="stm-custom-schedule-kicker">Somtoday Mod</span><h2>${existing?'Afspraak bewerken':'Aangepaste afspraak'}</h2></div>
                    <button type="button" class="stm-custom-schedule-icon-btn" data-close aria-label="Sluiten">×</button>
                </div>
                <form class="stm-custom-schedule-form">
                    <label>Titel<input name="title" maxlength="80" required placeholder="Titel van de afspraak"></label>
                    <label>Beschrijving<textarea name="description" rows="3" maxlength="500" placeholder="Beschrijving"></textarea></label>
                    <div class="stm-custom-schedule-grid stm-custom-schedule-grid-3">
                        <label>Datum<input name="date" type="date" required></label>
                        <label>Vanaf<input name="start" type="time" step="300" required></label>
                        <label>Tot<input name="end" type="time" step="300" required></label>
                    </div>
                    <label>Lokaal<input name="room" maxlength="40" placeholder="Bijv. B1.24"></label>
                    <label>Kleur<div class="stm-custom-schedule-simple-color"><input name="color" type="color"><span>Roosterkleur</span></div></label>
                    <div class="stm-custom-schedule-actions">
                        ${existing?'<button type="button" class="stm-custom-schedule-danger" data-delete>Verwijderen</button>':'<span></span>'}
                        <div class="stm-custom-schedule-actions-right">
                            <button type="button" class="stm-custom-schedule-secondary" data-close>Annuleren</button>
                            <button type="submit" class="stm-custom-schedule-primary">Gereed</button>
                        </div>
                    </div>
                </form>
            </div>`;
        document.body.appendChild(shell);
        const form = shell.querySelector('form');
        for (const k of ['title','description','date','start','end','room','color']) form.elements[k].value=item[k]||'';
        shell.addEventListener('click', async e => {
            if (e.target===shell || e.target.closest('[data-close]')) shell.remove();
            if (e.target.closest('[data-delete]') && existing && confirm('Deze aangepaste afspraak verwijderen?')) {
                state.events = state.events.filter(x=>x.id!==existing.id);
                await setStorage({[EVENTS_KEY]:state.events}); shell.remove(); scheduleRender(20);
            }
        });
        form.addEventListener('submit', async e => {
            e.preventDefault();
            if (fromTime(form.end.value) <= fromTime(form.start.value)) { form.end.setCustomValidity('De eindtijd moet later zijn dan de begintijd.'); form.end.reportValidity(); return; }
            const saved = {id:existing?.id||`stm-${Date.now()}-${Math.random().toString(36).slice(2,8)}`,title:form.title.value.trim(),description:form.description.value.trim(),date:form.date.value,start:form.start.value,end:form.end.value,room:form.room.value.trim(),color:form.color.value,updatedAt:Date.now()};
            const i=state.events.findIndex(x=>x.id===saved.id); if(i>=0) state.events[i]=saved; else state.events.push(saved);
            await setStorage({[EVENTS_KEY]:state.events}); shell.remove(); scheduleRender(20);
        });
        setTimeout(()=>form.title.focus(),0);
    }

    function forbiddenTarget(target) {
        return !!target.closest('button,a,input,textarea,select,label,[role="button"],[role="dialog"],[role="menu"],sl-dialog,hmy-popup,sl-popup,.cdk-overlay-container,[class*="modal" i],[class*="popup" i],[class*="popover" i]');
    }

    function onDoubleClick(e) {
        if (!state.enabled || !isRosterPage() || forbiddenTarget(e.target)) return;
        const week=getActiveWeek(); if(!week) return;
        const weekRect=week.getBoundingClientRect();
        if(e.clientX<weekRect.left||e.clientX>weekRect.right||e.clientY<weekRect.top||e.clientY>weekRect.bottom) return;

        const columns=getDayColumns(week); if(!columns.length) return;
        const dates=getWeekDates(columns);
        let day=0,dist=Infinity; columns.forEach((x,i)=>{const d=Math.abs(x-e.clientX);if(d<dist){dist=d;day=i;}});
        const geometry=getTimeGeometry(week); if(geometry.mode==='rows'&&!geometry.rows.length) return;
        const mins=yToMinutes(e.clientY,geometry);
        openModal(null,{date:dateKey(dates[day]||new Date()),start:toTime(mins),end:toTime(mins+60)});
    }

    document.addEventListener('dblclick', onDoubleClick, false);
    window.addEventListener('resize',()=>scheduleRender(60),{passive:true});
    window.addEventListener('scroll',()=>scheduleRender(60),{passive:true,capture:true});

    new MutationObserver(()=>{
        ensureSettingsSwitch();
        if(location.href!==state.lastUrl){state.lastUrl=location.href;document.getElementById(MODAL_ID)?.remove();scheduleRender(180);} else if(isRosterPage()) scheduleRender(250);
    }).observe(document.documentElement,{childList:true,subtree:true});

    (async()=>{
        const data=await getStorage([EVENTS_KEY,ENABLED_KEY,'somtoday_mod_custom_schedule_events_v1']);
        state.enabled=data[ENABLED_KEY]===true;
        state.events=Array.isArray(data[EVENTS_KEY])?data[EVENTS_KEY]:(Array.isArray(data.somtoday_mod_custom_schedule_events_v1)?data.somtoday_mod_custom_schedule_events_v1:[]);
        document.documentElement.classList.toggle('stm-custom-schedule-enabled',state.enabled);
        ensureSettingsSwitch();
        scheduleRender(300);
        setInterval(ensureSettingsSwitch,1200);
    })();
})();