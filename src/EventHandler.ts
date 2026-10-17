export class EventHandler {
    target: EventListenerOrEventListenerObject;
    eventName: string;
    source: Element | Window;
    private readonly capture: boolean;

    constructor(source: Element | Window, eventName: string, target: EventListenerOrEventListenerObject | ((e: any) => void), useCapture?: boolean | AddEventListenerOptions) {
        this.target = target;
        this.eventName = eventName;
        this.source = source;
        this.capture = typeof useCapture === 'boolean' ? useCapture : !!useCapture?.capture;

        this.source.addEventListener(eventName, this.target, useCapture);
    }

    cancel() {
        this.source.removeEventListener(this.eventName, this.target, this.capture);
    }
}
