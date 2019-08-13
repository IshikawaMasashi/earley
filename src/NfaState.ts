import { CharMatcher, getNextStateId } from './CharMatcher';

export class NfaState {
  mchar?: CharMatcher;
  next: NfaState[] = [];
  id = getNextStateId(); //NextStateId++;
  lastList = 0;
  accept: string | {} | undefined = undefined;
  /** @constructor */
  constructor(charMatcher?: CharMatcher) {
    this.mchar = charMatcher;
  }
  toString() {
    var str = '\nState [' + this.id + '] ch=' + this.mchar + '\n';
    if (this.accept !== undefined) {
      str += '    Accept ' + this.accept + '\n';
    }
    for (var i = 0; i < this.next.length; i++) {
      str +=
        '    ch=' + this.next[i].mchar + ' goto [' + this.next[i].id + ']\n';
    }
    return str;
  }
}
