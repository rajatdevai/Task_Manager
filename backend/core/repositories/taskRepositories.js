const dbManager = require('../../config/database.config');
const { DatabaseOperationError } = require('../../utils/errors/customErrors');

/**
 * Task Repository Layer
 * Handles all database operations for tasks
 * Professional pattern: Separation of data access from business logic
 */
class TaskRepository {
    
    /**
     * Create new task in database
     */
    async createTask(taskData) {
        const query = `
            INSERT INTO task_queue (
                task_id, task_label, payload_data, urgency_level,
                schedule_pattern, is_recurring, next_execution_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?)
        `;

        try {
            await dbManager.executeQuery(query, [
                taskData.task_id,
                taskData.task_label,
                JSON.stringify(taskData.payload_data),
                taskData.urgency_level,
                taskData.schedule_pattern || null,
                taskData.is_recurring || false,
                taskData.next_execution_at || null
            ]);

            return await this.findTaskById(taskData.task_id);
        } catch (error) {
            throw new DatabaseOperationError('createTask', error.message);
        }
    }

    /**
     * Find task by ID
     */
    async findTaskById(taskId) {
        const query = `SELECT * FROM task_queue WHERE task_id = ?`;
        
        try {
            const results = await dbManager.executeQuery(query, [taskId]);
            
            if (results.length === 0) {
                return null;
            }

            return this._formatTaskData(results[0]);
        } catch (error) {
            throw new DatabaseOperationError('findTaskById', error.message);
        }
    }

    /**
     * Get all tasks with optional filters
     */
    async findAllTasks(filters = {}) {
        let query = `SELECT * FROM task_queue WHERE 1=1`;
        const params = [];

        if (filters.execution_state) {
            query += ` AND execution_state = ?`;
            params.push(filters.execution_state);
        }

        if (filters.urgency_level) {
            query += ` AND urgency_level = ?`;
            params.push(filters.urgency_level);
        }

        if (filters.is_recurring !== undefined) {
            query += ` AND is_recurring = ?`;
            params.push(filters.is_recurring);
        }

        query += ` ORDER BY spawned_at DESC`;

        if (filters.limit) {
            query += ` LIMIT ?`;
            params.push(parseInt(filters.limit));
        }

        try {
            const results = await dbManager.executeQuery(query, params);
            return results.map(row => this._formatTaskData(row));
        } catch (error) {
            throw new DatabaseOperationError('findAllTasks', error.message);
        }
    }

    /**
     * Update task state
     */
    async updateTaskState(taskId, newState, additionalData = {}) {
        const updates = ['execution_state = ?'];
        const params = [newState];

        if (additionalData.execution_attempts !== undefined) {
            updates.push('execution_attempts = ?');
            params.push(additionalData.execution_attempts);
        }

        if (additionalData.execution_duration_ms !== undefined) {
            updates.push('execution_duration_ms = ?');
            params.push(additionalData.execution_duration_ms);
        }

        if (additionalData.failure_reason) {
            updates.push('failure_reason = ?');
            params.push(additionalData.failure_reason);
        }

        if (newState === 'completed') {
            updates.push('completed_at = NOW()');
        }

        if (additionalData.last_executed_at) {
            updates.push('last_executed_at = ?');
            params.push(additionalData.last_executed_at);
        }

        params.push(taskId);

        const query = `
            UPDATE task_queue 
            SET ${updates.join(', ')}
            WHERE task_id = ?
        `;

        try {
            await dbManager.executeQuery(query, params);
            return await this.findTaskById(taskId);
        } catch (error) {
            throw new DatabaseOperationError('updateTaskState', error.message);
        }
    }

    /**
     * Get tasks ready for scheduled execution
     */
    async findScheduledTasksReady() {
        const query = `
            SELECT * FROM task_queue
            WHERE is_recurring = TRUE
            AND next_execution_at IS NOT NULL
            AND next_execution_at <= NOW()
            AND execution_state IN ('queued', 'completed')
        `;

        try {
            const results = await dbManager.executeQuery(query);
            return results.map(row => this._formatTaskData(row));
        } catch (error) {
            throw new DatabaseOperationError('findScheduledTasksReady', error.message);
        }
    }

    /**
     * Log execution history
     */
    async logExecution(taskId, status, startTime, endTime, errorMessage = null) {
        const duration = endTime - startTime;
        
        const query = `
            INSERT INTO execution_history (
                task_id, execution_status, started_at, finished_at, 
                duration_ms, error_message
            ) VALUES (?, ?, ?, ?, ?, ?)
        `;

        try {
            await dbManager.executeQuery(query, [
                taskId,
                status,
                new Date(startTime),
                new Date(endTime),
                duration,
                errorMessage
            ]);
        } catch (error) {
            console.error('Failed to log execution history:', error.message);
        }
    }

    /**
     * Log webhook delivery
     */
    async logWebhookDelivery(taskId, webhookUrl, payload, response) {
        const query = `
            INSERT INTO webhook_logs (
                task_id, webhook_url, payload_sent, response_status,
                response_body, delivery_success
            ) VALUES (?, ?, ?, ?, ?, ?)
        `;

        try {
            await dbManager.executeQuery(query, [
                taskId,
                webhookUrl,
                JSON.stringify(payload),
                response.status || null,
                response.body ? JSON.stringify(response.body) : null,
                response.success
            ]);
        } catch (error) {
            console.error('Failed to log webhook delivery:', error.message);
        }
    }

    /**
     * Delete task
     */
    async deleteTask(taskId) {
        const query = `DELETE FROM task_queue WHERE task_id = ?`;
        
        try {
            const result = await dbManager.executeQuery(query, [taskId]);
            return result.affectedRows > 0;
        } catch (error) {
            throw new DatabaseOperationError('deleteTask', error.message);
        }
    }

    /**
     * Format task data (parse JSON fields)
     */
    _formatTaskData(row) {
        return {
            ...row,
            payload_data: typeof row.payload_data === 'string' 
                ? JSON.parse(row.payload_data) 
                : row.payload_data,
            is_recurring: Boolean(row.is_recurring)
        };
    }
}

module.exports = new TaskRepository();