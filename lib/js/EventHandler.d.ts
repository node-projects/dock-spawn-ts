export declare class EventHandler {
    target: EventListenerOrEventListenerObject;
    eventName: string;
    source: Element | Window;
    constructor(source: Element | Window, eventName: string, target: EventListenerOrEventListenerObject | ((e: any) => void), useCapture?: boolean | AddEventListenerOptions);
    cancel(): void;
}
