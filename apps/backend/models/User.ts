import mongoose, { Schema, Document } from 'mongoose';

export enum Role {
    ADMIN = 'ADMIN',
    SUPERVISOR = 'SUPERVISOR',
    EMPLOYEE = 'EMPLOYEE',
}

export interface IUser extends Document {
    userId: string;
    password?: string;
    name: string;
    role: Role;
    avatar: string;
    departments: string[];
    idCardFront?: string;
    idCardBack?: string;
    customSchedule?: Map<string, { enabled: boolean; startTime: string; endTime: string }>;
}

const UserSchema: Schema = new Schema({
    userId: { type: String, unique: true, sparse: true },
    password: { type: String, select: false },
    name: { type: String, required: true },
    role: { type: String, enum: Object.values(Role), default: Role.EMPLOYEE },
    avatar: { type: String },
    departments: [{ type: String }],
    idCardFront: { type: String },
    idCardBack: { type: String },
    customSchedule: {
        type: Map, of: new Schema({
            enabled: Boolean,
            startTime: String,
            endTime: String
        })
    }
}, {
    timestamps: true
});

// Allow virtual 'id'
// Allow virtual 'id' in both JSON and Objects (consistent serialization)
const options = {
    virtuals: true,
    versionKey: false,
    transform: (doc: any, ret: any) => {
        delete ret._id;
        return ret;
    }
};

UserSchema.set('toJSON', options);
UserSchema.set('toObject', options);

export default mongoose.model<IUser>('User', UserSchema);
