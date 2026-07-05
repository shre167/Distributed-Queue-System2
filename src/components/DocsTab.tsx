/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from "react";
import { 
  Database, 
  GitBranch, 
  ShieldCheck, 
  Sliders 
} from "lucide-react";

export const DocsTab: React.FC = () => {
  return (
    <div className="space-y-8 max-w-4xl">
      {/* Header */}
      <div className="border-b border-border-subtle pb-6">
        <p className="text-xs uppercase tracking-[0.25em] text-slate-500 font-mono font-semibold">
          System Architecture, Schema Design & Engineering Decisions
        </p>
        <h2 className="font-serif italic text-2xl text-slate-100 tracking-tight mt-1">
          Architecture & Implementation Specifications
        </h2>
      </div>

      {/* Relational Database Design */}
      <div className="bg-bg-card border border-border-subtle rounded-2xl p-6 space-y-4 shadow-sm">
        <div className="flex items-center space-x-2 text-brand border-b border-border-subtle pb-3">
          <Database className="w-4 h-4" />
          <h3 className="text-xs font-mono uppercase tracking-wider text-slate-100 font-semibold">
            1. Relational Database Design & Entity Mapping
          </h3>
        </div>

        <p className="text-xs text-slate-400 leading-relaxed font-sans">
          The architecture utilizes a fully normalized, relational schema designed for strict integrity. Foreign key references, composite constraints, and cascading rules prevent orphaned state records.
        </p>

        {/* Entity details list */}
        <div className="space-y-3 font-mono text-[11px] text-slate-300">
          <div className="p-4 bg-bg-deep rounded-xl border border-border-subtle">
            <span className="text-brand font-bold block mb-1">Users Table</span>
            <ul className="list-disc list-inside space-y-1 text-slate-400 pl-2">
              <li><strong className="text-slate-300">id:</strong> VARCHAR(36) [Primary Key]</li>
              <li><strong className="text-slate-300">email:</strong> VARCHAR(255) [Unique Constraint]</li>
              <li><strong className="text-slate-300">role:</strong> ENUM('admin', 'viewer')</li>
            </ul>
          </div>

          <div className="p-4 bg-bg-deep rounded-xl border border-border-subtle">
            <span className="text-brand font-bold block mb-1">Projects & Queues (1-to-Many Relationship)</span>
            <ul className="list-disc list-inside space-y-1 text-slate-400 pl-2">
              <li><strong className="text-slate-300">queues.id:</strong> VARCHAR(36) [Primary Key]</li>
              <li><strong className="text-slate-300">queues.projectId:</strong> VARCHAR(36) [Foreign Key REFERENCES projects(id) ON DELETE CASCADE]</li>
              <li><strong className="text-slate-300">queues.name:</strong> VARCHAR(100) [Unique Constraint within projectId]</li>
              <li><strong className="text-slate-300">queues.concurrencyLimit:</strong> INTEGER [Restricts simultaneous running jobs in the queue]</li>
            </ul>
          </div>

          <div className="p-4 bg-bg-deep rounded-xl border border-border-subtle">
            <span className="text-brand font-bold block mb-1">Jobs & Job Executions (1-to-Many Audit Trail)</span>
            <ul className="list-disc list-inside space-y-1 text-slate-400 pl-2">
              <li><strong className="text-slate-300">jobs.id:</strong> VARCHAR(36) [Primary Key]</li>
              <li><strong className="text-slate-300">jobs.status:</strong> ENUM('queued', 'scheduled', 'claimed', 'running', 'completed', 'failed', 'dlq')</li>
              <li><strong className="text-slate-300">job_executions.jobId:</strong> VARCHAR(36) [Foreign Key REFERENCES jobs(id) ON DELETE CASCADE]</li>
              <li><strong className="text-slate-300">job_executions.workerId:</strong> VARCHAR(36) [Foreign Key REFERENCES workers(id) ON DELETE SET NULL]</li>
            </ul>
          </div>

          <div className="p-4 bg-bg-deep rounded-xl border border-border-subtle">
            <span className="text-brand font-bold block mb-1">Dead Letter Queue (DLQ) Entry Mapping</span>
            <ul className="list-disc list-inside space-y-1 text-slate-400 pl-2">
              <li><strong className="text-slate-300">dlq.id:</strong> VARCHAR(36) [Primary Key]</li>
              <li><strong className="text-slate-300">dlq.jobId:</strong> VARCHAR(36) [Unique Key REFERENCES jobs(id)]</li>
              <li><strong className="text-slate-300">dlq.reason:</strong> TEXT [Describes execution crash stack dumps]</li>
            </ul>
          </div>
        </div>
      </div>

      {/* System Architecture */}
      <div className="bg-bg-card border border-border-subtle rounded-2xl p-6 space-y-4 shadow-sm">
        <div className="flex items-center space-x-2 text-brand border-b border-border-subtle pb-3">
          <GitBranch className="w-4 h-4" />
          <h3 className="text-xs font-mono uppercase tracking-wider text-slate-100 font-semibold">
            2. System Architecture & Atomic Claim Mechanics
          </h3>
        </div>

        <div className="space-y-4 text-xs text-slate-400 leading-relaxed font-sans">
          <p>
            The scheduling platform separates the API ingestion layer from the execution workers pool. It relies on a centralized coordinator database model to manage polling states.
          </p>

          <div className="bg-bg-deep p-4 rounded-xl border border-border-subtle font-mono text-[10px] text-brand space-y-2">
            <div className="text-center font-bold text-slate-300 border-b border-border-subtle pb-2 mb-2">
              DISTRIBUTED LIFE CYCLE DATA FLOW
            </div>
            <div className="flex justify-between items-center px-4">
              <span className="bg-bg-card px-2 py-1 border border-border-subtle rounded text-slate-300">API Gateway</span>
              <span>── Enqueues ──&gt;</span>
              <span className="bg-brand/10 px-2 py-1 border border-brand/20 rounded text-brand font-bold">Relational DB (Queued)</span>
            </div>
            <div className="text-center py-1">│</div>
            <div className="flex justify-between items-center px-4">
              <span className="bg-rose-950/20 px-2 py-1 border border-rose-900/30 rounded text-rose-400">DLQ (Failures)</span>
              <span>&lt;── Retries Maxed ──</span>
              <span className="bg-emerald-950/20 px-2 py-1 border border-emerald-900/30 rounded text-emerald-400 font-bold">Workers (Claimed / Running)</span>
            </div>
            <div className="text-center py-1">│</div>
            <div className="flex justify-center px-4">
              <span className="bg-bg-card px-2 py-1 border border-border-subtle rounded text-emerald-400 font-bold">Completed (cron/DAG trigger)</span>
            </div>
          </div>

          <p>
            <strong className="text-slate-300 font-semibold">Atomic Claims:</strong> To prevent race conditions where multiple workers poll and claim the same task simultaneously, claims are executed inside serializable transactions. In Node, because code runs on a single event loop thread, synchronous transaction blocks are inherently serialized and thread-safe.
          </p>
        </div>
      </div>

      {/* Reliability & Concurrency Decisions */}
      <div className="bg-bg-card border border-border-subtle rounded-2xl p-6 space-y-4 shadow-sm">
        <div className="flex items-center space-x-2 text-brand border-b border-border-subtle pb-3">
          <ShieldCheck className="w-4 h-4" />
          <h3 className="text-xs font-mono uppercase tracking-wider text-slate-100 font-semibold">
            3. Reliability, Concurrency & Smart Diagnoses
          </h3>
        </div>

        <div className="space-y-3 text-xs text-slate-400 leading-relaxed font-sans">
          <ul className="list-disc list-inside space-y-2">
            <li>
              <strong className="text-slate-300 font-semibold">Exponential Backoff:</strong> Avoids database starvation by exponentially increasing delays between retries (delay = BaseDelay * 2^(attempt-1)).
            </li>
            <li>
              <strong className="text-slate-300 font-semibold">Worker Heartbeats:</strong> Active worker nodes ping the central database every 3 seconds. If heartbeats miss for &gt;10s, the worker is marked offline and its active running jobs are rescued and re-queued.
            </li>
            <li>
              <strong className="text-slate-300 font-semibold">AI Crash Summaries (Gemini):</strong> Leverages the modern `@google/genai` model `gemini-3.5-flash` to parse execution stack traces and context arguments, diagnosing root causes and outputting actionable remediation steps for developers.
            </li>
          </ul>
        </div>
      </div>

      {/* Design Trade-offs */}
      <div className="bg-bg-card border border-border-subtle rounded-2xl p-6 space-y-4 shadow-sm">
        <div className="flex items-center space-x-2 text-brand border-b border-border-subtle pb-3">
          <Sliders className="w-4 h-4" />
          <h3 className="text-xs font-mono uppercase tracking-wider text-slate-100 font-semibold">
            4. Design Decisions & Major Trade-offs
          </h3>
        </div>

        <div className="space-y-4 text-xs text-slate-400 leading-relaxed font-sans">
          <div>
            <strong className="text-slate-300 font-semibold">A. Polling vs. Push-Based Event Triggers</strong>
            <p className="mt-1">
              <em>Decision:</em> Hybrid Polling. Polling reduces connections overhead compared to persistent long-lived push links in a containerized server environment. Ticking checks ensure scheduled timing accuracy.
            </p>
          </div>

          <div>
            <strong className="text-slate-300 font-semibold">B. SQLite File Storage vs. InMemory Lock State</strong>
            <p className="mt-1">
              <em>Decision:</em> We built an optimized relational model with JSON database backup. This guarantees immediate zero-dependency portability across any serverless Cloud Run instance without needing native C/C++ build chains (like standard SQLite binaries) which can fail during deployments.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
