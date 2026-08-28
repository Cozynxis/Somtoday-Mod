// SERVICE WORKER

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
        enableNewFeatures().then(() => {
            if (details.reason === 'install') {
                chrome.storage.local.set({ enabled: true });
                chrome.runtime.openOptionsPage();
            }
        });
    }
});

chrome.runtime.setUninstallURL("https://jonazwetsloot.nl/somtoday-mod-bye");