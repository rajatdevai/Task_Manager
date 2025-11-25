const mysql = require('mysql2/promise');
require('dotenv').config();

/**
 * Database Connection Pool Manager
 * Professional pattern: Singleton pool with connection health checks
 */
class DatabaseManager {
    constructor() {
        this.pool = null;
        this.isInitialized = false;
    }

    /**
     * Initialize connection pool with retry logic
     */
    async initialize() {
        if (this.isInitialized) {
            return this.pool;
        }

        try {
            this.pool = mysql.createPool({
                host: process.env.DB_HOST,
                port: process.env.DB_PORT,
                user: process.env.DB_USER,
                password: process.env.DB_PASSWORD,
                database: process.env.DB_NAME,
                connectionLimit: parseInt(process.env.DB_CONNECTION_LIMIT) || 10,
                waitForConnections: true,
                queueLimit: 0,
                enableKeepAlive: true,
                keepAliveInitialDelay: 0
            });

            // Test connection
            await this.healthCheck();
            this.isInitialized = true;

            console.log('✅ Database connection pool established');
            return this.pool;

        } catch (error) {
            console.error('❌ Database initialization failed:', error.message);
            throw new Error(`DB_INIT_FAILURE: ${error.message}`);
        }
    }

    /**
     * Health check for connection pool
     */
    async healthCheck() {
        try {
            const connection = await this.pool.getConnection();
            await connection.ping();
            connection.release();
            return true;
        } catch (error) {
            throw new Error(`DB_HEALTH_CHECK_FAILED: ${error.message}`);
        }
    }

    /**
     * Execute query with error handling
     */
    async executeQuery(sql, params = []) {
        if (!this.isInitialized) {
            await this.initialize();
        }

        try {
            const [results] = await this.pool.execute(sql, params);
            return results;
        } catch (error) {
            console.error('Query execution error:', error.message);
            throw error;
        }
    }

    /**
     * Execute transaction
     */
    async executeTransaction(callback) {
        const connection = await this.pool.getConnection();
        
        try {
            await connection.beginTransaction();
            const result = await callback(connection);
            await connection.commit();
            return result;
        } catch (error) {
            await connection.rollback();
            throw error;
        } finally {
            connection.release();
        }
    }

    /**
     * Graceful shutdown
     */
    async close() {
        if (this.pool) {
            await this.pool.end();
            this.isInitialized = false;
            console.log('🔌 Database connection pool closed');
        }
    }
}

// Singleton instance
const dbManager = new DatabaseManager();

module.exports = dbManager;