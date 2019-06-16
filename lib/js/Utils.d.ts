import { DockNode } from "./DockNode";
export declare class Utils {
    private static _counter;
    static getPixels(pixels: string): number;
    static disableGlobalTextSelection(element: HTMLElement): void;
    static enableGlobalTextSelection(element: HTMLElement): void;
    static isPointInsideNode(px: number, py: number, node: DockNode): boolean;
    static getNextId(prefix: string): string;
    static removeNode(node: Node): boolean;
    static orderByIndexes<T>(array: T[], indexes: number[]): any[];
    static arrayRemove<T>(array: T[], value: any): T[] | false;
    static arrayContains<T>(array: T[], value: T): boolean;
    static arrayEqual<T>(a: T[], b: T[]): boolean;
}
