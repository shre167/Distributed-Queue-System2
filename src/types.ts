/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface User {
  id: string;
  email: string;
  role: "admin" | "viewer";
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
  priority: number;
  concurrencyLimit: number;
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
  scheduledAt: number;
  cronExpression?: string;
  parentJobId?: string;
  batchId?: string;
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

export interface JobLog {
  id: string;
  jobId: string;
  level: "info" | "error";
  message: string;
  timestamp: number;
}

export interface MetricsCounts {
  total: number;
  completed: number;
  failed: number;
  running: number;
  queued: number;
}

export interface QueueDistributionItem {
  name: string;
  priority: number;
  concurrencyLimit: number;
  isPaused: boolean;
  totalJobs: number;
  runningJobs: number;
}

export interface TimelineDataItem {
  time: string;
  completed: number;
  failed: number;
}

export interface DashboardMetrics {
  counts: MetricsCounts;
  successRate: number;
  avgWaitTimeMs: number;
  avgRunTimeMs: number;
  queueDistribution: QueueDistributionItem[];
  timelineData: TimelineDataItem[];
}
