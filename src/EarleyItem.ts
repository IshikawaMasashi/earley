import Location from './Location';
import { Rule } from './Rule';
import { Token } from './Token';

var NextId = 0;
/** @constructor */
export class EarleyItem {
  public id = NextId++;
  constructor(
    public rule: Rule,
    public pos: number,
    public base: number,
    public token?: Token | EarleyItem,
    public prev?: EarleyItem,
    public location?: Location
  ) {}

  toString() {
    var str = '[' + this.id + '] ' + this.rule.name + ':';
    for (var i = 0; i < this.rule.symbols.length; i++) {
      if (i == this.pos) {
        str += ' .';
      }
      str += ' ' + this.rule.symbols[i];
    }

    if (i == this.pos) {
      str += ' .';
    }
    str += ', ' + this.base;
    if (this.token instanceof Token) {
      str += ', token=' + this.token.text;
    } else if (this.token) {
      str += ', rule=' + this.token.rule;
    }
    if (this.prev) {
      str += ', prev=' + this.prev.id;
    }
    return str;
  }
}
