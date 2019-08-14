# earley

TypeScript implementation of the Earley parsing algorithm

## Usage

Consider the following simple grammar for arithmetic expressions:

```
<P> ::= <S>      # the start rule
<S> ::= <S> "+" <M> | <M>
<M> ::= <M> "*" <T> | <T>
<T> ::= "1" | "2" | "3" | "4" | "5"
```

```typescript
import { RuleParser, Location } from "../src";
import EarleyParser from "../src";

class T {
  constructor(readonly location: Location, readonly value: string) {}
  public toString() {
    const value = this.value;
    return value;
  }
  public toNumber() {
    const value = this.value;
    return Number(value);
  }
}

class M {
  constructor(
    readonly location: Location,
    readonly mOrT: M | T,
    readonly t?: T
  ) {}

  public toString(): string {
    const { mOrT, t } = this;
    if (t) {
      return `${mOrT.toString()}*${t.toString()}`;
    }
    return `${mOrT.toString()}`;
  }
  public toNumber(): number {
    const { mOrT, t } = this;
    if (t) {
      return mOrT.toNumber() * t.toNumber();
    }
    return mOrT.toNumber();
  }
}

class S {
  constructor(
    readonly location: Location,
    readonly sOrM: S | M,
    readonly m?: M
  ) {}

  public toString(): string {
    const { sOrM, m } = this;
    if (m) {
      return `${sOrM.toString()}+${m.toString()}`;
    }
    return `${sOrM.toString()}`;
  }
  public toNumber(): number {
    const { sOrM, m } = this;
    if (m) {
      return sOrM.toNumber() + m.toNumber();
    }
    return sOrM.toNumber();
  }
}

class P {
  constructor(readonly location: Location, readonly s: S) {}

  public toString() {
    const s = this.s;
    return s.toString();
  }
  public toNumber() {
    const s = this.s;
    return s.toNumber();
  }
}

const rules = new RuleParser({ printf: () => {} });

rules.addRule("start: P");
rules.addRule(
  "P: S",
  (args: [S], location: Location) => new P(location, args[0])
);
rules.addRule(
  "S: S '\\+' M",
  (args: [S, string, M], location: Location) =>
    new S(location, args[0], args[2])
);
rules.addRule(
  "S: M",
  (args: [M], location: Location) => new S(location, args[0])
);
rules.addRule(
  "M: M '\\*' T",
  (args: [M, string, T], location: Location) =>
    new M(location, args[0], args[2])
);
rules.addRule(
  "M: T",
  (args: [T], location: Location) => new M(location, args[0])
);
rules.addRule(
  "T: '1'",
  (args: [string], location: Location) => new T(location, args[0])
);
rules.addRule(
  "T: '2'",
  (args: [string], location: Location) => new T(location, args[0])
);
rules.addRule(
  "T: '3'",
  (args: [string], location: Location) => new T(location, args[0])
);
rules.addRule(
  "T: '4'",
  (args: [string], location: Location) => new T(location, args[0])
);
rules.addRule(
  "T: '5'",
  (args: [string], location: Location) => new T(location, args[0])
);

const errors: string[] = [];
rules.buildSet.check(errors);

for (var i = 0; i < errors.length; i++) {
  console.log(errors[i]);
}

rules.buildSet.finalize();

const parser = new EarleyParser(rules.buildSet, { printf: () => {} });

// Parse the program into abstract syntax tree.
const p: P = parser.parse("1 + 5 * 3 * 4 + 2");

for (let i = 0; i < parser.errors.length; i++) {
  console.log(parser.errors[i]);
}

console.log(p.toString()); // 1+5*3*4+2;
console.log(p.toNumber()); // 63;
```
