/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
import { 
  X, 
  Terminal, 
  Cpu, 
  FileText, 
  Clock, 
  RefreshCw, 
  AlertCircle, 
  Sparkles, 
  CheckCircle2, 
  CheckCircle, 
  Zap 
} from "lucide-react";
import { Job, JobExecution, JobLog } from "../types";

interface JobDetailsModalProps {
  job: Job | null;
  executions: JobExecution[];
  logs: JobLog[];
  onClose: () => void;
}

export const JobDetailsModal: React.FC<JobDetailsModalProps> = ({
  job,
  executions,
  logs,
  onClose,
}) => {
  const [aiSummary, setAiSummary] = useState<string | null>(null);
  const [loadingAi, setLoadingAi] = useState(false);
  const [errorAi, setErrorAi] = useState<string | null>(null);

  if (!job) return null;

  const handleGenerateAiSummary = async () => {
    setLoadingAi(true);
    setErrorAi(null);
    setAiSummary(null);

    try {
      const response = await fetch(`/api/jobs/${job.id}/ai-summary`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      if (!response.ok) {
        throw new Error("HTTP connection failed generating summary");
      }
      const data = await response.json();
      setAiSummary(data.summary);
    } catch (err: any) {
      setErrorAi(err.message || "Could not retrieve summary.");
    } finally {
      setLoadingAi(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-[#040404]/90 backdrop-blur-md flex items-center justify-center p-4">
      <div className="bg-bg-card border border-border-subtle rounded-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col shadow-2xl animate-in fade-in zoom-in-95 duration-150">
        
        {/* Modal Header */}
        <div className="p-5 border-b border-border-subtle flex justify-between items-center bg-bg-deep/30">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 rounded-lg bg-brand/10 flex items-center justify-center text-brand border border-brand/20">
              <FileText className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-slate-100 font-mono">
                Inspect: {job.id}
              </h2>
              <p className="text-[10px] text-slate-500 font-mono">
                Submitted at {new Date(job.createdAt).toLocaleString()}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded bg-bg-deep hover:bg-bg-deep/80 text-slate-400 hover:text-slate-200 border border-border-subtle transition-all cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1">
          
          {/* Metadata Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-bg-deep p-3 rounded-xl border border-border-subtle">
              <span className="text-[9px] font-mono text-slate-500 block uppercase">QUEUE MAPPING</span>
              <span className="text-xs font-semibold text-slate-300 font-mono">{job.queueId}</span>
            </div>
            <div className="bg-bg-deep p-3 rounded-xl border border-border-subtle">
              <span className="text-[9px] font-mono text-slate-500 block uppercase">RETRIES EXECUTED</span>
              <span className="text-xs font-semibold text-slate-300 font-mono">{job.retryCount} / {job.maxRetries}</span>
            </div>
            <div className="bg-bg-deep p-3 rounded-xl border border-border-subtle">
              <span className="text-[9px] font-mono text-slate-500 block uppercase">SCHEDULING EVENT</span>
              <span className="text-xs font-semibold text-slate-300 font-mono">
                {job.cronExpression ? `Cron: ${job.cronExpression}` : new Date(job.scheduledAt).toLocaleTimeString()}
              </span>
            </div>
            <div className="bg-bg-deep p-3 rounded-xl border border-border-subtle">
              <span className="text-[9px] font-mono text-slate-500 block uppercase">CURRENT STATUS</span>
              <span className="text-xs font-semibold text-brand font-mono uppercase tracking-wider">{job.status}</span>
            </div>
          </div>

          {/* Job Payload */}
          <div className="space-y-2">
            <h3 className="text-[10px] font-semibold text-slate-400 font-mono uppercase tracking-wider">
              Job Payload Arguments (JSON parameters)
            </h3>
            <pre className="bg-bg-deep p-4 rounded-xl border border-border-subtle text-xs font-mono text-brand overflow-x-auto select-all">
              {JSON.stringify(job.payload, null, 2)}
            </pre>
          </div>

          {/* AI FAILURE SUMMARY DIAGNOSIS (GEMINI FEATURE!) */}
          {(job.status === "failed" || job.status === "dlq") && (
            <div className="bg-brand/5 border border-brand/20 rounded-2xl p-5 space-y-4">
              <div className="flex justify-between items-center">
                <div className="flex items-center space-x-2">
                  <Sparkles className="w-4 h-4 text-brand animate-pulse" />
                  <h3 className="text-xs font-semibold text-brand font-mono uppercase tracking-wider">
                    Gemini Smart Failure Summarizer
                  </h3>
                </div>
                {!aiSummary && !loadingAi && (
                  <button
                    onClick={handleGenerateAiSummary}
                    className="flex items-center space-x-1 px-3 py-1.5 bg-brand text-bg-deep rounded text-[10px] font-mono font-bold uppercase tracking-wider transition-all shadow-md cursor-pointer hover:opacity-90"
                  >
                    <Zap className="w-3 h-3 fill-current" />
                    <span>Run RCA Diagnosis</span>
                  </button>
                )}
              </div>

              {loadingAi && (
                <div className="flex flex-col items-center justify-center py-6 space-y-2">
                  <RefreshCw className="w-5 h-5 animate-spin text-brand" />
                  <p className="text-[11px] text-brand/80 font-mono">Generative intelligence digesting crash dumps...</p>
                </div>
              )}

              {errorAi && (
                <div className="text-xs text-rose-400 bg-rose-950/20 p-3 rounded border border-rose-900/30 flex items-center space-x-2">
                  <AlertCircle className="w-4 h-4 text-rose-500" />
                  <span>{errorAi}</span>
                </div>
              )}

              {aiSummary && (
                <div className="bg-bg-deep p-4 rounded-xl border border-brand/20 text-xs text-slate-300 space-y-3 font-sans leading-relaxed select-text">
                  <div className="flex items-center space-x-1.5 text-brand font-mono text-[9px] mb-2 border-b border-border-subtle pb-1">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>GEMINI RCA DIAGNOSIS COMPLETED</span>
                  </div>
                  {/* Clean text paragraph rendering of the AI output */}
                  <div className="whitespace-pre-wrap font-sans prose-invert text-slate-300 text-xs">
                    {aiSummary}
                  </div>
                  <button
                    onClick={handleGenerateAiSummary}
                    className="flex items-center space-x-1 text-[10px] text-slate-500 hover:text-slate-400 font-mono mt-2"
                  >
                    <RefreshCw className="w-3 h-3" />
                    <span>Re-evaluate Diagnosis</span>
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Execution History */}
          <div className="space-y-3">
            <h3 className="text-[10px] font-semibold text-slate-400 font-mono uppercase tracking-wider">
              Execution Attempt Timeline History
            </h3>
            <div className="space-y-2">
              {executions.length === 0 ? (
                <p className="text-[11px] text-slate-500 italic">No execution attempts triggered yet (queued or delayed state).</p>
              ) : (
                executions.map((e, idx) => (
                  <div key={e.id} className="bg-bg-deep p-3.5 rounded-xl border border-border-subtle flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs">
                    <div className="flex items-center space-x-3">
                      <div className="p-1 rounded bg-bg-card border border-border-subtle text-slate-400">
                        <Cpu className="w-4 h-4" />
                      </div>
                      <div>
                        <h4 className="font-semibold text-slate-200">
                          Attempt #{idx + 1} // Worker: <span className="text-brand font-mono font-normal">{e.workerId}</span>
                        </h4>
                        <p className="text-[10px] text-slate-500 font-mono">
                          ID: {e.id} | Delta: {e.executionTimeMs ? `${e.executionTimeMs}ms` : "Active running"}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-3">
                      <div className="text-right">
                        <span className={`px-2 py-0.5 rounded text-[9px] font-mono border ${
                          e.status === "completed" 
                            ? "bg-emerald-950/20 text-emerald-400 border-emerald-900/30" 
                            : e.status === "failed" 
                              ? "bg-rose-950/20 text-rose-400 border-rose-900/30" 
                              : "bg-brand/10 text-brand border-brand/20 animate-pulse"
                        }`}>
                          {e.status.toUpperCase()}
                        </span>
                        {e.finishedAt && (
                          <p className="text-[9px] text-slate-500 font-mono mt-1">
                            Finished: {new Date(e.finishedAt).toLocaleTimeString()}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Job Specific Logs */}
          <div className="space-y-3">
            <div className="flex items-center space-x-2">
              <Terminal className="w-4 h-4 text-brand" />
              <h3 className="text-[10px] font-semibold text-slate-400 font-mono uppercase tracking-wider">
                Full Execution Logs for Job Context
              </h3>
            </div>
            <div className="bg-bg-deep rounded-xl p-4 border border-border-subtle font-mono text-[11px] h-40 overflow-y-auto space-y-2 select-all">
              {logs.length === 0 ? (
                <p className="text-slate-500 italic text-center py-10">No execution log context available.</p>
              ) : (
                logs.map((log) => (
                  <div key={log.id} className="flex items-start space-x-2">
                    <span className="text-slate-500">[{new Date(log.timestamp).toLocaleTimeString()}]</span>
                    <span className={`text-[9px] px-1 rounded uppercase font-semibold ${
                      log.level === "error" ? "bg-rose-950/20 text-rose-400" : "bg-bg-card border border-border-subtle text-slate-400"
                    }`}>
                      {log.level}
                    </span>
                    <span className={log.level === "error" ? "text-rose-400" : "text-slate-300"}>
                      {log.message}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>

        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-border-subtle flex justify-end bg-bg-deep/20">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-transparent border border-brand text-brand hover:bg-brand/10 text-xs font-mono uppercase tracking-widest transition-all cursor-pointer"
          >
            Close Inspector
          </button>
        </div>

      </div>
    </div>
  );
};
