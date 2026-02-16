import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import dotenv from 'dotenv';
import { createServer } from 'http';
import { Server } from 'socket.io';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import mongoSanitize from 'express-mongo-sanitize';
import hpp from 'hpp';
import apiRoutes from './routes/api';
import * as UserController from './controllers/userController';
import * as SettingsController from './controllers/settingsController';

dotenv.config();

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
    cors: {
        origin: "*", // Allow all for dev, restrict in prod if needed
        methods: ["GET", "POST", "PUT", "DELETE"]
    }
});

// Security Middleware
app.use(helmet()); // Set security headers
app.use(mongoSanitize()); // Prevent NoSQL injection
app.use(hpp()); // Prevent HTTP Parameter Pollution

// Rate Limiting
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // Limit each IP to 100 requests per windowMs
    standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
    legacyHeaders: false, // Disable the `X-RateLimit-*` headers
    message: 'Too many requests from this IP, please try again later.'
});
app.use('/api', limiter); // Apply to API routes

// CORS Configuration
const whitelist = process.env.CORS_WHITELIST ? process.env.CORS_WHITELIST.split(',') : ['http://localhost:3000', 'http://localhost:5173'];
const corsOptions = {
    origin: function (origin: any, callback: any) {
        if (!origin || whitelist.indexOf(origin) !== -1 || process.env.NODE_ENV !== 'production') {
            // Allow requests with no origin (like mobile apps or curl requests)
            // or whitelisted origins
            callback(null, true);
        } else {
            callback(new Error('Not allowed by CORS'));
        }
    },
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'x-forwarded-for'],
    credentials: true
};

app.use(cors(corsOptions));
app.use(express.json({ limit: '10mb' }));

// Routes
app.use('/api', apiRoutes);

// Socket.io
io.on('connection', (socket) => {
    console.log('Client connected:', socket.id);

    socket.on('disconnect', () => {
        console.log('Client disconnected:', socket.id);
    });
});

// Make io available in routes
app.set('io', io);

// Database Connection
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/attendflow';
console.log('Connecting to MongoDB at:', MONGODB_URI.replace(/:([^:@]+)@/, ':****@'));

mongoose.connect(MONGODB_URI)
    .then(() => {
        console.log('✅ Connected to MongoDB');
        UserController.seedUsers();
    })
    .catch(err => console.error('❌ MongoDB Connection Error:', err));

// Background Cleanup (Junk data, expired QRs, old records)
// Run once on startup, then every hour
SettingsController.cleanupJunkData();
setInterval(SettingsController.cleanupJunkData, 60 * 60 * 1000);

// Start Server
const PORT = parseInt(process.env.PORT || '5001', 10);
httpServer.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Server running on port ${PORT}`);
});
