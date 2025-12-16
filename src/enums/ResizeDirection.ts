/** 
 * Bit flags describing the allowed resizing direction of a dialog 
 */
export enum ResizeDirection {
    None = 0,
    North = 1,
    NorthEast = 2,
    East = 4,
    SouthEast = 8,
    South = 16,
    SouthWest = 32,
    West = 64,
    NorthWest = 128,
    Sides = North | South | East | West,
    Angles = NorthEast | SouthEast | SouthWest | NorthWest,
    All = North | South | East | West | NorthEast | NorthWest | SouthEast | SouthWest
}
