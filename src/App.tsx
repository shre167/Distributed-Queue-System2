/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from "react";
import { Sidebar } from "./components/Sidebar";
import { OverviewTab } from "./components/OverviewTab";
import { QueuesTab } from "./components/QueuesTab";
import { JobsTab } from "./components/JobsTab";
import { PlaygroundTab } from "./components/PlaygroundTab";
import { WorkersTab } from "./components/WorkersTab";
import { DocsTab } from "./components/DocsTab";
import { JobDetailsModal } from "./components/JobDetailsModal";
import { 
  Job, 
  Queue, 
  RetryPolicy, 
  Worker, 
  JobLog, 
  DashboardMetrics, 
  JobExecution 
} from "./types";

export default function App() {
  const [activeTab, setActiveTab] = useState("overview");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [systemHealth, setSystemHealth] = useState<"healthy" | "degraded" | "critical">("healthy");
  const [lastPolled, setLastPolled] = useState<Date>(new Date());

  // Main system data state
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [queues, setQueues] = useState<Queue[]>([]);
  const [retryPolicies, setRetryPolicies] = useState<RetryPolicy[]>([]);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [workers, setWorkers] = useState<Worker[]>([]);
  const [allLogs, setAllLogs] = useState<JobLog[]>([]);

  // Filtering for Job Explorer
  const [statusFilter, setStatusFilter] = useState("");
  const [queueFilter, setQueueFilter] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalJobsCount, setTotalJobsCount] = useState(0);

  // Inspector Modal state
  const [inspectedJob, setInspectedJob] = useState<Job | null>(null);
  const [inspectedExecutions, setInspectedExecutions] = useState<JobExecution[]>([]);
  const [inspectedLogs, setInspectedLogs] = useState<JobLog[]>([]);

  // Fetch metrics & system status
  const fetchMetricsAndStatic = async () => {
    try {
      // Fetch Metrics
      const resMetrics = await fetch("/api/metrics");
      if (resMetrics.ok) {
        const data = await resMetrics.json();
        setMetrics(data);

        // Calculate dynamic system health indicator based on failed and running jobs
        const failedCount = data.counts.failed;
        if (failedCount > 10) {
          setSystemHealth("critical");
        } else if (failedCount > 2) {
          setSystemHealth("degraded");
        } else {
          setSystemHealth("healthy");
        }
      }

      // Fetch Queues
      const resQueues = await fetch("/api/queues");
      if (resQueues.ok) {
        setQueues(await resQueues.json());
      }

      // Fetch Workers
      const resWorkers = await fetch("/api/workers");
      if (resWorkers.ok) {
        setWorkers(await resWorkers.json());
      }

      setLastPolled(new Date());
    } catch (e) {
      console.error("Failed to sync metrics from backend APIs:", e);
    }
  };

  // Fetch retry policies (run once on load)
  useEffect(() => {
    fetch("/api/retry-policies")
      .then((res) => (res.ok ? res.json() : []))
      .then((data) => setRetryPolicies(data))
      .catch((err) => console.error("Error loading policies:", err));
  }, []);

  // Fetch jobs dynamically based on explorer parameters
  const fetchJobsList = async () => {
    try {
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: "10",
        status: statusFilter,
        queueId: queueFilter,
        search: searchQuery,
      });

      const res = await fetch(`/api/jobs?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setJobs(data.jobs);
        setTotalJobsCount(data.total);
        setTotalPages(data.totalPages);
      }
    } catch (e) {
      console.error("Error syncing jobs data list:", e);
    }
  };

  // Sync entire scheduler logs trace
  const fetchAllSchedulerLogs = async () => {
    try {
      // We will pull the logs of individual jobs to build a combined log stream
      const allLogsAccumulator: JobLog[] = [];
      const res = await fetch("/api/jobs?limit=50");
      if (res.ok) {
        const data = await res.json();
        const activeJobs: Job[] = data.jobs;

        // Fetch logs for the top jobs
        await Promise.all(
          activeJobs.slice(0, 10).map(async (job) => {
            try {
              const resJob = await fetch(`/api/jobs/${job.id}`);
              if (resJob.ok) {
                const jobData = await resJob.json();
                allLogsAccumulator.push(...jobData.logs);
              }
            } catch (err) {
              // Ignore single job details failure
            }
          })
        );

        // Sort all accumulated logs desc by timestamp
        allLogsAccumulator.sort((a, b) => b.timestamp - a.timestamp);
        setAllLogs(allLogsAccumulator.slice(0, 50));
      }
    } catch (e) {
      console.error("Error building live scheduler log stream:", e);
    }
  };

  // Polling setup: updates metrics, workers, and active lists every 2.5 seconds
  useEffect(() => {
    fetchMetricsAndStatic();
    fetchJobsList();
    fetchAllSchedulerLogs();

    const interval = setInterval(() => {
      fetchMetricsAndStatic();
      fetchJobsList();
      fetchAllSchedulerLogs();
    }, 2500);

    return () => clearInterval(interval);
  }, [currentPage, statusFilter, queueFilter, searchQuery]);

  // Sync inspected job details in real-time if modal is active
  useEffect(() => {
    if (!inspectedJob) return;

    const syncInspectedDetails = async () => {
      try {
        const res = await fetch(`/api/jobs/${inspectedJob.id}`);
        if (res.ok) {
          const data = await res.json();
          setInspectedExecutions(data.executions);
          setInspectedLogs(data.logs);
        }
      } catch (e) {
        console.error("Failed to sync details for inspected job:", e);
      }
    };

    syncInspectedDetails();
    const interval = setInterval(syncInspectedDetails, 2000);
    return () => clearInterval(interval);
  }, [inspectedJob]);

  // ---------------------------------------------------------------------------
  // Action Handlers
  // ---------------------------------------------------------------------------

  const handlePauseQueue = async (id: string) => {
    await fetch(`/api/queues/${id}/pause`, { method: "POST" });
    fetchMetricsAndStatic();
  };

  const handleResumeQueue = async (id: string) => {
    await fetch(`/api/queues/${id}/resume`, { method: "POST" });
    fetchMetricsAndStatic();
  };

  const handleCreateQueue = async (data: any) => {
    const res = await fetch("/api/queues", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || "Failed to create queue.");
    }
    fetchMetricsAndStatic();
  };

  const handleDispatchJob = async (data: any) => {
    const res = await fetch("/api/jobs", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || "Failed to submit job.");
    }
    fetchMetricsAndStatic();
    fetchJobsList();
    fetchAllSchedulerLogs();
  };

  const handleDispatchBatch = async (data: any) => {
    const res = await fetch("/api/jobs/batch", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || "Failed to submit batch.");
    }
    fetchMetricsAndStatic();
    fetchJobsList();
    fetchAllSchedulerLogs();
  };

  const handleRetryJob = async (id: string) => {
    await fetch(`/api/jobs/${id}/retry`, { method: "POST" });
    fetchMetricsAndStatic();
    fetchJobsList();
    fetchAllSchedulerLogs();
  };

  const handleCancelJob = async (id: string) => {
    await fetch(`/api/jobs/${id}`, { method: "DELETE" });
    fetchMetricsAndStatic();
    fetchJobsList();
    fetchAllSchedulerLogs();
  };

  const handleSpawnWorker = async (name: string) => {
    const res = await fetch("/api/workers", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || "Failed to spawn worker.");
    }
    fetchMetricsAndStatic();
  };

  const handleShutdownWorker = async (id: string) => {
    await fetch(`/api/workers/${id}/shutdown`, { method: "POST" });
    fetchMetricsAndStatic();
  };

  const handleInspectJob = (job: Job) => {
    setInspectedJob(job);
    setInspectedExecutions([]);
    setInspectedLogs([]);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans flex flex-col lg:flex-row antialiased overflow-hidden">
      {/* Mobile Top Bar */}
      <header className="lg:hidden bg-bg-sidebar border-b border-border-subtle p-4 flex items-center justify-between shrink-0">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 bg-brand rounded flex items-center justify-center shrink-0">
            <div className="w-3 h-3 bg-bg-deep rotate-45"></div>
          </div>
          <div>
            <h1 className="font-serif italic text-sm text-slate-100 tracking-tight leading-none">
              Scheduler Core
            </h1>
            <span className="text-[9px] font-mono uppercase tracking-[0.15em] text-brand block mt-0.5">
              Distributed v1.0.0
            </span>
          </div>
        </div>
        
        <button
          onClick={() => setMobileMenuOpen(true)}
          className="p-1.5 rounded bg-[#151515] border border-border-subtle text-slate-400 hover:text-slate-200 transition-all cursor-pointer"
        >
          {/* Hamburger Menu Icon */}
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
      </header>

      {/* Mobile Sidebar Back-drop overlay */}
      {mobileMenuOpen && (
        <div 
          onClick={() => setMobileMenuOpen(false)}
          className="lg:hidden fixed inset-0 bg-[#000]/70 z-40 backdrop-blur-sm animate-in fade-in duration-200"
        />
      )}

      {/* Sidebar navigation */}
      <Sidebar 
        activeTab={activeTab} 
        setActiveTab={setActiveTab} 
        systemHealth={systemHealth} 
        lastPolled={lastPolled} 
        isOpen={mobileMenuOpen}
        onClose={() => setMobileMenuOpen(false)}
      />

      {/* Main Container console */}
      <main className="flex-1 overflow-y-auto h-screen p-4 md:p-8 bg-gradient-to-br from-slate-950 via-slate-950 to-indigo-950/10">
        <div className="max-w-6xl mx-auto space-y-6">
          {activeTab === "overview" && (
            <OverviewTab 
              metrics={metrics} 
              logs={allLogs} 
              onTriggerRefresh={fetchMetricsAndStatic} 
            />
          )}

          {activeTab === "queues" && (
            <QueuesTab
              queues={queues}
              retryPolicies={retryPolicies}
              onPauseQueue={handlePauseQueue}
              onResumeQueue={handleResumeQueue}
              onCreateQueue={handleCreateQueue}
              onTriggerRefresh={fetchMetricsAndStatic}
            />
          )}

          {activeTab === "jobs" && (
            <JobsTab
              jobs={jobs}
              queues={queues}
              totalJobs={totalJobsCount}
              currentPage={currentPage}
              totalPages={totalPages}
              statusFilter={statusFilter}
              setStatusFilter={setStatusFilter}
              queueFilter={queueFilter}
              setQueueFilter={setQueueFilter}
              searchQuery={searchQuery}
              setSearchQuery={setSearchQuery}
              setCurrentPage={setCurrentPage}
              onInspectJob={handleInspectJob}
              onRetryJob={handleRetryJob}
              onCancelJob={handleCancelJob}
              onTriggerRefresh={fetchJobsList}
            />
          )}

          {activeTab === "playground" && (
            <PlaygroundTab
              queues={queues}
              recentJobs={jobs}
              onDispatchJob={handleDispatchJob}
              onDispatchBatch={handleDispatchBatch}
            />
          )}

          {activeTab === "workers" && (
            <WorkersTab
              workers={workers}
              onSpawnWorker={handleSpawnWorker}
              onShutdownWorker={handleShutdownWorker}
              onTriggerRefresh={fetchMetricsAndStatic}
            />
          )}

          {activeTab === "docs" && <DocsTab />}
        </div>
      </main>

      {/* Side drawer / Popup Modal to inspect detailed execution and smart summaries */}
      {inspectedJob && (
        <JobDetailsModal
          job={inspectedJob}
          executions={inspectedExecutions}
          logs={inspectedLogs}
          onClose={() => setInspectedJob(null)}
        />
      )}
    </div>
  );
}
