import { NfaState } from './NfaState';

export class NFA {
  /** @constructor */
  public constructor(public start: NfaState, public end: NfaState) {}

  public toString() {
    var processed: any = {};
    var stack = [this.start];
    var str = '';

    while (stack.length > 0) {
      var state = <any>stack.pop();
      if (processed[state]) {
        continue;
      }
      processed[state] = 1;

      for (var i = 0; i < state.next.length; i++) {
        stack.push(state.next[i]);
      }
      str += state.toString();
    }
    return str;
  }
}
