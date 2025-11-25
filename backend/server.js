const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const dbManager = require('./config/database.config');
const taskRoutes = require('./routes/taskRoutes');
const { BaseApplicationError } = require('./utils/errors/customErrors');

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// ==================== MIDDLEWARE ====================

// Body parsers
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// CORS
app.use(cors({
    origin: process.env.CORS_ORIGIN || '*',
    credentials: true
}));

// Request logging middleware
app.use((req, res, next) => {
    const start = Date.now();
    res.on('finish', () => {
        const duration = Date.now() - start;
        console.log(`[${new Date().toISOString()}] ${req.method} ${req.path} - ${res.statusCode} (${duration}ms)`);
    });
    next();
});

// Health check endpoint
app.get('/health', (req, res) => {
    res.status(200).json({
        success: true,
        status: 'operational',
        timestamp: new Date().toISOString(),
        uptime: process.uptime()
    });
});

// ==================== ROUTES ====================

app.use('/api/v1', taskRoutes);

// API info
app.get('/api/v1/info', (req, res) => {
    res.json({
        service: 'Task Manager API',
        version: process.env.API_VERSION || 'v1',
        environment: process.env.NODE_ENV,
        timestamp: new Date().toISOString()
    });
});

// ==================== ERROR HANDLING ====================

// 404 handler
app.use((req, res) => {
    res.status(404).json({
        success: false,
        error: {
            code: 'ROUTE_NOT_FOUND',
            message: `Route ${req.method} ${req.path} not found`,
            timestamp: new Date().toISOString()
        }
    });
});

// Global error handler
app.use((error, req, res, next) => {
    console.error('❌ Error caught:', error);

    if (error instanceof BaseApplicationError) {
        return res.status(error.statusCode).json(error.toJSON());
    }

    // Unhandled error
    res.status(500).json({
        success: false,
        error: {
            code: 'INTERNAL_SERVER_ERROR',
            message: process.env.NODE_ENV === 'production' 
                ? 'An unexpected error occurred' 
                : error.message,
            timestamp: new Date().toISOString()
        }
    });
});

// ==================== SERVER STARTUP ====================

async function startServer() {
    try {
        // Initialize database
        await dbManager.initialize();
        console.log('✅ Database initialized');

        // Start HTTP server
        app.listen(PORT, () => {
            console.log(`
╔════════════════════════════════════════╗
║  Task Manager API Server               ║
║  Running on: http://localhost:${PORT}   ║
║  Environment: ${process.env.NODE_ENV}           ║
║  Mode: Ready for operations             ║
╚════════════════════════════════════════╝
            `);
        });

    } catch (error) {
        console.error('❌ Failed to start server:', error.message);
        process.exit(1);
    }
}

// ==================== GRACEFUL SHUTDOWN ====================

process.on('SIGTERM', async () => {
    console.log('\n🛑 SIGTERM received. Shutting down gracefully...');
    await dbManager.close();
    process.exit(0);
});

process.on('SIGINT', async () => {
    console.log('\n🛑 SIGINT received. Shutting down gracefully...');
    await dbManager.close();
    process.exit(0);
});

// Start the server
startServer();

module.exports = app;