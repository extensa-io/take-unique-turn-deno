import {Turn} from '../Types.ts';

export class TurnService {
  constructor() {
    this.createNextTurn();
  }

  public turns: Turn = {};
  public currentTurn: number = 0;
  public nextAvailableTurn: string = '';

  public assignTurn(id: string, userName: string): number {
    if (!this.turns[id].assigned) {
      this.turns[id].user_name = userName;
      this.turns[id].assigned = true;
    }

    return this.turns[id].turn;
  }

  public createNextTurn() {
    this.currentTurn++;
    this.nextAvailableTurn = crypto.randomUUID();

    this.turns[this.nextAvailableTurn] = {
      turn: this.currentTurn,
      user_name: '',
      assigned: false,
    };
  }

}
