/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import fs from "fs";
import path from "path";

// Define strict types matching the schema in the spec:
// Users, Organizations, Projects, Queues, Jobs, Job Executions, Retry Policies, Workers, Worker Heartbeats, Job Logs, Scheduled Jobs, and Dead Letter Queue entries.

export interface User {
  id: string;
  email: string;
  role: "admin" | "viewer";
  createdAt: number;
}

export interface Organization {
  id: string;
  name: string;
  createdAt: number;
}

export interface Project {
  id: string;
  orgId: string;
  name: string;
  createdAt: number;
}

export type RetryStrategy = "fixed" | "linear" | "exponential";

export interface RetryPolicy {
  id: string;
  name: string;
  strategy: RetryStrategy;
  baseDelayMs: number;
  maxRetries: number;
  createdAt: number;
}

export interface Queue {
  id: string;
  projectId: string;
  name: string;
  priority: number; // 1 (lowest) to 10 (highest)
  concurrencyLimit: number; // e.g. 5 concurrent jobs
  retryPolicyId: string;
  isPaused: boolean;
  createdAt: number;
}

export type JobStatus = "queued" | "scheduled" | "claimed" | "running" | "completed" | "failed" | "dlq";

export interface Job {
  id: string;
  queueId: string;
  status: JobStatus;
  payload: Record<string, any>;
  retryCount: number;
  maxRetries: number;
  createdAt: number;
  updatedAt: number;
  scheduledAt: number; // For delayed or scheduled execution
  cronExpression?: string; // e.g., "*/5 * * * *" for recurring
  parentJobId?: string; // For workflow dependencies DAG
  batchId?: string; // For batch grouping
}

export interface JobExecution {
  id: string;
  jobId: string;
  workerId: string;
  status: "running" | "completed" | "failed";
  startedAt: number;
  finishedAt?: number;
  errorMessage?: string;
  executionTimeMs?: number;
}

export interface Worker {
  id: string;
  name: string;
  status: "active" | "idle" | "offline";
  lastHeartbeatAt: number;
  concurrencyLoad: number;
  createdAt: number;
}

export interface WorkerHeartbeat {
  id: string;
  workerId: string;
  timestamp: number;
  loadMetrics: {
    cpuLoad: number;
    memoryUsagePercent: number;
    activeJobsCount: number;
  };
}

export interface JobLog {
  id: string;
  jobId: string;
  level: "info" | "error";
  message: string;
  timestamp: number;
}

export interface DeadLetterQueueEntry {
  id: string;
  jobId: string;
  queueId: string;
  failedAt: number;
  reason: string;
  originalPayload: Record<string, any>;
}

// Relational database state structure
interface DbState {
  users: User[];
  organizations: Organization[];
  projects: Project[];
  retryPolicies: RetryPolicy[];
  queues: Queue[];
  jobs: Job[];
  jobExecutions: JobExecution[];
  workers: Worker[];
  workerHeartbeats: WorkerHeartbeat[];
  jobLogs: JobLog[];
  deadLetterQueue: DeadLetterQueueEntry[];
}

const DB_FILE_PATH = path.join(process.cwd(), "data", "db.json");

// Ensure data folder exists
if (!fs.existsSync(path.dirname(DB_FILE_PATH))) {
  fs.mkdirSync(path.dirname(DB_FILE_PATH), { recursive: true });
}

class RelationalDatabase {
  private state: DbState = {
    users: [],
    organizations: [],
    projects: [],
    retryPolicies: [],
    queues: [],
    jobs: [],
    jobExecutions: [],
    workers: [],
    workerHeartbeats: [],
    jobLogs: [],
    deadLetterQueue: [],
  };

  constructor() {
    this.load();
    if (this.state.organizations.length === 0) {
      this.seedDefaults();
    }
  }

  private load() {
    try {
      if (fs.existsSync(DB_FILE_PATH)) {
        const raw = fs.readFileSync(DB_FILE_PATH, "utf-8");
        this.state = JSON.parse(raw);
      }
    } catch (e) {
      console.error("Failed to load local DB state:", e);
    }
  }

