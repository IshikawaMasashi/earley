import Location from './Location';

export class Token {
  readonly location: Location;
  /** @constructor */
  constructor(
    public id: string | {},
    public text: string,
    line: number,
    position: number
  ) {
    this.location = new Location(line, position);
  }
  toString() {
    return 'Token(' + this.text + ')';
  }
}
