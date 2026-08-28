(() => {
    'use strict';

    const EVENTS_KEY = 'somtoday_mod_custom_schedule_events_v2';
    const ENABLED_KEY = 'somtoday_mod_custom_schedule_enabled';
    const MODAL_ID = 'stm-custom-schedule-modal';
    const EVENT_CLASS = 'stm-custom-schedule-event';
    const SWITCH_ID = 'stm-custom-schedule-toggle';
    const SWITCH_ROW_ID = 'stm-custom-schedule-setting-row';

    const state = {
        enabled: false,
        events: [],
        renderTimer: null,
        lastUrl: location.href
    };

    const storageApi = () => globalThis.browser?.storage?.local || globalThis.chrome?.storage?.local;

    async function getStorage(keys) {
        try { return await storageApi()?.get(keys) || {}; }
        catch { return {}; }
    }

    async function setStorage(value) {
        try { await storageApi()?.set(value); }
        catch (error) { console.warn('[Somtoday Mod] Opslaan van aangepaste afspraken mislukt.', error); }
    }

    function dateKey(date) {
        return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
    }

    function dateFromKey(value) {
        const match = String(value || '').match(/^(\d{4})-(\d{2})-(\d{2})$/);
        if (!match) return null;
        const date = new Date(+match[1], +match[2] - 1, +match[3], 12, 0, 0, 0);
        return Number.isNaN(date.getTime()) ? null : date;
    }

    function mondayOf(value) {
        const date = new Date(value);
        const day = (date.getDay() + 6) % 7;
        date.setHours(12, 0, 0, 0);
        date.setDate(date.getDate() - day);
        return date;
    }

    function addDays(value, amount) {
        const date = new Date(value);
        date.setDate(date.getDate() + amount);
        return date;
    }

    function parseDateFromText(value) {
        const text = String(value || '').toLowerCase().replace(/,/g, ' ').replace(/\s+/g, ' ').trim();
        if (!text) return null;

        let match = text.match(/\b(20\d{2})[-/.]([01]?\d)[-/.]([0-3]?\d)\b/);
        if (match) {
            const date = new Date(+match[1], +match[2] - 1, +match[3], 12);
            return date.getFullYear() === +match[1] && date.getMonth() === +match[2] - 1 && date.getDate() === +match[3] ? date : null;
        }

        const months = {
            jan: 0, januari: 0, feb: 1, februari: 1, mrt: 2, maart: 2,
            apr: 3, april: 3, mei: 4, jun: 5, juni: 5, jul: 6, juli: 6,
            aug: 7, augustus: 7, sep: 8, sept: 8, september: 8,
            okt: 9, oktober: 9, nov: 10, november: 10, dec: 11, december: 11
        };

        match = text.match(/\b([0-3]?\d)[-/. ]+([01]?\d)(?:[-/. ]+(20\d{2}))?\b/);
        let day, month, year;
        if (match) {
            day = +match[1];
            month = +match[2] - 1;
            year = match[3] ? +match[3] : new Date().getFullYear();
        } else {
            match = text.match(/\b([0-3]?\d)\s+(jan(?:uari)?|feb(?:ruari)?|mrt|maart|apr(?:il)?|mei|jun(?:i)?|jul(?:i)?|aug(?:ustus)?|sep(?:t(?:ember)?)?|okt(?:ober)?|nov(?:ember)?|dec(?:ember)?)(?:\s+(20\d{2}))?\b/);
            if (!match) return null;
            day = +match[1];
            month = months[match[2]];
            year = match[3] ? +match[3] : new Date().getFullYear();
        }

        const date = new Date(year, month, day, 12);
        return date.getDate() === day && date.getMonth() === month ? date : null;
    }

    function dateFromElement(element) {
        if (!element) return null;
        const values = [
            element.textContent,
            element.getAttribute?.('datetime'),
            element.getAttribute?.('date'),
            element.getAttribute?.('data-date'),
            element.getAttribute?.('data-datum'),
            element.getAttribute?.('data-day'),
            element.getAttribute?.('title'),
            element.getAttribute?.('aria-label')
        ];
        for (const value of values) {
            const parsed = parseDateFromText(value);
            if (parsed) return parsed;
        }
        return null;
    }

    function isRosterPage() {
        return !!document.querySelector('sl-rooster-weken sl-rooster-week, sl-rooster-week-header');
    }

    function elementIsShown(element) {
        if (!element) return false;
        const style = getComputedStyle(element);
        const rect = element.getBoundingClientRect();
        return !element.hidden && element.getAttribute('aria-hidden') !== 'true' && element.ariaHidden !== 'true' &&
            style.display !== 'none' && style.visibility !== 'hidden' && rect.width > 80 && rect.height > 40;
    }

    function viewportOverlap(rect) {
        const left = Math.max(rect.left, 0);
        const top = Math.max(rect.top, 0);
        const right = Math.min(rect.right, innerWidth);
        const bottom = Math.min(rect.bottom, innerHeight);
        return Math.max(0, right - left) * Math.max(0, bottom - top);
    }

    function getActiveWeek() {
        const weeks = [...document.querySelectorAll('sl-rooster-week')].filter(elementIsShown);
        if (!weeks.length) return null;
        return weeks.sort((a, b) => viewportOverlap(b.getBoundingClientRect()) - viewportOverlap(a.getBoundingClientRect()))[0];
    }

    function getActiveHeader(week) {
        const headers = [...document.querySelectorAll('sl-rooster-week-header')].filter(elementIsShown);
        if (!headers.length) return null;
        const weekRect = week?.getBoundingClientRect();
        return headers.sort((a, b) => {
            const ar = a.getBoundingClientRect();
            const br = b.getBoundingClientRect();
            const aScore = viewportOverlap(ar) - (weekRect ? Math.abs(ar.left - weekRect.left) * 20 : 0);
            const bScore = viewportOverlap(br) - (weekRect ? Math.abs(br.left - weekRect.left) * 20 : 0);
            return bScore - aScore;
        })[0];
    }

    function getDayColumns(week) {
        const cells = [...week.querySelectorAll('.uur')].filter(element => {
            const rect = element.getBoundingClientRect();
            return rect.width > 30 && rect.height > 20;
        });
        const centers = [];
        for (const cell of cells) {
            const rect = cell.getBoundingClientRect();
            const center = rect.left + rect.width / 2;
            if (!centers.some(value => Math.abs(value - center) < 8)) centers.push(center);
        }
        centers.sort((a, b) => a - b);
        if (centers.length >= 5) return centers.slice(0, 7);

        const rect = week.getBoundingClientRect();
        return Array.from({ length: 5 }, (_, index) => rect.left + (rect.width / 5) * (index + 0.5));
    }

    function getWeekDates(week, columns) {
        const header = getActiveHeader(week);
        const dayElements = header ? [...header.querySelectorAll('.dag')] : [];
        const exactDates = dayElements.map(dateFromElement).filter(Boolean);

        if (exactDates.length >= columns.length) return exactDates.slice(0, columns.length);
        if (exactDates.length) {
            const monday = mondayOf(exactDates[0]);
            return columns.map((_, index) => addDays(monday, index));
        }

        const possibleRoots = [header, week, week?.parentElement].filter(Boolean);
        for (const root of possibleRoots) {
            const direct = dateFromElement(root);
            if (direct) {
                const monday = mondayOf(direct);
                return columns.map((_, index) => addDays(monday, index));
            }
            for (const child of root.querySelectorAll?.('[datetime],[data-date],[data-datum],[date],[aria-label],[title]') || []) {
                const parsed = dateFromElement(child);
                if (parsed) {
                    const monday = mondayOf(parsed);
                    return columns.map((_, index) => addDays(monday, index));
                }
            }
        }

        const monday = mondayOf(new Date());
        return columns.map((_, index) => addDays(monday, index));
    }

    function getTimeGeometry(week) {
        const cells = [...week.querySelectorAll('.uur')].filter(element => {
            const rect = element.getBoundingClientRect();
            return rect.width > 30 && rect.height > 20;
        });
        const rows = [];
        for (const cell of cells) {
            const rect = cell.getBoundingClientRect();
            if (!rows.some(row => Math.abs(row.top - rect.top) < 6)) rows.push({ top: rect.top, height: rect.height });
        }
        rows.sort((a, b) => a.top - b.top);

        const marks = [...document.querySelectorAll('sl-rooster-tijden span')].map(element => {
            const match = (element.textContent || '').match(/\b([01]?\d|2[0-3]):([0-5]\d)\b/);
            if (!match) return null;
            const rect = element.getBoundingClientRect();
            return { minutes: +match[1] * 60 + +match[2], y: rect.top + rect.height / 2 };
        }).filter(Boolean).sort((a, b) => a.y - b.y);

        return marks.length >= 2 ? { mode: 'labels', marks } : { mode: 'rows', rows, startMinutes: 480 };
    }

    function yToMinutes(y, geometry) {
        if (geometry.mode === 'labels') {
            let a = geometry.marks[0];
            let b = geometry.marks[geometry.marks.length - 1];
            for (let i = 0; i < geometry.marks.length - 1; i++) {
                if (y >= geometry.marks[i].y && y <= geometry.marks[i + 1].y) {
                    a = geometry.marks[i];
                    b = geometry.marks[i + 1];
                    break;
                }
            }
            return Math.round((a.minutes + ((y - a.y) / (b.y - a.y || 1)) * (b.minutes - a.minutes)) / 5) * 5;
        }
        let index = geometry.rows.findIndex(row => y >= row.top && y <= row.top + row.height);
        if (index < 0) index = Math.max(0, geometry.rows.findIndex(row => y < row.top));
        return geometry.startMinutes + index * 60;
    }

    function minutesToY(minutes, geometry, week) {
        if (geometry.mode === 'labels') {
            let a = geometry.marks[0];
            let b = geometry.marks[geometry.marks.length - 1];
            for (let i = 0; i < geometry.marks.length - 1; i++) {
                if (minutes >= geometry.marks[i].minutes && minutes <= geometry.marks[i + 1].minutes) {
                    a = geometry.marks[i];
                    b = geometry.marks[i + 1];
                    break;
                }
            }
            return a.y + ((minutes - a.minutes) / (b.minutes - a.minutes || 1)) * (b.y - a.y);
        }
        const first = geometry.rows[0];
        const rowHeight = geometry.rows[1] ? geometry.rows[1].top - first.top : first?.height || 84;
        return (first?.top || week.getBoundingClientRect().top) + ((minutes - geometry.startMinutes) / 60) * rowHeight;
    }

    function toTime(minutes) {
        minutes = Math.max(0, Math.min(1435, Math.round(minutes / 5) * 5));
        return `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`;
    }

    function fromTime(value) {
        const [hours, minutes] = String(value).split(':').map(Number);
        return hours * 60 + minutes;
    }

    function weekKeyForDate(value) {
        const date = value instanceof Date ? value : dateFromKey(value);
        return date ? dateKey(mondayOf(date)) : '';
    }

    function ensureSettingsSwitch() {
        const extra = document.querySelector('#category-extra');
        if (!extra || document.getElementById(SWITCH_ID)) return;

        const tasksHeading = [...extra.querySelectorAll('h3')].find(element => /^taken toevoegen$/i.test((element.textContent || '').trim()));
        const tasksBlock = tasksHeading?.parentElement;
        const row = document.createElement('div');
        row.id = SWITCH_ROW_ID;
        row.innerHTML = `
            <h3>Aangepaste afspraken toevoegen</h3>
            <label tabindex="0" class="switch" for="${SWITCH_ID}">
                <input title="Aangepaste afspraken toevoegen" class="mod-custom-setting" type="checkbox" id="${SWITCH_ID}" ${state.enabled ? 'checked' : ''}>
                <div class="slider round"></div>
            </label>
            <p>Dubbelklik in je rooster om zelf een afspraak toe te voegen.</p>`;

        if (tasksBlock && tasksBlock !== extra) tasksBlock.insertAdjacentElement('afterend', row);
        else extra.appendChild(row);

        const input = row.querySelector(`#${SWITCH_ID}`);
        input.addEventListener('change', async () => {
            input.classList.add('mod-modified');
            state.enabled = input.checked;
            await setStorage({ [ENABLED_KEY]: state.enabled });
            document.documentElement.classList.toggle('stm-custom-schedule-enabled', state.enabled);
            if (!state.enabled) document.querySelectorAll(`.${EVENT_CLASS}`).forEach(element => element.remove());
            scheduleRender(20);
        });
    }

    function render() {
        document.querySelectorAll(`.${EVENT_CLASS}`).forEach(element => element.remove());
        if (!state.enabled || !isRosterPage()) return;

        const week = getActiveWeek();
        if (!week) return;
        const columns = getDayColumns(week);
        if (!columns.length) return;
        const dates = getWeekDates(week, columns);
        const activeWeekKey = dates.length ? dateKey(mondayOf(dates[0])) : '';
        const geometry = getTimeGeometry(week);
        if (geometry.mode === 'rows' && !geometry.rows.length) return;

        const weekRect = week.getBoundingClientRect();
        const gap = columns.length > 1 ? Math.abs(columns[1] - columns[0]) : weekRect.width / 5;
        const dateKeys = dates.map(dateKey);

        for (const item of state.events) {
            const itemWeekKey = item.weekKey || weekKeyForDate(item.date);
            if (activeWeekKey && itemWeekKey && activeWeekKey !== itemWeekKey) continue;

            const dayIndex = dateKeys.indexOf(item.date);
            if (dayIndex < 0) continue;

            const top = minutesToY(fromTime(item.start), geometry, week);
            const bottom = minutesToY(fromTime(item.end), geometry, week);
            const card = document.createElement('button');
            card.type = 'button';
            card.className = EVENT_CLASS;
            card.style.setProperty('--stm-event-color', item.color || '#0067c2');
            card.style.left = `${columns[dayIndex] - gap / 2 + 4}px`;
            card.style.top = `${top + 2}px`;
            card.style.width = `${Math.max(60, gap - 8)}px`;
            card.style.height = `${Math.max(42, bottom - top - 4)}px`;
            card.innerHTML = '<span class="stm-custom-schedule-subject"></span><span class="stm-custom-schedule-room"></span><span class="stm-custom-schedule-time"></span>';
            card.children[0].textContent = item.title;
            card.children[1].textContent = item.room || item.description || 'Eigen afspraak';
            card.children[2].textContent = `${item.start} - ${item.end}`;
            card.addEventListener('click', event => {
                event.preventDefault();
                event.stopPropagation();
                openModal(item);
            });
            document.body.appendChild(card);
        }
    }

    function scheduleRender(delay = 100) {
        clearTimeout(state.renderTimer);
        state.renderTimer = setTimeout(render, delay);
    }

    function openModal(existing = null, defaults = {}) {
        if (!state.enabled) return;
        document.getElementById(MODAL_ID)?.remove();

        const item = existing || {
            title: '', description: '', date: defaults.date || dateKey(new Date()),
            start: defaults.start || '09:00', end: defaults.end || '10:00', room: '', color: '#0067c2'
        };

        const shell = document.createElement('div');
        shell.id = MODAL_ID;
        shell.className = 'stm-custom-schedule-modal-backdrop';
        shell.innerHTML = `
            <div class="stm-custom-schedule-modal" role="dialog" aria-modal="true">
                <div class="stm-custom-schedule-modal-header">
                    <div><span class="stm-custom-schedule-kicker">Somtoday Mod</span><h2>${existing ? 'Afspraak bewerken' : 'Aangepaste afspraak'}</h2></div>
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
                    <label>Kleur
                        <div class="stm-custom-schedule-simple-color">
                            <span class="stm-custom-schedule-color-dot" aria-hidden="true"></span>
                            <input name="color" type="color" aria-label="Roosterkleur kiezen">
                            <span>Roosterkleur</span>
                        </div>
                    </label>
                    <div class="stm-custom-schedule-actions">
                        ${existing ? '<button type="button" class="stm-custom-schedule-danger" data-delete>Verwijderen</button>' : '<span></span>'}
                        <div class="stm-custom-schedule-actions-right">
                            <button type="button" class="stm-custom-schedule-secondary" data-close>Annuleren</button>
                            <button type="submit" class="stm-custom-schedule-primary">Gereed</button>
                        </div>
                    </div>
                </form>
            </div>`;

        document.body.appendChild(shell);
        const form = shell.querySelector('form');
        for (const key of ['title', 'description', 'date', 'start', 'end', 'room', 'color']) form.elements[key].value = item[key] || '';

        const colorInput = form.elements.color;
        const colorDot = shell.querySelector('.stm-custom-schedule-color-dot');
        const updateColorPreview = () => {
            colorDot.style.backgroundColor = colorInput.value;
            colorDot.style.borderColor = colorInput.value;
            colorDot.style.boxShadow = `0 0 0 3px color-mix(in srgb, ${colorInput.value} 20%, transparent)`;
        };
        colorInput.addEventListener('input', updateColorPreview);
        colorInput.addEventListener('change', updateColorPreview);
        updateColorPreview();

        shell.addEventListener('click', async event => {
            if (event.target === shell || event.target.closest('[data-close]')) shell.remove();
            if (event.target.closest('[data-delete]') && existing && confirm('Deze aangepaste afspraak verwijderen?')) {
                state.events = state.events.filter(entry => entry.id !== existing.id);
                await setStorage({ [EVENTS_KEY]: state.events });
                shell.remove();
                render();
            }
        });

        form.addEventListener('submit', async event => {
            event.preventDefault();
            if (fromTime(form.end.value) <= fromTime(form.start.value)) {
                form.end.setCustomValidity('De eindtijd moet later zijn dan de begintijd.');
                form.end.reportValidity();
                return;
            }
            form.end.setCustomValidity('');

            const saved = {
                id: existing?.id || `stm-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
                title: form.title.value.trim(),
                description: form.description.value.trim(),
                date: form.date.value,
                weekKey: weekKeyForDate(form.date.value),
                start: form.start.value,
                end: form.end.value,
                room: form.room.value.trim(),
                color: form.color.value,
                updatedAt: Date.now()
            };

            const index = state.events.findIndex(entry => entry.id === saved.id);
            if (index >= 0) state.events[index] = saved;
            else state.events.push(saved);

            await setStorage({ [EVENTS_KEY]: state.events });
            shell.remove();
            render();
            scheduleRender(120);
        });

        setTimeout(() => form.title.focus(), 0);
    }

    function forbiddenTarget(target) {
        return !!target.closest('button,a,input,textarea,select,label,[role="button"],[role="dialog"],[role="menu"],sl-dialog,hmy-popup,sl-popup,.cdk-overlay-container,[class*="modal" i],[class*="popup" i],[class*="popover" i]');
    }

    function onDoubleClick(event) {
        if (!state.enabled || !isRosterPage() || forbiddenTarget(event.target)) return;
        const week = getActiveWeek();
        if (!week || !week.contains(event.target)) return;

        const rect = week.getBoundingClientRect();
        if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) return;

        const columns = getDayColumns(week);
        const dates = getWeekDates(week, columns);
        if (!columns.length || !dates.length) return;

        let dayIndex = 0;
        let distance = Infinity;
        columns.forEach((center, index) => {
            const nextDistance = Math.abs(center - event.clientX);
            if (nextDistance < distance) {
                distance = nextDistance;
                dayIndex = index;
            }
        });

        const geometry = getTimeGeometry(week);
        if (geometry.mode === 'rows' && !geometry.rows.length) return;
        const minutes = yToMinutes(event.clientY, geometry);
        openModal(null, {
            date: dateKey(dates[dayIndex]),
            start: toTime(minutes),
            end: toTime(minutes + 60)
        });
    }

    document.addEventListener('dblclick', onDoubleClick, false);
    window.addEventListener('resize', () => scheduleRender(60), { passive: true });
    window.addEventListener('scroll', () => scheduleRender(60), { passive: true, capture: true });

    new MutationObserver(() => {
        ensureSettingsSwitch();
        if (location.href !== state.lastUrl) {
            state.lastUrl = location.href;
            document.getElementById(MODAL_ID)?.remove();
            scheduleRender(180);
        } else if (isRosterPage()) {
            scheduleRender(220);
        }
    }).observe(document.documentElement, { childList: true, subtree: true });

    (async () => {
        const data = await getStorage([EVENTS_KEY, ENABLED_KEY, 'somtoday_mod_custom_schedule_events_v1']);
        state.enabled = data[ENABLED_KEY] === true;
        state.events = Array.isArray(data[EVENTS_KEY]) ? data[EVENTS_KEY] :
            (Array.isArray(data.somtoday_mod_custom_schedule_events_v1) ? data.somtoday_mod_custom_schedule_events_v1 : []);
        state.events = state.events.map(item => ({ ...item, weekKey: item.weekKey || weekKeyForDate(item.date) }));
        document.documentElement.classList.toggle('stm-custom-schedule-enabled', state.enabled);
        ensureSettingsSwitch();
        scheduleRender(300);
        setInterval(ensureSettingsSwitch, 1200);
    })();
})();