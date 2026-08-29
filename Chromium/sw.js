// SERVICE WORKER

const WHATS_NEW_PENDING_KEY = 'somtoday_mod_whats_new_pending_v1';

function enableNewFeatures() {
    // Sticky Notes = bools19, Apps = bools20.
    // Always enable both when this extension is installed or updated so every
    // user sees the newly introduced features at least once.
    return chrome.storage.local.get('bools').then(({ bools }) => {
        let value = typeof bools === 'string' && bools.length
            ? bools
            : '110001110111101111100000000000';

        while (value.length <= 20) value += '0';
        value = value.substring(0, 19) + '1' + value.substring(20);
        value = value.substring(0, 20) + '1' + value.substring(21);

        return chrome.storage.local.set({ bools: value });
    });
}

chrome.runtime.onInstalled.addListener(details => {
    if (details.reason === 'install' || details.reason === 'update') {
        const version = chrome.runtime.getManifest().version;
        Promise.all([
            enableNewFeatures(),
            chrome.storage.local.set({
                [WHATS_NEW_PENDING_KEY]: {
                    version,
                    reason: details.reason,
                    previousVersion: details.previousVersion || null,
                    createdAt: Date.now()
                }
            })
        ]).then(() => {
            if (details.reason === 'install') {
                chrome.storage.local.set({ enabled: true });
                chrome.runtime.openOptionsPage();
            }
        });
    }
});

chrome.runtime.setUninstallURL("https://jonazwetsloot.nl/somtoday-mod-bye");