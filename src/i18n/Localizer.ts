import { Defaults, GetLocalizerParameters, TranslationKey } from "./Defaults.js";

function formatString(template: string, ...params: any[]): string {
    return template.replace(/{(\d+)}/g, (_match: string, n: string) => {
        const index = Number.parseInt(n);
        return params[index].toString();
    });
}

export class Localizer {
    public static configure(getTemplateString: (key: TranslationKey) => string | null): void {
        Localizer._getTemplateString = getTemplateString;
    }

    public static getString<K extends TranslationKey>(key: K, ...params: GetLocalizerParameters<K>): string {
        return formatString(
            Localizer._getTemplateString?.(key) ?? Defaults[key],
            ...params
        );
    }

    private static _getTemplateString?: (key: TranslationKey) => string | null;
}