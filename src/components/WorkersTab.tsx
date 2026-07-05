/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
import { 
  Cpu, 
  Plus, 
  Activity, 
  Power, 
  AlertCircle, 
  CheckCircle, 
  RefreshCw 
} from "lucide-react";
import { Worker } from "../types";

interface WorkersTabProps {
  workers: Worker[];
  onSpawnWorker: (name: string) => Promise<void>;
  onShutdownWorker: (id: string) => Promise<void>;
  onTriggerRefresh: () => void;
}

export const WorkersTab: React.FC<WorkersTabProps> = ({
  workers,
  onSpawnWorker,
  onShutdownWorker,
  onTriggerRefresh,
}) => {
  const [newWorkerName, setNewWorkerName] = useState("");
  const [isSpawning, setIsSpawning] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSpawn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newWorkerName.trim()) return;

    setIsSpawning(true);
    setError(null);

    try {
      await onSpawnWorker(newWorkerName.trim());
      setNewWorkerName("");
    } catch (err: any) {
      setError(err.message || "Failed to spawn worker node.");
    } finally {
      setIsSpawning(false);
    }
  };

  const getStatusBadge = (status: "active" | "idle" | "offline") => {
    switch (status) {
      case "active":
        return "bg-emerald-950/20 text-emerald-400 border border-emerald-900/30 animate-pulse";
      case "idle":
        return "bg-brand/10 text-brand border border-brand/20";
      case "offline":
        return "bg-bg-deep text-slate-500 border border-border-subtle";
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center border-b border-border-subtle pb-6">
        <div>
          <p className="text-xs uppercase tracking-[0.25em] text-slate-500 font-mono font-semibold">
            Distributed Worker Clusters
          </p>
          <h2 className="font-serif italic text-2xl text-slate-100 tracking-tight mt-1">
            Distributed Cluster Console
          </h2>
        </div>
        <button
          onClick={onTriggerRefresh}
          className="flex items-center space-x-2 px-4 py-2 border border-brand text-brand hover:bg-brand/10 text-xs font-mono uppercase tracking-widest transition-all cursor-pointer"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Sync Workers</span>
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Spawn worker Form */}
        <div className="bg-bg-card border border-border-subtle rounded-2xl p-5 space-y-4 shadow-sm h-fit">
          <div className="flex items-center space-x-2 border-b border-border-subtle pb-3">
            <Plus className="w-4 h-4 text-brand" />
            <h3 className="text-xs font-mono uppercase tracking-wider text-slate-200 font-semibold">
              Provision Worker Instance
            </h3>
          </div>

          <p className="text-xs text-slate-400 leading-relaxed font-sans">
            Spawns a new virtual node in the distributed pool. The node automatically starts polling eligible queues and process concurrent tasks.
          </p>

          {error && (
            <div className="bg-rose-950/20 border border-rose-900/30 p-3 rounded-lg text-rose-400 text-xs flex items-center space-x-2">
              <AlertCircle className="w-4 h-4 text-rose-500" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSpawn} className="space-y-3">
            <div className="space-y-1">
              <label className="text-[9px] font-mono text-slate-500 uppercase tracking-wider font-semibold">
                Worker Instance Tag
              </label>
              <input
                type="text"
                value={newWorkerName}
                onChange={(e) => setNewWorkerName(e.target.value)}
                placeholder="e.g. node-worker-us-west-c"
                className="w-full bg-bg-deep text-slate-100 border border-border-subtle rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-brand/80 font-mono transition-all"
              />
            </div>

            <button
              type="submit"
              disabled={isSpawning || !newWorkerName.trim()}
              className="w-full py-2.5 bg-brand text-bg-deep font-mono uppercase tracking-wider text-xs font-bold hover:opacity-90 disabled:opacity-40 rounded transition-all flex items-center justify-center space-x-2 shadow-md cursor-pointer"
            >
              {isSpawning ? (
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Cpu className="w-3.5 h-3.5" />
              )}
              <span>Initialize Worker Node</span>
            </button>
          </form>
        </div>

        {/* Worker Pool List */}
        <div className="lg:col-span-2 space-y-4">
          <h3 className="text-xs font-mono uppercase tracking-wider text-slate-400">
            Active Worker Pool Index ({workers.filter((w) => w.status !== "offline").length} Online)
          </h3>

          <div className="space-y-3">
            {workers.map((worker) => {
              // Simulated CPU / Memory metrics
              const cpuUsage = worker.status === "offline" ? 0 : Math.floor(Math.sin(worker.createdAt) * 15) + (worker.concurrencyLoad * 25) + 12;
              const memoryUsage = worker.status === "offline" ? 0 : 38 + (worker.concurrencyLoad * 8);

              return (
                <div
                  key={worker.id}
                  className={`bg-bg-card border rounded-2xl p-5 space-y-4 shadow-sm transition-all ${
                    worker.status === "offline" ? "border-border-subtle/40 opacity-60 bg-bg-card/40" : "border-border-subtle hover:border-border-accent"
                  }`}
                >
                  {/* Name and State Status */}
                  <div className="flex justify-between items-start">
                    <div className="flex items-center space-x-3">
                      <div className={`p-2 rounded-lg ${worker.status === "offline" ? "bg-bg-deep text-slate-600" : "bg-brand/10 text-brand border border-brand/10"}`}>
                        <Cpu className="w-4.5 h-4.5" />
                      </div>
                      <div>
                        <h4 className="text-xs font-semibold text-slate-200 font-mono">
                          {worker.name}
                        </h4>
                        <p className="text-[10px] text-slate-500 font-mono">
                          ID: {worker.id} // Enrolled: {new Date(worker.createdAt).toLocaleTimeString()}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center space-x-2">
                      <span className={`px-2 py-0.5 rounded text-[9px] font-mono font-bold tracking-wider ${getStatusBadge(worker.status)}`}>
                        {worker.status.toUpperCase()}
                      </span>
                    </div>
                  </div>

                  {/* System load dials and heartbeats */}
                  {worker.status !== "offline" && (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-bg-deep/60 p-3 rounded-xl border border-border-subtle text-xs">
                      {/* CPU */}
                      <div className="space-y-1">
                        <div className="flex justify-between text-[9px] font-mono text-slate-400">
                          <span>CPU LOAD</span>
                          <span className="font-bold text-slate-300">{cpuUsage}%</span>
                        </div>
                        <div className="w-full bg-[#222] h-1 bg-[#151515] rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all duration-500 ${cpuUsage > 75 ? "bg-rose-500" : cpuUsage > 45 ? "bg-amber-500" : "bg-emerald-500"}`}
                            style={{ width: `${cpuUsage}%` }}
                          />
                        </div>
                      </div>

                      {/* MEMORY */}
                      <div className="space-y-1">
                        <div className="flex justify-between text-[9px] font-mono text-slate-400">
                          <span>RAM OCCUPANCY</span>
                          <span className="font-bold text-slate-300">{memoryUsage}%</span>
                        </div>
                        <div className="w-full bg-[#222] h-1 bg-[#151515] rounded-full overflow-hidden">
                          <div
                            className="h-full bg-brand rounded-full transition-all duration-500"
                            style={{ width: `${memoryUsage}%` }}
                          />
                        </div>
                      </div>

                      {/* CONCURRENCY */}
                      <div className="space-y-1">
                        <div className="flex justify-between text-[9px] font-mono text-slate-400">
                          <span>ACTIVE JOBS LOAD</span>
                          <span className="font-bold text-slate-300">{worker.concurrencyLoad} / 3 concurrent</span>
                        </div>
                        <div className="w-full bg-[#222] h-1 bg-[#151515] rounded-full overflow-hidden">
                          <div
                            className="h-full bg-emerald-500 rounded-full transition-all duration-500"
                            style={{ width: `${(worker.concurrencyLoad / 3) * 100}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Footer Heartbeat & Power Actions */}
                  <div className="flex justify-between items-center text-[10px] font-mono text-slate-500">
                    <span className="flex items-center space-x-1.5">
                      <Activity className={`w-3.5 h-3.5 ${worker.status !== "offline" ? "text-brand animate-pulse" : "text-slate-600"}`} />
                      <span>Last Heartbeat Ping: {new Date(worker.lastHeartbeatAt).toLocaleTimeString()}</span>
                    </span>

                    {worker.status !== "offline" && (
                      <button
                        onClick={() => onShutdownWorker(worker.id)}
                        className="flex items-center space-x-1 text-rose-400 hover:text-rose-300 bg-rose-950/20 hover:bg-rose-950/40 border border-rose-900/30 px-2.5 py-1 rounded transition-all cursor-pointer"
                      >
                        <Power className="w-3 h-3" />
                        <span>GRACEFUL SHUTDOWN</span>
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

      </div>
    </div>
  );
};
