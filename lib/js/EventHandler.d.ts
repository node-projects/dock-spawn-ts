export declare class EventHandler {
    target: EventListenerOrEventListenerObject;
    eventName: string;
    source: Element | Window;
    private readonly capture;
    constructor(source: Element | Window, eventName: string, target: EventListenerOrEventListenerObject | ((e: any) => void), useCapture?: boolean | AddEventListenerOptions);
    cancel(): void;
}
