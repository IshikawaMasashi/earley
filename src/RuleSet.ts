import { Tokenizer } from './Tokenizer';
import { Rule } from './Rule';
import IDebugConsole from './IDebugConsole';

export class RuleSet {
  // Each entry is an array of rules that have the same name.
  rules: { [key: string]: Rule[] } = {};
  // list of terminals in the grammar, from highest priority to lowest.
  terminals: string[] = [];
  // Keep track of which terminals have been added already.
  terminalsAdded: any = {};
  // map from rule name to map of symbols of FIRST set.
  first: { [key: string]: { [key: string]: number } } = {};
  // Whitespace can be significant in some languages. For now, we ignore it.
  eatWhiteSpace = true;
  joinExpr: string;
  // should be calculated later to be something not in the grammar.
  EOF_TOKEN = "'!EOF'";

  follow: { [key: string]: { [key: string]: number } } = {};
  // ----------------------------------------------------------------------------
  // Construct a ruleset object.
  // ----------------------------------------------------------------------------
  /** @constructor */
  constructor() {
    if (this.eatWhiteSpace) {
      this.joinExpr = ' *';
    } else {
      this.joinExpr = '';
    }
    this.addRule('_start', ['start', this.EOF_TOKEN]);
  }
  // A constant representing nothing in the FIRST set.
  //EPSILON = {
  //    toString: function () {
  //        return "EPSILON";
  //    }
  //};

  EPSILON = 'EPSILON';

  // ------------------------------------------------------------------------
  // Return string representation for debugging.
  // ------------------------------------------------------------------------
  toString() {
    var str = '';
    for (var name in this.rules) {
      var rules = this.rules[name];
      for (var i = 0; i < rules.length; i++) {
        str += rules[i].toString() + '\n';
      }
    }

    return str;
  }

  // ------------------------------------------------------------------------
  // Verify consistency of the rules.
  //
  // errors - an array. Text describing the errors will be added to the end of this array.
  //
  // Returns: Number of errors found.
  // ------------------------------------------------------------------------
  check(errors: string[]) {
    var size = errors.length;

    // for each rule name,
    for (var ruleName in this.rules) {
      // for each rule by that name,
      var rules = this.rules[ruleName];
      for (var i = 0; i < rules.length; i++) {
        var rule = rules[i];
        for (var j = 0; j < rule.symbols.length; j++) {
          var symbol = rule.symbols[j];
          if (symbol.length === 0) {
            errors.push(
              "Error: Rule '" +
                ruleName +
                "' contains a zero length symbol: " +
                symbol
            );
            // Verify that all non-terminals in the rule exist.
          } else if (symbol[0] != "'") {
            if (this.rules[symbol] === undefined) {
              errors.push(
                "Error: Rule'" +
                  ruleName +
                  "' contains an undefined symbol: " +
                  symbol
              );
            }
            // 2. Verify that all terminals are valid regular expressions.
          } else {
            // not easily done....
          }
        }
      }
    }
    return errors.length - size;
  }

  // ------------------------------------------------------------------------
  // Transform the grammar to try to reduce the number of rules.
  // ------------------------------------------------------------------------
  optimize() {
    var changed = 1;
    // loop until no change.
    while (changed) {
      changed = 0;

      // for each rule name,
      for (var name in this.rules) {
        var rules = this.rules[name];

        // inline the rule if it has no alternatives, one symbol, and
        // no associated actions.
        if (
          rules.length == 1 &&
          rules[0].name != '_start' &&
          !rules[0].action
        ) {
          this.replaceRule(rules[0].name, rules[0].symbols);
          changed |= 1;
        }
      }

      //dbg.printf("Iteration---------------------------\n");
      //dbg.print(this.toString());
    }
  }

  // ------------------------------------------------------------------------
  // Remove quotes from a string.
  // ------------------------------------------------------------------------
  innerExpr(symbol: string) {
    return symbol.substr(1, symbol.length - 2);
  }

  // ------------------------------------------------------------------------
  // Delete the rule, and replace all references to the rule with the
  // given symbols.
  // ------------------------------------------------------------------------
  replaceRule(name: string, newSymbols: string[]) {
    delete this.rules[name];
    for (var ruleName in this.rules) {
      var rules = this.rules[ruleName];
      for (var i = 0; i < rules.length; i++) {
        for (var j = 0; j < rules[i].symbols.length; j++) {
          if (rules[i].symbols[j] == name) {
            rules[i].symbols.splice(j, 1);
            for (var k = 0; k < newSymbols.length; k++) {
              rules[i].symbols.splice(j + k, 0, newSymbols[k]);
            }
            j += newSymbols.length - 1;
          }
        }
      }
    }
  }

