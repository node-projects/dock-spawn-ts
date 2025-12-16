/**
 * Bit flags describing the allowed resizing direction of a dialog
 */
export var ResizeDirection;
(function (ResizeDirection) {
    ResizeDirection[ResizeDirection["None"] = 0] = "None";
    ResizeDirection[ResizeDirection["North"] = 1] = "North";
    ResizeDirection[ResizeDirection["NorthEast"] = 2] = "NorthEast";
    ResizeDirection[ResizeDirection["East"] = 4] = "East";
    ResizeDirection[ResizeDirection["SouthEast"] = 8] = "SouthEast";
    ResizeDirection[ResizeDirection["South"] = 16] = "South";
    ResizeDirection[ResizeDirection["SouthWest"] = 32] = "SouthWest";
    ResizeDirection[ResizeDirection["West"] = 64] = "West";
    ResizeDirection[ResizeDirection["NorthWest"] = 128] = "NorthWest";
    ResizeDirection[ResizeDirection["Sides"] = 85] = "Sides";
    ResizeDirection[ResizeDirection["Angles"] = 170] = "Angles";
    ResizeDirection[ResizeDirection["All"] = 255] = "All";
})(ResizeDirection || (ResizeDirection = {}));
//# sourceMappingURL=ResizeDirection.js.map