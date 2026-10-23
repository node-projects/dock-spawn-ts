export type TranslationKey = keyof typeof Defaults;

export type GetLocalizerParameters<K extends TranslationKey> = K extends keyof LocalizerParameters 
    ? LocalizerParameters[K] 
    : [];

export const Defaults = {
    'Fullscreen': 'Maximize panel',
    'RestorePanel': 'Restore panel',
    'AutoHide': 'Auto hide',
    'PinPanel': 'Pin panel',
    'TabGroup': 'Tab group — drag to dock',
    'SelectTab': 'Select tab',
    'SelectHiddenTab': 'Select tab (including hidden tabs)',
    'ShowTabRows': 'Show tabs in multiple rows',
    'ShowSingleTabRow': 'Switch to a single row of tabs',
    'CloseDialog': 'Close dialog',
    'CloseAll': 'Close all documents',
    'CloseAllButThis': 'Close all documents but this',
    'DefaultPanelName': 'Panel',
    'NewBrowserWindow': 'Open in new window'
    //Example of parameterized translation
    // 'CloseWithName': 'Close tab {0}'
};

export interface LocalizerParameters {
    // Example
    // 'CloseWithName': [tabName: string]
}
