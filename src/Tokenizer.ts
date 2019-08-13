import { NfaState } from './NfaState';
import { NFA } from './Nfa';
import { DfaState } from './DfaState';
import {
  POST_NEWLINE,
  PRE_NEWLINE,
  DIGIT_CHAR,
  ANY_CHAR,
  CharMatcher
} from './CharMatcher';
import { RangeMatcher } from './RangeMatcher';
import { Token } from './Token';
import IDebugConsole from './IDebugConsole';

/** @constructor */
export class Tokenizer {
  root = new NfaState();
  expr?: string; // = null;
  index = 0;
  listId = 1;
  dfaCache: { [key: string]: DfaState } = {};

  // text to tokenize.
  text = '';

  // for each line, the character position of that line in the text.
  lineNumbers: number[] = [];

  // users can redefine these if they want.
  EOF_TOKEN = {};
  IGNORE_TOKEN = {};

  // check this to determine if we have reached the end of the text.
  finished = true;

  rootDfa?: DfaState;

  //   dbg: IDebugConsole;
  constructor(readonly dbg: IDebugConsole) {}

  addToken(id: string | {}, expr: string) {
    this.expr = expr;
    this.index = 0;
    var nfa = this.parseAlternation();
    this.root.next.push(nfa.start);
    nfa.end.accept = id;
  }

  ignore(expr: string) {
    this.addToken(this.IGNORE_TOKEN, expr);
  }

  eof() {
    return this.index == this.expr!.length;
  }

  matchChar(ch: string) {
    if (this.expr![this.index] == ch) {
      this.index++;
      return true;
    }
    return false;
  }

  peek(ch: string) {
    return this.expr![this.index] == ch;
  }

  parseChar() {
    if (this.matchChar('\\')) {
      if (this.matchChar('n')) {
        return '\n';
      } else if (this.matchChar('r')) {
        return '\r';
      } else if (this.matchChar('t')) {
        return '\t';
      } else if (this.matchChar('d')) {
        return DIGIT_CHAR;
      } else {
        return this.expr![this.index++];
      }
    } else if (this.matchChar('.')) {
      return ANY_CHAR;
    } else if (this.matchChar('$')) {
      return PRE_NEWLINE;
    } else if (this.matchChar('^')) {
      return POST_NEWLINE;
    } else {
      return this.expr![this.index++];
    }
  }

  parseRange() {
    var include = true;
    var ranges: any[] = [];

    while (!this.eof() && !this.peek(']')) {
      if (this.matchChar('^')) {
        include = false;
      }
      var first = this.parseChar();
      var last = first;
      if (this.matchChar('-')) {
        last = this.parseChar();
      }

      if (first == DIGIT_CHAR) {
        first = '0';
        last = '9';
      }

      //dbg.printf("Pushing range %s..%s\n", first, last );
      ranges.push([first, last]);
    }

    var state = new NfaState(<any>new RangeMatcher(ranges, include));
    return new NFA(state, state);
  }

  parseBasic() {
    var nfa;

    if (this.matchChar('(')) {
      nfa = this.parseAlternation();
      if (!this.matchChar(')')) {
        throw "Expected ')'";
      }
    } else if (this.matchChar('[')) {
      //dbg.printf("Encountered RANGE!\n");
      nfa = this.parseRange();
      if (!this.matchChar(']')) {
        throw "Expected ']'";
      }
    } else {
      var state = new NfaState(new CharMatcher(this.parseChar()));
      nfa = new NFA(state, state);
    }

    return nfa;
  }

  parseKleene() {
    var nfa = this.parseBasic();
    // var splitter;
    if (this.matchChar('+')) {
      let splitter = new NfaState();
      nfa.end.next.push(splitter);
      splitter.next.push(nfa.start);
      nfa.end = splitter;
    } else if (this.matchChar('*')) {
      let splitter = new NfaState();
      splitter.next.push(nfa.start);
      nfa.end.next.push(splitter);
      nfa.start = splitter;
      nfa.end = splitter;
    } else if (this.matchChar('?')) {
      var start = new NfaState();
      var end = new NfaState();
      start.next.push(nfa.start);
      start.next.push(end);
      nfa.end.next.push(end);
      nfa.start = start;
      nfa.end = end;
    }

    return nfa;
  }

  parseConcat() {
    var start = new NfaState();
    var end = start;
    for (;;) {
      if (this.peek('|') || this.peek(')') || this.eof()) {
        break;
      }
      var nfa = this.parseKleene();
      end.next.push(nfa.start);
      end = nfa.end;
    }
    return new NFA(start, end);
  }

  parseAlternation() {
    var start = new NfaState();
    var end = new NfaState();
    do {
      var nfa = this.parseConcat();
      start.next.push(nfa.start);
      nfa.end.next.push(end);
    } while (this.matchChar('|'));

    return new NFA(start, end);
  }