  // ------------------------------------------------------------------------
  // Add the rule to the set.
  // ------------------------------------------------------------------------
  addRule(name: string, symbols: string[], action?: any) {
    if (this.rules[name] === undefined) {
      this.rules[name] = [];
    }

    this.rules[name].push(new Rule(name, symbols, action));
    for (var i = 0; i < symbols.length; i++) {
      if (
        symbols.length > 0 &&
        symbols[i][0] == "'" &&
        !this.terminalsAdded[symbols[i]]
      ) {
        this.terminalsAdded[symbols[i]] = 1;
        this.terminals.push(symbols[i]);
      }
    }
  }

  // ------------------------------------------------------------------------
  // Add a token. This simply creates a new rule.
  // ------------------------------------------------------------------------
  addToken(name: string, re: string) {
    this.addRule(name, ["'" + re + "'"]);
  }

  // ------------------------------------------------------------------------
  // Compute rules that are nullable (non-terminal leads to nothing)
  // ------------------------------------------------------------------------
  computeFirst() {
    this.first = {};
    var name;
    for (name in this.rules) {
      this.first[name] = {};
    }

    var changed = true;
    var self = this;

    function addFirst(name: string, token: string) {
      var ret = !(token in self.first[name]);
      self.first[name][token] = 1;
      return ret;
    }

    function merge(destName: string, sourceName: string) {
      var ret = false; //0;
      for (var token in self.first[sourceName]) {
        //ret |= addFirst(destName, token);
        ret = ret || addFirst(destName, token);
      }
      return ret;
    }

    // loop until no change.
    while (changed) {
      changed = false;

      // for each rule name,
      for (name in this.rules) {
        var rules = this.rules[name];
        // for each RHS of the rule,
        for (var i = 0; i < rules.length; i++) {
          // If the rule has no symbols,
          if (rules[i].symbols.length === 0) {
            // add EPSILON to first set
            changed = changed || addFirst(name, this.EPSILON);
          }

          // for each symbol of the rule,
          for (var j = 0; j < rules[i].symbols.length; j++) {
            // if it is a terminal
            if (rules[i].symbols[j][0] == "'") {
              changed = changed || addFirst(name, rules[i].symbols[j]);
              break;

              // if it's a terminal,
            } else {
              changed = changed || merge(name, rules[i].symbols[j]);

              if (this.first[rules[i].symbols[j]][this.EPSILON] !== 1) {
                // continue only if it contains the epsilon
                // symbol.
                break;
              }
            }
          }
        }
      }
    }
  }

  // ------------------------------------------------------------------------
  // Compute follow set of all non-terminals.
  // ------------------------------------------------------------------------
  computeFollow() {
    // var name;
    this.follow = {};
    for (let name in this.rules) {
      this.follow[name] = {};
    }

    var changed = true; //1;

    while (changed) {
      changed = false; //0;
      var f;
      for (let name in this.rules) {
        var rules = this.rules[name];
        for (var i = 0; i < rules.length; i++) {
          var rule = rules[i];
          for (var j = 0; j < rule.symbols.length; j++) {
            if (rule.symbols[j][0] === "'") {
              continue;
            }
            var follow = this.follow[rule.symbols[j]];

            if (j == rule.symbols.length - 1) {
              if (rule.symbols[j][0] != "'" && rule.symbols[j] != name) {
                for (f in this.follow[name]) {
                  if (f !== this.EPSILON) {
                    //dbg.printf("%s follows %s cause it's last of %s\n", f, rule.symbols[j], name );
                    //changed |= follow[f] === undefined;
                    changed = changed || follow[f] === undefined;
                    follow[f] = 1;
                  }
                }
              }
            } else if (
              rule.symbols[j + 1][0] == "'" ||
              rule.symbols[j + 1] === this.EOF_TOKEN
            ) {
              //changed |= follow[rule.symbols[j + 1]] === undefined;
              changed = changed || follow[rule.symbols[j + 1]] === undefined;
              follow[rule.symbols[j + 1]] = 1;
              //dbg.printf("%s follows %s\n", rule.symbols[j+1],
              //    rule.symbols[j]);
            } else {
              for (f in this.first[rule.symbols[j + 1]]) {
                if (f !== this.EPSILON) {
                  //dbg.printf("%s follows %s via %s\n",
                  //    f, name, rule.symbols[j+1] );
                  //changed |= follow[f] === undefined;
                  changed = changed || follow[f] === undefined;
                  follow[f] = 1;
                }
              }
            }
          }
        }
      }
    }
  }

  finalize() {
    this.optimize();
    this.computeFirst();
    this.computeFollow();
  }

  createTokenizer(dbg: IDebugConsole) {
    var tokenizer = new Tokenizer(dbg);
    tokenizer.ignore('[ \t\r\u001a]+');

    for (var i = 0; i < this.terminals.length; i++) {
      //dbg.printf("Add token %s='%s'\n",
      //    this.terminals[i],
      //    this.innerExpr( this.terminals[i] ) );
      tokenizer.addToken(this.terminals[i], this.innerExpr(this.terminals[i]));
    }

    tokenizer.EOF_TOKEN = this.EOF_TOKEN;
    return tokenizer;
  }
}
