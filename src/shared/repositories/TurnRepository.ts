import {DBSettings, TurnDetails, TurnStatus} from '../Types.ts';
import mongoose, {Model} from "npm:mongoose@^6.7";
import {ITurnModel, turnSchema} from '../models/Turn.ts';

export class TurnRepository {
  constructor() {
    mongoose.set('strictQuery', false);
    this.model = mongoose.model<ITurnModel>('Turn', turnSchema);
  }
  private model: Model<ITurnModel>

  public async connect(dbSettings: DBSettings) {
    const uri: string = `mongodb+srv://${dbSettings.dbUser}:${dbSettings.dbPassword}@${dbSettings.dbServer}`;
    try {
      await mongoose.connect(uri, {dbName: 'turns'});
    } catch (e) {
      console.error(e);
    }

    console.log('connected to MongoDB');
  }

  public async addTurn(turn: TurnDetails): Promise<TurnDetails> {
    const newTurn = await this.model.create(turn);
    console.log(`Turn [${newTurn.turn}] created [${newTurn.turn_id}]`);

    return newTurn.toObject();
  }

  public async getTurn(turnId: string): Promise<TurnDetails> {
    const turn = await this.model.findOne({ turn_id: turnId });
    if (!turn) {
      console.log('Turn not found');
    }
    return turn!.toObject();
  }

  public async assignTurn(turnId: string, name: string): Promise<TurnDetails> {
    const turn = await this.model.findOneAndUpdate(
        {turn_id: turnId},
        {
          $set: {user_name: name, status: TurnStatus.ASSIGNED}
        },
        {
          new: true,
          upsert: false,
        }
    );
    console.log(`Turn ${turnId} assigned`);
    return turn!.toObject();
  }

  public async reserveTurn(turnId: string): Promise<TurnDetails> {
    const turn = await this.model.findOneAndUpdate(
        {turn_id: turnId},
        {
          $set: {status: TurnStatus.RESERVED}
        },
        {
          new: true,
          upsert: false,
        }
    );
    console.log(`Turn ${turnId} reserved`);
    return turn!.toObject();
  }

  public async getNextAvailableTurn(): Promise<TurnDetails> {
    const unassignedTurn = await this.model.findOne({ status: TurnStatus.AVAILABLE });
    if (!unassignedTurn) {
      return await this.addTurn({
        turn_id: crypto.randomUUID(),
        turn: await this.getMaxTurn(),
        user_name: '',
        status: TurnStatus.AVAILABLE,
      });
    } else {
      console.log(`current available turn is [${unassignedTurn.turn}] [${unassignedTurn.turn_id}]`);
      return unassignedTurn.toObject();
    }
  }

  public async getMaxTurn(): Promise<number> {
    const maxCurrentTurn = await this.model.findOne().sort({turn:-1}).limit(1);
    if (!maxCurrentTurn) {
      return 1;
    }
    return maxCurrentTurn.turn + 1;
  }

  public async getTurns(): Promise<TurnDetails[]> {
    const turns = await this.model.find({}).sort({turn:-1});

    return turns.map((t) => t.toObject());
  }

  public async resetTurns(): Promise<void> {
    await this.model.deleteMany({});
  }
}
