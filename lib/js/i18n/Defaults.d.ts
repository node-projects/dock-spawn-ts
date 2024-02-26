export type TranslationKey = keyof typeof Defaults;
export type GetLocalizerParameters<K extends TranslationKey> = K extends keyof LocalizerParameters ? LocalizerParameters[K] : [];
export declare const Defaults: {
    CloseDialog: string;
    CloseAll: string;
    CloseAllButThis: string;
    DefaultPanelName: string;
    NewBrowserWindow: string;
};
export interface LocalizerParameters {
}
