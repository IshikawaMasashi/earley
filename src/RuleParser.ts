import { RuleSet } from './RuleSet';
import { EarleyParser } from './EarleyParser';
import IDebugConsole from './IDebugConsole';

// --------------------------------------------------------------------------
// The ruleparser uses the parser to parse your rules from a string
// into a RuleSet. It extends the grammar to handle *, +, ?, and | operators
// in the grammar.
// --------------------------------------------------------------------------
export class RuleParser {
  // a unique number to let us make up rule names.
  nextRuleId = 0;

  // The buildset is the rules that we are building.
  buildSet = new RuleSet();

  action?: () => void;
  parser: EarleyParser;

  /**
   * @constructor
   */
  constructor(dbg: IDebugConsole) {
    // The rules are the grammar of the rules themselves.
    const rules = new RuleSet();

    // Lets us access this from local functions inside this function.
    // var self = this;

    rules.addRule('start', ['rule']);
    rules.addRule('identifier', ["'[A-Za-z0-9_]+'"]);
    rules.addRule('terminal', ["''([^'\\\\]|\\\\.)*''"]);
    rules.addRule('expr', ['or_expr']);
    rules.addRule(
      'rule',
      ['identifier', "':'", 'expr'],
      (args: [string, string, string[]]) => {
        this.buildSet.addRule(args[0], args[2], this.action);
        return args[0];
      }
    );
    rules.addRule('rule', ['identifier', "':'"], (args: string[]) => {
      this.buildSet.addRule(args[0], [], this.action);
      return args[0];
    });
    rules.addRule(
      'or_expr',
      ['or_expr', "'\\|'", 'cat_expr'],
      (args: [string[], string, string[]]) => {
        // Implement the or operator by making two new rules.
        const name = '_' + this.nextRuleId++;
        this.buildSet.addRule(name, args[0]);
        this.buildSet.addRule(name, args[2]);
        return [name];
      }
    );
    rules.addRule('or_expr', ['cat_expr']);
    rules.addRule(
      'cat_expr',
      ['cat_expr', 'list_expr'],
      (args: [string[], string]) => {
        args[0].push(args[1]);
        return args[0];
      }
    );
    rules.addRule('cat_expr', ['list_expr'], (args: string[]) => [args[0]]);

    rules.addRule('list_expr', ['kleene_expr']);
    rules.addRule(
      'list_expr',
      ["'\\['", 'kleene_expr', "','", 'kleene_expr', "'\\]'"],
      (args: string[]) => {
        var nameOpt = '_' + this.nextRuleId++;
        var name = '_' + this.nextRuleId++;

        this.buildSet.addRule(nameOpt, [name]);

        this.buildSet.addRule(nameOpt, [], (_args: string[]) => [] as string[]);

        this.buildSet.addRule(name, [args[1]], (args: string[]) => args); // list of one element.)

        this.buildSet.addRule(
          name,
          [name, args[3], args[1]],
          (args: [string[], string, string]) => {
            // join the lists and return the result.
            args[0].push(args[2]);
            return args[0];
          }
        );

        return nameOpt;
      }
    );

    rules.addRule(
      'kleene_expr',
      ['basic_expr', "'[\\+\\*\\?]'"],
      (args: string[]) => {
        var name = '_' + this.nextRuleId++;

        // Simulates kleene-star operations by adding more rules.
        if (args[1] == '*') {
          this.buildSet.addRule(
            name,
            [name, args[0]],
            (args: [string[], string]) => {
              args[0].push(args[1]);
              return args[0];
            }
          );
          this.buildSet.addRule(name, [], (_args: string[]) => [] as string[]);
        } else if (args[1] == '?') {
          this.buildSet.addRule(name, [args[0]]);
          this.buildSet.addRule(name, [], (args: string[]) => null as unknown);
        } else if (args[1] == '+') {
          var name2 = '_' + this.nextRuleId++;
          this.buildSet.addRule(name, [name2, args[0]]);
          this.buildSet.addRule(name2, [name2, args[0]]);
          this.buildSet.addRule(name2, []);
        }

        return name;
      }
    );
    rules.addRule('kleene_expr', ['basic_expr']);
    rules.addRule('basic_expr', ['identifier']);
    rules.addRule('basic_expr', ["'\\('", 'expr', "'\\)'"], (args: any) => {
      const name = '_' + this.nextRuleId++;
      this.buildSet.addRule(name, args[1]);
      return name;
    });

    rules.addRule('basic_expr', ['terminal']);

    rules.finalize();
    //dbg.printf("%s", rules);

    this.parser = new EarleyParser(rules, dbg);
  }

  // ----------------------------------------------------------------------
  // Add a token to the rules. See RuleSet.addToken().
  // ----------------------------------------------------------------------
  addToken(name: string, re: string) {
    this.buildSet.addToken(name, re);
  }

  // ----------------------------------------------------------------------
  // Add a rule to the grammar. The rule will be parsed and can include
  // regular-expression-like syntax.
  // ----------------------------------------------------------------------
  addRule(str: string, action?: any) {
    this.action = action;
    this.parser.parse(str);
  }
}
