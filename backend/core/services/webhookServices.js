const { v4: uuidv4 } = require('uuid');
const taskRepository = require('../repositories/taskRepositories');
const webhookService = require('./webhookServices');
const {
    TaskNotFoundError,
    InvalidTaskStateError,
    ValidationError,
    TaskExecutionError
} = require('../../utils/errors/customErrors');

/**
 * Task Service Layer
 * Contains all business logic for task management
 */
class TaskService {

    /**
     * Create a new task
     */
    async createTask(taskPayload) {
        // Validate input
        this._validateTaskPayload(taskPayload);

        const taskData = {
            task_id: uuidv4(),
            task_label: taskPayload.taskName,
            payload_data: taskPayload.payload,
            urgency_level: taskPayload.priority.toLowerCase(),
            schedule_pattern: taskPayload.schedulePattern || null,
            is_recurring: Boolean(taskPayload.schedulePattern),
            next_execution_at: taskPayload.schedulePattern 
                ? this._calculateNextExecution(taskPayload.schedulePattern)
                : null
        };

        const createdTask = await taskRepository.createTask(taskData);
        
        return {
            success: true,
            message: 'Task created successfully',
            data: this._formatTaskResponse(createdTask)
        };
    }

    /**
     * Get all tasks with filters
     */
    async getAllTasks(filters = {}) {
        const tasks = await taskRepository.findAllTasks({
            execution_state: filters.status,
            urgency_level: filters.priority,
            limit: filters.limit
        });

        return {
            success: true,
            count: tasks.length,
            data: tasks.map(task => this._formatTaskResponse(task))
        };
    }

    /**
     * Get single task by ID
     */
    async getTaskById(taskId) {
        const task = await taskRepository.findTaskById(taskId);
        
        if (!task) {
            throw new TaskNotFoundError(taskId);
        }

        return {
            success: true,
            data: this._formatTaskResponse(task)
        };
    }

    /**
     * Execute a task (main business logic)
     */
    async executeTask(taskId) {
        const task = await taskRepository.findTaskById(taskId);
        
        if (!task) {
            throw new TaskNotFoundError(taskId);
        }

        // Validate state transition
        if (task.execution_state === 'processing') {
            throw new InvalidTaskStateError(task.execution_state, 'execute');
        }

        const startTime = Date.now();

        try {
            // Step 1: Mark as processing
            await taskRepository.updateTaskState(taskId, 'processing', {
                execution_attempts: task.execution_attempts + 1,
                last_executed_at: new Date()
            });

            // Step 2: Simulate task execution
            await this._simulateTaskExecution(task);

            // Step 3: Mark as completed
            const endTime = Date.now();
            const completedTask = await taskRepository.updateTaskState(taskId, 'completed', {
                execution_duration_ms: endTime - startTime
            });

            // Step 4: Log execution history
            await taskRepository.logExecution(taskId, 'success', startTime, endTime);

            // Step 5: Trigger webhook
            await webhookService.deliverWebhook(completedTask);

            // Step 6: If recurring, update next execution time
            if (task.is_recurring && task.schedule_pattern) {
                await this._scheduleNextExecution(taskId, task.schedule_pattern);
            }

            return {
                success: true,
                message: 'Task executed successfully',
                data: this._formatTaskResponse(completedTask)
            };

        } catch (error) {
            const endTime = Date.now();
            
            // Log failed execution
            await taskRepository.logExecution(
                taskId, 
                'failure', 
                startTime, 
                endTime, 
                error.message
            );

            // Update task state to failed
            await taskRepository.updateTaskState(taskId, 'failed', {
                failure_reason: error.message,
                execution_duration_ms: endTime - startTime
            });

            throw new TaskExecutionError(taskId, error.message);
        }
    }

    /**
     * Delete a task
     */
    async deleteTask(taskId) {
        const task = await taskRepository.findTaskById(taskId);
        
        if (!task) {
            throw new TaskNotFoundError(taskId);
        }

        await taskRepository.deleteTask(taskId);

        return {
            success: true,
            message: 'Task deleted successfully'
        };
    }

    /**
     * Get tasks ready for scheduled execution
     */
    async getScheduledTasksForExecution() {
        return await taskRepository.findScheduledTasksReady();
    }

    // ==================== Private Helper Methods ====================

    /**
     * Validate task payload
     */
    _validateTaskPayload(payload) {
        if (!payload.taskName || payload.taskName.trim().length === 0) {
            throw new ValidationError('taskName', 'Task name is required');
        }

        if (!payload.payload) {
            throw new ValidationError('payload', 'Payload data is required');
        }

        const validPriorities = ['low', 'medium', 'high'];
        if (!validPriorities.includes(payload.priority?.toLowerCase())) {
            throw new ValidationError('priority', 'Must be one of: low, medium, high');
        }

        // Validate cron pattern if provided
        if (payload.schedulePattern) {
            if (!this._isValidCronPattern(payload.schedulePattern)) {
                throw new ValidationError('schedulePattern', 'Invalid cron pattern');
            }
        }
    }

    /**
     * Simulate task execution (placeholder for actual work)
     */
    async _simulateTaskExecution(task) {
        const delay = parseInt(process.env.TASK_SIMULATION_DELAY_MS) || 3000;
        
        // Simulate processing time
        await new Promise(resolve => setTimeout(resolve, delay));

        // Add custom logic based on task type here
        console.log(`✅ Processed task: ${task.task_label}`);
        
        return true;
    }

    /**
     * Calculate next execution time for recurring tasks
     */
    _calculateNextExecution(cronPattern) {
        // Simple implementation - in production, use node-cron parser
        const now = new Date();
        
        // For demo: if pattern is "*/5 * * * *", next run is 5 minutes from now
        if (cronPattern.startsWith('*/')) {
            const minutes = parseInt(cronPattern.split(' ')[0].replace('*/', ''));
            now.setMinutes(now.getMinutes() + minutes);
        } else {
            // Default: 1 hour from now
            now.setHours(now.getHours() + 1);
        }
        
        return now;
    }

    /**
     * Schedule next execution for recurring task
     */
    async _scheduleNextExecution(taskId, cronPattern) {
        const nextExecution = this._calculateNextExecution(cronPattern);
        
        await taskRepository.updateTaskState(taskId, 'queued', {
            next_execution_at: nextExecution
        });
    }

    /**
     * Validate cron pattern (basic validation)
     */
    _isValidCronPattern(pattern) {
        // Basic validation: should have 5 parts (minute hour day month weekday)
        const parts = pattern.trim().split(' ');
        return parts.length === 5;
    }

    /**
     * Format task for API response
     */
    _formatTaskResponse(task) {
        return {
            id: task.task_id,
            taskName: task.task_label,
            payload: task.payload_data,
            priority: task.urgency_level,
            status: task.execution_state,
            isRecurring: task.is_recurring,
            schedulePattern: task.schedule_pattern,
            nextExecutionAt: task.next_execution_at,
            executionAttempts: task.execution_attempts,
            executionDuration: task.execution_duration_ms,
            createdAt: task.spawned_at,
            updatedAt: task.modified_at,
            completedAt: task.completed_at,
            failureReason: task.failure_reason
        };
    }
}

module.exports = new TaskService();