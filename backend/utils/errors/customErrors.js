/**
 * Custom Error Classes
 * Professional approach: Specific error types for better error handling
 */

class BaseApplicationError extends Error {
    constructor(message, statusCode = 500, errorCode = 'INTERNAL_ERROR') {
        super(message);
        this.name = this.constructor.name;
        this.statusCode = statusCode;
        this.errorCode = errorCode;
        this.timestamp = new Date().toISOString();
        Error.captureStackTrace(this, this.constructor);
    }

    toJSON() {
        return {
            success: false,
            error: {
                code: this.errorCode,
                message: this.message,
                timestamp: this.timestamp
            }
        };
    }
}

class TaskNotFoundError extends BaseApplicationError {
    constructor(taskId) {
        super(`Task with ID '${taskId}' does not exist`, 404, 'TASK_NOT_FOUND');
        this.taskId = taskId;
    }
}

class InvalidTaskStateError extends BaseApplicationError {
    constructor(currentState, attemptedAction) {
        super(
            `Cannot ${attemptedAction} task in '${currentState}' state`,
            400,
            'INVALID_STATE_TRANSITION'
        );
        this.currentState = currentState;
        this.attemptedAction = attemptedAction;
    }
}

class ValidationError extends BaseApplicationError {
    constructor(field, message) {
        super(`Validation failed for '${field}': ${message}`, 400, 'VALIDATION_ERROR');
        this.field = field;
    }
}

class DatabaseOperationError extends BaseApplicationError {
    constructor(operation, details) {
        super(`Database operation '${operation}' failed: ${details}`, 500, 'DB_OPERATION_FAILED');
        this.operation = operation;
    }
}

class WebhookDeliveryError extends BaseApplicationError {
    constructor(url, reason) {
        super(`Webhook delivery to '${url}' failed: ${reason}`, 502, 'WEBHOOK_DELIVERY_FAILED');
        this.webhookUrl = url;
    }
}

class TaskExecutionError extends BaseApplicationError {
    constructor(taskId, reason) {
        super(`Task execution failed for '${taskId}': ${reason}`, 500, 'EXECUTION_FAILED');
        this.taskId = taskId;
    }
}

class ConcurrencyLimitError extends BaseApplicationError {
    constructor(currentCount, limit) {
        super(
            `Maximum concurrent tasks limit reached (${currentCount}/${limit})`,
            429,
            'CONCURRENCY_LIMIT_EXCEEDED'
        );
        this.currentCount = currentCount;
        this.limit = limit;
    }
}

module.exports = {
    BaseApplicationError,
    TaskNotFoundError,
    InvalidTaskStateError,
    ValidationError,
    DatabaseOperationError,
    WebhookDeliveryError,
    TaskExecutionError,
    ConcurrencyLimitError
};