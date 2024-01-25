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
        var _a, _b;
        return formatString((_b = (_a = Localizer._getTemplateString) === null || _a === void 0 ? void 0 : _a.call(Localizer, key)) !== null && _b !== void 0 ? _b : Defaults[key], ...params);
    }
}
//# sourceMappingURL=Localizer.js.map