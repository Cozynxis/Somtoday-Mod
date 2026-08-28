(() => {
    'use strict';

    const STYLE_ID = 'stm-apps-nav-layout-fix';

    function getLayout() {
        try { return String(get('layout') || '1'); }
        catch { return '1'; }
    }

    function ensureStyles() {
        if (document.getElementById(STYLE_ID)) return;
        const style = document.createElement('style');
        style.id = STYLE_ID;
        style.textContent = `
            .stm-apps-nav-item .item > i,.stm-apps-nav-item i.stm-apps-nav-icon{box-sizing:border-box!important;display:flex!important;align-items:center!important;justify-content:center!important;padding:0!important;overflow:visible!important;flex:0 0 auto!important}
            .stm-apps-nav-item .item > i svg,.stm-apps-nav-item i.stm-apps-nav-icon svg{display:block!important;width:24px!important;height:24px!important;min-width:24px!important;min-height:24px!important;max-width:24px!important;max-height:24px!important;fill:currentColor!important}
            body:not(.stm-apps-sidebar-layout) .stm-apps-nav-item .item > i,body:not(.stm-apps-sidebar-layout) .stm-apps-nav-item i.stm-apps-nav-icon{width:30px!important;height:30px!important;min-width:30px!important;min-height:30px!important;margin:0 auto!important}
            body.stm-apps-sidebar-layout .stm-apps-nav-item .item > i,body.stm-apps-sidebar-layout .stm-apps-nav-item i.stm-apps-nav-icon{width:100%!important;height:40px!important;min-height:40px!important;margin:0!important}
            body:not(.stm-apps-sidebar-layout) sl-tab-bar:has(.stm-apps-nav-item){overflow-y:visible!important}
            body.stm-apps-sidebar-layout sl-header sl-tab-bar:has(.stm-apps-nav-item){box-sizing:border-box!important;overflow-x:hidden!important;overflow-y:auto!important;overscroll-behavior:contain!important;scrollbar-width:none!important;padding-bottom:0!important;justify-content:flex-start!important;align-content:flex-start!important}
            body.stm-apps-sidebar-layout sl-header sl-tab-bar:has(.stm-apps-nav-item)::-webkit-scrollbar{display:none!important}
            body.stm-apps-sidebar-layout sl-header sl-tab-bar:has(.stm-apps-nav-item)>sl-tab-item{flex:0 0 auto!important}
            body.stm-apps-sidebar-layout .menu-avatar,body.stm-apps-sidebar-layout sl-header>div:first-of-type{transform:none!important}
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
            ['top','bottom','height','max-height','overflow-y','overflow-x','position'].forEach(p=>bar.style.removeProperty(p));
        });
        document.querySelectorAll('.menu-avatar, sl-header > div:first-of-type').forEach(el => {
            ['top','bottom','left','right','width','position','transform'].forEach(p=>el.style.removeProperty(p));
        });
    }

    function clampBar(bar) {
        const app = bar?.querySelector('.stm-apps-nav-item');
        if (!app || bar.clientHeight <= 0) return;
        const max = Math.max(0, app.offsetTop + app.offsetHeight - bar.clientHeight);
        if (bar.scrollTop > max) bar.scrollTop = max;
        if (!bar.dataset.stmAppsClampBound) {
            bar.dataset.stmAppsClampBound = '1';
            bar.addEventListener('scroll', () => {
                const btn = bar.querySelector('.stm-apps-nav-item');
                if (!btn) return;
                const limit = Math.max(0, btn.offsetTop + btn.offsetHeight - bar.clientHeight);
                if (bar.scrollTop > limit) bar.scrollTop = limit;
            }, {passive:true});
            bar.addEventListener('wheel', e => {
                if (e.deltaY <= 0) return;
                const btn = bar.querySelector('.stm-apps-nav-item');
                if (!btn) return;
                const limit = Math.max(0, btn.offsetTop + btn.offsetHeight - bar.clientHeight);
                if (bar.scrollTop >= limit - 1) {
                    bar.scrollTop = limit;
                    e.preventDefault();
                }
            }, {passive:false});
        }
    }

    function fixAppsNavigation() {
        ensureStyles();
        cleanWrongNavCopies();
        const layout = getLayout();
        const sidebar = layout === '2' || layout === '3';
        document.body?.classList.toggle('stm-apps-sidebar-layout', sidebar);
        if (!sidebar) resetSidebarInlineStyles();

        document.querySelectorAll('sl-header sl-tab-bar:has(.stm-apps-nav-item)').forEach(clampBar);
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
        requestAnimationFrame(() => { scheduled = false; fixAppsNavigation(); });
    }

    new MutationObserver(scheduleFix).observe(document.documentElement,{childList:true,subtree:true});
    window.addEventListener('resize',scheduleFix);
    window.addEventListener('hashchange',scheduleFix);
    window.addEventListener('popstate',scheduleFix);
    setInterval(scheduleFix,700);
    setTimeout(scheduleFix,100);
})();