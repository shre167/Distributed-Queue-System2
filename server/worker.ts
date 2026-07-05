/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { db, Job, Queue, RetryPolicy, Worker, JobExecution } from "./db";

export class WorkerManager {
  private activeTimers: Map<string, NodeJS.Timeout> = new Map();
  private isShuttingDown: Map<string, boolean> = new Map();

  constructor() {
    this.startGlobalPoll();
  }

  /**
   * Periodically wakes up the active workers and checks for scheduled jobs.
   */
  private startGlobalPoll() {
    const pollInterval = setInterval(() => {
      this.tick();
    }, 1000);
    // Keep it running in background
    pollInterval.unref();
  }

  /**
   * The core engine execution tick.
   * Runs every second to check for workers heartbeats and schedule cron/delayed executions.
   */
  private tick() {
    const now = Date.now();

    db.transaction(() => {
      // 1. Mark dead workers (no heartbeat in 10s) as offline
      db.workers.forEach((worker) => {
        if (worker.status !== "offline" && now - worker.lastHeartbeatAt > 10000) {
          worker.status = "offline";
          db.jobLogs.push({
            id: `log_hb_fail_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
            jobId: "",
            level: "error",
            message: `Worker "${worker.name}" missed heartbeats. Marking offline.`,
            timestamp: now,
          });

          // Rescue running jobs assigned to this worker
          db.jobs.forEach((job) => {
            if (job.status === "running") {
              const activeExe = db.jobExecutions.find(
                (e) => e.jobId === job.id && e.workerId === worker.id && e.status === "running"
              );
              if (activeExe) {
                activeExe.status = "failed";
                activeExe.finishedAt = now;
                activeExe.errorMessage = "Worker died or missed heartbeats";

                // Trigger retry logic or fail to DLQ
                this.handleJobFailureInternal(job, "Worker connection lost", now);
              }
            }
          });
        }
      });

      // 2. Poll and claim jobs for active workers
      db.workers.forEach((worker) => {
        if (worker.status === "active" && !this.isShuttingDown.get(worker.id)) {
          this.attemptClaimAndRun(worker, now);
        }
      });
    });
  }

  /**
   * Attempts to claim jobs for a given worker.
   * Fulfills atomic claim via synchronous db.transaction callback.
   */
  private attemptClaimAndRun(worker: Worker, now: number) {
    // Determine worker capacity: let's assume max concurrency load of 3 jobs per worker
    const workerMaxConcurrency = 3;
    const currentLoad = db.jobs.filter(
      (j) => j.status === "running" && db.jobExecutions.some((e) => e.jobId === j.id && e.workerId === worker.id && e.status === "running")
    ).length;

    if (currentLoad >= workerMaxConcurrency) {
      worker.status = "active";
      worker.concurrencyLoad = currentLoad;
      return;
    }

    // Attempt to claim jobs up to capacity
    const slotsAvailable = workerMaxConcurrency - currentLoad;
    for (let i = 0; i < slotsAvailable; i++) {
      const claimedJob = this.claimNextEligibleJob(worker.id, now);
      if (!claimedJob) break; // No eligible jobs available

      // Execute claimed job asynchronously outside transaction
      this.executeJob(worker.id, claimedJob.id);
    }

    worker.concurrencyLoad = db.jobs.filter(
      (j) => j.status === "running" && db.jobExecutions.some((e) => e.jobId === j.id && e.workerId === worker.id && e.status === "running")
    ).length;
    worker.status = worker.concurrencyLoad > 0 ? "active" : "idle";
  }

  /**
   * Find and claim the next available job adhering to queue priority, concurrency limits, workflow dependencies, and scheduled times.
   */
  private claimNextEligibleJob(workerId: string, now: number): Job | null {
    // 1. Filter and sort queues by Priority (highest first)
    const activeQueues = db.queues
      .filter((q) => !q.isPaused)
      .sort((a, b) => b.priority - a.priority);

    for (const queue of activeQueues) {
      // Check queue concurrency limit
      const currentQueueRunningCount = db.jobs.filter(
        (j) => j.queueId === queue.id && j.status === "running"
      ).length;

      if (currentQueueRunningCount >= queue.concurrencyLimit) {
        continue; // Queue is at concurrency capacity
      }

      // Find jobs in this queue that are ready to run:
      // - status is 'queued' or 'scheduled'
      // - scheduledAt <= now
      // - workflow dependencies (parentJobId) are satisfied (parent job status is 'completed')
      const readyJobs = db.jobs
        .filter((job) => {
          if (job.queueId !== queue.id) return false;
          if (job.status !== "queued" && job.status !== "scheduled") return false;
          if (job.scheduledAt > now) return false;

          // Check dependency DAG
          if (job.parentJobId) {
            const parent = db.jobs.find((pj) => pj.id === job.parentJobId);
            if (!parent || parent.status !== "completed") {
              return false; // Parent must be completed
            }
          }

          return true;
        })
        .sort((a, b) => a.createdAt - b.createdAt); // FIFO within queue

      if (readyJobs.length > 0) {
        const job = readyJobs[0];
        // Claim the job atomically
        job.status = "running";
        job.updatedAt = now;

        // Create execution entry
        const executionId = `exe_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
        db.jobExecutions.push({
          id: executionId,
          jobId: job.id,
          workerId: workerId,
          status: "running",
          startedAt: now,
        });

        // Add log entry
        db.jobLogs.push({
          id: `log_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
          jobId: job.id,
          level: "info",
          message: `Job claimed and run by worker "${workerId}". Execution started.`,
          timestamp: now,
        });

        return job;
      }
    }

    return null;
  }

  /**
   * Run the actual job workload (simulated)
   */
  private async executeJob(workerId: string, jobId: string) {
    // Simulated processing latency based on job payload parameters
    const job = db.transaction(() => db.jobs.find((j) => j.id === jobId));
    if (!job) return;

    const taskType = job.payload.task || "default_task";
    const runDuration = job.payload.duration || Math.floor(Math.random() * 3000) + 1500; // 1.5s - 4.5s
    const shouldFail = job.payload.fail === true || (job.payload.failRate !== undefined && Math.random() < job.payload.failRate);

    // Let the job run
    setTimeout(() => {
      const finishTime = Date.now();
      db.transaction(() => {
        const refreshedJob = db.jobs.find((j) => j.id === jobId);
        const execution = db.jobExecutions.find((e) => e.jobId === jobId && e.workerId === workerId && e.status === "running");
        const worker = db.workers.find((w) => w.id === workerId);

        if (!refreshedJob || refreshedJob.status !== "running") return;

        if (execution) {
          execution.finishedAt = finishTime;
          execution.executionTimeMs = finishTime - execution.startedAt;
        }

        if (shouldFail) {
          const errMsg = job.payload.errorMsg || `Simulated execution failure for task type: ${taskType}`;
          if (execution) {
            execution.status = "failed";
            execution.errorMessage = errMsg;
          }

          db.jobLogs.push({
            id: `log_${finishTime}_${Math.random().toString(36).substr(2, 6)}`,
            jobId: jobId,
            level: "error",
            message: `Task execution failed: ${errMsg}`,
            timestamp: finishTime,
          });

          this.handleJobFailureInternal(refreshedJob, errMsg, finishTime);
        } else {
          // Success!
          refreshedJob.status = "completed";
          refreshedJob.updatedAt = finishTime;

          if (execution) {
            execution.status = "completed";
          }

          db.jobLogs.push({
            id: `log_${finishTime}_${Math.random().toString(36).substr(2, 6)}`,
            jobId: jobId,
            level: "info",
            message: `Task successfully completed in ${finishTime - execution!.startedAt}ms.`,
            timestamp: finishTime,
          });

          // Check if this is a recurring cron job
          if (refreshedJob.cronExpression) {
            this.scheduleNextCronInstance(refreshedJob, finishTime);
          }
        }

        // Update worker load status
        if (worker) {
          const currentLoad = db.jobs.filter(
            (j) => j.status === "running" && db.jobExecutions.some((e) => e.jobId === j.id && e.workerId === worker.id && e.status === "running")
          ).length;
          worker.concurrencyLoad = currentLoad;
          worker.status = currentLoad > 0 ? "active" : "idle";
        }
      });
    }, runDuration);
  }

  /**
   * Handle retries or route to DLQ if max retries reached.
   */
  private handleJobFailureInternal(job: Job, errorMsg: string, now: number) {
    const queue = db.queues.find((q) => q.id === job.queueId);
    const policy = db.retryPolicies.find((p) => p.id === queue?.retryPolicyId) || db.retryPolicies[0];

    if (job.retryCount < job.maxRetries) {
      job.retryCount += 1;
      job.status = "scheduled"; // Schedule retry in the future

      // Calculate backoff delay
      let delay = policy.baseDelayMs;
      if (policy.strategy === "linear") {
        delay = policy.baseDelayMs * job.retryCount;
      } else if (policy.strategy === "exponential") {
        delay = policy.baseDelayMs * Math.pow(2, job.retryCount - 1);
      }

      job.scheduledAt = now + delay;
      job.updatedAt = now;

      db.jobLogs.push({
        id: `log_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
        jobId: job.id,
        level: "info",
        message: `Retry scheduled (Attempt ${job.retryCount}/${job.maxRetries}) in ${delay}ms using strategy "${policy.strategy}".`,
        timestamp: now,
      });
    } else {
      // Route to Dead Letter Queue (DLQ)
      job.status = "dlq";
      job.updatedAt = now;

      db.deadLetterQueue.push({
        id: `dlq_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
        jobId: job.id,
        queueId: job.queueId,
        failedAt: now,
        reason: errorMsg,
        originalPayload: job.payload,
      });

      db.jobLogs.push({
        id: `log_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
        jobId: job.id,
        level: "error",
        message: `Job exceeded maximum retries (${job.maxRetries}). Sent to Dead Letter Queue (DLQ).`,
        timestamp: now,
      });
    }
  }

  /**
   * For recurring jobs, generate the next execution event
   */
  private scheduleNextCronInstance(completedJob: Job, now: number) {
    // Create an elegant simulated cron schedule (e.g. 15s or 30s based on expression, or parse simple inputs)
    // To keep the dashboard active and exciting, if the cron is "*/5 * * * *", we will trigger it every 15 seconds in this simulator
    // so the user can easily observe the background scheduler running!
    const delay = completedJob.cronExpression === "*/1 * * * *" ? 15000 : 30000; // Simulated recurring intervals

    const nextJob: Job = {
      id: `job_cron_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
      queueId: completedJob.queueId,
      status: "scheduled",
      payload: completedJob.payload,
      retryCount: 0,
      maxRetries: completedJob.maxRetries,
      createdAt: now,
      updatedAt: now,
      scheduledAt: now + delay,
      cronExpression: completedJob.cronExpression,
    };

    db.jobs.push(nextJob);

    db.jobLogs.push({
      id: `log_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
      jobId: nextJob.id,
      level: "info",
      message: `Recurring cron schedule triggered. Next instance scheduled at ${new Date(nextJob.scheduledAt).toISOString()}.`,
      timestamp: now,
    });
  }

  /**
   * API: Spawns a new active worker process
   */
  public spawnWorker(name: string): Worker {
    return db.transaction(() => {
      const now = Date.now();
      const id = `worker_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`;
      const worker: Worker = {
        id,
        name,
        status: "idle",
        lastHeartbeatAt: now,
        concurrencyLoad: 0,
        createdAt: now,
      };
      db.workers.push(worker);

      db.jobLogs.push({
        id: `log_${now}_${Math.random().toString(36).substr(2, 4)}`,
        jobId: "",
        level: "info",
        message: `Worker "${name}" spawned and initialized successfully. Listening to eligible queues.`,
        timestamp: now,
      });

      return worker;
    });
  }

  /**
   * API: Heartbeat ping from a worker
   */
  public pingWorker(workerId: string, metrics?: any) {
    db.transaction(() => {
      const worker = db.workers.find((w) => w.id === workerId);
      if (worker) {
        const now = Date.now();
        worker.lastHeartbeatAt = now;
        if (worker.status === "offline") {
          worker.status = "idle";
        }

        // Add heartbeat log
        db.workerHeartbeats.push({
          id: `hb_${now}_${Math.random().toString(36).substr(2, 4)}`,
          workerId,
          timestamp: now,
          loadMetrics: metrics || {
            cpuLoad: Math.floor(Math.random() * 20) + 5,
            memoryUsagePercent: Math.floor(Math.random() * 15) + 35,
            activeJobsCount: worker.concurrencyLoad,
          },
        });

        // Limit heartbeat table length to prevent memory leakage
        if (db.workerHeartbeats.length > 500) {
          db.workerHeartbeats.splice(0, 100);
        }
      }
    });
  }

  /**
   * API: Graceful shutdown of a worker.
   * Stops claiming immediately, waits for running tasks, then shuts down.
   */
  public async shutdownWorkerGracefully(workerId: string): Promise<boolean> {
    this.isShuttingDown.set(workerId, true);

    db.transaction(() => {
      db.jobLogs.push({
        id: `log_grace_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
        jobId: "",
        level: "info",
        message: `Graceful shutdown signal received for Worker "${workerId}". Stopping queue polling.`,
        timestamp: Date.now(),
      });
    });

    return new Promise((resolve) => {
      const checkInterval = setInterval(() => {
        db.transaction(() => {
          const worker = db.workers.find((w) => w.id === workerId);
          if (!worker) {
            clearInterval(checkInterval);
            resolve(true);
            return;
          }

          // Check if worker still has active jobs
          const runningJobs = db.jobs.filter(
            (j) => j.status === "running" && db.jobExecutions.some((e) => e.jobId === j.id && e.workerId === workerId && e.status === "running")
          );

          if (runningJobs.length === 0) {
            worker.status = "offline";
            worker.concurrencyLoad = 0;
            clearInterval(checkInterval);

            db.jobLogs.push({
              id: `log_grace_done_${Date.now()}`,
              jobId: "",
              level: "info",
              message: `Worker "${worker.name}" finished active jobs. Shutdown complete.`,
              timestamp: Date.now(),
            });

            resolve(true);
          }
        });
      }, 500);
    });
  }
}

export const workerManager = new WorkerManager();

// Seed initial online workers
db.transaction(() => {
  if (db.workers.length === 0) {
    db.workers.push(
      {
        id: "worker_1",
        name: "node-worker-us-east-a",
        status: "idle",
        lastHeartbeatAt: Date.now(),
        concurrencyLoad: 0,
        createdAt: Date.now(),
      },
      {
        id: "worker_2",
        name: "node-worker-us-east-b",
        status: "idle",
        lastHeartbeatAt: Date.now(),
        concurrencyLoad: 0,
        createdAt: Date.now(),
      }
    );
  }
});
