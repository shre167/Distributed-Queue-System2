/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import { 
  Layers, 
  Search, 
  Filter, 
  Play, 
  CheckCircle, 
  XCircle, 
  Hourglass, 
  Trash2, 
  RefreshCw, 
  ArrowRight, 
  FileText 
} from "lucide-react";
import { Job, Queue, JobStatus } from "../types";

interface JobsTabProps {
  jobs: Job[];
  queues: Queue[];
  totalJobs: number;
  currentPage: number;
  totalPages: number;
  statusFilter: string;
  setStatusFilter: (status: string) => void;
  queueFilter: string;
  setQueueFilter: (qId: string) => void;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  setCurrentPage: (page: number) => void;
  onInspectJob: (job: Job) => void;
  onRetryJob: (id: string) => Promise<void>;
  onCancelJob: (id: string) => Promise<void>;
  onTriggerRefresh: () => void;
}

export const JobsTab: React.FC<JobsTabProps> = ({
  jobs,
  queues,
  totalJobs,
  currentPage,
  totalPages,
  statusFilter,
  setStatusFilter,
  queueFilter,
  setQueueFilter,
  searchQuery,
  setSearchQuery,
  setCurrentPage,
  onInspectJob,
  onRetryJob,
  onCancelJob,
  onTriggerRefresh,
}) => {
  const [debouncedSearch, setDebouncedSearch] = useState(searchQuery);

  useEffect(() => {
    const handle = setTimeout(() => {
      setSearchQuery(debouncedSearch);
      setCurrentPage(1);
    }, 300);
    return () => clearTimeout(handle);
  }, [debouncedSearch]);

  const getStatusBadge = (status: JobStatus) => {
    switch (status) {
      case "queued":
        return "bg-bg-deep text-slate-400 border-border-subtle";
      case "scheduled":
        return "bg-brand/10 text-brand border-brand/20";
      case "claimed":
        return "bg-amber-950/20 text-amber-400 border-amber-900/30";
      case "running":
        return "bg-emerald-950/20 text-emerald-400 border-emerald-900/30 animate-pulse";
      case "completed":
        return "bg-emerald-950/20 text-emerald-400 border border-emerald-900/20";
      case "failed":
        return "bg-rose-950/20 text-rose-400 border-rose-900/30";
      case "dlq":
        return "bg-rose-950/40 text-rose-400 border border-rose-900/40 font-bold uppercase tracking-wide";
    }
  };

  const getStatusIcon = (status: JobStatus) => {
    switch (status) {
      case "queued": return <Layers className="w-3.5 h-3.5" />;
      case "scheduled": return <Hourglass className="w-3.5 h-3.5" />;
      case "claimed": return <Hourglass className="w-3.5 h-3.5" />;
      case "running": return <Play className="w-3.5 h-3.5 fill-current" />;
      case "completed": return <CheckCircle className="w-3.5 h-3.5" />;
      case "failed": return <XCircle className="w-3.5 h-3.5" />;
      case "dlq": return <XCircle className="w-3.5 h-3.5" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center border-b border-border-subtle pb-6">
        <div>
          <p className="text-xs uppercase tracking-[0.25em] text-slate-500 font-mono font-semibold">
            Background Job Explorer
          </p>
          <h2 className="font-serif italic text-2xl text-slate-100 tracking-tight mt-1">
            Active Execution Ledger
          </h2>
        </div>
        <button
          onClick={onTriggerRefresh}
          className="flex items-center space-x-2 px-4 py-2 border border-brand text-brand hover:bg-brand/10 text-xs font-mono uppercase tracking-widest transition-all cursor-pointer"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Refresh List</span>
        </button>
      </div>

      {/* Filter Toolbar */}
      <div className="bg-bg-card border border-border-subtle rounded-2xl p-4 grid grid-cols-1 md:grid-cols-4 gap-4">
        {/* Search */}
        <div className="relative">
          <Search className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
          <input
            type="text"
            value={debouncedSearch}
            onChange={(e) => setDebouncedSearch(e.target.value)}
            placeholder="Search by ID or parameters..."
            className="w-full bg-bg-deep text-slate-100 border border-border-subtle rounded-lg pl-9 pr-3 py-2 text-xs focus:outline-none focus:border-brand/80 font-mono transition-all"
          />
        </div>

        {/* State Filter */}
        <div className="flex items-center space-x-2">
          <Filter className="w-3.5 h-3.5 text-slate-500 shrink-0" />
          <select
            value={statusFilter}
            onChange={(e) => { setStatusFilter(e.target.value); setCurrentPage(1); }}
            className="w-full bg-bg-deep text-slate-100 border border-border-subtle rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-brand/80 font-mono transition-all"
          >
            <option value="">All Statuses</option>
            <option value="queued">Queued</option>
            <option value="scheduled">Scheduled / Delayed</option>
            <option value="running">Running</option>
            <option value="completed">Completed</option>
            <option value="failed">Failed</option>
            <option value="dlq">Dead Letter Queue (DLQ)</option>
          </select>
        </div>

        {/* Queue Filter */}
        <div className="flex items-center space-x-2">
          <Layers className="w-3.5 h-3.5 text-slate-500 shrink-0" />
          <select
            value={queueFilter}
            onChange={(e) => { setQueueFilter(e.target.value); setCurrentPage(1); }}
            className="w-full bg-bg-deep text-slate-100 border border-border-subtle rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-brand/80 font-mono transition-all"
          >
            <option value="">All Queues</option>
            {queues.map((q) => (
              <option key={q.id} value={q.id}>
                {q.name}
              </option>
            ))}
          </select>
        </div>

        {/* Total count indicator */}
        <div className="flex items-center justify-end">
          <span className="text-[11px] font-mono text-slate-500 uppercase">
            Resolved: <span className="text-slate-300 font-bold">{totalJobs} jobs</span>
          </span>
        </div>
      </div>

      {/* Jobs Grid/Table */}
      <div className="bg-bg-card border border-border-subtle rounded-2xl overflow-hidden shadow-md">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-border-subtle bg-[#151515]/60 text-[10px] font-mono text-slate-400 uppercase tracking-wider">
                <th className="py-3 px-4">Job Identifier</th>
                <th className="py-3 px-4">Queue Mapping</th>
                <th className="py-3 px-4">State</th>
                <th className="py-3 px-4">Retries</th>
                <th className="py-3 px-4">Scheduled Execution</th>
                <th className="py-3 px-4">Updated timestamp</th>
                <th className="py-3 px-4 text-right">Operations</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border-subtle text-xs text-slate-300">
              {jobs.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-500 italic font-serif">
                    No active job matches found in index.
                  </td>
                </tr>
              ) : (
                jobs.map((job) => {
                  const targetQueue = queues.find((q) => q.id === job.queueId);
                  return (
                    <tr key={job.id} className="hover:bg-[#151515]/20 transition-all">
                       {/* ID */}
                      <td className="py-3 px-4 font-mono font-semibold text-slate-100 select-all">
                        {job.id}
                        {job.batchId && (
                          <div className="text-[9px] text-brand mt-0.5 font-mono">
                            Batch: {job.batchId}
                          </div>
                        )}
                        {job.parentJobId && (
                          <div className="text-[9px] text-emerald-500 mt-0.5 font-mono">
                            Depends on: {job.parentJobId}
                          </div>
                        )}
                      </td>

                      {/* Queue */}
                      <td className="py-3 px-4">
                        <span className="px-2 py-0.5 bg-bg-deep text-slate-400 font-mono text-[10px] border border-border-subtle rounded">
                          {targetQueue ? targetQueue.name : "unknown_queue"}
                        </span>
                      </td>

                      {/* Status */}
                      <td className="py-3 px-4">
                        <span className={`inline-flex items-center space-x-1.5 px-2 py-0.5 rounded text-[10px] font-mono border ${getStatusBadge(job.status)}`}>
                          {getStatusIcon(job.status)}
                          <span>{job.status}</span>
                        </span>
                      </td>

                      {/* Retries */}
                      <td className="py-3 px-4 font-mono text-[11px]">
                        {job.retryCount} / {job.maxRetries}
                      </td>

                      {/* Scheduled At */}
                      <td className="py-3 px-4 font-mono text-[11px] text-slate-400">
                        {job.cronExpression ? (
                          <span className="text-brand bg-brand/10 px-1.5 py-0.5 rounded border border-brand/20 font-semibold">
                            Cron: {job.cronExpression}
                          </span>
                        ) : (
                          new Date(job.scheduledAt).toLocaleTimeString()
                        )}
                      </td>

                      {/* Updated At */}
                      <td className="py-3 px-4 font-mono text-[11px] text-slate-500">
                        {new Date(job.updatedAt).toLocaleTimeString()}
                      </td>

                      {/* Actions */}
                      <td className="py-3 px-4 text-right space-x-2">
                        <button
                          onClick={() => onInspectJob(job)}
                          className="px-2.5 py-1.5 bg-transparent hover:bg-brand/10 text-brand border border-brand/35 rounded text-[10px] font-mono font-medium transition-all cursor-pointer"
                        >
                          INSPECT
                        </button>

                        {(job.status === "failed" || job.status === "dlq") && (
                          <button
                            onClick={() => onRetryJob(job.id)}
                            className="px-2.5 py-1.5 bg-emerald-950/20 hover:bg-emerald-950/40 text-emerald-400 border border-emerald-900/30 rounded text-[10px] font-mono font-semibold transition-all cursor-pointer"
                          >
                            RETRY
                          </button>
                        )}

                        {(job.status === "queued" || job.status === "scheduled") && (
                          <button
                            onClick={() => onCancelJob(job.id)}
                            className="px-2.5 py-1.5 bg-rose-950/20 hover:bg-rose-950/40 text-rose-400 border border-rose-900/30 rounded text-[10px] font-mono font-medium transition-all cursor-pointer"
                          >
                            CANCEL
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination bar */}
        {totalPages > 1 && (
          <div className="bg-[#0a0a0a]/60 border-t border-border-subtle px-4 py-3 flex items-center justify-between">
            <span className="text-[10px] font-mono text-slate-500">
              Page {currentPage} of {totalPages}
            </span>

            <div className="flex space-x-1.5">
              <button
                disabled={currentPage === 1}
                onClick={() => setCurrentPage(currentPage - 1)}
                className="px-2.5 py-1.5 bg-[#181818] border border-border-subtle hover:bg-[#222] disabled:opacity-40 text-slate-300 rounded text-[10px] font-mono transition-all cursor-pointer"
              >
                PREVIOUS
              </button>
              <button
                disabled={currentPage === totalPages}
                onClick={() => setCurrentPage(currentPage + 1)}
                className="px-2.5 py-1.5 bg-[#181818] border border-border-subtle hover:bg-[#222] disabled:opacity-40 text-slate-300 rounded text-[10px] font-mono transition-all cursor-pointer"
              >
                NEXT
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
