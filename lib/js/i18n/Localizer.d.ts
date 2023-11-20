import { GetLocalizerParameters, TranslationKey } from "./Defaults.js";
export declare class Localizer {
    static configure(getTemplateString: (key: TranslationKey) => string | null): void;
    static getString<K extends TranslationKey>(key: K, ...params: GetLocalizerParameters<K>): string;
    private static _getTemplateString?;
}
