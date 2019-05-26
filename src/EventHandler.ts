export class EventHandler {
    target: EventListenerOrEventListenerObject;
    eventName: string;
    source: Element | Window;

    constructor(source: Element | Window, eventName: string, target: EventListenerOrEventListenerObject, useCapture?: boolean | AddEventListenerOptions) {
        this.target = target;
        this.eventName = eventName;
        this.source = source;

        this.source.addEventListener(eventName, this.target, useCapture);
    }

    cancel() {
        this.source.removeEventListener(this.eventName, this.target);
    }
}