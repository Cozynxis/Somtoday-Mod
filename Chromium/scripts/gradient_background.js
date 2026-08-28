(() => {
    'use strict';

    const STORAGE_KEY = 'somtoday_mod_gradient_background_v1';
    const TAB_ID = 'type-gradient';
    const PANEL_ID = 'mod-bg-gradient';
    const RUNTIME_STYLE_ID = 'stm-gradient-runtime-style';

    const defaults = {
        enabled: false,
        type: 'linear',
        color1: '#6d28d9',
        color2: '#ec4899',
        angle: 135,
        panelTransparency: 35
    };

    let saved = { ...defaults };
    let draft = { ...defaults };
    let gradientSelected = false;

    const storageApi = () => globalThis.browser?.storage?.local || globalThis.chrome?.storage?.local;

    async function storageGet() {
        try {
            const result = await storageApi()?.get(STORAGE_KEY);
            return result?.[STORAGE_KEY] || null;
        } catch {
            return null;
        }
    }

    async function storageSet(value) {
        try {
            await storageApi()?.set({ [STORAGE_KEY]: value });
        } catch (error) {
            console.warn('[Somtoday Mod] Gradient achtergrond opslaan mislukt.', error);
        }
    }

    function clamp(value, min, max) {
        return Math.max(min, Math.min(max, Number(value) || 0));
    }

    function normalizeHex(value) {
        let hex = String(value || '').trim().replace('#', '');
        if (/^[0-9a-f]{3}$/i.test(hex)) hex = hex.split('').map(char => char + char).join('');
        if (!/^[0-9a-f]{6}$/i.test(hex)) return '#000000';
        return `#${hex.toLowerCase()}`;
    }

    function hexToRgb(hex) {
        const value = normalizeHex(hex).slice(1);
        return [
            parseInt(value.slice(0, 2), 16),
            parseInt(value.slice(2, 4), 16),
            parseInt(value.slice(4, 6), 16)
        ];
    }

    function rgbToHex(r, g, b) {
        return '#' + [r, g, b]
            .map(value => clamp(value, 0, 255).toString(16).padStart(2, '0'))
            .join('');
    }

    function gradientString(config) {
        const first = normalizeHex(config.color1);
        const second = normalizeHex(config.color2);
        if (config.type === 'radial') {
            return `radial-gradient(circle at center, ${first} 0%, ${second} 100%)`;
        }
        return `linear-gradient(${clamp(config.angle, 0, 360)}deg, ${first} 0%, ${second} 100%)`;
    }

    function removeRuntimeStyle() {
        document.getElementById(RUNTIME_STYLE_ID)?.remove();
    }

    function applyGradient(config = saved) {
        removeRuntimeStyle();
        document.documentElement.classList.toggle('stm-gradient-background-active', Boolean(config.enabled));
        if (!config.enabled) return;

        const transparent = clamp(config.panelTransparency, 0, 100);
        const opaque = 100 - transparent;
        const style = document.createElement('style');
        style.id = RUNTIME_STYLE_ID;
        style.textContent = `
            html.stm-gradient-background-active {
                background: ${gradientString(config)} !important;
                background-attachment: fixed !important;
                background-position: center !important;
                background-repeat: no-repeat !important;
                background-size: cover !important;
                min-height: 100% !important;
            }
            html.stm-gradient-background-active body {
                background: transparent !important;
            }
            html.stm-gradient-background-active #mod-background,
            html.stm-gradient-background-active #mod-backgroundcolor,
            html.stm-gradient-background-active #mod-backgroundslide,
            html.stm-gradient-background-active #mod-background-live {
                display: none !important;
            }
            html.stm-gradient-background-active sl-rooster-week,
            html.stm-gradient-background-active sl-studiewijzer-week,
            html.stm-gradient-background-active sl-studiewijzer-dag,
            html.stm-gradient-background-active sl-studiewijzer-lijst-dag,
            html.stm-gradient-background-active sl-home,
            html.stm-gradient-background-active sl-cijfers .tabs,
            html.stm-gradient-background-active sl-cijfers .container,
            html.stm-gradient-background-active sl-berichten .main,
            html.stm-gradient-background-active sl-berichten .berichten-lijst,
            html.stm-gradient-background-active sl-registratie-overzicht,
            html.stm-gradient-background-active .content {
                background-color: color-mix(in srgb, var(--bg-neutral-none) ${opaque}%, transparent) !important;
            }
        `;
        document.head.appendChild(style);
    }

    function setBuiltInPanelsVisible(visible) {
        const backgroundCategory = document.getElementById('category-background');
        if (!backgroundCategory) return;
        backgroundCategory.querySelectorAll('.mod-background-type-content').forEach(panel => {
            if (panel.id !== PANEL_ID && !visible) panel.style.display = 'none';
        });
    }

    function selectGradientTab() {
        const tabs = document.getElementById('mod-background-type');
        const panel = document.getElementById(PANEL_ID);
        const tab = document.getElementById(TAB_ID);
        if (!tabs || !panel || !tab) return;

        tabs.querySelectorAll('a').forEach(item => item.classList.remove('active'));
        tab.classList.add('active');
        setBuiltInPanelsVisible(false);
        panel.style.display = 'block';
        gradientSelected = true;
    }

    function selectBuiltInTab(tab) {
        if (!tab || tab.id === TAB_ID) return;
        gradientSelected = false;
        const panel = document.getElementById(PANEL_ID);
        if (panel) panel.style.display = 'none';
    }

    function colorEditorMarkup(index, label, color) {
        const [r, g, b] = hexToRgb(color);
        return `
            <div class="stm-gradient-color-card" data-color-index="${index}">
                <div class="stm-gradient-color-heading">
                    <div>
                        <h3>${label}</h3>
                        <p>Kies een kleur of vul de RGB-waardes handmatig in.</p>
                    </div>
                    <span class="stm-gradient-color-dot" style="background:${color}"></span>
                </div>
                <div class="stm-gradient-color-controls">
                    <input class="stm-gradient-native-color" type="color" value="${color}" aria-label="${label}">
                    <label>R<input class="stm-gradient-rgb" data-channel="r" type="number" min="0" max="255" value="${r}"></label>
                    <label>G<input class="stm-gradient-rgb" data-channel="g" type="number" min="0" max="255" value="${g}"></label>
                    <label>B<input class="stm-gradient-rgb" data-channel="b" type="number" min="0" max="255" value="${b}"></label>
                    <input class="stm-gradient-hex" type="text" maxlength="7" value="${color}" aria-label="HEX kleur">
                </div>
            </div>`;
    }

    function updatePreview() {
        const preview = document.getElementById('stm-gradient-preview');
        if (preview) preview.style.background = gradientString(draft);
        const angleWrap = document.getElementById('stm-gradient-angle-wrap');
        if (angleWrap) angleWrap.style.display = draft.type === 'linear' ? 'grid' : 'none';
        const angleValue = document.getElementById('stm-gradient-angle-value');
        if (angleValue) angleValue.textContent = `${draft.angle}°`;
        const transparencyValue = document.getElementById('stm-gradient-transparency-value');
        if (transparencyValue) transparencyValue.textContent = `${draft.panelTransparency}%`;
    }

    function syncColorCard(card, hex) {
        const index = Number(card.dataset.colorIndex);
        const normalized = normalizeHex(hex);
        const [r, g, b] = hexToRgb(normalized);
        card.querySelector('.stm-gradient-native-color').value = normalized;
        card.querySelector('.stm-gradient-hex').value = normalized;
        card.querySelector('[data-channel="r"]').value = r;
        card.querySelector('[data-channel="g"]').value = g;
        card.querySelector('[data-channel="b"]').value = b;
        card.querySelector('.stm-gradient-color-dot').style.background = normalized;
        if (index === 1) draft.color1 = normalized;
        if (index === 2) draft.color2 = normalized;
        updatePreview();
    }

    function bindColorCard(card) {
        const picker = card.querySelector('.stm-gradient-native-color');
        const hex = card.querySelector('.stm-gradient-hex');
        const rgbInputs = [...card.querySelectorAll('.stm-gradient-rgb')];

        picker.addEventListener('input', () => syncColorCard(card, picker.value));
        hex.addEventListener('input', () => {
            if (/^#[0-9a-f]{6}$/i.test(hex.value)) syncColorCard(card, hex.value);
        });
        rgbInputs.forEach(input => input.addEventListener('input', () => {
            const r = card.querySelector('[data-channel="r"]').value;
            const g = card.querySelector('[data-channel="g"]').value;
            const b = card.querySelector('[data-channel="b"]').value;
            syncColorCard(card, rgbToHex(r, g, b));
        }));
    }

    function injectSettings() {
        const typeBar = document.getElementById('mod-background-type');
        const category = document.getElementById('category-background');
        if (!typeBar || !category) return;

        if (!document.getElementById(TAB_ID)) {
            const tab = document.createElement('a');
            tab.id = TAB_ID;
            tab.tabIndex = 0;
            tab.textContent = 'Gradient';
            typeBar.appendChild(tab);
            tab.addEventListener('click', () => selectGradientTab());
            tab.addEventListener('keydown', event => {
                if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault();
                    selectGradientTab();
                }
            });
        }

        if (!document.getElementById(PANEL_ID)) {
            const panel = document.createElement('div');
            panel.id = PANEL_ID;
            panel.className = 'mod-background-type-content stm-gradient-settings';
            panel.style.display = 'none';
            panel.innerHTML = `
                <div class="stm-gradient-intro">
                    <div>
                        <h3>Gradient achtergrond</h3>
                        <p>Maak een volledig eigen achtergrond met twee kleuren. De gradient wordt over Somtoday gebruikt, dus ook achter rooster, studiewijzer, huiswerk, cijfers en berichten.</p>
                    </div>
                    <button type="button" class="mod-button" id="stm-gradient-swap">Kleuren omwisselen</button>
                </div>

                <div id="stm-gradient-preview" class="mod-background-preview stm-gradient-preview"></div>

                <div class="stm-gradient-options-grid">
                    <label class="stm-gradient-option">
                        <span>Gradienttype</span>
                        <select id="stm-gradient-type">
                            <option value="linear">Lineair</option>
                            <option value="radial">Radiaal</option>
                        </select>
                    </label>
                    <label class="stm-gradient-option" id="stm-gradient-angle-wrap">
                        <span>Richting <b id="stm-gradient-angle-value">${draft.angle}°</b></span>
                        <input id="stm-gradient-angle" type="range" min="0" max="360" step="1" value="${draft.angle}">
                    </label>
                    <label class="stm-gradient-option">
                        <span>Paneeltransparantie <b id="stm-gradient-transparency-value">${draft.panelTransparency}%</b></span>
                        <input id="stm-gradient-transparency" type="range" min="0" max="100" step="1" value="${draft.panelTransparency}">
                    </label>
                </div>

                <div class="stm-gradient-colors">
                    ${colorEditorMarkup(1, 'Kleur 1', draft.color1)}
                    ${colorEditorMarkup(2, 'Kleur 2', draft.color2)}
                </div>
                <p class="stm-gradient-save-note">Klik bovenaan op <b>Instellingen opslaan</b> om deze gradient definitief toe te passen.</p>`;

            const livePanel = document.getElementById('mod-bg-live');
            if (livePanel) livePanel.insertAdjacentElement('afterend', panel);
            else category.appendChild(panel);

            panel.querySelectorAll('.stm-gradient-color-card').forEach(bindColorCard);

            const typeSelect = panel.querySelector('#stm-gradient-type');
            typeSelect.value = draft.type;
            typeSelect.addEventListener('change', () => {
                draft.type = typeSelect.value === 'radial' ? 'radial' : 'linear';
                updatePreview();
            });

            panel.querySelector('#stm-gradient-angle').addEventListener('input', event => {
                draft.angle = clamp(event.target.value, 0, 360);
                updatePreview();
            });

            panel.querySelector('#stm-gradient-transparency').addEventListener('input', event => {
                draft.panelTransparency = clamp(event.target.value, 0, 100);
                updatePreview();
            });

            panel.querySelector('#stm-gradient-swap').addEventListener('click', () => {
                const old = draft.color1;
                draft.color1 = draft.color2;
                draft.color2 = old;
                syncColorCard(panel.querySelector('[data-color-index="1"]'), draft.color1);
                syncColorCard(panel.querySelector('[data-color-index="2"]'), draft.color2);
            });

            updatePreview();
        }

        typeBar.querySelectorAll('a:not(#type-gradient)').forEach(tab => {
            if (tab.dataset.stmGradientListener === 'true') return;
            tab.dataset.stmGradientListener = 'true';
            tab.addEventListener('click', () => selectBuiltInTab(tab));
        });

        if (saved.enabled) selectGradientTab();
    }

    async function saveGradientFromSettings() {
        if (gradientSelected) {
            saved = {
                enabled: true,
                type: draft.type === 'radial' ? 'radial' : 'linear',
                color1: normalizeHex(draft.color1),
                color2: normalizeHex(draft.color2),
                angle: clamp(draft.angle, 0, 360),
                panelTransparency: clamp(draft.panelTransparency, 0, 100)
            };
            await storageSet(saved);
            applyGradient(saved);
        } else if (saved.enabled) {
            saved = { ...saved, enabled: false };
            await storageSet(saved);
            applyGradient(saved);
        }
    }

    document.addEventListener('click', event => {
        const save = event.target.closest?.('#save');
        if (save) {
            saveGradientFromSettings();
            return;
        }
        const reset = event.target.closest?.('#reset');
        if (reset) {
            saved = { ...defaults };
            draft = { ...defaults };
            gradientSelected = false;
            storageSet(saved);
            applyGradient(saved);
        }
    }, true);

    const observer = new MutationObserver(() => injectSettings());
    observer.observe(document.documentElement, { childList: true, subtree: true });

    (async () => {
        const stored = await storageGet();
        saved = stored ? { ...defaults, ...stored } : { ...defaults };
        draft = { ...saved };
        gradientSelected = Boolean(saved.enabled);
        applyGradient(saved);
        injectSettings();
        setInterval(injectSettings, 1200);
    })();
})();