  public save() {
    try {
      fs.writeFileSync(DB_FILE_PATH, JSON.stringify(this.state, null, 2), "utf-8");
    } catch (e) {
      console.error("Failed to save local DB state:", e);
    }
  }

  /**
   * Node is single-threaded. Any synchronous callback is naturally executed
   * as an atomic transaction on the event loop because no other JavaScript codes
   * can interleave during synchronous execution.
   */
  public transaction<T>(callback: () => T): T {
    const result = callback();
    this.save();
    return result;
  }

  // Raw tables access (always use inside transactions or copy to prevent references leaks)
  public get users() { return this.state.users; }
  public get organizations() { return this.state.organizations; }
  public get projects() { return this.state.projects; }
  public get retryPolicies() { return this.state.retryPolicies; }
  public get queues() { return this.state.queues; }
  public get jobs() { return this.state.jobs; }
  public get jobExecutions() { return this.state.jobExecutions; }
  public get workers() { return this.state.workers; }
  public get workerHeartbeats() { return this.state.workerHeartbeats; }
  public get jobLogs() { return this.state.jobLogs; }
  public get deadLetterQueue() { return this.state.deadLetterQueue; }

  private seedDefaults() {
    const now = Date.now();

    // 1. Seed users
    const defaultUser: User = {
      id: "usr_1",
      email: "admin@scheduler.io",
      role: "admin",
      createdAt: now,
    };
    this.state.users.push(defaultUser);

    // 2. Seed organizations
    const defaultOrg: Organization = {
      id: "org_1",
      name: "Acme Corp",
      createdAt: now,
    };
    this.state.organizations.push(defaultOrg);

    // 3. Seed projects
    const defaultProject: Project = {
      id: "proj_1",
      orgId: "org_1",
      name: "Core Platform Services",
      createdAt: now,
    };
    this.state.projects.push(defaultProject);

    // 4. Seed default Retry Policies
    const policies: RetryPolicy[] = [
      {
        id: "rp_fixed",
        name: "Fixed Delay (3s)",
        strategy: "fixed",
        baseDelayMs: 3000,
        maxRetries: 3,
        createdAt: now,
      },
      {
        id: "rp_linear",
        name: "Linear Backoff (5s base)",
        strategy: "linear",
        baseDelayMs: 5000,
        maxRetries: 4,
        createdAt: now,
      },
      {
        id: "rp_exponential",
        name: "Exponential Backoff (2s base)",
        strategy: "exponential",
        baseDelayMs: 2000,
        maxRetries: 5,
        createdAt: now,
      },
    ];
    this.state.retryPolicies.push(...policies);

    // 5. Seed default queues
    const queuesList: Queue[] = [
      {
        id: "q_critical",
        projectId: "proj_1",
        name: "critical-notifications",
        priority: 10, // highest
        concurrencyLimit: 5,
        retryPolicyId: "rp_exponential",
        isPaused: false,
        createdAt: now,
      },
      {
        id: "q_media",
        projectId: "proj_1",
        name: "media-transcoding",
        priority: 5,
        concurrencyLimit: 2,
        retryPolicyId: "rp_linear",
        isPaused: false,
        createdAt: now,
      },
      {
        id: "q_reports",
        projectId: "proj_1",
        name: "analytics-reporting",
        priority: 2, // low
        concurrencyLimit: 3,
        retryPolicyId: "rp_fixed",
        isPaused: false,
        createdAt: now,
      },
    ];
    this.state.queues.push(...queuesList);

    // 6. Seed some default finished/running jobs to populate dashboard
    const sampleJobs: Job[] = [
      {
        id: "job_sample_1",
        queueId: "q_critical",
        status: "completed",
        payload: { task: "email_dispatch", recipient: "ceo@acme.com", template: "welcome" },
        retryCount: 0,
        maxRetries: 3,
        createdAt: now - 3600000,
        updatedAt: now - 3595000,
        scheduledAt: now - 3600000,
      },
      {
        id: "job_sample_2",
        queueId: "q_media",
        status: "completed",
        payload: { task: "image_thumbnail_resize", src: "/uploads/avatar.png", size: "128x128" },
        retryCount: 1,
        maxRetries: 4,
        createdAt: now - 1800000,
        updatedAt: now - 1790000,
        scheduledAt: now - 1800000,
      },
      {
        id: "job_sample_3",
        queueId: "q_reports",
        status: "dlq",
        payload: { task: "compile_monthly_spend", department: "marketing", format: "pdf" },
        retryCount: 3,
        maxRetries: 3,
        createdAt: now - 7200000,
        updatedAt: now - 7180000,
        scheduledAt: now - 7200000,
      },
    ];
    this.state.jobs.push(...sampleJobs);

    // Seed logs & executions for sample jobs
    this.state.jobLogs.push(
      {
        id: "log_1",
        jobId: "job_sample_1",
        level: "info",
        message: "Job submitted into critical-notifications queue.",
        timestamp: now - 3600000,
      },
      {
        id: "log_2",
        jobId: "job_sample_1",
        level: "info",
        message: "Job claimed by worker_1. Initiating email dispatch template.",
        timestamp: now - 3598000,
      },
      {
        id: "log_3",
        jobId: "job_sample_1",
        level: "info",
        message: "Email successfully delivered to SMTP server. Status: 250 OK.",
        timestamp: now - 3595000,
      },
      {
        id: "log_4",
        jobId: "job_sample_3",
        level: "info",
        message: "Job submitted into analytics-reporting queue.",
        timestamp: now - 7200000,
      },
      {
        id: "log_5",
        jobId: "job_sample_3",
        level: "error",
        message: "Attempt 1 failed: Connection timeout connecting to reporting database cluster.",
        timestamp: now - 7195000,
      },
      {
        id: "log_6",
        jobId: "job_sample_3",
        level: "error",
        message: "Attempt 2 failed: Connection timeout connecting to reporting database cluster.",
        timestamp: now - 7190000,
      },
      {
        id: "log_7",
        jobId: "job_sample_3",
        level: "error",
        message: "Attempt 3 failed: Connection timeout connecting to reporting database cluster. Permanent failure reached.",
        timestamp: now - 7180000,
      },
      {
        id: "log_8",
        jobId: "job_sample_3",
        level: "error",
        message: "Routing job to Dead Letter Queue (DLQ). Policy max retries (3) exhausted.",
        timestamp: now - 7180000,
      }
    );

    this.state.jobExecutions.push(
      {
        id: "exe_1",
        jobId: "job_sample_1",
        workerId: "worker_1",
        status: "completed",
        startedAt: now - 3598000,
        finishedAt: now - 3595000,
        executionTimeMs: 3000,
      },
      {
        id: "exe_2",
        jobId: "job_sample_3",
        workerId: "worker_2",
        status: "failed",
        startedAt: now - 7196000,
        finishedAt: now - 7195000,
        errorMessage: "Database connection timeout",
        executionTimeMs: 1000,
      },
      {
        id: "exe_3",
        jobId: "job_sample_3",
        workerId: "worker_2",
        status: "failed",
        startedAt: now - 7191000,
        finishedAt: now - 7190000,
        errorMessage: "Database connection timeout",
        executionTimeMs: 1000,
      },
      {
        id: "exe_4",
        jobId: "job_sample_3",
        workerId: "worker_1",
        status: "failed",
        startedAt: now - 7181000,
        finishedAt: now - 7180000,
        errorMessage: "Database connection timeout",
        executionTimeMs: 1000,
      }
    );

    this.state.deadLetterQueue.push({
      id: "dlq_1",
      jobId: "job_sample_3",
      queueId: "q_reports",
      failedAt: now - 7180000,
      reason: "Database connection timeout after 3 retries",
      originalPayload: { task: "compile_monthly_spend", department: "marketing", format: "pdf" },
    });

    this.save();
  }
}

export const db = new RelationalDatabase();
