const { ValidationError } = require('../utils/errors/customErrors');

/**
 * Validation Middleware
 * Validates incoming request payloads
 */
class RequestValidator {
    /**
     * Validate create task request
     */
    static validateCreateTaskRequest(req, res, next) {
        const { taskName, payload, priority } = req.body;

        // Validate taskName
        if (!taskName || typeof taskName !== 'string' || taskName.trim().length === 0) {
            throw new ValidationError('taskName', 'Must be a non-empty string');
        }

        if (taskName.length > 255) {
            throw new ValidationError('taskName', 'Must be 255 characters or less');
        }

        // Validate payload
        if (!payload) {
            throw new ValidationError('payload', 'Payload is required');
        }

        if (typeof payload !== 'object') {
            throw new ValidationError('payload', 'Payload must be a JSON object');
        }

        // Validate priority
        const validPriorities = ['low', 'medium', 'high'];
        if (!priority || !validPriorities.includes(priority.toLowerCase())) {
            throw new ValidationError('priority', 'Must be one of: low, medium, high');
        }

        // Validate optional schedule pattern
        if (req.body.schedulePattern) {
            const isValidCron = /^(\*|([0-9]|1[0-9]|2[0-9]|3[0-9]|4[0-9]|5[0-9])|\*\/([0-9]|1[0-9]|2[0-9]|3[0-9]|4[0-9]|5[0-9])) (\*|([0-9]|1[0-9]|2[0-3])|\*\/([0-9]|1[0-9]|2[0-3])) (\*|([1-9]|1[0-9]|2[0-9]|3[0-1])|\*\/([1-9]|1[0-9]|2[0-9]|3[0-1])) (\*|([1-9]|1[0-2])|\*\/([1-9]|1[0-2])) (\*|([0-6])|\*\/([0-6]))$/;
            
            if (!isValidCron.test(req.body.schedulePattern)) {
                throw new ValidationError('schedulePattern', 'Invalid cron pattern (format: minute hour day month weekday)');
            }
        }

        next();
    }

    /**
     * Validate query parameters for filtering
     */
    static validateFilterParams(req, res, next) {
        const { status, priority, limit } = req.query;

        if (status) {
            const validStatuses = ['queued', 'processing', 'completed', 'failed'];
            if (!validStatuses.includes(status.toLowerCase())) {
                throw new ValidationError('status', 'Invalid status filter');
            }
        }

        if (priority) {
            const validPriorities = ['low', 'medium', 'high'];
            if (!validPriorities.includes(priority.toLowerCase())) {
                throw new ValidationError('priority', 'Invalid priority filter');
            }
        }

        if (limit) {
            const limitNum = parseInt(limit);
            if (isNaN(limitNum) || limitNum < 1 || limitNum > 1000) {
                throw new ValidationError('limit', 'Limit must be between 1 and 1000');
            }
        }

        next();
    }

    /**
     * Validate UUID format
     */
    static validateUUIDParam(req, res, next) {
        const { id } = req.params;
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

        if (!uuidRegex.test(id)) {
            throw new ValidationError('id', 'Invalid task ID format (must be UUID)');
        }

        next();
    }
}

/**
 * Rate Limiting Middleware (Optional Enhancement)
 */
class RateLimiter {
    constructor() {
        this.requestCounts = new Map();
        this.windowMs = 60000; // 1 minute
        this.maxRequests = 100; // per window

        // Cleanup old entries every 5 minutes
        setInterval(() => this._cleanup(), 300000);
    }

    middleware(req, res, next) {
        const clientIP = req.ip;
        const now = Date.now();

        if (!this.requestCounts.has(clientIP)) {
            this.requestCounts.set(clientIP, []);
        }

        const requests = this.requestCounts.get(clientIP);
        const recentRequests = requests.filter(time => now - time < this.windowMs);

        if (recentRequests.length >= this.maxRequests) {
            return res.status(429).json({
                success: false,
                error: {
                    code: 'RATE_LIMIT_EXCEEDED',
                    message: 'Too many requests. Try again later.'
                }
            });
        }

        recentRequests.push(now);
        this.requestCounts.set(clientIP, recentRequests);

        next();
    }

    _cleanup() {
        const now = Date.now();
        for (const [clientIP, requests] of this.requestCounts.entries()) {
            const recentRequests = requests.filter(time => now - time < this.windowMs);
            if (recentRequests.length === 0) {
                this.requestCounts.delete(clientIP);
            } else {
                this.requestCounts.set(clientIP, recentRequests);
            }
        }
    }
}

module.exports = {
    RequestValidator,
    RateLimiter: new RateLimiter()
};