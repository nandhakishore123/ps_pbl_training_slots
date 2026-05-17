import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import path from 'path';
import { fileURLToPath } from 'url';

import authRoutes from './features/auth/auth.routes.js';
import pointsRoutes from './features/points/points.routes.js';
import trainingRoutes from './features/training/training.routes.js';

const app = express();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(cors({
    origin: function(origin, callback) {
        if (!origin) return callback(null, true);
        const allowedOrigins = [
            'http://localhost:5173',
            // 'https://5dnv4qb3-5173.inc1.devtunnels.ms',
            // 'https://h0bfbxwv-5000.inc1.devtunnels.ms',
            // 'https://h0bfbxwv-5173.inc1.devtunnels.ms',
            // 'https://h0bfbxwv-5174.inc1.devtunnels.ms',
        ];

        if (origin && origin.endsWith('.serveousercontent.com')) return callback(null, true);

        if (allowedOrigins.includes(origin) ||
            /^http:\/\/(localhost|10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.)/.test(origin)) {
            return callback(null, true);
        }
        callback(null, true);
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-New-Access-Token']
}));

// Health check endpoint
app.get('/health', (req, res) => {
    res.status(200).json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        uptime: process.uptime()
    });
});

// Static course assets
app.use('/courses/ps_courses', express.static(path.join(__dirname, 'courses', 'ps_courses')));
app.use('/courses/pbl_courses', express.static(path.join(__dirname, 'courses', 'pbl_courses')));

app.use('/api/auth', authRoutes);
app.use('/api/points', pointsRoutes);
app.use('/api/training', trainingRoutes);

// Global error handler
app.use((err, req, res, next) => {
    console.error('Global error:', err);
    
    res.status(err.status || 500).json({
        success: false,
        message: err.message || 'Internal server error',
        ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
    });
});

export default app;
