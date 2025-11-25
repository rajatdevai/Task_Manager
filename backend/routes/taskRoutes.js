const express = require('express');
const taskController = require('../core/controllers/taskController');
const webhookService = require('../core/services/webhookServices');

const router = express.Router();

// ==================== TASK MANAGEMENT ROUTES ====================

/**
 * POST /api/v1/tasks
 * Create a new task
 */
router.post('/tasks', async (req, res, next) => {
    await taskController.createTask(req, res, next);
});

/**
 * GET /api/v1/tasks
 * Retrieve all tasks with optional filters
 * Query params: status, priority, limit
 */
router.get('/tasks', async (req, res, next) => {
    await taskController.getAllTasks(req, res, next);
});

/**
 * GET /api/v1/tasks/:id
 * Retrieve specific task by ID
 */
router.get('/tasks/:id', async (req, res, next) => {
    await taskController.getTaskById(req, res, next);
});

/**
 * POST /api/v1/run-job/:id
 * Execute a task (required endpoint from assignment)
 */
router.post('/run-job/:id', async (req, res, next) => {
    await taskController.executeTask(req, res, next);
});

/**
 * DELETE /api/v1/tasks/:id
 * Delete a task
 */
router.delete('/tasks/:id', async (req, res, next) => {
    await taskController.deleteTask(req, res, next);
});

/**
 * GET /api/v1/tasks/stats/overview
 * Get task statistics and summary
 */
router.get('/tasks/stats/overview', async (req, res, next) => {
    await taskController.getTaskStats(req, res, next);
});

// ==================== WEBHOOK ROUTES ====================

/**
 * POST /api/v1/webhook/test
 * Test webhook delivery without executing a task
 */
router.post('/webhook/test', async (req, res, next) => {
    try {
        const result = await webhookService.testWebhook(req.body);
        res.status(200).json({
            success: result.success,
            data: result.success ? result.data : null,
            error: !result.success ? result.error : null
        });
    } catch (error) {
        next(error);
    }
});

/**
 * GET /api/v1/webhook/logs
 * Retrieve webhook delivery logs
 */
router.get('/webhook/logs', async (req, res, next) => {
    try {
        const taskId = req.query.taskId;
        // Implementation in next artifact
        res.json({ message: 'Webhook logs endpoint', taskId });
    } catch (error) {
        next(error);
    }
});

// ==================== SYSTEM ROUTES ====================

/**
 * GET /api/v1/system/config
 * Get system configuration (non-sensitive)
 */
router.get('/system/config', (req, res) => {
    res.json({
        success: true,
        config: {
            taskSimulationDelay: process.env.TASK_SIMULATION_DELAY_MS,
            maxConcurrentTasks: process.env.MAX_CONCURRENT_TASKS,
            webhookRetryAttempts: process.env.WEBHOOK_RETRY_ATTEMPTS,
            environment: process.env.NODE_ENV
        }
    });
});

module.exports = router;