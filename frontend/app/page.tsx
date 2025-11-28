'use client';

import React, { useState, useEffect } from 'react';
import { Zap, AlertCircle, CheckCircle, Clock, Trash2, Play, Plus, X } from 'lucide-react';

interface Task {
  id: string;
  name: string;
  priority: 'low' | 'medium' | 'high';
  status: 'queued' | 'processing' | 'completed' | 'failed';
  duration: number | null;
  attempts: number;
  created: string;
}

interface FormData {
  taskName: string;
  payload: string;
  priority: 'low' | 'medium' | 'high';
  schedulePattern: string;
}

interface Stats {
  total: number;
  active: number;
  completed: number;
  failed: number;
}

export default function TaskDashboard() {
  const [activeTasks, setActiveTasks] = useState<Task[]>([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [formData, setFormData] = useState<FormData>({
    taskName: '',
    payload: '{}',
    priority: 'medium',
    schedulePattern: ''
  });
  const [filter, setFilter] = useState('all');
  const [stats, setStats] = useState<Stats>({
    total: 0,
    active: 0,
    completed: 0,
    failed: 0
  });

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    const mockTasks: Task[] = [
      {
        id: '1',
        name: 'Send Email Campaign',
        priority: 'high',
        status: 'processing',
        duration: 2500,
        attempts: 1,
        created: '2 min ago'
      },
      {
        id: '2',
        name: 'Sync CRM Data',
        priority: 'medium',
        status: 'queued',
        duration: null,
        attempts: 0,
        created: '5 min ago'
      },
      {
        id: '3',
        name: 'Generate Report',
        priority: 'low',
        status: 'completed',
        duration: 3100,
        attempts: 1,
        created: '1 hour ago'
      },
      {
        id: '4',
        name: 'Database Backup',
        priority: 'high',
        status: 'completed',
        duration: 8500,
        attempts: 2,
        created: '3 hours ago'
      }
    ];
    setActiveTasks(mockTasks);
    setStats({
      total: 12,
      active: 1,
      completed: 8,
      failed: 1
    });
  }, []);

  const statusColors = {
    queued: 'border-yellow-400 bg-yellow-900/10',
    processing: 'border-cyan-400 bg-cyan-900/10',
    completed: 'border-green-400 bg-green-900/10',
    failed: 'border-red-400 bg-red-900/10'
  };
//my self
  const statusIconColor = {
    queued: 'text-yellow-400',
    processing: 'text-cyan-400 animate-pulse',
    completed: 'text-green-500',
    failed: 'text-red-500'
  };

  const priorityDots = {
    high: 'bg-red-500',
    medium: 'bg-yellow-500',
    low: 'bg-green-500'
  };

  const handleCreateTask = () => {
    if (formData.taskName.trim()) {
      console.log('Task created:', formData);
      setShowCreateModal(false);
      setFormData({ taskName: '', payload: '{}', priority: 'medium', schedulePattern: '' });
    }
  };

  const filteredTasks = activeTasks.filter(task => {
    if (filter === 'all') return true;
    return task.status === filter;
  });

  return (
    <div className="min-h-screen" style={{ background: 'linear-gradient(135deg, #0a0e27 0%, #1a1f3a 50%, #0f1629 100%)' }}>
      {/* Animated background grid */}
      <div className="fixed inset-0 opacity-5 pointer-events-none" style={{
        backgroundImage: 'linear-gradient(0deg, transparent 24%, rgba(0, 255, 159, .05) 25%, rgba(0, 255, 159, .05) 26%, transparent 27%, transparent 74%, rgba(0, 255, 159, .05) 75%, rgba(0, 255, 159, .05) 76%, transparent 77%, transparent), linear-gradient(90deg, transparent 24%, rgba(0, 255, 159, .05) 25%, rgba(0, 255, 159, .05) 26%, transparent 27%, transparent 74%, rgba(0, 255, 159, .05) 75%, rgba(0, 255, 159, .05) 76%, transparent 77%, transparent)',
        backgroundSize: '50px 50px'
      }}></div>

      <div className="relative z-10 max-w-7xl mx-auto px-6 py-8">
        {/* Header */}
        <div className="mb-12">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-4xl font-black text-transparent bg-clip-text" style={{
                backgroundImage: 'linear-gradient(90deg, #00ff9f 0%, #ff006e 50%, #00ff9f 100%)',
                letterSpacing: '-0.02em'
              }}>
                TASK MANAGER DASHBOARD
              </h1>
              <p className="text-gray-400 text-sm mt-2 font-mono">Automation Engine v1.0 | Ready for Operations</p>
            </div>
            <button
              onClick={() => setShowCreateModal(true)}
              className="px-6 py-3 bg-linear-to-r from-cyan-500 to-blue-500 text-black font-bold hover:shadow-lg hover:shadow-cyan-500/50 transition-all transform hover:scale-105 flex items-center gap-2"
              style={{ textTransform: 'uppercase', letterSpacing: '0.1em' }}
            >
              <Plus size={20} /> Create Task
            </button>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-4 gap-4">
            {[
              { label: 'Total', value: stats.total, color: 'from-purple-500 to-purple-600' },
              { label: 'Active', value: stats.active, color: 'from-cyan-500 to-blue-600' },
              { label: 'Completed', value: stats.completed, color: 'from-green-500 to-emerald-600' },
              { label: 'Failed', value: stats.failed, color: 'from-red-500 to-pink-600' }
            ].map((stat, i) => (
              <div
                key={i}
                className="p-4 border-2 border-gray-700 bg-gray-900/50 hover:border-gray-500 transition-colors"
              >
                <p className="text-xs text-gray-400 font-mono uppercase tracking-wider mb-2">{stat.label}</p>
                <p className={`text-3xl font-black bg-clip-text text-transparent bg-linear-to-r ${stat.color}`}>
                  {stat.value}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Filter Tabs */}
        <div className="flex gap-2 mb-8 border-b border-gray-700 pb-4">
          {['all', 'queued', 'processing', 'completed', 'failed'].map(tab => (
            <button
              key={tab}
              onClick={() => setFilter(tab)}
              className={`px-4 py-2 font-mono text-sm uppercase tracking-wider transition-all ${
                filter === tab
                  ? 'text-cyan-400 border-b-2 border-cyan-400'
                  : 'text-gray-500 hover:text-gray-300'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* Tasks Container */}
        <div className="space-y-3">
          {filteredTasks.length === 0 ? (
            <div className="text-center py-12 border-2 border-dashed border-gray-700">
              <Zap className="mx-auto mb-4 text-gray-600" size={32} />
              <p className="text-gray-400 font-mono">No tasks in this category</p>
            </div>
          ) : (
            filteredTasks.map(task => (
              <div
                key={task.id}
                className={`p-6 border-2 transition-all ${statusColors[task.status]} hover:shadow-lg group`}
                style={{
                  boxShadow: task.status === 'processing' ? `0 0 20px rgba(0, 255, 159, 0.3)` : 'none'
                }}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-4 flex-1">
                    <div className="pt-1">
                      {task.status === 'processing' && <Zap className={statusIconColor[task.status]} size={20} />}
                      {task.status === 'queued' && <Clock className={statusIconColor[task.status]} size={20} />}
                      {task.status === 'completed' && <CheckCircle className={statusIconColor[task.status]} size={20} />}
                      {task.status === 'failed' && <AlertCircle className={statusIconColor[task.status]} size={20} />}
                    </div>

                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="font-bold text-white text-lg font-mono">{task.name}</h3>
                        <div className={`w-3 h-3 ${priorityDots[task.priority]}`}></div>
                        <span className="text-xs text-gray-400 font-mono uppercase">{task.priority}</span>
                      </div>

                      <div className="flex items-center gap-6 text-sm text-gray-400 font-mono">
                        <span>ID: {task.id}</span>
                        <span>Created: {task.created}</span>
                        {task.duration && <span>Duration: {(task.duration / 1000).toFixed(2)}s</span>}
                        <span>Attempts: {task.attempts}</span>
                      </div>

                      {task.status === 'processing' && (
                        <div className="mt-3 h-1 bg-gray-800 overflow-hidden">
                          <div className="h-full bg-linear-to-r from-cyan-500 to-cyan-400 w-3/4 animate-pulse"></div>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    {task.status === 'queued' && (
                      <button className="p-2 hover:bg-cyan-500/20 transition-colors" title="Execute">
                        <Play size={18} className="text-cyan-400" />
                      </button>
                    )}
                    <button className="p-2 hover:bg-red-500/20 transition-colors" title="Delete">
                      <Trash2 size={18} className="text-red-400" />
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Create Task Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50">
          <div className="bg-gray-900 border-2 border-cyan-400 p-8 w-full max-w-md">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-cyan-400 font-mono">CREATE TASK</h2>
              <button onClick={() => setShowCreateModal(false)} className="text-gray-400 hover:text-white">
                <X size={24} />
              </button>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-mono text-gray-300 mb-2">Task Name</label>
                <input
                  type="text"
                  value={formData.taskName}
                  onChange={(e) => setFormData({ ...formData, taskName: e.target.value })}
                  className="w-full px-4 py-2 bg-gray-800 border border-gray-700 text-white font-mono focus:border-cyan-400 outline-none"
                  placeholder="Enter task name..."
                />
              </div>
              <div>
                <label className="block text-sm font-mono text-gray-300 mb-2">Payload (JSON)</label>
                <textarea
                  value={formData.payload}
                  onChange={(e) => setFormData({ ...formData, payload: e.target.value })}
                  className="w-full px-4 py-2 bg-gray-800 border border-gray-700 text-white font-mono text-sm focus:border-cyan-400 outline-none h-24 resize-none"
                  placeholder="{}"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-mono text-gray-300 mb-2">Priority</label>
                  <select
                    value={formData.priority}
                    onChange={(e) => setFormData({ ...formData, priority: e.target.value as 'low' | 'medium' | 'high' })}
                    className="w-full px-4 py-2 bg-gray-800 border border-gray-700 text-white font-mono focus:border-cyan-400 outline-none"
                  >
                    <option>low</option>
                    <option>medium</option>
                    <option>high</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-mono text-gray-300 mb-2">Schedule</label>
                  <input
                    type="text"
                    value={formData.schedulePattern}
                    onChange={(e) => setFormData({ ...formData, schedulePattern: e.target.value })}
                    className="w-full px-4 py-2 bg-gray-800 border border-gray-700 text-white font-mono text-sm focus:border-cyan-400 outline-none"
                    placeholder="*/5 * * * *"
                  />
                </div>
              </div>
              <div className="flex gap-3 pt-4">
                <button
                  onClick={() => setShowCreateModal(false)}
                  className="flex-1 px-4 py-2 border border-gray-600 text-gray-300 font-mono hover:border-gray-400 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleCreateTask}
                  className="flex-1 px-4 py-2 bg-cyan-500 text-black font-bold font-mono hover:bg-cyan-400 transition-colors"
                >
                  Create
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}