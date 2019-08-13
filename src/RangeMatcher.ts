/** 
  When the match function is called, it will return true if the argument
  matches a particular character range.

  */
export class RangeMatcher {
  /**
   *
   * @constructor
   * @param ranges
   * @param include
   */
  public constructor(
    public ranges: [number, number][],
    public include: boolean
  ) {
    // list of [ start, end ]
    // this.ranges = ranges;
    // this.include = include; // boolean
  }

  match(ch: number) {
    for (var i = 0; i < this.ranges.length; i++) {
      var range = this.ranges[i];
      if (ch >= range[0] && ch <= range[1]) {
        return this.include;
      }
    }

    return !this.include;
  }

  toString() {
    var str = '[';
    if (!this.include) {
      str += '^';
    }
    for (var i = 0; i < this.ranges.length; i++) {
      if (this.ranges[i][0] == this.ranges[i][1]) {
        str += this.ranges[i][0];
      } else {
        str += this.ranges[i][0] + '-' + this.ranges[i][1];
      }
    }
    return str + ']';
  }
}
