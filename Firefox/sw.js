// SERVICE WORKER
const NEW_FEATURES_DEFAULT_VERSION = '5.6';
const NEW_FEATURES_MARKER = `somtoday_mod_new_features_enabled_${NEW_FEATURES_DEFAULT_VERSION}`;

function enableNewFeaturesOnce() {
    chrome.storage.local.get([NEW_FEATURES_MARKER, 'bools'], result => {
        if (result[NEW_FEATURES_MARKER]) return;

        let bools = result.bools || '110001110111101111100000000000';
        while (bools.length <= 20) bools += '0';
        bools = bools.substring(0, 19) + '1' + bools.substring(20); // Sticky Notes
        bools = bools.substring(0, 20) + '1' + bools.substring(21); // Apps

        chrome.storage.local.set({
            bools,
            [NEW_FEATURES_MARKER]: true
        });
    });
}

chrome.runtime.onInstalled.addListener(({ reason }) => {
    if (reason == chrome.runtime.OnInstalledReason.INSTALL) {
        chrome.runtime.openOptionsPage();
        chrome.storage.local.set({ enabled: true });
        enableNewFeaturesOnce();
    } else if (reason == chrome.runtime.OnInstalledReason.UPDATE) {
        enableNewFeaturesOnce();
    }
});
chrome.runtime.setUninstallURL("https://jonazwetsloot.nl/somtoday-mod-bye");