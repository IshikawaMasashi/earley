import { getNextStateId } from './CharMatcher';
import { NfaState } from './NfaState';

/** @constructor */
export class DfaState {
  public nfaStates: NfaState[] = [];
  public next: { [key: string]: DfaState } = {};
  public accepts: string[] = [];
  public id = getNextStateId(); //NextStateId++;
  public constructor() {}
}
