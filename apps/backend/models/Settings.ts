import mongoose, { Schema, Document } from 'mongoose';

export interface IOfficeLocation {
    name: string;
    lat: number;
    lng: number;
    radiusMeters: number;
}

export interface ITeamSettings {
    useCustomIPs: boolean;
    allowedIPs: string[];
    useCustomLocations: boolean;
    officeLocations: IOfficeLocation[];
    useCustomQr: boolean;
    useCustomSchedule: boolean;
    schedule: Record<string, { enabled: boolean; startTime: string; endTime: string }>;
}

export interface ISettings extends Document {
    schedule: Map<string, { enabled: boolean; startTime: string; endTime: string }>;
    exceptions: Map<string, { enabled: boolean; startTime: string; endTime: string }>;
    requireLocation: boolean;
    requireWifi: boolean;
    requireQr: boolean;
    officeLocation?: {
        lat: number;
        lng: number;
        radiusMeters: number;
    };
    officeLocations: IOfficeLocation[];
    allowedWifiSSID: string;
    allowedIPs: string[];
    gracePeriodMinutes: number;
    qrExpirySeconds: number;
    qrGenerationConfig: {
        length: number;
        prefix: string;
        includeNumbers: boolean;
        includeLetters: boolean;
    };
    globalQrCode?: {
        code: string;
        timestamp: number;
        expiresIn: number;
    };
    teamQrCodes: Map<string, {
        code: string;
        timestamp: number;
        expiresIn: number;
    }>;
    teamSettings: Map<string, ITeamSettings>;
    dataRetentionDays: number;
}

// Singleton Settings Document
const SettingsSchema: Schema = new Schema({
    schedule: {
        type: Map, of: new Schema({
            enabled: Boolean,
            startTime: String,
            endTime: String
        })
    },
    exceptions: {
        type: Map, of: new Schema({
            enabled: Boolean,
            startTime: String,
            endTime: String
        })
    },
    requireLocation: { type: Boolean, default: true },
    requireWifi: { type: Boolean, default: false },
    requireQr: { type: Boolean, default: false },
    officeLocation: {
        lat: Number,
        lng: Number,
        radiusMeters: Number
    },
    officeLocations: [{
        name: { type: String, default: 'Office' },
        lat: Number,
        lng: Number,
        radiusMeters: { type: Number, default: 500 }
    }],
    allowedWifiSSID: { type: String, default: '' },
    allowedIPs: { type: [String], default: [] },
    gracePeriodMinutes: { type: Number, default: 15 },
    qrExpirySeconds: { type: Number, default: 10 },
    qrGenerationConfig: {
        length: { type: Number, default: 8 },
        prefix: { type: String, default: '' },
        includeNumbers: { type: Boolean, default: true },
        includeLetters: { type: Boolean, default: true }
    },
    globalQrCode: {
        code: String,
        timestamp: Number,
        expiresIn: Number
    },
    teamQrCodes: {
        type: Map,
        of: new Schema({
            code: String,
            timestamp: Number,
            expiresIn: Number
        })
    },
    teamSettings: {
        type: Map,
        of: new Schema({
            useCustomIPs: { type: Boolean, default: false },
            allowedIPs: { type: [String], default: [] },
            useCustomLocations: { type: Boolean, default: false },
            officeLocations: [{
                name: { type: String, default: 'Office' },
                lat: Number,
                lng: Number,
                radiusMeters: { type: Number, default: 500 }
            }],
            useCustomQr: { type: Boolean, default: false },
            useCustomSchedule: { type: Boolean, default: false },
            schedule: {
                type: Map, of: new Schema({
                    enabled: Boolean,
                    startTime: String,
                    endTime: String
                })
            }
        })
    },
    dataRetentionDays: { type: Number, default: 365 }
}, {
    timestamps: true
});

export default mongoose.model<ISettings>('Settings', SettingsSchema);
