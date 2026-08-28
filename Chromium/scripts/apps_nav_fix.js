(() => {
    'use strict';

    const STYLE_ID = 'stm-apps-nav-layout-fix';

    function getLayout() {
        try {
            return String(get('layout') || '1');
        } catch {
            return '1';
        }
    }

    function ensureStyles() {
        let style = document.getElementById(STYLE_ID);
        if (style) return;
        style = document.createElement('style');
        style.id = STYLE_ID;
        style.textContent = `
            .stm-apps-nav-item .item > i,
            .stm-apps-nav-item i.stm-apps-nav-icon {
                box-sizing: border-box !important;
                display: flex !important;
                align-items: center !important;
                justify-content: center !important;
                padding: 0 !important;
                overflow: visible !important;
                flex: 0 0 auto !important;
            }
            .stm-apps-nav-item .item > i svg,
            .stm-apps-nav-item i.stm-apps-nav-icon svg {
                display: block !important;
                width: 24px !important;
                height: 24px !important;
                min-width: 24px !important;
                min-height: 24px !important;
                max-width: 24px !important;
                max-height: 24px !important;
                fill: currentColor !important;
            }
            body:not(.stm-apps-sidebar-layout) .stm-apps-nav-item .item > i,
            body:not(.stm-apps-sidebar-layout) .stm-apps-nav-item i.stm-apps-nav-icon {
                width: 30px !important;
                height: 30px !important;
                min-width: 30px !important;
                min-height: 30px !important;
                margin: 0 auto !important;
            }
            body.stm-apps-sidebar-layout .stm-apps-nav-item .item > i,
            body.stm-apps-sidebar-layout .stm-apps-nav-item i.stm-apps-nav-icon {
                width: 100% !important;
                height: 40px !important;
                min-height: 40px !important;
                margin: 0 !important;
            }
            body:not(.stm-apps-sidebar-layout) sl-tab-bar:has(.stm-apps-nav-item) {
                overflow-y: visible !important;
            }
            body.stm-apps-sidebar-layout sl-header sl-tab-bar:has(.stm-apps-nav-item) {
                box-sizing: border-box !important;
                overflow-x: hidden !important;
                overflow-y: auto !important;
                overscroll-behavior: contain !important;
                scrollbar-width: none !important;
                padding-bottom: 0 !important;
                justify-content: flex-start !important;
                align-content: flex-start !important;
            }
            body.stm-apps-sidebar-layout sl-header sl-tab-bar:has(.stm-apps-nav-item)::-webkit-scrollbar {
                display: none !important;
            }
            body.stm-apps-sidebar-layout sl-header sl-tab-bar:has(.stm-apps-nav-item) > sl-tab-item {
                flex: 0 0 auto !important;
            }
            body.stm-apps-sidebar-layout .menu-avatar,
            body.stm-apps-sidebar-layout sl-header > div:first-of-type {
                transform: none !important;
            }
        `;
        document.head.appendChild(style);
    }

    function cleanWrongNavCopies() {
        document.querySelectorAll('.stm-apps-nav-item').forEach(item => {
            if (!item.closest('sl-header')) item.remove();
        });
    }

    function resetSidebarInlineStyles() {
        document.querySelectorAll('sl-header sl-tab-bar').forEach(bar => {
            if (!bar.querySelector('.stm-apps-nav-item')) return;
            bar.style.removeProperty('top');
            bar.style.removeProperty('bottom');
            bar.style.removeProperty('height');
            bar.style.removeProperty('max-height');
            bar.style.removeProperty('overflow-y');
            bar.style.removeProperty('overflow-x');
        });
        document.querySelectorAll('.menu-avatar, sl-header > div:first-of-type').forEach(el => {
            el.style.removeProperty('top');
            el.style.removeProperty('bottom');
            el.style.removeProperty('left');
            el.style.removeProperty('right');
            el.style.removeProperty('width');
            el.style.removeProperty('position');
            el.style.removeProperty('transform');
        });
    }

    function fixSidebar(layout) {
        const header = document.querySelector('sl-header');
        if (!header) return;
        const bar = [...header.querySelectorAll('sl-tab-bar')].find(el => el.querySelector('.stm-apps-nav-item'));
        if (!bar) return;

        const profile = header.querySelector('.menu-avatar') || header.querySelector(':scope > div:first-of-type');
        const logo = document.getElementById('mod-logo-wrapper');
        const headerRect = header.getBoundingClientRect();

        let top = 0;
        if (logo) {
            const logoRect = logo.getBoundingClientRect();
            if (logoRect.height > 0) top = Math.max(0, Math.round(logoRect.bottom - headerRect.top));
        }

        let bottom = 84;
        if (profile) {
            const profileRect = profile.getBoundingClientRect();
            if (profileRect.height > 0) {
                bottom = Math.max(72, Math.round(headerRect.bottom - profileRect.top + 8));
            }
        }

        bar.style.setProperty('position', 'absolute', 'important');
        bar.style.setProperty('top', `${top}px`, 'important');
        bar.style.setProperty('bottom', `${bottom}px`, 'important');
        bar.style.setProperty('height', 'auto', 'important');
        bar.style.setProperty('max-height', `calc(100vh - ${top + bottom}px)`, 'important');
        bar.style.setProperty('overflow-y', 'auto', 'important');
        bar.style.setProperty('overflow-x', 'hidden', 'important');
        bar.scrollTop = Math.min(bar.scrollTop, Math.max(0, bar.scrollHeight - bar.clientHeight));

        if (profile) {
            profile.style.setProperty('position', 'fixed', 'important');
            profile.style.setProperty('top', 'auto', 'important');
            profile.style.setProperty('bottom', '12px', 'important');
            profile.style.setProperty('transform', 'none', 'important');
            profile.style.setProperty('width', 'calc(100px - 24px)', 'important');
            if (layout === '3') {
                profile.style.setProperty('right', '12px', 'important');
                profile.style.setProperty('left', 'auto', 'important');
            } else {
                profile.style.setProperty('left', '12px', 'important');
                profile.style.setProperty('right', 'auto', 'important');
            }
        }
    }

    function fixAppsNavigation() {
        ensureStyles();
        cleanWrongNavCopies();

        const layout = getLayout();
        const sidebar = layout === '2' || layout === '3';
        document.body?.classList.toggle('stm-apps-sidebar-layout', sidebar);

        if (sidebar) {
            fixSidebar(layout);
        } else {
            resetSidebarInlineStyles();
        }

        document.querySelectorAll('.stm-apps-nav-item').forEach(item => {
            const icon = item.querySelector('i');
            const svg = icon?.querySelector('svg');
            if (icon) icon.setAttribute('aria-hidden', 'true');
            if (svg) {
                svg.setAttribute('width', '24');
                svg.setAttribute('height', '24');
                svg.style.width = '24px';
                svg.style.height = '24px';
            }
        });
    }

    let scheduled = false;
    function scheduleFix() {
        if (scheduled) return;
        scheduled = true;
        requestAnimationFrame(() => {
            scheduled = false;
            fixAppsNavigation();
        });
    }

    const observer = new MutationObserver(scheduleFix);
    observer.observe(document.documentElement, { childList: true, subtree: true });
    window.addEventListener('resize', scheduleFix);
    window.addEventListener('hashchange', scheduleFix);
    window.addEventListener('popstate', scheduleFix);
    setInterval(scheduleFix, 700);
    setTimeout(scheduleFix, 100);
})();