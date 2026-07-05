/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import { 
  Plus, 
  Settings, 
  Pause, 
  Play, 
  ShieldCheck, 
  Trash2, 
  Sliders, 
  AlertCircle, 
  RefreshCw 
} from "lucide-react";
import { Queue, RetryPolicy } from "../types";

interface QueuesTabProps {
  queues: Queue[];
  retryPolicies: RetryPolicy[];
  onPauseQueue: (id: string) => void;
  onResumeQueue: (id: string) => void;
  onCreateQueue: (data: {
    projectId: string;
    name: string;
    priority: number;
    concurrencyLimit: number;
    retryPolicyId: string;
  }) => Promise<void>;
  onTriggerRefresh: () => void;
}

export const QueuesTab: React.FC<QueuesTabProps> = ({
  queues,
  retryPolicies,
  onPauseQueue,
  onResumeQueue,
  onCreateQueue,
  onTriggerRefresh,
}) => {
  const [showAddForm, setShowAddForm] = useState(false);
  const [name, setName] = useState("");
  const [priority, setPriority] = useState(5);
  const [concurrencyLimit, setConcurrencyLimit] = useState(3);
  const [retryPolicyId, setRetryPolicyId] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Set default retry policy
  useEffect(() => {
    if (retryPolicies.length > 0 && !retryPolicyId) {
      setRetryPolicyId(retryPolicies[0].id);
    }
  }, [retryPolicies, retryPolicyId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError("Queue name cannot be empty.");
      return;
    }

    // Clean queue naming checks
    const formattedName = name.trim().toLowerCase().replace(/[^a-z0-9-_]/g, "-");
    if (queues.some((q) => q.name === formattedName)) {
      setError("A queue with this name already exists in this project.");
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      await onCreateQueue({
        projectId: "proj_1",
        name: formattedName,
        priority,
        concurrencyLimit,
        retryPolicyId,
      });
      setName("");
      setPriority(5);
      setConcurrencyLimit(3);
      setShowAddForm(false);
    } catch (err: any) {
      setError(err.message || "Failed to create queue.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Tab Header */}
      <div className="flex justify-between items-center border-b border-border-subtle pb-6">
        <div>
          <p className="text-xs uppercase tracking-[0.25em] text-slate-500 font-mono font-semibold">
            Queue Configurations & Allocations
          </p>
          <h2 className="font-serif italic text-2xl text-slate-100 tracking-tight mt-1">
            Distributed Queue Orchestrator
          </h2>
        </div>
        <button
          onClick={() => setShowAddForm(!showAddForm)}
          className="flex items-center space-x-2 px-4 py-2 border border-brand text-brand hover:bg-brand/10 text-xs font-mono uppercase tracking-widest transition-all cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>Provision Queue</span>
        </button>
      </div>

      {/* Create Queue Drawer/Form */}
      {showAddForm && (
        <form onSubmit={handleSubmit} className="bg-bg-card border border-border-subtle rounded-2xl p-6 space-y-4 shadow-xl">
          <div className="flex items-center space-x-2 border-b border-border-subtle pb-3">
            <Settings className="w-4 h-4 text-brand" />
            <h3 className="text-xs font-mono uppercase tracking-wider text-slate-200">
              Provision New Job Queue
            </h3>
          </div>

          {error && (
            <div className="bg-rose-950/20 border border-rose-900/30 p-3 rounded-lg text-rose-400 text-xs flex items-center space-x-2">
              <AlertCircle className="w-4 h-4" />
              <span>{error}</span>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Name */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-mono text-slate-400 uppercase tracking-wider font-semibold">
                Queue Name (Slug)
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. priority-push-notifications"
                className="w-full bg-bg-deep text-slate-100 border border-border-subtle rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-brand/80 font-mono transition-all"
              />
            </div>

            {/* Retry Policy Select */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-mono text-slate-400 uppercase tracking-wider font-semibold">
                Retry backoff strategy mapping
              </label>
              <select
                value={retryPolicyId}
                onChange={(e) => setRetryPolicyId(e.target.value)}
                className="w-full bg-bg-deep text-slate-100 border border-border-subtle rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-brand/80 font-mono transition-all"
              >
                {retryPolicies.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} ({p.strategy})
                  </option>
                ))}
              </select>
            </div>

            {/* Priority Slider */}
            <div className="space-y-1.5">
              <div className="flex justify-between items-center text-[10px] font-mono text-slate-400 uppercase tracking-wider font-semibold">
                <span>Queue Priority Weight</span>
                <span className="text-brand font-bold">Lvl {priority}/10</span>
              </div>
              <input
                type="range"
                min="1"
                max="10"
                value={priority}
                onChange={(e) => setPriority(Number(e.target.value))}
                className="w-full h-1 bg-[#222] rounded-lg appearance-none cursor-pointer accent-brand"
              />
              <div className="flex justify-between text-[8px] text-slate-500 font-mono">
                <span>Low Priority (1)</span>
                <span>Critical Priority (10)</span>
              </div>
            </div>

            {/* Concurrency Slider */}
            <div className="space-y-1.5">
              <div className="flex justify-between items-center text-[10px] font-mono text-slate-400 uppercase tracking-wider font-semibold">
                <span>Concurrency limit (Max active parallel workers)</span>
                <span className="text-emerald-400 font-bold">{concurrencyLimit} active threads</span>
              </div>
              <input
                type="range"
                min="1"
                max="10"
                value={concurrencyLimit}
                onChange={(e) => setConcurrencyLimit(Number(e.target.value))}
                className="w-full h-1 bg-[#222] rounded-lg appearance-none cursor-pointer accent-emerald-500"
              />
              <div className="flex justify-between text-[8px] text-slate-500 font-mono">
                <span>Throttle limit (1)</span>
                <span>High load (10)</span>
              </div>
            </div>
          </div>

          <div className="flex justify-end space-x-2 pt-4 border-t border-border-subtle">
            <button
              type="button"
              onClick={() => setShowAddForm(false)}
              className="px-3 py-1.5 bg-[#181818] border border-border-subtle hover:bg-[#222] text-slate-300 rounded-lg text-xs font-semibold transition-all cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-4 py-1.5 bg-brand text-bg-deep font-mono uppercase tracking-wider text-xs font-bold hover:opacity-90 disabled:opacity-50 rounded transition-all flex items-center space-x-1 cursor-pointer"
            >
              {isSubmitting && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
              <span>Deploy Queue</span>
            </button>
          </div>
        </form>
      )}

      {/* Queues List Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {queues.map((q) => {
          const associatedPolicy = retryPolicies.find((p) => p.id === q.retryPolicyId);
          return (
            <div
              key={q.id}
              className={`bg-bg-card border rounded-2xl p-5 space-y-4 shadow-sm transition-all ${
                q.isPaused ? "border-amber-950/60 bg-[#0f0f0f]" : "border-border-subtle hover:border-border-accent"
              }`}
            >
              {/* Header Status */}
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="text-sm font-semibold text-slate-200 font-mono">
                    {q.name}
                  </h3>
                  <p className="text-[9px] text-slate-500 font-mono">
                    ID: {q.id}
                  </p>
                </div>
                <span className={`px-2 py-0.5 rounded text-[8px] font-mono tracking-wider font-semibold ${
                  q.isPaused 
                    ? "bg-amber-950/20 text-amber-400 border border-amber-900/30" 
                    : "bg-emerald-950/20 text-emerald-400 border border-emerald-900/30"
                }`}>
                  {q.isPaused ? "PAUSED" : "ACTIVE"}
                </span>
              </div>

              {/* Specs Metrics */}
              <div className="grid grid-cols-2 gap-4 border-y border-border-subtle py-3">
                <div className="space-y-1">
                  <span className="text-[9px] font-mono text-slate-500 uppercase">Priority Weight</span>
                  <div className="flex items-center space-x-1.5">
                    <Sliders className="w-3.5 h-3.5 text-brand" />
                    <span className="text-xs font-semibold text-slate-300 font-sans">
                      Lvl {q.priority}/10
                    </span>
                  </div>
                </div>

                <div className="space-y-1">
                  <span className="text-[9px] font-mono text-slate-500 uppercase">Concurrency Max</span>
                  <div className="flex items-center space-x-1.5">
                    <Settings className="w-3.5 h-3.5 text-emerald-400" />
                    <span className="text-xs font-semibold text-slate-300 font-sans">
                      {q.concurrencyLimit} Tasks
                    </span>
                  </div>
                </div>
              </div>

              {/* Associated Backoff Policy */}
              {associatedPolicy && (
                <div className="bg-bg-deep/60 rounded-xl p-3 border border-border-subtle space-y-1">
                  <div className="flex items-center space-x-1.5 text-[9px] font-mono text-slate-400">
                    <ShieldCheck className="w-3.5 h-3.5 text-brand" />
                    <span className="tracking-wider uppercase">BACKOFF STRATEGY</span>
                  </div>
                  <h4 className="text-[11px] font-bold text-slate-300 font-sans">
                    {associatedPolicy.name}
                  </h4>
                  <p className="text-[9px] text-slate-500 font-mono leading-relaxed">
                    Strategy: {associatedPolicy.strategy} ({associatedPolicy.maxRetries} max attempts, {associatedPolicy.baseDelayMs / 1000}s base delay)
                  </p>
                </div>
              )}

              {/* Action Operations */}
              <div className="flex justify-end space-x-2 pt-2">
                {q.isPaused ? (
                  <button
                    onClick={() => onResumeQueue(q.id)}
                    className="flex items-center space-x-1 px-3 py-1.5 bg-emerald-950/20 hover:bg-emerald-950/40 text-emerald-400 border border-emerald-900/30 rounded-lg text-[10px] font-mono font-bold transition-all cursor-pointer"
                  >
                    <Play className="w-3 h-3 fill-current" />
                    <span>RESUME POLLING</span>
                  </button>
                ) : (
                  <button
                    onClick={() => onPauseQueue(q.id)}
                    className="flex items-center space-x-1 px-3 py-1.5 bg-amber-950/20 hover:bg-amber-950/40 text-amber-400 border border-amber-900/30 rounded-lg text-[10px] font-mono font-bold transition-all cursor-pointer"
                  >
                    <Pause className="w-3 h-3 fill-current" />
                    <span>PAUSE QUEUE</span>
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
