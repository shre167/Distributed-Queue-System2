/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import { 
  Play, 
  CheckCircle, 
  XCircle, 
  RefreshCw, 
  ArrowUpRight, 
  Hourglass, 
  Terminal, 
  ShieldAlert, 
  Flame,
  Clock
} from "lucide-react";
import { 
  LineChart, 
  Line, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  Legend 
} from "recharts";
import { DashboardMetrics, JobLog } from "../types";

interface OverviewTabProps {
  metrics: DashboardMetrics | null;
  logs: JobLog[];
  onTriggerRefresh: () => void;
}

export const OverviewTab: React.FC<OverviewTabProps> = ({ 
  metrics, 
  logs, 
  onTriggerRefresh 
}) => {
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleManualRefresh = () => {
    setIsRefreshing(true);
    onTriggerRefresh();
    setTimeout(() => setIsRefreshing(false), 800);
  };

  if (!metrics) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="flex flex-col items-center space-y-4">
          <RefreshCw className="w-8 h-8 animate-spin text-indigo-500" />
          <p className="text-slate-400 text-sm">Synchronizing core engine metrics...</p>
        </div>
      </div>
    );
  }

  const { counts, successRate, avgWaitTimeMs, avgRunTimeMs, queueDistribution, timelineData } = metrics;

  return (
    <div className="space-y-6">
      {/* Overview Header */}
      <div className="flex justify-between items-center border-b border-border-subtle pb-6">
        <div>
          <h1 className="text-xs uppercase tracking-[0.25em] text-slate-500 font-mono font-semibold">
            System Telemetry & Performance
          </h1>
          <p className="font-serif italic text-2xl text-slate-100 tracking-tight mt-1">
            Distributed Scheduler Performance
          </p>
        </div>
        <button
          onClick={handleManualRefresh}
          className={`flex items-center space-x-2 px-4 py-2 border border-brand text-brand hover:bg-brand/10 text-xs font-mono uppercase tracking-widest transition-all cursor-pointer ${
            isRefreshing ? "opacity-50 pointer-events-none" : ""
          }`}
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? "animate-spin" : ""}`} />
          <span>Sync Realtime</span>
        </button>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        {/* Total Jobs */}
        <div className="bg-bg-card border border-border-subtle rounded-2xl p-5 shadow-sm hover:border-border-accent transition-all">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-[10px] font-mono tracking-wider text-slate-500 uppercase">TOTAL JOBS</span>
            <span className="p-1 rounded bg-[#181818] text-brand">
              <ArrowUpRight className="w-3.5 h-3.5" />
            </span>
          </div>
          <div className="text-2xl font-light text-slate-100 font-sans">{counts.total}</div>
          <span className="text-[10px] text-slate-500 font-mono">Job submissions lifecycle</span>
        </div>

        {/* Active Running */}
        <div className="bg-bg-card border border-border-subtle rounded-2xl p-5 shadow-sm hover:border-border-accent transition-all">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-[10px] font-mono tracking-wider text-slate-500 uppercase">ACTIVE RUNNING</span>
            <span className="p-1 rounded bg-emerald-950/20 text-emerald-400 animate-pulse border border-emerald-900/30">
              <Play className="w-3.5 h-3.5 fill-current" />
            </span>
          </div>
          <div className="text-2xl font-light text-emerald-400 font-sans">{counts.running}</div>
          <span className="text-[10px] text-emerald-600/80 font-mono">Under active execution</span>
        </div>

        {/* Queued/Scheduled */}
        <div className="bg-bg-card border border-border-subtle rounded-2xl p-5 shadow-sm hover:border-border-accent transition-all">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-[10px] font-mono tracking-wider text-slate-500 uppercase">QUEUED / DELAYED</span>
            <span className="p-1 rounded bg-brand/10 text-brand border border-brand/20">
              <Hourglass className="w-3.5 h-3.5" />
            </span>
          </div>
          <div className="text-2xl font-light text-brand font-sans">{counts.queued}</div>
          <span className="text-[10px] text-brand/80 font-mono">Waiting in FIFO queue</span>
        </div>

        {/* Failed / DLQ */}
        <div className="bg-bg-card border border-border-subtle rounded-2xl p-5 shadow-sm hover:border-border-accent transition-all">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-[10px] font-mono tracking-wider text-slate-500 uppercase">FAILED / DLQ</span>
            <span className="p-1 rounded bg-rose-950/20 text-rose-400 border border-rose-900/30">
              <ShieldAlert className="w-3.5 h-3.5" />
            </span>
          </div>
          <div className="text-2xl font-light text-rose-500 font-sans">{counts.failed}</div>
          <span className="text-[10px] text-rose-500/80 font-mono">Redirected to dead letter</span>
        </div>

        {/* Success Rate */}
        <div className="bg-bg-card border border-border-subtle rounded-2xl p-5 shadow-sm hover:border-border-accent transition-all">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-[10px] font-mono tracking-wider text-slate-500 uppercase">SUCCESS RATE</span>
            <span className="p-1 rounded bg-emerald-950/20 text-emerald-400 border border-emerald-900/30">
              <CheckCircle className="w-3.5 h-3.5" />
            </span>
          </div>
          <div className="text-2xl font-light text-slate-100 font-sans">
            {successRate.toFixed(1)}%
          </div>
          <span className="text-[10px] text-slate-500 font-mono">Reliability ratio index</span>
        </div>
      </div>

      {/* Latency & Processing Timing */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-bg-card border border-border-subtle rounded-2xl p-4 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-lg bg-brand/10 flex items-center justify-center text-brand border border-brand/20">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <p className="text-[10px] font-mono text-slate-500 uppercase tracking-wider font-semibold">
                Average Queue Latency
              </p>
              <h4 className="text-lg font-bold text-slate-200">
                {(avgWaitTimeMs / 1000).toFixed(2)}s
              </h4>
            </div>
          </div>
          <span className="text-[10px] text-slate-400 bg-[#181818] border border-border-subtle px-2.5 py-1 rounded font-mono">
            FIFO queue wait duration
          </span>
        </div>

        <div className="bg-bg-card border border-border-subtle rounded-2xl p-4 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-lg bg-emerald-600/10 flex items-center justify-center text-emerald-400 border border-emerald-500/20">
              <Flame className="w-5 h-5" />
            </div>
            <div>
              <p className="text-[10px] font-mono text-slate-500 uppercase tracking-wider font-semibold">
                Average Execution Duration
              </p>
              <h4 className="text-lg font-bold text-slate-200">
                {(avgRunTimeMs / 1000).toFixed(2)}s
              </h4>
            </div>
          </div>
          <span className="text-[10px] text-slate-400 bg-[#181818] border border-border-subtle px-2.5 py-1 rounded font-mono">
            Active processing duration
          </span>
        </div>
      </div>

      {/* Visual Analytics Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Timeline Chart */}
        <div className="bg-bg-card border border-border-subtle rounded-2xl p-5 space-y-4">
          <div>
            <h3 className="text-sm font-semibold text-slate-200 tracking-tight font-serif italic">
              Scheduler Throughput Timeline
            </h3>
            <p className="text-[11px] text-slate-400">
              Visualizes background job execution outcomes over the preceding minutes.
            </p>
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={timelineData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#222" />
                <XAxis dataKey="time" stroke="#666" fontSize={10} tickLine={false} />
                <YAxis stroke="#666" fontSize={10} tickLine={false} allowDecimals={false} />
                <Tooltip 
                  contentStyle={{ backgroundColor: "#080808", borderColor: "#222" }}
                  labelStyle={{ color: "#888", fontSize: "11px", fontFamily: "monospace" }}
                  itemStyle={{ fontSize: "11px" }}
                />
                <Legend verticalAlign="top" height={36} wrapperStyle={{ fontSize: "11px" }} />
                <Line 
                  type="monotone" 
                  dataKey="completed" 
                  name="Completed Tasks" 
                  stroke="#C0A080" 
                  strokeWidth={2}
                  activeDot={{ r: 6 }} 
                />
                <Line 
                  type="monotone" 
                  dataKey="failed" 
                  name="Failed Tasks" 
                  stroke="#ef4444" 
                  strokeWidth={2} 
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Queue Load Comparison */}
        <div className="bg-bg-card border border-border-subtle rounded-2xl p-5 space-y-4">
          <div>
            <h3 className="text-sm font-semibold text-slate-200 tracking-tight font-serif italic">
              Queue Load Distribution
            </h3>
            <p className="text-[11px] text-slate-400">
              Compares active queue sizes and current processing occupancy rates.
            </p>
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={queueDistribution}>
                <CartesianGrid strokeDasharray="3 3" stroke="#222" />
                <XAxis dataKey="name" stroke="#666" fontSize={9} tickLine={false} />
                <YAxis stroke="#666" fontSize={10} tickLine={false} allowDecimals={false} />
                <Tooltip 
                  contentStyle={{ backgroundColor: "#080808", borderColor: "#222" }}
                  labelStyle={{ color: "#888", fontSize: "11px", fontFamily: "monospace" }}
                  itemStyle={{ fontSize: "11px" }}
                />
                <Legend verticalAlign="top" height={36} wrapperStyle={{ fontSize: "11px" }} />
                <Bar dataKey="totalJobs" name="Enqueued Jobs" fill="#C0A080" radius={[4, 4, 0, 0]} />
                <Bar dataKey="runningJobs" name="Running Occupancy" fill="#ffffff" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Realtime Event Logs Stream */}
      <div className="bg-bg-card border border-border-subtle rounded-2xl p-5 space-y-3">
        <div className="flex items-center justify-between border-b border-border-subtle pb-3">
          <div className="flex items-center space-x-2">
            <Terminal className="w-4 h-4 text-brand" />
            <h3 className="text-sm font-semibold text-slate-200 font-mono uppercase tracking-wider">
              Live Scheduler Trace Stream
            </h3>
          </div>
          <span className="text-[10px] font-mono text-slate-500 animate-pulse">
            ● Listening and receiving telemetry
          </span>
        </div>

        <div className="bg-bg-deep rounded-xl p-4 border border-border-subtle font-mono text-[11px] h-48 overflow-y-auto space-y-2 select-all">
          {logs.length === 0 ? (
            <p className="text-slate-500 italic text-center py-12">No trace records available. Submit a job to view output stream.</p>
          ) : (
            logs.slice(-20).reverse().map((log) => (
              <div key={log.id} className="flex items-start space-x-2 hover:bg-[#111]/40 p-1 rounded transition-all">
                <span className="text-slate-500 select-none">
                  [{new Date(log.timestamp).toLocaleTimeString()}]
                </span>
                <span className={`font-semibold uppercase select-none text-[9px] px-1 rounded ${
                  log.level === "error" ? "bg-rose-950/40 text-rose-400 border border-rose-900/30" : "bg-zinc-800 text-zinc-400 border border-zinc-700/55"
                }`}>
                  {log.level}
                </span>
                <span className={`text-xs ${log.level === "error" ? "text-rose-400/90" : "text-slate-300"}`}>
                  {log.message}
                </span>
                {log.jobId && (
                  <span className="text-[10px] text-brand font-semibold truncate hover:underline cursor-pointer ml-auto select-none font-mono">
                    // {log.jobId}
                  </span>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
