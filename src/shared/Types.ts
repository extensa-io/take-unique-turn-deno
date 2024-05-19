export enum MessageType {
  DIRECT = 'DIRECT',
  GET_TURN = 'GET_TURN',
  TURN_URL = 'TURN_URL',
}

export interface TurnDetails {
  turn: number;
  user_name: string;
  assigned: boolean;
}

export interface Turn {
  [id: string] : TurnDetails
}

export interface Message {
  server_url: string,
  next_available_turn: string,
}
