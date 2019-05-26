export class Utils {

    private static _counter: number = 0;

    static getPixels(pixels) {
        if (pixels === null) {
            return 0;
        }

        return parseInt(pixels.replace('px', ''));
    }

    static disableGlobalTextSelection() {
        document.body.classList.add('disable-selection');
    }

    static enableGlobalTextSelection() {
        document.body.classList.remove('disable-selection');
    }

    static isPointInsideNode(px, py, node): boolean {
        var element = node.container.containerElement;

        return (
            px >= element.offsetLeft &&
            px <= element.offsetLeft + element.clientWidth &&
            py >= element.offsetTop &&
            py <= element.offsetTop + element.clientHeight
        );
    }

    static getNextId(prefix): string {
        return prefix + Utils._counter++;
    }

    static removeNode(node): boolean {
        if (node.parentNode === null) {
            return false;
        }

        node.parentNode.removeChild(node);

        return true;
    }


    static orderByIndexes(array, indexes) {
        var sortedArray = [];

        for (var i = 0; i < indexes.length; i++) {
            sortedArray.push(array[indexes[i]]);
        }

        return sortedArray;
    }
}