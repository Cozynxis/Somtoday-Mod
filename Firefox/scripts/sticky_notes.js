(() => {
    'use strict';

    const STORAGE_KEY = 'somtoday_mod_sticky_notes_v1';
    const ROOT_ID = 'stm-sticky-notes';
    const MODAL_ID = 'stm-sticky-modal';
    const storage = () => globalThis.browser?.storage?.local || globalThis.chrome?.storage?.local;

    async function loadNotes() {
        try { return (await storage().get(STORAGE_KEY))[STORAGE_KEY] || []; }
        catch { return []; }
    }

    async function saveNotes(notes) {
        try { await storage().set({ [STORAGE_KEY]: notes }); } catch {}
    }

    function esc(value = '') {
        const div = document.createElement('div');
        div.textContent = value;
        return div.innerHTML;
    }

    function isVisible(element) {
        if (!element) return false;
        const rect = element.getBoundingClientRect();
        const style = getComputedStyle(element);
        return rect.width > 0 && rect.height > 0 && style.display !== 'none' && style.visibility !== 'hidden';
    }

    function getVisibleHome() {
        return [...document.querySelectorAll('sl-home')].find(isVisible) || null;
    }

    function findGradePlacement(home) {
        const selectors = '[class*="cijfer" i], [id*="cijfer" i], [class*="grade" i], [id*="grade" i]';
        const candidates = [...home.querySelectorAll(selectors)].filter(isVisible);

        if (!candidates.length) {
            const textCandidates = [...home.querySelectorAll('h1,h2,h3,h4,h5,p,span,div')]
                .filter(element => isVisible(element) && /cijfer/i.test((element.textContent || '').trim()));
            candidates.push(...textCandidates);
        }

        candidates.sort((a, b) => {
            const ar = a.getBoundingClientRect();
            const br = b.getBoundingClientRect();
            if (Math.abs(ar.top - br.top) > 8) return ar.top - br.top;
            return ar.right - br.right;
        });

        for (let i = candidates.length - 1; i >= 0; i--) {
            let node = candidates[i];

            while (node && node !== home) {
                const parent = node.parentElement;
                if (!parent || !home.contains(parent)) break;

                const display = getComputedStyle(parent).display;
                const parentRect = parent.getBoundingClientRect();
                const nodeRect = node.getBoundingClientRect();
                const horizontalLayout = display.includes('flex') || display.includes('grid');
                const roomForNotes = parentRect.width >= nodeRect.width + 250;

                if (horizontalLayout && roomForNotes) {
                    return { host: parent, after: node };
                }

                node = parent;
            }
        }

        return null;
    }

    async function renderNotes() {
        const list = document.querySelector('#stm-sticky-list');
        if (!list) return;
        const notes = await loadNotes();
        list.innerHTML = notes.length ? notes.map(note => `
            <article class="stm-sticky-note stm-sticky-${note.theme === 'dark' ? 'dark' : 'light'}" data-id="${esc(note.id)}">
                <button class="stm-sticky-delete" type="button" title="Sticky note verwijderen" aria-label="Sticky note verwijderen">×</button>
                <div class="stm-sticky-text">${esc(note.text).replace(/\n/g, '<br>')}</div>
                ${(note.subject || note.date || note.time) ? `<div class="stm-sticky-meta">${note.subject ? `<span>${esc(note.subject)}</span>` : ''}${note.date ? `<span>${esc(note.date)}${note.time ? ` · ${esc(note.time)}` : ''}</span>` : (note.time ? `<span>${esc(note.time)}</span>` : '')}</div>` : ''}
            </article>`).join('') : '<div class="stm-sticky-empty">Nog geen sticky notes.<br>Maak er eentje voor iets dat je niet wilt vergeten.</div>';

        list.querySelectorAll('.stm-sticky-delete').forEach(button => button.addEventListener('click', async event => {
            event.stopPropagation();
            const id = button.closest('.stm-sticky-note')?.dataset.id;
            const current = await loadNotes();
            await saveNotes(current.filter(note => note.id !== id));
            renderNotes();
        }));
    }

    function closeModal() {
        const modal = document.getElementById(MODAL_ID);
        if (!modal) return;
        modal.classList.add('stm-sticky-modal-closing');
        setTimeout(() => modal.remove(), 160);
    }

    function openModal() {
        if (document.getElementById(MODAL_ID)) return;
        const modal = document.createElement('div');
        modal.id = MODAL_ID;
        modal.className = 'stm-sticky-modal-backdrop';
        modal.innerHTML = `
            <section class="stm-sticky-modal" role="dialog" aria-modal="true" aria-labelledby="stm-sticky-modal-title">
                <div class="stm-sticky-modal-header">
                    <div><span class="stm-sticky-kicker">Somtoday Mod</span><h2 id="stm-sticky-modal-title">Sticky note maken</h2><p>Zet iets belangrijks direct op je startpagina.</p></div>
                    <button class="stm-sticky-close" type="button" aria-label="Sluiten">×</button>
                </div>
                <label class="stm-sticky-field"><span>Notitie</span><textarea id="stm-sticky-input" maxlength="600" rows="5" placeholder="Bijv. hoofdstuk 4 leren voor vrijdag..."></textarea></label>
                <div class="stm-sticky-fields-row">
                    <label class="stm-sticky-field"><span>Datum <small>optioneel</small></span><input id="stm-sticky-date" type="date"></label>
                    <label class="stm-sticky-field"><span>Tijd <small>optioneel</small></span><input id="stm-sticky-time" type="time"></label>
                </div>
                <label class="stm-sticky-field"><span>Vak <small>optioneel</small></span><input id="stm-sticky-subject" type="text" maxlength="60" placeholder="Bijv. Wiskunde"></label>
                <div class="stm-sticky-theme-field"><span>Sticky note stijl</span><div class="stm-sticky-theme-switch"><button type="button" data-theme="light" class="active">Light</button><button type="button" data-theme="dark">Dark</button></div></div>
                <div class="stm-sticky-modal-actions"><button class="stm-sticky-cancel" type="button">Annuleren</button><button class="stm-sticky-create" type="button">Sticky note maken</button></div>
            </section>`;
        document.body.appendChild(modal);
        requestAnimationFrame(() => modal.classList.add('stm-sticky-modal-visible'));
        let theme = 'light';
        modal.querySelectorAll('[data-theme]').forEach(button => button.addEventListener('click', () => {
            theme = button.dataset.theme;
            modal.querySelectorAll('[data-theme]').forEach(b => b.classList.toggle('active', b === button));
        }));
        modal.querySelector('.stm-sticky-close').addEventListener('click', closeModal);
        modal.querySelector('.stm-sticky-cancel').addEventListener('click', closeModal);
        modal.addEventListener('click', event => { if (event.target === modal) closeModal(); });
        modal.querySelector('.stm-sticky-create').addEventListener('click', async () => {
            const text = modal.querySelector('#stm-sticky-input').value.trim();
            if (!text) { modal.querySelector('#stm-sticky-input').focus(); return; }
            const notes = await loadNotes();
            notes.unshift({
                id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
                text,
                date: modal.querySelector('#stm-sticky-date').value,
                time: modal.querySelector('#stm-sticky-time').value,
                subject: modal.querySelector('#stm-sticky-subject').value.trim(),
                theme
            });
            await saveNotes(notes);
            closeModal();
            renderNotes();
        });
        setTimeout(() => modal.querySelector('#stm-sticky-input')?.focus(), 80);
    }

    function createPanel() {
        const root = document.createElement('section');
        root.id = ROOT_ID;
        root.className = 'stm-sticky-panel';
        root.innerHTML = `<div class="stm-sticky-panel-header"><div><span class="stm-sticky-kicker">Somtoday Mod</span><h3>Sticky Notes</h3></div><span class="stm-sticky-pin">●</span></div><button type="button" class="stm-sticky-add">+ <span>Sticky Note Maken</span></button><div id="stm-sticky-list" class="stm-sticky-list"></div>`;
        root.querySelector('.stm-sticky-add').addEventListener('click', openModal);
        return root;
    }

    function mount() {
        const home = getVisibleHome();
        const existing = document.getElementById(ROOT_ID);

        if (!home) {
            existing?.remove();
            return;
        }

        const placement = findGradePlacement(home);
        if (!placement) {
            existing?.remove();
            return;
        }

        const root = existing || createPanel();
        if (root.parentElement !== placement.host || root.previousElementSibling !== placement.after) {
            placement.after.insertAdjacentElement('afterend', root);
        }

        if (!existing) renderNotes();
    }

    let timer;
    const observer = new MutationObserver(() => {
        clearTimeout(timer);
        timer = setTimeout(mount, 100);
    });

    observer.observe(document.documentElement, { childList: true, subtree: true });
    window.addEventListener('hashchange', mount);
    window.addEventListener('popstate', mount);
    setInterval(mount, 900);
    setTimeout(mount, 250);
})();