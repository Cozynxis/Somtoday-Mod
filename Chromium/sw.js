// SERVICE WORKER
chrome.runtime.onInstalled.addListener(({ reason }) => {
    const version = chrome.runtime.getManifest().version;

    if (reason == chrome.runtime.OnInstalledReason.INSTALL) {
        chrome.runtime.openOptionsPage();
        chrome.storage.local.get(['somtoday_mod_update_log_disabled']).then((data) => {
            chrome.storage.local.set({
                enabled: true,
                somtoday_mod_update_log_pending: data.somtoday_mod_update_log_disabled === true ? false : true,
                somtoday_mod_update_log_pending_version: data.somtoday_mod_update_log_disabled === true ? '' : version,
                somtoday_mod_update_log_last_shown: ''
            });
        });
    }

    if (reason == chrome.runtime.OnInstalledReason.UPDATE) {
        chrome.storage.local.get(['somtoday_mod_update_log_disabled']).then((data) => {
            if (data.somtoday_mod_update_log_disabled === true) return;
            chrome.storage.local.set({
                somtoday_mod_update_log_pending: true,
                somtoday_mod_update_log_pending_version: version,
                somtoday_mod_update_log_last_shown: ''
            });
        });
    }
});
chrome.runtime.setUninstallURL("https://jonazwetsloot.nl/somtoday-mod-bye");