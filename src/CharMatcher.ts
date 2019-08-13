var NextStateId = 0;

export function getNextStateId() {
  return NextStateId++;
}

export var POST_NEWLINE = -1;
export var PRE_NEWLINE = -2;
export var DIGIT_CHAR = -3;
export var ANY_CHAR = -4;

/** 
  When the match function is called, it will return true if the argument
  matches a particular character.

  @constructor 
 */
export class CharMatcher {
  public constructor(public mchar: number | string) {}

  match(ch: number | string) {
    //dbg.printf("Compare %s with %s\n", this.mchar, ch );
    if (this.mchar == DIGIT_CHAR) {
      return ch >= '0' && ch <= '9';
    } else if (this.mchar == ANY_CHAR) {
      return ch !== POST_NEWLINE && ch !== PRE_NEWLINE && ch != '\n';
    } else {
      return ch == this.mchar;
    }
  }

  toString() {
    if (this.mchar == DIGIT_CHAR) {
      return '\\d';
    } else {
      return this.mchar;
    }
  }
}
