export default class Player {
  constructor(id, name) {
    this.id = id;
    this.name = name;
    this.hand = [null, null, null, null];
    this.score = 0;
    this.isReady = false;
  }
}
