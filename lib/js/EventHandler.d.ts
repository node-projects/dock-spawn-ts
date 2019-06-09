export declare class EventHandler {
    target: EventListenerOrEventListenerObject;
    eventName: string;
    source: Element | Window;
    constructor(source: Element | Window, eventName: string, target: EventListenerOrEventListenerObject, useCapture?: boolean | AddEventListenerOptions);
    cancel(): void;
}
