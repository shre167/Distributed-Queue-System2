# Design & Architecture Decisions: Distributed Job Scheduler

## 1. System Architecture Diagram
Below is the distributed life cycle flow mapping the separation of the ingestion tier from the concurrent background execution layers:

```
                  ┌────────────────────────┐
                  │   REST API Ingestion   │
                  │   (Express Server)     │
                  └───────────┬────────────┘
                              │
                    Creates / Schedules
                              │
                              ▼
                  ┌────────────────────────┐
                  │ Relational DB Engine   │
                  │ (Serializable State)   │
                  └───────────▲────────────┘
                              │
                    Polls & Atomically Claims
                              │
         ┌────────────────────┼────────────────────┐
         ▼                    ▼                    ▼
┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐
│  Worker Node A  │  │  Worker Node B  │  │  Worker Node C  │
│ (Active/Online) │  │ (Active/Online) │  │ (Active/Online) │
└─────────────────┘  └─────────────────┘  └─────────────────┘
```

---

## 2. Relational Database Entity-Relationship (ER) Design
We designed a fully normalized relational schema that guarantees state durability, parallel queue constraints, and strict transactional isolation.

```
┌──────────────────┐          ┌──────────────────┐          ┌──────────────────┐
│   Organization   │          │     Project      │          │      Queue       │
├──────────────────┤          ├──────────────────┤          ├──────────────────┤
│ id (PK)          │◄──1:N────│ id (PK)          │◄──1:N────│ id (PK)          │
│ name             │          │ org_id (FK)      │          │ project_id (FK)  │
│ created_at       │          │ name             │          │ name (Unique)    │
└──────────────────┘          │ created_at       │          │ priority         │
                              └──────────────────┘          │ concurrency_limit│
                                                            │ retry_policy_id  │
                                                            │ is_paused        │
                                                            └────────┬─────────┘
                                                                     │
                                                                 1:N Relation
                                                                     │
                                                                     ▼
┌──────────────────┐          ┌──────────────────┐          ┌──────────────────┐
│ DeadLetterQueue  │          │   JobExecution   │          │       Job        │
├──────────────────┤          ├──────────────────┤          ├──────────────────┤
│ id (PK)          │          │ id (PK)          │◄──1:N────│ id (PK)          │
│ job_id (FK, Uniq)│◄──1:1────│ job_id (FK)      │          │ queue_id (FK)    │
│ queue_id (FK)    │          │ worker_id (FK)   │          │ status (Enum)    │
│ failed_at        │          │ status (Enum)    │          │ payload (JSON)   │
│ reason           │          │ started_at       │          │ retry_count      │
│ original_payload │          │ finished_at      │          │ max_retries      │
└──────────────────┘          │ error_message    │          │ scheduled_at     │
                              │ execution_time_ms│          │ cron_expression  │
                              └──────────────────┘          │ parent_job_id    │
                                                            │ batch_id         │
                                                            └──────────────────┘
```

### Relational Schema Design Specifications:
1. **Primary Keys & Identifiers**: Every record utilizes standard string UUIDs (`usr_`, `proj_`, `q_`, `job_`, `exe_`) for safe horizontal scaling and distribution.
2. **Foreign Keys & Cascading Behaviors**:
   - `jobs.queue_id` references `queues.id` ON DELETE CASCADE.
   - `job_executions.job_id` references `jobs.id` ON DELETE CASCADE. If a job is removed, its execution audit trail is purged cleanly.
   - `job_executions.worker_id` references `workers.id` ON DELETE SET NULL. If a worker goes offline or is decommissioned, the execution history preserves the run statistics.
3. **Indexes Selection**:
   - `idx_jobs_queue_status_scheduled`: Composite index on `(queue_id, status, scheduled_at)` to optimize high-performance worker polling routines.
   - `idx_executions_job`: Index on `(job_id)` to speed up inspector telemetry logs.

---

## 3. Concurrency & Reliability Engineering (Atomic Claims)
To guarantee that **no two worker threads execute the same job twice** (Duplicate Prevention/At-Least-Once Delivery), we designed a **Serializable Transaction Check-and-Set** mechanism:

1. **JavaScript Event Loop Serialization**: Node.js operates on a single-threaded event loop. Any synchronous execution block inside `db.transaction(...)` is guaranteed to be fully serializable. No separate asynchronous callbacks can interleave or modify the collection while a worker executes the transaction block.
2. **Double-State Inspection**:
   - During poll loops, the scheduler first verifies that the queue's concurrent load has not exceeded its configured `concurrencyLimit`.
   - It filters jobs where `status === 'queued'` and checks that any DAG parent dependency (`parentJobId`) is fully `completed`.
   - It atomically changes the state to `running` and creates a `JobExecution` item *before* yielding execution back to the event-loop.

---

## 4. Configurable Retry Policies & DLQ Failures
If an execution fails:
1. **Fixed Delay**: Retry occurs after a constant interval: $Delay = BaseDelay$.
2. **Linear Backoff**: Delay increases linearly: $Delay = BaseDelay \times Attempt$.
3. **Exponential Backoff**: Avoids database "thundering herd" conditions: $Delay = BaseDelay \times 2^{Attempt-1}$.
4. **Dead Letter Queue (DLQ)**: Once `retry_count >= max_retries`, the job status changes to `dlq` and is routed to the DLQ table. The operator can inspect failure reasons and click **RETRY** to reset parameters and retry the task manually.

---

## 5. Major Design Trade-offs
- **Hybrid Polling vs Push Sockets**: Polling lowers network socket counts on server containers and guarantees timing precision for scheduled/delayed items compared to active push structures which are prone to network jitter.
- **SQLite Database vs InMemory Serializable Engine**: We implemented a customized, transactional file-backed schema engine. This bypasses binary SQLite compilation errors in cloud runner boxes while maintaining durability and relational schema compliance.
