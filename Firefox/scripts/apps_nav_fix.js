(() => {
    'use strict';

    const STYLE_ID = 'stm-apps-nav-layout-fix';

    function getLayout() {
        try { return String(get('layout') || '1'); }
        catch { return '1'; }
    }

    function ensureStyles() {
        let style = document.getElementById(STYLE_ID);
        if (style) return;
        style = document.createElement('style');
        style.id = STYLE_ID;
        style.textContent = `
            /* Apps button: follow Somtoday Mod's own menu geometry instead of creating a second layout. */
            .stm-apps-nav-item { cursor: pointer !important; }
            .stm-apps-nav-item .item > i,
            .stm-apps-nav-item i.stm-apps-nav-icon {
                box-sizing: border-box !important;
                overflow: visible !important;
                color: inherit !important;
            }
            .stm-apps-nav-item svg {
                display: block !important;
                fill: currentColor !important;
                pointer-events: none !important;
            }

            /* Normal / compact / centred layouts. */
            body.stm-apps-layout-1 .stm-apps-nav-item .item > i,
            body.stm-apps-layout-4 .stm-apps-nav-item .item > i,
            body.stm-apps-layout-5 .stm-apps-nav-item .item > i,
            body.stm-apps-layout-1 .stm-apps-nav-item i.stm-apps-nav-icon,
            body.stm-apps-layout-4 .stm-apps-nav-item i.stm-apps-nav-icon,
            body.stm-apps-layout-5 .stm-apps-nav-item i.stm-apps-nav-icon {
                display:flex !important;
                align-items:center !important;
                justify-content:center !important;
                width:32px !important;
                height:32px !important;
                min-width:32px !important;
                min-height:32px !important;
                padding:0 !important;
                margin:0 auto !important;
            }
            body.stm-apps-layout-1 .stm-apps-nav-item svg,
            body.stm-apps-layout-4 .stm-apps-nav-item svg,
            body.stm-apps-layout-5 .stm-apps-nav-item svg {
                width:24px !important;
                height:24px !important;
                min-width:24px !important;
                min-height:24px !important;
                max-width:24px !important;
                max-height:24px !important;
            }

            /* Left and right sidebar: use the exact same dimensions as the existing sidebar items. */
            body.stm-apps-layout-2 .stm-apps-nav-item .item > i,
            body.stm-apps-layout-3 .stm-apps-nav-item .item > i,
            body.stm-apps-layout-2 .stm-apps-nav-item i.stm-apps-nav-icon,
            body.stm-apps-layout-3 .stm-apps-nav-item i.stm-apps-nav-icon {
                display:block !important;
                box-sizing:border-box !important;
                width:100% !important;
                height:40px !important;
                min-height:40px !important;
                padding:0 !important;
                margin:0 !important;
            }
            @media (min-width:1280px) {
                body.stm-apps-layout-2 .stm-apps-nav-item .item > i,
                body.stm-apps-layout-3 .stm-apps-nav-item .item > i,
                body.stm-apps-layout-2 .stm-apps-nav-item i.stm-apps-nav-icon,
                body.stm-apps-layout-3 .stm-apps-nav-item i.stm-apps-nav-icon {
                    padding-top:23px !important;
                    height:63px !important;
                }
            }
            body.stm-apps-layout-2 .stm-apps-nav-item svg,
            body.stm-apps-layout-3 .stm-apps-nav-item svg {
                width:100% !important;
                height:40px !important;
                min-width:0 !important;
                min-height:40px !important;
                max-width:none !important;
                max-height:40px !important;
            }

            /* Never turn the whole original sidebar into our own positioned/scrollable panel. */
            body.stm-apps-layout-2 sl-header sl-tab-bar:has(.stm-apps-nav-item),
            body.stm-apps-layout-3 sl-header sl-tab-bar:has(.stm-apps-nav-item) {
                overflow-x:hidden !important;
                scrollbar-width:none !important;
                overscroll-behavior:contain !important;
            }
            body.stm-apps-layout-2 sl-header sl-tab-bar:has(.stm-apps-nav-item)::-webkit-scrollbar,
            body.stm-apps-layout-3 sl-header sl-tab-bar:has(.stm-apps-nav-item)::-webkit-scrollbar { display:none !important; }

            /* Apps must behave as a real page: fully cover the current Somtoday content. */
            #stm-apps-page {
                z-index:14 !important;
                background:var(--bg-neutral-none) !important;
                isolation:isolate !important;
            }
            body.stm-apps-layout-2 #stm-apps-page {
                top:0 !important;
                left:var(--safe-area-inset-left,100px) !important;
                right:0 !important;
                bottom:0 !important;
            }
            body.stm-apps-layout-3 #stm-apps-page {
                top:0 !important;
                left:0 !important;
                right:var(--safe-area-inset-right,100px) !important;
                bottom:0 !important;
            }
            body.stm-apps-layout-1 #stm-apps-page,
            body.stm-apps-layout-4 #stm-apps-page,
            body.stm-apps-layout-5 #stm-apps-page {
                top:64px !important;
                bottom:var(--safe-area-inset-bottom,0) !important;
            }
            body.stm-apps-layout-4 #stm-apps-page {
                left:var(--safe-area-inset-left,0) !important;
                right:var(--safe-area-inset-right,0) !important;
            }
        `;
        document.head.appendChild(style);
    }

    function clearOldBrokenOverrides() {
        /* Remove only properties the previous Apps navigation fix wrote inline. */
        document.querySelectorAll('sl-header sl-tab-bar').forEach(bar => {
            if (!bar.querySelector('.stm-apps-nav-item')) return;
            ['position','top','bottom','height','max-height','overflow-y','overflow-x'].forEach(p => bar.style.removeProperty(p));
        });
        document.querySelectorAll('sl-header .menu-avatar, sl-header > div:first-of-type').forEach(el => {
            ['position','top','bottom','left','right','width','transform'].forEach(p => el.style.removeProperty(p));
        });
    }

    function cleanWrongNavCopies() {
        document.querySelectorAll('.stm-apps-nav-item').forEach(item => {
            if (!item.closest('sl-header')) item.remove();
        });
    }

    function applyLayoutClass() {
        const layout = getLayout();
        if (!document.body) return layout;
        for (let i=1;i<=5;i++) document.body.classList.toggle(`stm-apps-layout-${i}`, layout===String(i));
        return layout;
    }

    function matchAppsItemToSibling(item, layout) {
        const sibling = [...(item.parentElement?.children || [])].find(el => el !== item && el.matches?.('sl-tab-item'));
        if (!sibling) return;

        /* Keep the cloned button using the same item dimensions as its neighbours. */
        const siblingItem = sibling.querySelector('.item');
        const appItem = item.querySelector('.item');
        if (siblingItem && appItem) {
            const cs = getComputedStyle(siblingItem);
            if (cs.height && cs.height !== '0px') appItem.style.height = cs.height;
            appItem.style.minHeight = cs.minHeight;
            appItem.style.maxHeight = cs.maxHeight;
        }

        const icon = item.querySelector('i');
        const svg = icon?.querySelector('svg');
        if (icon) icon.setAttribute('aria-hidden','true');
        if (svg) {
            svg.removeAttribute('width');
            svg.removeAttribute('height');
            svg.style.removeProperty('width');
            svg.style.removeProperty('height');
        }

        /* Sidebar layouts already have the correct sizing rules in main_functions.js. */
        if (layout === '2' || layout === '3') {
            item.style.removeProperty('height');
            item.style.removeProperty('max-height');
        }
    }

    function fixAppsNavigation() {
        ensureStyles();
        clearOldBrokenOverrides();
        cleanWrongNavCopies();
        const layout = applyLayoutClass();

        document.querySelectorAll('sl-header .stm-apps-nav-item').forEach(item => matchAppsItemToSibling(item, layout));

        /* Keep scroll position legal, but never create extra empty scroll space. */
        if (layout === '2' || layout === '3') {
            document.querySelectorAll('sl-header sl-tab-bar:has(.stm-apps-nav-item)').forEach(bar => {
                const max = Math.max(0, bar.scrollHeight - bar.clientHeight);
                if (bar.scrollTop > max) bar.scrollTop = max;
            });
        }
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
    observer.observe(document.documentElement, {childList:true, subtree:true});
    window.addEventListener('resize', scheduleFix);
    window.addEventListener('hashchange', scheduleFix);
    window.addEventListener('popstate', scheduleFix);
    setInterval(scheduleFix, 700);
    setTimeout(scheduleFix, 100);
})();