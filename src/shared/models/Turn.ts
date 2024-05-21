import {Schema, Document} from "npm:mongoose@^6.7";
import {CreateIndexesOptions} from "npm:mongodb@5.7.0";
import {TurnDetails, TurnStatus} from '../Types.ts';

export const turnSchema = new Schema(
    {
      turn_id: String,
      turn: Number,
      user_name: String,
      status: {
        type: String,
        enum: Object.values(TurnStatus),
      },
    },
    {
      toObject: {transform, flattenMaps: true},
      toJSON: {transform},
      collection: 'turns-deno',
      timestamps: true,
      versionKey: false,
    },
);

turnSchema.index({'turn_id': 1}, <CreateIndexesOptions>{name: 'turn_id_index', unique: true, background: true});
turnSchema.index({'turn': 1}, <CreateIndexesOptions>{name: 'turn_index', unique: true, background: true});
turnSchema.index({'status': 1}, <CreateIndexesOptions>{name: 'status_index', background: true});

function transform(doc: any, ret: any) {
  delete ret._id;
  delete ret.createdAt;
  delete ret.updatedAt;
}

export interface ITurnModel extends TurnDetails, Document {
}
