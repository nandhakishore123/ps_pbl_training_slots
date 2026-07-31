import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import path from 'path';
import { fileURLToPath } from 'url';

import authRoutes from './features/auth/auth.routes.js';
import pointsRoutes from './features/points/points.routes.js';
import trainingRoutes from './features/training/training.routes.js';
import adminRoutes from './features/admin/admin.routes.js';
import facultyRoutes from './features/faculty/faculty.routes.js';
import superAdminRoutes from './features/superadmin/superadmin.routes.js';
import announcementsRoutes from './features/announcements/announcements.routes.js';
import feedbackRoutes from './features/feedback/feedback.routes.js';
import surveyRoutes from './features/survey/survey.routes.js';
import inventoryRoutes from './features/inventory/inventory.routes.js';
// USER MANAGEMENT (non-student roles) — removable
import manageUsersRoutes from './features/manageusers/manageusers.routes.js';

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
            process.env.FRONTEND_URL || 'http://localhost:5173',
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
// USER MANAGEMENT (non-student roles) — removable. Mounted BEFORE adminRoutes so
// /manage-users resolves here under its stricter role-3 gate; every other
// /api/admin path falls through to adminRoutes unchanged.
app.use('/api/admin', manageUsersRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/faculty', facultyRoutes);
app.use('/api/superadmin', superAdminRoutes);
// Announcements router defines full subpaths (/announcements, /student-announcements)
app.use('/api', announcementsRoutes);
app.use('/api/feedback', feedbackRoutes);
app.use('/api/survey', surveyRoutes);
app.use('/api/inventory', inventoryRoutes);

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
