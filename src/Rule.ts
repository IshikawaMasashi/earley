import Location from './Location';
import TreeNode from './TreeNode';

var NextRuleId = 0;

// ----------------------------------------------------------------------------
// Construct a rule object.
// ----------------------------------------------------------------------------
/** @constructor */
export class Rule {
  readonly id = NextRuleId++;
  constructor(
    readonly name: string,
    readonly symbols: string[],
    readonly action?: (args: any, location: Location) => string | TreeNode
  ) {
    // this.id = NextRuleId++;
    // Name of the rule.
    // this.name = name;
    // array of symbols. If the symbol begins with ' then it is a regular
    // expression. Otherwise, it is the name of another rule. The array
    // may not be null. For an empty rule, use a zero-length array.
    // this.symbols = symbols;
    // The action. May be undefined.
    // this.action = action;
  }

  // ----------------------------------------------------------------------------
  // Returns string representation of a rule for debugging.
  // ----------------------------------------------------------------------------

  public toString() {
    let str = this.name + ':';

    for (var i = 0; i < this.symbols.length; i++) {
      str += ' ' + this.symbols[i];
    }

    if (0 && this.action) {
      // this prints out the whole function which can be undesirable.
      str += ' action=' + this.action;
    }

    return str;
  }
}
