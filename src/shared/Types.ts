export enum MessageType {
  DIRECT = 'DIRECT',
  GET_TURN = 'GET_TURN',
  TURN_URL = 'TURN_URL',
}

export enum TurnStatus {
  ASSIGNED = 'ASSIGNED',
  AVAILABLE = 'AVAILABLE',
  RESERVED = 'RESERVED',
}

export interface DBSettings {
  dbCollection: string;
  dbServer: string;
  dbUser: string;
  dbPassword: string;
}

export interface TurnDetails {
  turn_id?: string;
  turn: number;
  user_name: string;
  status: TurnStatus;
}

export interface Message {
  server_url: string,
  next_available_turn: string,
}
