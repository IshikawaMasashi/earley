import { Tokenizer } from './Tokenizer';
import { RuleSet } from './RuleSet';
import { EarleyItem } from './EarleyItem';
import Location from './Location';
import { Rule } from './Rule';
import { Token } from './Token';
import IDebugConsole from './IDebugConsole';
/**
  The Earley parser is like the proverbial tortoise. Its simplicity lets slowly
  but surely it chug through any grammar you throw its way.

  @constructor
 */
export class EarleyParser {
  tokenizer: Tokenizer;
  rules: { [key: string]: Rule[] };
  first: { [key: string]: { [key: string]: number } };
  errors: string[] = [];

  location?: Location;
  //EPSILON: {
  //    toString: () => string;
  //};
  EPSILON: string;
  debug = false; //true;
  // dbg: IDebugConsole;
  constructor(ruleSet: RuleSet, readonly dbg: IDebugConsole) {
    // Map from rule name to NFA.
    this.tokenizer = ruleSet.createTokenizer(dbg);
    this.EPSILON = ruleSet.EPSILON;

    ruleSet.computeFirst();

    this.rules = ruleSet.rules;
    this.first = ruleSet.first;

    //this.debug = true;
  }

  getNonTerminal(name: string) {
    return this.rules[name];
  }

  getRegexFromTerminal(terminal: string) {
    return terminal.substr(1, terminal.length - 2);
  }

  isTerminal(symbol: string) {
    return symbol !== undefined && symbol[0] == "'";
  }

  isNonTerminal(symbol: string) {
    return symbol !== undefined && symbol[0] != "'";
  }

  parse(text: string) {
    const dbg = this.dbg;
    var states = [[new EarleyItem(this.rules['_start'][0], 0, 0)]];

    var line = 0;
    var position = 0;
    var j;
    this.tokenizer.setText(text);

    this.errors = [];

    for (var i = 0; ; i++) {
      var token = this.tokenizer.nextToken(line, position);
      if (token === null) {
        this.errors.push(`Bad token at ${line}:${position}\n`);
        dbg.printf('Bad token!\n');
        return null;
      } else if (this.debug) {
        dbg.printf('Got token %s at %s\n', token, token.location);
      }
      this.location = token.location;

      states.push([]);
      var processedTo = 0;
      while (processedTo < states[i].length) {
        // remain calm
        this.predict(states[i], processedTo, i, token);
        this.complete(states, i, processedTo, i);
        processedTo++;
      }

      this.scan(states, i, token);

      if (states[i].length === 0) {
        this.errors.push(`Syntax error at ${this.location}: ${token}`);
        for (j = 0; j < states[i - 1].length; j++) {
          this.errors.push(`    ${states[i - 1][j]}\n`);
        }
        break;
      }

      if (this.debug) {
        this.printState(states, i);
      }

      line = token.location.line;
      position = token.location.position + token.text.length;

      if (token.id === this.tokenizer.EOF_TOKEN) {
        //dbg.printf("Reached end of input.\n");
        i++;
        break;
      }
    }

    if (this.debug) {
      this.printState(states, i);
    }
    if (states[i].length) {
      return this.evaluate(states[i][0]);
    }

    this.errors.push(`Syntax error at ${this.location}`);
    for (j = 0; j < states[i - 1].length; j++) {
      this.errors.push(`    ${states[i - 1][j]}\n`);
    }
    return null;
  }

  predict(items: EarleyItem[], index: number, base: number, token: Token) {
    var item = items[index];
    if (this.isNonTerminal(item.rule.symbols[item.pos])) {
      var nonTerminal = this.getNonTerminal(item.rule.symbols[item.pos]);
      for (var i = 0; i < nonTerminal.length; i++) {
        var rule = nonTerminal[i];
        if (
          rule.symbols.length === 0 ||
          rule.symbols[0][0] === "'" ||
          this.first[rule.symbols[0]][<string>token.id] ||
          this.first[rule.symbols[0]][this.EPSILON]
        ) {
          this.addToState(items, rule, 0, base, undefined, undefined);
        }
      }
    }
  }

  complete(states: EarleyItem[][], i: number, index: number, _base: number) {
    var item = states[i][index];
    if (item.pos == item.rule.symbols.length) {
      var baseItems = states[item.base];
      for (var j = 0; j < baseItems.length; j++) {
        if (baseItems[j].rule.symbols[baseItems[j].pos] == item.rule.name) {
          this.addToState(
            states[i],
            baseItems[j].rule,
            baseItems[j].pos + 1,
            baseItems[j].base,
            item,
            baseItems[j]
          );
        }
      }
    }
  }

  scan(states: EarleyItem[][], i: number, token: Token) {
    var items = states[i];
    for (var j = 0; j < items.length; j++) {
      if (items[j].rule.symbols[items[j].pos] == token.id) {
        states[i + 1].push(
          new EarleyItem(
            items[j].rule,
            items[j].pos + 1,
            items[j].base,
            token,
            items[j],
            this.location
          )
        );
      }
    }
  }

  addToState(
    items: EarleyItem[],
    rule: Rule,
    pos: number,
    base: number,
    token?: Token | EarleyItem,
    prev?: EarleyItem
  ) {
    for (var i = 0; i < items.length; i++) {
      if (
        items[i].rule === rule &&
        items[i].pos === pos &&
        items[i].base === base
      ) {
        return;
      }
    }
    items.push(new EarleyItem(rule, pos, base, token, prev, this.location));
  }

  printState(states: EarleyItem[][], index: number) {
    const dbg = this.dbg;

    if (!this.debug) {
      return;
    }
    var items = states[index];
    dbg.printf('State [%d]\n', index);
    for (var i = 0; i < items.length; i++) {
      dbg.printf('%s\n', items[i]);
    }
    dbg.printf('\n');
  }

  // ----------------------------------------------------------------------
  // Given an earley item, reconstruct the dervation and invoke any associated
  // actions.
  // ----------------------------------------------------------------------
  evaluate(item_in?: EarleyItem) {
    if (!item_in) {
      return null;
    }

    var args: any[] = [];
    var item: EarleyItem | undefined = item_in;
    var location = item_in.location;

    while (item) {
      if (item.token instanceof Token) {
        args.unshift(item.token.text);
      } else if (item.token) {
        args.unshift(this.evaluate(item.token));
      }
      location = item.location;
      item = item.prev;
    }

    var result;

    if (item_in.rule.action) {
      result = item_in.rule.action(args, location!);
    } else {
      result = args[0];
    }
    return result;
  }
}
