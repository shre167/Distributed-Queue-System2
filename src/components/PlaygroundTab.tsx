/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
import { 
  Play, 
  Send, 
  Clock, 
  AlertTriangle, 
  CheckCircle, 
  GitCommit, 
  Layers, 
  RefreshCw 
} from "lucide-react";
import { Queue, Job } from "../types";

interface PlaygroundTabProps {
  queues: Queue[];
  recentJobs: Job[];
  onDispatchJob: (data: {
    queueId: string;
    payload: Record<string, any>;
    delayMs?: number;
    scheduledAt?: number;
    cronExpression?: string;
    parentJobId?: string;
    batchId?: string;
    maxRetries?: number;
  }) => Promise<void>;
  onDispatchBatch: (data: {
    queueId: string;
    jobsList: Record<string, any>[];
    batchId?: string;
  }) => Promise<void>;
}

export const PlaygroundTab: React.FC<PlaygroundTabProps> = ({
  queues,
  recentJobs,
  onDispatchJob,
  onDispatchBatch,
}) => {
  const [queueId, setQueueId] = useState("");
  const [taskTemplate, setTaskTemplate] = useState("push_notification");
  const [scheduleType, setScheduleType] = useState<"immediate" | "delayed" | "scheduled" | "cron">("immediate");
  const [delaySecs, setDelaySecs] = useState(10);
  const [scheduledTime, setScheduledTime] = useState("");
  const [cronExpr, setCronExpr] = useState("*/1 * * * *");
  const [parentJobId, setParentJobId] = useState("");
  const [simulateFailure, setSimulateFailure] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [maxRetries, setMaxRetries] = useState(3);

  const [notification, setNotification] = useState<{ type: "success" | "error"; msg: string } | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Set default queue
  React.useEffect(() => {
    if (queues.length > 0 && !queueId) {
      setQueueId(queues[0].id);
    }
  }, [queues, queueId]);

  const handleDispatch = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setNotification(null);

    let payload: Record<string, any> = {
      task: taskTemplate,
      duration: taskTemplate === "compile_monthly_spend" ? 4000 : 2000,
      fail: simulateFailure,
    };

    if (simulateFailure) {
      payload.errorMsg = errorMsg.trim() || `Simulated error for task type: ${taskTemplate}`;
    }

    let delayMs: number | undefined = undefined;
    let scheduledAt: number | undefined = undefined;
    let cronExpression: string | undefined = undefined;

    if (scheduleType === "delayed") {
      delayMs = delaySecs * 1000;
    } else if (scheduleType === "scheduled" && scheduledTime) {
      scheduledAt = new Date(scheduledTime).getTime();
    } else if (scheduleType === "cron") {
      cronExpression = cronExpr;
    }

    try {
      await onDispatchJob({
        queueId,
        payload,
        delayMs,
        scheduledAt,
        cronExpression,
        parentJobId: parentJobId || undefined,
        maxRetries,
      });

      setNotification({
        type: "success",
        msg: `Job successfully enqueued. Core scheduler initialized execution thread.`,
      });

      // Reset
      setSimulateFailure(false);
      setErrorMsg("");
    } catch (err: any) {
      setNotification({
        type: "error",
        msg: err.message || "Failed to submit background task.",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDispatchBatch = async () => {
    setIsSubmitting(true);
    setNotification(null);

    const batchId = `batch_playground_${Date.now().toString().substr(-6)}`;
    const list = [
      { task: `${taskTemplate}_batch_1`, duration: 2000, isBatch: true },
      { task: `${taskTemplate}_batch_2`, duration: 2500, isBatch: true },
      { task: `${taskTemplate}_batch_3`, duration: 1500, isBatch: true, fail: simulateFailure, errorMsg: "Batch worker timeout" },
      { task: `${taskTemplate}_batch_4`, duration: 3000, isBatch: true },
      { task: `${taskTemplate}_batch_5`, duration: 1800, isBatch: true },
    ];

    try {
      await onDispatchBatch({
        queueId,
        jobsList: list,
        batchId,
      });
      setNotification({
        type: "success",
        msg: `Successfully dispatched batch of 5 jobs. Batch ID: ${batchId}`,
      });
    } catch (err: any) {
      setNotification({
        type: "error",
        msg: err.message || "Failed to dispatch batch.",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="border-b border-border-subtle pb-6">
        <p className="text-xs uppercase tracking-[0.25em] text-slate-500 font-mono font-semibold">
          Asynchronous Job Dispatcher & DAG Playground
        </p>
        <h2 className="font-serif italic text-2xl text-slate-100 tracking-tight mt-1">
          Job Dispatcher & DAG Sandbox
        </h2>
      </div>

      {notification && (
        <div className={`p-4 rounded-xl border flex items-center space-x-3 text-xs font-mono transition-all duration-150 ${
          notification.type === "success" 
            ? "bg-emerald-950/20 border-emerald-900/30 text-emerald-400" 
            : "bg-rose-950/20 border-rose-900/30 text-rose-400"
        }`}>
          {notification.type === "success" ? (
            <CheckCircle className="w-5 h-5 shrink-0" />
          ) : (
            <AlertTriangle className="w-5 h-5 shrink-0" />
          )}
          <span>{notification.msg}</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Forms controls */}
        <form onSubmit={handleDispatch} className="lg:col-span-2 bg-bg-card border border-border-subtle rounded-2xl p-6 space-y-6 shadow-sm">
          <div className="flex items-center space-x-2 border-b border-border-subtle pb-3">
            <Send className="w-4 h-4 text-brand" />
            <h3 className="text-xs font-mono uppercase tracking-wider text-slate-200 font-semibold">
              Configure Task Dispatch Parameters
            </h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Target Queue Mapping */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-mono text-slate-400 uppercase tracking-wider font-semibold">
                Target Queue Pipeline
              </label>
              <select
                value={queueId}
                onChange={(e) => setQueueId(e.target.value)}
                className="w-full bg-bg-deep text-slate-100 border border-border-subtle rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-brand/80 font-mono transition-all"
              >
                {queues.map((q) => (
                  <option key={q.id} value={q.id}>
                    {q.name} (Priority Weight: {q.priority})
                  </option>
                ))}
              </select>
            </div>

            {/* Task Template */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-mono text-slate-400 uppercase tracking-wider font-semibold">
                Workload Task Template
              </label>
              <select
                value={taskTemplate}
                onChange={(e) => setTaskTemplate(e.target.value)}
                className="w-full bg-bg-deep text-slate-100 border border-border-subtle rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-brand/80 font-mono transition-all"
              >
                <option value="push_notification_dispatch">Push Notification Dispatch</option>
                <option value="image_thumbnail_resize">Image Asset Thumbnail Resize</option>
                <option value="compile_monthly_spend">Heavy Task: Compile Monthly Spend Report</option>
                <option value="sync_crm_leads">External CRM Leads Sync</option>
                <option value="generate_ai_summary">AI Generation: Summarize Transcriptions</option>
              </select>
            </div>

            {/* Scheduling Type */}
            <div className="space-y-1.5 md:col-span-2">
              <label className="text-[10px] font-mono text-slate-400 uppercase tracking-wider font-semibold block mb-2">
                Execution schedule trigger
              </label>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                {["immediate", "delayed", "scheduled", "cron"].map((type) => (
                  <button
                    key={type}
                    type="button"
                    onClick={() => setScheduleType(type as any)}
                    className={`px-3 py-2 rounded-lg border text-xs font-semibold font-mono text-center transition-all cursor-pointer ${
                      scheduleType === type
                        ? "bg-brand/10 border-brand text-brand"
                        : "bg-bg-deep border-border-subtle hover:border-brand/40 text-slate-400"
                    }`}
                  >
                    {type.toUpperCase()}
                  </button>
                ))}
              </div>
            </div>

            {/* Conditional Scheduling Controls */}
            {scheduleType === "delayed" && (
              <div className="space-y-1.5 md:col-span-2 bg-bg-deep p-4 rounded-xl border border-border-subtle">
                <div className="flex justify-between items-center text-[10px] font-mono text-slate-400 uppercase tracking-wider font-semibold mb-2">
                  <span>Enqueuing Delay Offset</span>
                  <span className="text-brand font-bold">{delaySecs} seconds delay</span>
                </div>
                <input
                  type="range"
                  min="3"
                  max="60"
                  value={delaySecs}
                  onChange={(e) => setDelaySecs(Number(e.target.value))}
                  className="w-full h-1 bg-[#222] rounded-lg appearance-none cursor-pointer accent-brand"
                />
              </div>
            )}

            {scheduleType === "scheduled" && (
              <div className="space-y-1.5 md:col-span-2 bg-bg-deep p-4 rounded-xl border border-border-subtle">
                <label className="text-[10px] font-mono text-slate-400 uppercase tracking-wider font-semibold block mb-1">
                  Schedule Datetime Target
                </label>
                <input
                  type="datetime-local"
                  value={scheduledTime}
                  onChange={(e) => setScheduledTime(e.target.value)}
                  className="w-full bg-[#151515] text-slate-100 border border-border-subtle rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-brand/80 font-mono transition-all"
                />
              </div>
            )}

            {scheduleType === "cron" && (
              <div className="space-y-1.5 md:col-span-2 bg-bg-deep p-4 rounded-xl border border-border-subtle space-y-3">
                <div>
                  <label className="text-[10px] font-mono text-slate-400 uppercase tracking-wider font-semibold block mb-1">
                    Cron Expression Pattern
                  </label>
                  <input
                    type="text"
                    value={cronExpr}
                    onChange={(e) => setCronExpr(e.target.value)}
                    placeholder="*/1 * * * *"
                    className="w-full bg-[#151515] text-slate-100 border border-border-subtle rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-brand/80 font-mono transition-all"
                  />
                </div>
                <p className="text-[10px] text-slate-500 leading-relaxed font-mono">
                  * Note: In this simulation playground, cron schedules trigger every 15 seconds to facilitate rapid observation and telemetry checking.
                </p>
              </div>
            )}

            {/* DAG Dependencies */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-mono text-slate-400 uppercase tracking-wider font-semibold">
                Workflow Parent Dependency (DAG)
              </label>
              <select
                value={parentJobId}
                onChange={(e) => setParentJobId(e.target.value)}
                className="w-full bg-bg-deep text-slate-100 border border-border-subtle rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-brand/80 font-mono transition-all"
              >
                <option value="">No parent dependency (standalone)</option>
                {recentJobs.slice(0, 8).map((j) => (
                  <option key={j.id} value={j.id}>
                    {j.id} ({j.payload.task}, status: {j.status})
                  </option>
                ))}
              </select>
            </div>

            {/* Max Retries */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-mono text-slate-400 uppercase tracking-wider font-semibold">
                Maximum Retry Attempts
              </label>
              <input
                type="number"
                min="0"
                max="5"
                value={maxRetries}
                onChange={(e) => setMaxRetries(Number(e.target.value))}
                className="w-full bg-bg-deep text-slate-100 border border-border-subtle rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-brand/80 font-mono transition-all"
              />
            </div>

            {/* Failure Simulation */}
            <div className="md:col-span-2 bg-bg-deep p-4 rounded-xl border border-border-subtle space-y-3">
              <label className="flex items-center space-x-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={simulateFailure}
                  onChange={(e) => setSimulateFailure(e.target.checked)}
                  className="rounded bg-[#151515] border-border-subtle text-brand focus:ring-0 focus:ring-offset-0 cursor-pointer"
                />
                <span className="text-xs font-semibold text-rose-400 font-mono tracking-wider">
                  SIMULATE FAILURE CRASH
                </span>
              </label>

              {simulateFailure && (
                <div className="space-y-1.5">
                  <label className="text-[9px] font-mono text-slate-500 uppercase tracking-wider">
                    Error Log Message Mockup
                  </label>
                  <input
                    type="text"
                    value={errorMsg}
                    onChange={(e) => setErrorMsg(e.target.value)}
                    placeholder="e.g. SMTP Server handshake timeout: status code 504"
                    className="w-full bg-[#151515] text-slate-100 border border-border-subtle rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-brand/80 font-mono transition-all"
                  />
                </div>
              )}
            </div>
          </div>

          <div className="flex justify-end pt-4 border-t border-border-subtle">
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2.5 bg-brand text-bg-deep font-mono uppercase tracking-widest text-xs font-bold hover:opacity-90 disabled:opacity-40 rounded transition-all flex items-center space-x-2 shadow-md cursor-pointer"
            >
              {isSubmitting ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : (
                <Play className="w-4 h-4 fill-current" />
              )}
              <span>Enqueue Background Job</span>
            </button>
          </div>
        </form>

        {/* Batch Dispatcher Side Panel */}
        <div className="bg-bg-card border border-border-subtle rounded-2xl p-5 space-y-4 shadow-sm h-fit">
          <div className="flex items-center space-x-2 border-b border-border-subtle pb-3">
            <Layers className="w-4 h-4 text-emerald-400" />
            <h3 className="text-xs font-mono uppercase tracking-wider text-slate-200 font-semibold">
              Batch Job Dispatcher
            </h3>
          </div>

          <p className="text-xs text-slate-400 leading-relaxed font-sans">
            Quickly trigger a batch array containing 5 parallel workloads with a unified batch ID. Evaluates parallel scaling throughput and queue concurrency limits.
          </p>

          <div className="bg-bg-deep p-3.5 rounded-xl border border-border-subtle font-mono text-[10px] text-slate-500 space-y-1.5 select-none">
            <div className="flex justify-between">
              <span>Task count:</span>
              <span className="text-slate-300">5 elements</span>
            </div>
            <div className="flex justify-between">
              <span>Layout sequence:</span>
              <span className="text-slate-300">Parallel FIFO</span>
            </div>
            <div className="flex justify-between">
              <span>Error mockup:</span>
              <span className="text-rose-400 font-semibold">{simulateFailure ? "Task #3 fails" : "All success"}</span>
            </div>
          </div>

          <button
            type="button"
            onClick={handleDispatchBatch}
            disabled={isSubmitting}
            className="w-full py-2.5 bg-transparent hover:bg-emerald-950/10 border border-emerald-900/40 text-emerald-400 font-mono uppercase tracking-widest text-xs rounded transition-all flex items-center justify-center space-x-2 shadow-md cursor-pointer"
          >
            <GitCommit className="w-4 h-4" />
            <span>Dispatch 5-Job Batch</span>
          </button>
        </div>

      </div>
    </div>
  );
};
