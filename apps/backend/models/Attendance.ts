import mongoose, { Schema, Document } from 'mongoose';

export enum Status {
    PRESENT = 'PRESENT',
    LATE = 'LATE',
    ABSENT = 'ABSENT',
    CHECKED_OUT = 'CHECKED_OUT',
}

export enum AttendanceMethod {
    LOCATION = 'LOCATION',
    WIFI = 'WIFI',
    QR = 'QR',
    MANUAL = 'MANUAL',
}

export interface IAttendance extends Document {
    userId: string;
    userName: string;
    department: string;
    date: string;
    checkInTime: Date;
    checkOutTime: Date | null;
    status: Status;
    method: AttendanceMethod;
    notes?: string;
    location?: { lat: number; lng: number };
}

const AttendanceSchema: Schema = new Schema({
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true }, // Keeping reference, though frontend uses string ID
    userName: { type: String, required: true }, // Snapshot of name
    department: { type: String, required: true },
    date: { type: String, required: true, index: true }, // YYYY-MM-DD
    checkInTime: { type: Date },
    checkOutTime: { type: Date },
    status: { type: String, enum: Object.values(Status), default: Status.PRESENT },
    method: { type: String, enum: Object.values(AttendanceMethod), required: true },
    notes: { type: String },
    location: {
        lat: Number,
        lng: Number
    }
}, {
    timestamps: true
});

AttendanceSchema.set('toJSON', {
    virtuals: true,
    versionKey: false,
    transform: (doc, ret) => { delete ret._id; }
});

export default mongoose.model<IAttendance>('Attendance', AttendanceSchema);
