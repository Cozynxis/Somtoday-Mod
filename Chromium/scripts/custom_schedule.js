(() => {
    'use strict';

    const STORAGE_KEY = 'somtoday_mod_custom_schedule_events_v1';
    const OVERLAY_ID = 'stm-custom-schedule-overlay';
    const MODAL_ID = 'stm-custom-schedule-modal';
    const EVENT_CLASS = 'stm-custom-schedule-event';

    const state = {
        events: [],
        scheduleRoot: null,
        columns: [],
        timeMarks: [],
        renderTimer: null,
        currentEventId: null,
        lastUrl: location.href,
        observer: null
    };

    const monthMap = {
        jan: 0, januari: 0,
        feb: 1, februari: 1,
        mrt: 2, maart: 2,
        apr: 3, april: 3,
        mei: 4,
        jun: 5, juni: 5,
        jul: 6, juli: 6,
        aug: 7, augustus: 7,
        sep: 8, sept: 8, september: 8,
        okt: 9, oktober: 9,
        nov: 10, november: 10,
        dec: 11, december: 11
    };

    function storageGet(key) {
        return new Promise(resolve => {
            try {
                const api = globalThis.browser?.storage?.local || globalThis.chrome?.storage?.local;
                if (!api) return resolve({});
                const result = api.get(key);
                if (result && typeof result.then === 'function') result.then(resolve).catch(() => resolve({}));
                else api.get(key, resolve);
            } catch {
                resolve({});
            }
        });
    }

    function storageSet(data) {
        return new Promise(resolve => {
            try {
                const api = globalThis.browser?.storage?.local || globalThis.chrome?.storage?.local;
                if (!api) return resolve();
                const result = api.set(data);
                if (result && typeof result.then === 'function') result.then(resolve).catch(resolve);
                else api.set(data, resolve);
            } catch {
                resolve();
            }
        });
    }

    function isSchedulePage() {
        const path = `${location.pathname} ${location.hash}`.toLowerCase();
        if (path.includes('rooster') || path.includes('schedule') || path.includes('timetable')) return true;
        const heading = [...document.querySelectorAll('h1,h2,[role="heading"]')]
            .some(el => /\brooster\b/i.test((el.textContent || '').trim()));
        return heading;
    }

    function safeText(el) {
        return (el?.textContent || '').replace(/\s+/g, ' ').trim();
    }

    function visibleRect(el) {
        const rect = el.getBoundingClientRect();
        const style = getComputedStyle(el);
        return rect.width > 30 && rect.height > 30 && style.display !== 'none' && style.visibility !== 'hidden' && Number(style.opacity || 1) !== 0;
    }

    function findScheduleRoot() {
        const preferred = [...document.querySelectorAll('[class*="rooster" i],[class*="schedule" i],[class*="timetable" i],[class*="agenda" i],main')]
            .filter(visibleRect);
        let best = null;
        let bestScore = -1;
        for (const el of preferred) {
            const rect = el.getBoundingClientRect();
            const text = safeText(el).slice(0, 12000);
            const timeCount = (text.match(/\b(?:[01]?\d|2[0-3]):[0-5]\d\b/g) || []).length;
            const dayCount = (text.match(/\b(?:maandag|dinsdag|woensdag|donderdag|vrijdag|zaterdag|zondag|ma|di|wo|do|vr|za|zo)\b/gi) || []).length;
            const sizeScore = Math.min(20, (rect.width * rect.height) / 80000);
            const score = timeCount * 2 + dayCount + sizeScore;
            if (score > bestScore) {
                bestScore = score;
                best = el;
            }
        }
        if (best && bestScore >= 5) return best;
        return document.querySelector('main') || document.body;
    }

    function parseDateText(text) {
        const normalized = text.toLowerCase().replace(/[,]/g, ' ').replace(/\s+/g, ' ').trim();
        let day, month, year;

        let m = normalized.match(/\b([0-3]?\d)[\s\-/.]+([01]?\d)(?:[\s\-/.]+(20\d{2}))?\b/);
        if (m) {
            day = Number(m[1]);
            month = Number(m[2]) - 1;
            year = m[3] ? Number(m[3]) : undefined;
        } else {
            m = normalized.match(/\b([0-3]?\d)\s+(jan(?:uari)?|feb(?:ruari)?|mrt|maart|apr(?:il)?|mei|jun(?:i)?|jul(?:i)?|aug(?:ustus)?|sep(?:t(?:ember)?)?|okt(?:ober)?|nov(?:ember)?|dec(?:ember)?)(?:\s+(20\d{2}))?\b/);
            if (!m) return null;
            day = Number(m[1]);
            month = monthMap[m[2]];
            year = m[3] ? Number(m[3]) : undefined;
        }

        if (!Number.isInteger(day) || !Number.isInteger(month) || day < 1 || day > 31 || month < 0 || month > 11) return null;
        const now = new Date();
        if (!year) {
            year = now.getFullYear();
            const tentative = new Date(year, month, day);
            const diff = tentative.getTime() - now.getTime();
            if (diff > 1000 * 60 * 60 * 24 * 180) year--;
            if (diff < -1000 * 60 * 60 * 24 * 180) year++;
        }
        const date = new Date(year, month, day);
        if (date.getDate() !== day || date.getMonth() !== month) return null;
        return toDateKey(date);
    }

    function toDateKey(date) {
        const y = date.getFullYear();
        const m = String(date.getMonth() + 1).padStart(2, '0');
        const d = String(date.getDate()).padStart(2, '0');
        return `${y}-${m}-${d}`;
    }

    function collectColumns(root) {
        const rootRect = root.getBoundingClientRect();
        const candidates = [];
        for (const el of root.querySelectorAll('*')) {
            if (!(el instanceof HTMLElement)) continue;
            const text = safeText(el);
            if (!text || text.length > 60) continue;
            const date = parseDateText(text);
            if (!date) continue;
            const rect = el.getBoundingClientRect();
            if (rect.width < 15 || rect.height < 8) continue;
            if (rect.bottom < rootRect.top || rect.top > rootRect.bottom) continue;
            candidates.push({ date, x: rect.left + rect.width / 2, y: rect.top + rect.height / 2, rect });
        }

        const unique = [];
        for (const item of candidates.sort((a, b) => a.x - b.x || a.y - b.y)) {
            if (!unique.some(u => u.date === item.date && Math.abs(u.x - item.x) < 30)) unique.push(item);
        }
        if (unique.length === 0) return [];

        const grouped = new Map();
        unique.forEach(item => {
            const existing = grouped.get(item.date);
            if (!existing || item.y < existing.y) grouped.set(item.date, item);
        });
        const headers = [...grouped.values()].sort((a, b) => a.x - b.x);
        if (headers.length === 1) {
            return [{ date: headers[0].date, left: rootRect.left, right: rootRect.right, center: headers[0].x }];
        }
        return headers.map((header, i) => {
            const prev = headers[i - 1];
            const next = headers[i + 1];
            const left = i === 0 ? Math.max(rootRect.left, header.x - (next.x - header.x) / 2) : (prev.x + header.x) / 2;
            const right = i === headers.length - 1 ? Math.min(rootRect.right, header.x + (header.x - prev.x) / 2) : (header.x + next.x) / 2;
            return { date: header.date, left, right, center: header.x };
        });
    }

    function parseMinutes(text) {
        const m = text.match(/^\s*([01]?\d|2[0-3]):([0-5]\d)\s*$/);
        return m ? Number(m[1]) * 60 + Number(m[2]) : null;
    }

    function collectTimeMarks(root) {
        const rootRect = root.getBoundingClientRect();
        const marks = [];
        for (const el of root.querySelectorAll('*')) {
            if (!(el instanceof HTMLElement)) continue;
            const text = safeText(el);
            const minutes = parseMinutes(text);
            if (minutes == null) continue;
            const rect = el.getBoundingClientRect();
            if (rect.width > 160 || rect.height > 80 || rect.height < 5) continue;
            if (rect.bottom < rootRect.top || rect.top > rootRect.bottom) continue;
            marks.push({ minutes, y: rect.top + rect.height / 2 });
        }
        marks.sort((a, b) => a.y - b.y);
        const unique = [];
        for (const mark of marks) {
            if (!unique.some(u => Math.abs(u.y - mark.y) < 4 || (u.minutes === mark.minutes && Math.abs(u.y - mark.y) < 30))) unique.push(mark);
        }
        return unique;
    }

    function minutesToY(minutes) {
        const marks = state.timeMarks;
        if (marks.length >= 2) {
            let a = marks[0], b = marks[marks.length - 1];
            for (let i = 0; i < marks.length - 1; i++) {
                if (minutes >= marks[i].minutes && minutes <= marks[i + 1].minutes) {
                    a = marks[i]; b = marks[i + 1]; break;
                }
            }
            const deltaM = b.minutes - a.minutes || 60;
            return a.y + ((minutes - a.minutes) / deltaM) * (b.y - a.y);
        }
        const rootRect = state.scheduleRoot?.getBoundingClientRect();
        if (!rootRect) return 0;
        return rootRect.top + 80 + ((minutes - 8 * 60) / 60) * 64;
    }

    function yToMinutes(y) {
        const marks = state.timeMarks;
        if (marks.length >= 2) {
            let a = marks[0], b = marks[marks.length - 1];
            for (let i = 0; i < marks.length - 1; i++) {
                if (y >= marks[i].y && y <= marks[i + 1].y) {
                    a = marks[i]; b = marks[i + 1]; break;
                }
            }
            const dy = b.y - a.y || 60;
            const value = a.minutes + ((y - a.y) / dy) * (b.minutes - a.minutes);
            return clampAndRoundMinutes(value);
        }
        const rootRect = state.scheduleRoot?.getBoundingClientRect();
        if (!rootRect) return 8 * 60;
        return clampAndRoundMinutes(8 * 60 + ((y - (rootRect.top + 80)) / 64) * 60);
    }

    function clampAndRoundMinutes(value) {
        const rounded = Math.round(value / 5) * 5;
        return Math.max(0, Math.min(23 * 60 + 55, rounded));
    }

    function minutesToInput(minutes) {
        return `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`;
    }

    function inputToMinutes(value) {
        const [h, m] = String(value || '00:00').split(':').map(Number);
        return h * 60 + m;
    }

    function getColumnAtX(x) {
        return state.columns.find(c => x >= c.left && x <= c.right) ||
            state.columns.reduce((best, c) => !best || Math.abs(c.center - x) < Math.abs(best.center - x) ? c : best, null);
    }

    function ensureOverlay() {
        let overlay = document.getElementById(OVERLAY_ID);
        if (!overlay) {
            overlay = document.createElement('div');
            overlay.id = OVERLAY_ID;
            document.body.appendChild(overlay);
        }
        return overlay;
    }

    function renderEvents() {
        if (!isSchedulePage()) {
            document.getElementById(OVERLAY_ID)?.remove();
            state.scheduleRoot = null;
            return;
        }
        state.scheduleRoot = findScheduleRoot();
        if (!state.scheduleRoot) return;
        state.columns = collectColumns(state.scheduleRoot);
        state.timeMarks = collectTimeMarks(state.scheduleRoot);
        const overlay = ensureOverlay();
        overlay.innerHTML = '';

        for (const event of state.events) {
            const column = state.columns.find(c => c.date === event.date);
            if (!column) continue;
            const start = inputToMinutes(event.start);
            const end = inputToMinutes(event.end);
            const top = minutesToY(start);
            const bottom = minutesToY(end);
            if (!Number.isFinite(top) || !Number.isFinite(bottom)) continue;

            const card = document.createElement('button');
            card.type = 'button';
            card.className = EVENT_CLASS;
            card.dataset.eventId = event.id;
            card.style.left = `${Math.round(column.left + 4)}px`;
            card.style.top = `${Math.round(top + 2)}px`;
            card.style.width = `${Math.max(72, Math.round(column.right - column.left - 8))}px`;
            card.style.height = `${Math.max(34, Math.round(bottom - top - 4))}px`;
            card.style.setProperty('--stm-event-color', event.color || '#7c3aed');
            card.innerHTML = `<span class="stm-custom-schedule-title"></span><span class="stm-custom-schedule-meta"></span>`;
            card.querySelector('.stm-custom-schedule-title').textContent = event.title || 'Eigen item';
            card.querySelector('.stm-custom-schedule-meta').textContent = `${event.start} – ${event.end}${event.room ? ` · ${event.room}` : ''}`;
            card.addEventListener('click', e => {
                e.preventDefault(); e.stopPropagation();
                openModal(event);
            });
            overlay.appendChild(card);
        }
    }

    function scheduleRender(delay = 120) {
        clearTimeout(state.renderTimer);
        state.renderTimer = setTimeout(renderEvents, delay);
    }

    function makeId() {
        return `stm-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
    }

    function rgbFromHex(hex) {
        const clean = String(hex || '#7c3aed').replace('#', '');
        const value = clean.length === 3 ? clean.split('').map(c => c + c).join('') : clean.padEnd(6, '0').slice(0, 6);
        return [parseInt(value.slice(0, 2), 16), parseInt(value.slice(2, 4), 16), parseInt(value.slice(4, 6), 16)];
    }

    function hexFromRgb(r, g, b) {
        return '#' + [r, g, b].map(v => Math.max(0, Math.min(255, Number(v) || 0)).toString(16).padStart(2, '0')).join('');
    }

    function openModal(event = null, defaults = null) {
        document.getElementById(MODAL_ID)?.remove();
        state.currentEventId = event?.id || null;
        const data = event || {
            title: '', description: '', date: defaults?.date || toDateKey(new Date()),
            start: defaults?.start || '09:00', end: defaults?.end || '10:00', room: '', color: '#7c3aed'
        };
        const [r, g, b] = rgbFromHex(data.color);

        const backdrop = document.createElement('div');
        backdrop.id = MODAL_ID;
        backdrop.className = 'stm-custom-schedule-modal-backdrop';
        backdrop.innerHTML = `
            <div class="stm-custom-schedule-modal" role="dialog" aria-modal="true" aria-labelledby="stm-custom-schedule-heading">
                <div class="stm-custom-schedule-modal-header">
                    <div>
                        <div class="stm-custom-schedule-kicker">Somtoday Mod</div>
                        <h2 id="stm-custom-schedule-heading">${event ? 'Roosteritem bewerken' : 'Nieuw roosteritem'}</h2>
                    </div>
                    <button type="button" class="stm-custom-schedule-icon-btn" data-action="close" aria-label="Sluiten">×</button>
                </div>
                <form class="stm-custom-schedule-form">
                    <label>Titel<input name="title" maxlength="80" required></label>
                    <label>Beschrijving<textarea name="description" rows="3" maxlength="500"></textarea></label>
                    <div class="stm-custom-schedule-grid stm-custom-schedule-grid-3">
                        <label>Datum<input name="date" type="date" required></label>
                        <label>Vanaf<input name="start" type="time" step="300" required></label>
                        <label>Tot<input name="end" type="time" step="300" required></label>
                    </div>
                    <label>Lokaal<input name="room" maxlength="40" placeholder="Bijv. B1.24"></label>
                    <div class="stm-custom-schedule-color-block">
                        <div class="stm-custom-schedule-color-head"><span>Kleur</span><span class="stm-custom-schedule-color-preview"></span></div>
                        <div class="stm-custom-schedule-color-row">
                            <input name="color" type="color" value="${data.color || '#7c3aed'}" aria-label="Kleur kiezen">
                            <label>R<input name="red" type="number" min="0" max="255" value="${r}"></label>
                            <label>G<input name="green" type="number" min="0" max="255" value="${g}"></label>
                            <label>B<input name="blue" type="number" min="0" max="255" value="${b}"></label>
                        </div>
                    </div>
                    <div class="stm-custom-schedule-actions">
                        ${event ? '<button type="button" class="stm-custom-schedule-danger" data-action="delete">Verwijderen</button>' : '<span></span>'}
                        <div class="stm-custom-schedule-actions-right">
                            <button type="button" class="stm-custom-schedule-secondary" data-action="close">Annuleren</button>
                            <button type="submit" class="stm-custom-schedule-primary">${event ? 'Opslaan' : 'Toevoegen'}</button>
                        </div>
                    </div>
                </form>
            </div>`;
        document.body.appendChild(backdrop);

        const form = backdrop.querySelector('form');
        form.elements.title.value = data.title || '';
        form.elements.description.value = data.description || '';
        form.elements.date.value = data.date;
        form.elements.start.value = data.start;
        form.elements.end.value = data.end;
        form.elements.room.value = data.room || '';

        const color = form.elements.color;
        const red = form.elements.red, green = form.elements.green, blue = form.elements.blue;
        const preview = backdrop.querySelector('.stm-custom-schedule-color-preview');
        const syncPreview = () => preview.style.background = color.value;
        const syncRgb = () => {
            const [rr, gg, bb] = rgbFromHex(color.value);
            red.value = rr; green.value = gg; blue.value = bb; syncPreview();
        };
        const syncHex = () => { color.value = hexFromRgb(red.value, green.value, blue.value); syncPreview(); };
        color.addEventListener('input', syncRgb);
        [red, green, blue].forEach(input => input.addEventListener('input', syncHex));
        syncPreview();

        backdrop.addEventListener('click', e => {
            if (e.target === backdrop || e.target.closest('[data-action="close"]')) backdrop.remove();
            if (e.target.closest('[data-action="delete"]')) deleteCurrentEvent();
        });

        form.addEventListener('submit', async e => {
            e.preventDefault();
            const start = form.elements.start.value;
            const end = form.elements.end.value;
            if (inputToMinutes(end) <= inputToMinutes(start)) {
                form.elements.end.setCustomValidity('De eindtijd moet na de begintijd liggen.');
                form.elements.end.reportValidity();
                return;
            }
            form.elements.end.setCustomValidity('');
            const updated = {
                id: state.currentEventId || makeId(),
                title: form.elements.title.value.trim(),
                description: form.elements.description.value.trim(),
                date: form.elements.date.value,
                start,
                end,
                room: form.elements.room.value.trim(),
                color: form.elements.color.value,
                updatedAt: Date.now()
            };
            const index = state.events.findIndex(x => x.id === updated.id);
            if (index >= 0) state.events[index] = updated; else state.events.push(updated);
            await persist();
            backdrop.remove();
            scheduleRender(20);
        });

        setTimeout(() => form.elements.title.focus(), 0);
    }

    async function deleteCurrentEvent() {
        if (!state.currentEventId) return;
        const current = state.events.find(e => e.id === state.currentEventId);
        if (!current) return;
        if (!confirm(`Roosteritem “${current.title || 'Eigen item'}” verwijderen?`)) return;
        state.events = state.events.filter(e => e.id !== state.currentEventId);
        await persist();
        document.getElementById(MODAL_ID)?.remove();
        scheduleRender(20);
    }

    async function persist() {
        await storageSet({ [STORAGE_KEY]: state.events });
    }

    function clickedInSchedule(event) {
        if (!isSchedulePage() || !state.scheduleRoot || state.columns.length === 0) return false;
        if (event.target.closest(`.${EVENT_CLASS}, #${MODAL_ID}`)) return false;
        const rect = state.scheduleRoot.getBoundingClientRect();
        return event.clientX >= rect.left && event.clientX <= rect.right && event.clientY >= rect.top && event.clientY <= rect.bottom;
    }

    function handleScheduleClick(event) {
        if (event.button !== 0 || !clickedInSchedule(event)) return;
        const interactive = event.target.closest('button,a,input,textarea,select,[role="button"],[role="link"]');
        if (interactive) return;
        const column = getColumnAtX(event.clientX);
        if (!column) return;
        const startMinutes = yToMinutes(event.clientY);
        const endMinutes = Math.min(startMinutes + 60, 23 * 60 + 55);
        event.preventDefault();
        event.stopPropagation();
        openModal(null, { date: column.date, start: minutesToInput(startMinutes), end: minutesToInput(endMinutes) });
    }

    function watchNavigation() {
        document.addEventListener('click', event => {
            if (event.target.closest(`.${EVENT_CLASS}, #${MODAL_ID}`)) return;
            handleScheduleClick(event);
        }, true);

        window.addEventListener('resize', () => scheduleRender(60), { passive: true });
        window.addEventListener('scroll', () => scheduleRender(60), { passive: true, capture: true });

        state.observer = new MutationObserver(() => {
            if (location.href !== state.lastUrl) {
                state.lastUrl = location.href;
                scheduleRender(250);
                return;
            }
            if (isSchedulePage()) scheduleRender(250);
        });
        state.observer.observe(document.documentElement, { childList: true, subtree: true });

        setInterval(() => {
            if (location.href !== state.lastUrl) {
                state.lastUrl = location.href;
                scheduleRender(100);
            }
        }, 750);
    }

    async function init() {
        const stored = await storageGet(STORAGE_KEY);
        state.events = Array.isArray(stored?.[STORAGE_KEY]) ? stored[STORAGE_KEY] : [];
        watchNavigation();
        scheduleRender(300);
    }

    init();
})();