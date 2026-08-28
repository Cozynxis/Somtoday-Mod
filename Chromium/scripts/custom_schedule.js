(() => {
    'use strict';

    const STORAGE_KEY = 'somtoday_mod_custom_schedule_events_v1';
    const OVERLAY_ID = 'stm-custom-schedule-overlay';
    const MODAL_ID = 'stm-custom-schedule-modal';
    const EVENT_CLASS = 'stm-custom-schedule-event';

    const state = {
        events: [],
        root: null,
        columns: [],
        marks: [],
        timer: null,
        currentId: null,
        lastUrl: location.href
    };

    const monthMap = {
        jan: 0, januari: 0, feb: 1, februari: 1, mrt: 2, maart: 2,
        apr: 3, april: 3, mei: 4, jun: 5, juni: 5, jul: 6, juli: 6,
        aug: 7, augustus: 7, sep: 8, sept: 8, september: 8,
        okt: 9, oktober: 9, nov: 10, november: 10, dec: 11, december: 11
    };

    const storageApi = () => globalThis.browser?.storage?.local || globalThis.chrome?.storage?.local;

    async function loadEvents() {
        try {
            const result = await storageApi()?.get(STORAGE_KEY);
            return Array.isArray(result?.[STORAGE_KEY]) ? result[STORAGE_KEY] : [];
        } catch {
            return [];
        }
    }

    async function persist() {
        try {
            await storageApi()?.set({ [STORAGE_KEY]: state.events });
        } catch (error) {
            console.warn('[Somtoday Mod] Kon eigen roosteritems niet opslaan.', error);
        }
    }

    function isSchedulePage() {
        const route = `${location.pathname} ${location.hash}`.toLowerCase();
        if (route.includes('rooster') || route.includes('schedule') || route.includes('timetable')) return true;
        return [...document.querySelectorAll('h1,h2,[role="heading"]')]
            .some(el => /\brooster\b/i.test((el.textContent || '').trim()));
    }

    function text(el) {
        return (el?.textContent || '').replace(/\s+/g, ' ').trim();
    }

    function rectVisible(el) {
        const r = el.getBoundingClientRect();
        const s = getComputedStyle(el);
        return r.width > 160 && r.height > 160 && s.display !== 'none' && s.visibility !== 'hidden';
    }

    function dateKey(date) {
        return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
    }

    function parseDate(value) {
        const input = value.toLowerCase().replace(/,/g, ' ').replace(/\s+/g, ' ').trim();
        let day, month, year;
        let match = input.match(/\b([0-3]?\d)[\s\-/.]+([01]?\d)(?:[\s\-/.]+(20\d{2}))?\b/);
        if (match) {
            day = +match[1]; month = +match[2] - 1; year = match[3] ? +match[3] : null;
        } else {
            match = input.match(/\b([0-3]?\d)\s+(jan(?:uari)?|feb(?:ruari)?|mrt|maart|apr(?:il)?|mei|jun(?:i)?|jul(?:i)?|aug(?:ustus)?|sep(?:t(?:ember)?)?|okt(?:ober)?|nov(?:ember)?|dec(?:ember)?)(?:\s+(20\d{2}))?\b/);
            if (!match) return null;
            day = +match[1]; month = monthMap[match[2]]; year = match[3] ? +match[3] : null;
        }
        if (month == null || day < 1 || day > 31) return null;
        const now = new Date();
        if (!year) {
            year = now.getFullYear();
            const candidate = new Date(year, month, day);
            const diff = candidate - now;
            if (diff > 15552000000) year--;
            if (diff < -15552000000) year++;
        }
        const parsed = new Date(year, month, day);
        return parsed.getDate() === day && parsed.getMonth() === month ? dateKey(parsed) : null;
    }

    function parseMinutes(value) {
        const m = String(value || '').match(/^\s*([01]?\d|2[0-3]):([0-5]\d)\s*$/);
        return m ? +m[1] * 60 + +m[2] : null;
    }

    function collectGeometry(root) {
        if (!root) return { columns: [], marks: [] };
        const rr = root.getBoundingClientRect();
        const dates = [];
        const marks = [];

        for (const el of root.querySelectorAll('*')) {
            if (!(el instanceof HTMLElement)) continue;
            const value = text(el);
            if (!value || value.length > 80) continue;
            const r = el.getBoundingClientRect();
            if (r.width < 8 || r.height < 5 || r.bottom < rr.top || r.top > rr.bottom) continue;

            const parsedDate = parseDate(value);
            if (parsedDate && r.width < Math.max(260, rr.width / 2)) {
                dates.push({ date: parsedDate, x: r.left + r.width / 2, y: r.top + r.height / 2 });
            }

            const mins = parseMinutes(value);
            if (mins != null && r.width < 180 && r.height < 90) {
                marks.push({ minutes: mins, y: r.top + r.height / 2 });
            }
        }

        const dateMap = new Map();
        dates.sort((a, b) => a.y - b.y).forEach(item => {
            const current = dateMap.get(item.date);
            if (!current || item.y < current.y) dateMap.set(item.date, item);
        });
        const headers = [...dateMap.values()].sort((a, b) => a.x - b.x);
        const columns = headers.map((header, i) => {
            const prev = headers[i - 1];
            const next = headers[i + 1];
            const fallbackWidth = rr.width / Math.max(1, headers.length);
            return {
                date: header.date,
                center: header.x,
                left: prev ? (prev.x + header.x) / 2 : Math.max(rr.left, header.x - (next ? (next.x - header.x) / 2 : fallbackWidth / 2)),
                right: next ? (header.x + next.x) / 2 : Math.min(rr.right, header.x + (prev ? (header.x - prev.x) / 2 : fallbackWidth / 2))
            };
        });

        marks.sort((a, b) => a.y - b.y);
        const uniqueMarks = marks.filter((mark, i) => !marks.slice(0, i).some(old => Math.abs(old.y - mark.y) < 4));
        return { columns, marks: uniqueMarks };
    }

    function findScheduleRoot() {
        if (!isSchedulePage()) return null;
        const candidates = [...document.querySelectorAll(
            '[class*="rooster" i],[class*="schedule" i],[class*="timetable" i],[class*="agenda" i],main section,main > div'
        )].filter(rectVisible);

        let best = null;
        let bestScore = -1;
        for (const candidate of candidates) {
            if (candidate.closest(`#${MODAL_ID},[role="dialog"],[role="menu"],.cdk-overlay-container`)) continue;
            const geometry = collectGeometry(candidate);
            const r = candidate.getBoundingClientRect();
            const score = geometry.columns.length * 20 + Math.min(geometry.marks.length, 14) * 5 + Math.min((r.width * r.height) / 150000, 10);
            if (geometry.columns.length >= 1 && geometry.marks.length >= 2 && score > bestScore) {
                best = candidate;
                bestScore = score;
            }
        }
        return best;
    }

    function refreshGeometry() {
        state.root = findScheduleRoot();
        if (!state.root) {
            state.columns = [];
            state.marks = [];
            return false;
        }
        const geometry = collectGeometry(state.root);
        state.columns = geometry.columns;
        state.marks = geometry.marks;
        return state.columns.length > 0 && state.marks.length >= 2;
    }

    function clampRound(value) {
        return Math.max(0, Math.min(1435, Math.round(value / 5) * 5));
    }

    function minutesToTime(minutes) {
        return `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`;
    }

    function minutesToY(minutes) {
        const marks = state.marks;
        let a = marks[0], b = marks[marks.length - 1];
        for (let i = 0; i < marks.length - 1; i++) {
            if (minutes >= marks[i].minutes && minutes <= marks[i + 1].minutes) {
                a = marks[i]; b = marks[i + 1]; break;
            }
        }
        return a.y + ((minutes - a.minutes) / (b.minutes - a.minutes || 60)) * (b.y - a.y);
    }

    function yToMinutes(y) {
        const marks = state.marks;
        let a = marks[0], b = marks[marks.length - 1];
        for (let i = 0; i < marks.length - 1; i++) {
            if (y >= marks[i].y && y <= marks[i + 1].y) {
                a = marks[i]; b = marks[i + 1]; break;
            }
        }
        return clampRound(a.minutes + ((y - a.y) / (b.y - a.y || 60)) * (b.minutes - a.minutes));
    }

    function getColumn(x) {
        return state.columns.find(c => x >= c.left && x <= c.right) || null;
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

    function render() {
        if (!refreshGeometry()) {
            document.getElementById(OVERLAY_ID)?.remove();
            return;
        }
        const overlay = ensureOverlay();
        overlay.replaceChildren();

        for (const item of state.events) {
            const column = state.columns.find(c => c.date === item.date);
            if (!column) continue;
            const start = parseMinutes(item.start);
            const end = parseMinutes(item.end);
            if (start == null || end == null || end <= start) continue;
            const top = minutesToY(start);
            const bottom = minutesToY(end);
            const card = document.createElement('button');
            card.type = 'button';
            card.className = EVENT_CLASS;
            card.dataset.eventId = item.id;
            card.style.left = `${Math.round(column.left + 4)}px`;
            card.style.top = `${Math.round(top + 2)}px`;
            card.style.width = `${Math.max(70, Math.round(column.right - column.left - 8))}px`;
            card.style.height = `${Math.max(34, Math.round(bottom - top - 4))}px`;
            card.style.setProperty('--stm-event-color', item.color || '#7c3aed');
            card.innerHTML = '<span class="stm-custom-schedule-title"></span><span class="stm-custom-schedule-meta"></span>';
            card.children[0].textContent = item.title || 'Eigen item';
            card.children[1].textContent = `${item.start} – ${item.end}${item.room ? ` · ${item.room}` : ''}`;
            card.addEventListener('click', e => {
                e.preventDefault();
                e.stopPropagation();
                openModal(item);
            });
            overlay.appendChild(card);
        }
    }

    function scheduleRender(delay = 100) {
        clearTimeout(state.timer);
        state.timer = setTimeout(render, delay);
    }

    function rgbFromHex(hex) {
        const clean = String(hex || '#7c3aed').replace('#', '').padEnd(6, '0').slice(0, 6);
        return [parseInt(clean.slice(0, 2), 16), parseInt(clean.slice(2, 4), 16), parseInt(clean.slice(4, 6), 16)];
    }

    function hexFromRgb(r, g, b) {
        return '#' + [r, g, b].map(v => Math.max(0, Math.min(255, Number(v) || 0)).toString(16).padStart(2, '0')).join('');
    }

    function closeModal() {
        document.getElementById(MODAL_ID)?.remove();
        state.currentId = null;
    }

    function openModal(existing = null, defaults = {}) {
        closeModal();
        state.currentId = existing?.id || null;
        const item = existing || {
            title: '', description: '', date: defaults.date || dateKey(new Date()),
            start: defaults.start || '09:00', end: defaults.end || '10:00', room: '', color: '#7c3aed'
        };
        const [r, g, b] = rgbFromHex(item.color);
        const shell = document.createElement('div');
        shell.id = MODAL_ID;
        shell.className = 'stm-custom-schedule-modal-backdrop';
        shell.innerHTML = `
            <section class="stm-custom-schedule-modal" role="dialog" aria-modal="true" aria-labelledby="stm-schedule-title">
                <header class="stm-custom-schedule-modal-header">
                    <div class="stm-custom-schedule-header-icon">＋</div>
                    <div class="stm-custom-schedule-header-copy">
                        <span>Somtoday Mod</span>
                        <h2 id="stm-schedule-title">${existing ? 'Roosteritem bewerken' : 'Roosteritem toevoegen'}</h2>
                    </div>
                    <button type="button" class="stm-custom-schedule-icon-btn" data-action="close" aria-label="Sluiten">×</button>
                </header>
                <form class="stm-custom-schedule-form">
                    <div class="stm-custom-schedule-field"><label for="stm-title">Titel</label><input id="stm-title" name="title" maxlength="80" required placeholder="Bijv. Huiswerk maken"></div>
                    <div class="stm-custom-schedule-field"><label for="stm-description">Beschrijving <span>optioneel</span></label><textarea id="stm-description" name="description" rows="3" maxlength="500" placeholder="Extra informatie..."></textarea></div>
                    <div class="stm-custom-schedule-grid stm-custom-schedule-grid-3">
                        <div class="stm-custom-schedule-field"><label>Datum</label><input name="date" type="date" required></div>
                        <div class="stm-custom-schedule-field"><label>Vanaf</label><input name="start" type="time" step="300" required></div>
                        <div class="stm-custom-schedule-field"><label>Tot</label><input name="end" type="time" step="300" required></div>
                    </div>
                    <div class="stm-custom-schedule-field"><label>Lokaal <span>optioneel</span></label><input name="room" maxlength="40" placeholder="Bijv. B1.24"></div>
                    <div class="stm-custom-schedule-color-block">
                        <div class="stm-custom-schedule-color-head"><div><strong>Kleur</strong><small>Kies de kleur van het roosterblok</small></div><span class="stm-custom-schedule-color-preview"></span></div>
                        <div class="stm-custom-schedule-color-row">
                            <input name="color" type="color" value="${item.color || '#7c3aed'}" aria-label="Kleur kiezen">
                            <label>R<input name="red" type="number" min="0" max="255" value="${r}"></label>
                            <label>G<input name="green" type="number" min="0" max="255" value="${g}"></label>
                            <label>B<input name="blue" type="number" min="0" max="255" value="${b}"></label>
                        </div>
                    </div>
                    <footer class="stm-custom-schedule-actions">
                        ${existing ? '<button type="button" class="stm-custom-schedule-danger" data-action="delete">Verwijderen</button>' : '<span></span>'}
                        <div class="stm-custom-schedule-actions-right">
                            <button type="button" class="stm-custom-schedule-secondary" data-action="close">Annuleren</button>
                            <button type="submit" class="stm-custom-schedule-primary">${existing ? 'Wijzigingen opslaan' : 'Toevoegen'}</button>
                        </div>
                    </footer>
                </form>
            </section>`;
        document.body.appendChild(shell);

        const form = shell.querySelector('form');
        for (const key of ['title', 'description', 'date', 'start', 'end', 'room']) form.elements[key].value = item[key] || '';

        const color = form.elements.color;
        const red = form.elements.red, green = form.elements.green, blue = form.elements.blue;
        const preview = shell.querySelector('.stm-custom-schedule-color-preview');
        const paint = () => preview.style.background = color.value;
        color.addEventListener('input', () => {
            const rgb = rgbFromHex(color.value);
            red.value = rgb[0]; green.value = rgb[1]; blue.value = rgb[2]; paint();
        });
        [red, green, blue].forEach(input => input.addEventListener('input', () => {
            color.value = hexFromRgb(red.value, green.value, blue.value); paint();
        }));
        paint();

        shell.addEventListener('click', async e => {
            const action = e.target.closest('[data-action]')?.dataset.action;
            if (e.target === shell || action === 'close') closeModal();
            if (action === 'delete' && state.currentId) {
                const current = state.events.find(x => x.id === state.currentId);
                if (current && confirm(`Roosteritem “${current.title || 'Eigen item'}” verwijderen?`)) {
                    state.events = state.events.filter(x => x.id !== state.currentId);
                    await persist(); closeModal(); scheduleRender(20);
                }
            }
        });

        form.addEventListener('submit', async e => {
            e.preventDefault();
            const start = parseMinutes(form.elements.start.value);
            const end = parseMinutes(form.elements.end.value);
            if (start == null || end == null || end <= start) {
                form.elements.end.setCustomValidity('De eindtijd moet na de begintijd liggen.');
                form.elements.end.reportValidity();
                return;
            }
            form.elements.end.setCustomValidity('');
            const updated = {
                id: state.currentId || `stm-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
                title: form.elements.title.value.trim(),
                description: form.elements.description.value.trim(),
                date: form.elements.date.value,
                start: form.elements.start.value,
                end: form.elements.end.value,
                room: form.elements.room.value.trim(),
                color: form.elements.color.value,
                updatedAt: Date.now()
            };
            const index = state.events.findIndex(x => x.id === updated.id);
            if (index >= 0) state.events[index] = updated; else state.events.push(updated);
            await persist(); closeModal(); scheduleRender(20);
        });

        setTimeout(() => form.elements.title.focus(), 0);
    }

    function isForbiddenTarget(target) {
        if (!(target instanceof Element)) return true;
        return Boolean(target.closest([
            `.${EVENT_CLASS}`, `#${MODAL_ID}`, 'button', 'a', 'input', 'textarea', 'select', 'label',
            '[role="button"]', '[role="link"]', '[role="dialog"]', '[role="menu"]', '[role="menuitem"]',
            '[aria-haspopup="true"]', 'sl-dialog', 'sl-menu', '.cdk-overlay-container', '.cdk-overlay-pane',
            '[class*="modal" i]', '[class*="popup" i]', '[class*="popover" i]', '[class*="dropdown" i]'
        ].join(',')));
    }

    function handleScheduleDoubleClick(event) {
        if (event.button !== 0 || !isSchedulePage() || isForbiddenTarget(event.target)) return;
        if (!refreshGeometry() || !state.root?.contains(event.target)) return;
        const rootRect = state.root.getBoundingClientRect();
        const firstMark = state.marks[0]?.y ?? rootRect.top;
        const lastMark = state.marks[state.marks.length - 1]?.y ?? rootRect.bottom;
        if (event.clientX < rootRect.left || event.clientX > rootRect.right || event.clientY < firstMark - 12 || event.clientY > lastMark + 80) return;
        const column = getColumn(event.clientX);
        if (!column) return;
        const start = yToMinutes(event.clientY);
        openModal(null, { date: column.date, start: minutesToTime(start), end: minutesToTime(Math.min(start + 60, 1435)) });
    }

    document.addEventListener('dblclick', handleScheduleDoubleClick, false);
    window.addEventListener('resize', () => scheduleRender(80), { passive: true });
    window.addEventListener('scroll', () => scheduleRender(80), { passive: true, capture: true });

    new MutationObserver(() => {
        if (location.href !== state.lastUrl) {
            state.lastUrl = location.href;
            closeModal();
            scheduleRender(180);
        } else if (isSchedulePage()) {
            scheduleRender(250);
        }
    }).observe(document.documentElement, { childList: true, subtree: true });

    (async () => {
        state.events = await loadEvents();
        scheduleRender(300);
    })();
})();