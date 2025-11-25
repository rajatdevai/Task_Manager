const cron = require('node-cron');
const taskService = require('./TaskService');
const taskRepository = require('../repositories/TaskRepository');
const { ConcurrencyLimitError } = require('../../utils/errors/CustomErrors');

/**
 * Task Scheduler Service
 * Manages recurring tasks and scheduled execution
 * Professional implementation with concurrency control
 */
class SchedulerService {
    constructor() {
        this.schedulerJob = null;
        this.activeTasksCount = 0;
        this.maxConcurrentTasks = parseInt(process.env.MAX_CONCURRENT_TASKS) || 5;
        this.taskQueue = [];
        this.isRunning = false;
    }

    /**
     * Start the scheduler
     * Runs every minute to check for scheduled tasks
     */
    start() {
        if (this.isRunning) {
            console.warn('⚠️ Scheduler already running');
            return;
        }

        // Main scheduler: runs every minute
        this.schedulerJob = cron.schedule('* * * * *', async () => {
            await this._checkAndExecutePendingTasks();
        });

        this.isRunning = true;
        console.log('🚀 Scheduler Service started (runs every minute)');
    }

    /**
     * Stop the scheduler
     */
    stop() {
        if (this.schedulerJob) {
            this.schedulerJob.stop();
            this.schedulerJob.destroy();
            this.isRunning = false;
            console.log('🛑 Scheduler Service stopped');
        }
    }

    /**
     * Check and execute tasks that are ready
     */
    async _checkAndExecutePendingTasks() {
        try {
            // Get all recurring tasks ready for execution
            const tasksToExecute = await taskRepository.findScheduledTasksReady();

            if (tasksToExecute.length === 0) {
                return;
            }

            console.log(`📋 Found ${tasksToExecute.length} task(s) ready for execution`);

            // Queue tasks respecting concurrency limit
            for (const task of tasksToExecute) {
                if (this.activeTasksCount >= this.maxConcurrentTasks) {
                    console.log(`⏳ Concurrency limit reached. Queuing task ${task.task_id}`);
                    this.taskQueue.push(task);
                } else {
                    await this._executeTaskAsync(task);
                }
            }

            // Process queued tasks if capacity available
            await this._processTaskQueue();

        } catch (error) {
            console.error('❌ Error in scheduler cycle:', error.message);
        }
    }

    /**
     * Execute task asynchronously
     */
    async _executeTaskAsync(task) {
        this.activeTasksCount++;

        try {
            console.log(`▶️ Executing task: ${task.task_label} (ID: ${task.task_id})`);
            await taskService.executeTask(task.task_id);
            console.log(`✅ Task completed: ${task.task_id}`);

        } catch (error) {
            console.error(`❌ Task failed: ${task.task_label}`, error.message);

        } finally {
            this.activeTasksCount--;

            // Process next queued task
            if (this.taskQueue.length > 0) {
                const nextTask = this.taskQueue.shift();
                await this._executeTaskAsync(nextTask);
            }
        }
    }

    /**
     * Process queued tasks if capacity available
     */
    async _processTaskQueue() {
        while (
            this.taskQueue.length > 0 &&
            this.activeTasksCount < this.maxConcurrentTasks
        ) {
            const task = this.taskQueue.shift();
            await this._executeTaskAsync(task);
        }
    }

    /**
     * Manually trigger task execution (for API calls)
     */
    async manualExecuteTask(taskId) {
        if (this.activeTasksCount >= this.maxConcurrentTasks) {
            throw new ConcurrencyLimitError(this.activeTasksCount, this.maxConcurrentTasks);
        }

        return await this._executeTaskAsync(
            await taskRepository.findTaskById(taskId)
        );
    }

    /**
     * Get scheduler status
     */
    getStatus() {
        return {
            isRunning: this.isRunning,
            activeTasksCount: this.activeTasksCount,
            maxConcurrentTasks: this.maxConcurrentTasks,
            queuedTasksCount: this.taskQueue.length,
            totalQueuedTasks: this.activeTasksCount + this.taskQueue.length
        };
    }
}

module.exports = new SchedulerService();