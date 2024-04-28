import { Defaults } from "./Defaults.js";
function formatString(template, ...params) {
    return template.replace(/{(\d+)}/g, (_match, n) => {
        const index = Number.parseInt(n);
        return params[index].toString();
    });
}
export class Localizer {
    static configure(getTemplateString) {
        Localizer._getTemplateString = getTemplateString;
    }
    static getString(key, ...params) {
        return formatString(Localizer._getTemplateString?.(key) ?? Defaults[key], ...params);
    }
    static _getTemplateString;
}
//# sourceMappingURL=Localizer.js.map