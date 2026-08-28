// SERVICE WORKER
chrome.runtime.onInstalled.addListener(({ reason }) => {
    if (reason == chrome.runtime.OnInstalledReason.INSTALL) {
        chrome.runtime.openOptionsPage();
        chrome.storage.local.set({
            enabled: true,
            somtoday_mod_update_log_pending: false,
            somtoday_mod_update_log_pending_version: '',
            somtoday_mod_update_log_last_shown: chrome.runtime.getManifest().version
        });
    }

    if (reason == chrome.runtime.OnInstalledReason.UPDATE) {
        chrome.storage.local.get(['somtoday_mod_update_log_disabled']).then((data) => {
            if (data.somtoday_mod_update_log_disabled === true) return;
            chrome.storage.local.set({
                somtoday_mod_update_log_pending: true,
                somtoday_mod_update_log_pending_version: chrome.runtime.getManifest().version
            });
        });
    }
});
chrome.runtime.setUninstallURL("https://jonazwetsloot.nl/somtoday-mod-bye");