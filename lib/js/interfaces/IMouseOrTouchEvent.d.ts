export interface IMouseOrTouchEvent {
    clientX: number;
    clientY: number;
    changedTouches?: IMouseOrTouchEvent[];
    touches?: IMouseOrTouchEvent[];
}
