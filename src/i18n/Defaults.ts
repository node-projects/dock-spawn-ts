export type TranslationKey = keyof typeof Defaults;

export type GetLocalizerParameters<K extends TranslationKey> = K extends keyof LocalizerParameters 
    ? LocalizerParameters[K] 
    : [];

export const Defaults = {
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
