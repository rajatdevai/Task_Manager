const taskService = require('../services/taskServices');
const { BaseApplicationError } = require('../../utils/errors/customErrors');

/**
 * Task Controller
 * Handles HTTP requests and delegates to service layer
 */
class TaskController {

    /**
     * Create new task
     * POST /api/v1/tasks
     */
    async createTask(req, res, next) {
        try {
            const result = await taskService.createTask(req.body);
            res.status(201).json(result);
        } catch (error) {
            next(error);
        }
    }

    /**
     * Get all tasks with optional filters
     * GET /api/v1/tasks?status=queued&priority=high&limit=50
     */
    async getAllTasks(req, res, next) {
        try {
            const filters = {
                status: req.query.status,
                priority: req.query.priority,
                limit: req.query.limit
            };

            const result = await taskService.getAllTasks(filters);
            res.status(200).json(result);
        } catch (error) {
            next(error);
        }
    }

    /**
     * Get single task by ID
     * GET /api/v1/tasks/:id
     */
    async getTaskById(req, res, next) {
        try {
            const result = await taskService.getTaskById(req.params.id);
            res.status(200).json(result);
        } catch (error) {
            next(error);
        }
    }

    /**
     * Execute a task
     * POST /api/v1/run-job/:id
     */
    async executeTask(req, res, next) {
        try {
            const result = await taskService.executeTask(req.params.id);
            res.status(200).json(result);
        } catch (error) {
            next(error);
        }
    }

    /**
     * Delete a task
     * DELETE /api/v1/tasks/:id
     */
    async deleteTask(req, res, next) {
        try {
            const result = await taskService.deleteTask(req.params.id);
            res.status(200).json(result);
        } catch (error) {
            next(error);
        }
    }

    /**
     * Get task statistics
     * GET /api/v1/tasks/stats/overview
     */
    async getTaskStats(req, res, next) {
        try {
            const allTasks = await taskService.getAllTasks({});
            
            const stats = {
                total: allTasks.count,
                queued: allTasks.data.filter(t => t.status === 'queued').length,
                processing: allTasks.data.filter(t => t.status === 'processing').length,
                completed: allTasks.data.filter(t => t.status === 'completed').length,
                failed: allTasks.data.filter(t => t.status === 'failed').length,
                recurring: allTasks.data.filter(t => t.isRecurring).length
            };

            res.status(200).json({
                success: true,
                data: stats
            });
        } catch (error) {
            next(error);
        }
    }
}

module.exports = new TaskController();