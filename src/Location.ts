/**
  Represents a location in the source file. (The name "location" cannot be used
  because it has a special meaning in browsers.) This is used throughout the
  compiler to map program statements to token positions.
 */

export default class Location {
  /**
   *
   * @param line
   * @param position
   */
  constructor(readonly line: number, readonly position: number) {}
  toString() {
    const line = this.line;
    const position = this.position;
    return `${line + 1}:${position + 1}`;
  }
}