  addState(nfaStateList: NfaState[], accepts: string[], nfaState: NfaState) {
    if (nfaState.lastList == this.listId) {
      //dbg.printf("Skip adding nfa State [%d]\n", nfaState.id );
      return;
    }

    //dbg.printf("Add NFA state [%d]\n", nfaState.id );
    if (nfaState.accept !== undefined) {
      accepts.push(<string>nfaState.accept);
    }

    nfaState.lastList = this.listId;
    nfaStateList.push(nfaState);

    if (nfaState.mchar === undefined) {
      for (var i = 0; i < nfaState.next.length; i++) {
        this.addState(nfaStateList, accepts, nfaState.next[i]);
      }
    }
  }

  nextState(dfaState: DfaState, ch: number | string) {
    var nfaStateList: NfaState[] = [];
    var accepts: string[] = [];
    var i;
    //dbg.printf("Transition from DFA[%d] on ch=%s\n", dfaState.id, ch );

    this.listId++;

    for (i = 0; i < dfaState.nfaStates.length; i++) {
      var nfaState = dfaState.nfaStates[i];
      if (nfaState.mchar !== undefined) {
        if (nfaState.mchar.match(ch)) {
          this.addState(nfaStateList, accepts, nfaState.next[0]);
        } else if (ch == PRE_NEWLINE || ch == POST_NEWLINE) {
          this.addState(nfaStateList, accepts, nfaState);
        }
      }
    }

    nfaStateList.sort(function(a, b) {
      return a.id - b.id;
    });

    var key = '';
    for (i = 0; i < nfaStateList.length; i++) {
      key += nfaStateList[i].id + '.';
    }

    if (this.dfaCache[key] === undefined) {
      dfaState = new DfaState();
      //dbg.printf("Created DFA state [%d] accepts=%s\n", dfaState.id, accepts );
      dfaState.nfaStates = nfaStateList;
      dfaState.accepts = accepts;
      this.dfaCache[key] = dfaState;
    } else {
      //dbg.printf("Returning cached DFA state [%d] accepts=%s\n",
      //        this.dfaCache[key].id, this.dfaCache[key].accepts );
    }

    return this.dfaCache[key];
  }

  setText(text: string) {
    this.text = text;
    this.lineNumbers.length = 0;
    this.lineNumbers.push(0);
    this.finished = false;

    for (var i = 0; i < this.text.length; i++) {
      if (this.text[i] == '\n') {
        this.lineNumbers.push(i + 1);
      }
    }
  }

  getLine(lineno: number) {
    return this.text.substr(
      this.lineNumbers[lineno],
      this.lineNumbers[lineno + 1] - this.lineNumbers[lineno]
    );
  }

  /**
        Retrieve a list of tokens that match at a given position. The list is
        returned sorted in order of length.

        @param text Text to match.
        @param line Line number to begin matching, starting from 0
        @param position Character position on the line to begin matching.
    */
  nextTokenInternal(line: number, position: number) {
    const dbg = this.dbg;
    //var last = 0;
    let last: string | number = 0;
    var i;
    var accept = null;

    if (this.rootDfa === undefined) {
      this.rootDfa = new DfaState();
      this.addState(this.rootDfa.nfaStates, this.rootDfa.accepts, this.root);
    }

    var dfaState = this.rootDfa;

    var startPosition = this.lineNumbers[line] + position;
    //dbg.printf("Start match from %d:%d\n", line, position );

    if (startPosition == this.text.length) {
      this.finished = true;
      return new Token(this.EOF_TOKEN, '!EOF', line, position);
    }

    if (startPosition > 0) {
      last = this.text[startPosition - 1];
    }

    for (i = startPosition; i < this.text.length; i++) {
      //dbg.printf("Enter DFA state %d\n", dfaState.id );
      var ch: number | string = this.text[i];

      if (ch === '\n' && last != PRE_NEWLINE) {
        ch = PRE_NEWLINE;
        i--;
      } else if (last === '\n' || last === 0) {
        ch = POST_NEWLINE;
        i--;
      }

      if (last === '\n') {
        line++;
      }
      last = ch;

      if (dfaState.next[ch] === undefined) {
        dfaState.next[ch] = this.nextState(dfaState, ch);
      }
      dfaState = dfaState.next[ch];

      if (dfaState.accepts.length) {
        //dbg.printf("Would accept %s\n", dfaState.accepts[0] );
        //dbg.printf("i:%d line:%d lineNumbers=%d\n",
        //    i, line, this.lineNumbers[line] );
        accept = new Token(
          dfaState.accepts[0],
          this.text.substr(startPosition, i - startPosition + 1),
          line,
          startPosition - this.lineNumbers[line]
        );
      }

      if (dfaState.nfaStates.length === 0) {
        break;
      }
    }

    if (accept) {
      //dbg.printf("Returning match id=%s at %d:%d text=%s\n", accept.id,
      //    accept.locus.line, accept.locus.position, accept.text );
    } else if (0) {
      dbg.printf("Bad token at '%s'\n", this.text.substr(startPosition, 10));
      dbg.printf('ascii %d\n', this.text.charCodeAt(startPosition));
    }

    return accept;
  }

  nextToken(line: number, position: number) {
    for (;;) {
      var token = this.nextTokenInternal(line, position);
      if (token === null || token.id !== this.IGNORE_TOKEN) {
        return token;
      }
      line = token.location.line;
      position = token.location.position + token.text.length;
    }
  }
}
