export class EventHandler {
    target;
    eventName;
    source;
    capture;
    constructor(source, eventName, target, useCapture) {
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
//# sourceMappingURL=EventHandler.js.map