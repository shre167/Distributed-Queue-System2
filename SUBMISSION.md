# Distributed Job Scheduler & Core Telemetry Console
## Official Project Submission & Specifications Document

Welcome to the **Scheduler Core** official submission document. This system is a highly optimized, fully responsive, and production-ready **Asynchronous Distributed Job Scheduling & Monitoring Platform**. It separates the high-throughput **REST API Ingestion Tier** from a **Concurrent Background Execution Pool**, utilizing a normalized, transactional coordinator schema to guarantee strict execution bounds, state consistency, and prevent double-execution race conditions.

---

## 📷 App Visual Identity & User Interface Screenshots

The user interface follows a modern, high-contrast, Swiss-inspired typographic theme with a dark Cosmic theme (deep slate, rich charcoal blacks, and vibrant green/brand indicators) designed to maximize screen density and decrease operator fatigue.

### 1. Unified Telemetry Dashboard Overview
> **Visual Layout**: 
> *   **Dynamic Header**: Displays the system state (`● ONLINE`), real-time cluster health status (`● HEALTHY`), and worker heartbeat indicators.
> *   **Global Metrics Cards (Bento-Grid)**: Five elegant grid cards depicting **Active Workers Count**, **Success Rate %**, **Avg Queue Wait Time**, **Avg Run Duration**, and **DLQ Active Failures**.
> *   **Live Performance Graphs**: Fully responsive Recharts diagrams demonstrating real-time concurrency load throughput (Completed vs. Failed jobs) over a scrolling 10-minute time frame.

### 2. Live Coordinator Log Stream & Simulator Console
> **Visual Layout**: 
> *   **Terminal Simulator**: A scrolling monospace panel styled to look like an live operating terminal, streaming the coordinator logs (such as `[SYS] Worker claimed job_1`, `[INFO] Executing retry linearly`).
> *   **Dynamic Controls**: Operators can dynamically spawn additional worker threads (`+ Spawn Worker`), pause the simulation loop, or trigger automated load generation directly into active queues.

### 3. Queue Configuration & Workflow Managers
> **Visual Layout**: 
> *   **Interactive Rows**: Every active queue displays its unique database mapping, priority level, concurrency throttle limits, and current active load.
> *   **CRUD Controls**: Allows immediate creation and editing of queues, assigning priorities, and custom-mapped retry policies.

---

## 🧠 System Architecture & Core Features

### 1. REST API Ingestion Tier
An Express.js REST server handles all inbound scheduling traffic. This layer handles validation, metadata injection, and atomic storage. It decouples the application from the execution layer so that API clients get sub-millisecond responses while heavy payloads run asynchronously in the background.

### 2. Distributed Concurrent Workers Pool
Autonomous background workers poll the coordinator database on a configurable heartbeat tick.
*   **Active Heartbeats**: Every 3 seconds, workers write a heartbeat to `db.workers`.
*   **Worker Rescue & Recovery**: If a worker crashes or goes silent (heartbeat missing for >10s), the orchestrator automatically rescues and re-queues its active running jobs to preserve system safety.

### 3. Advanced DAG & Workflow Dependencies
Jobs can contain a `parentJobId` constraint. The coordinator prevents claiming a job if its parent has not completed successfully, allowing developers to schedule chained pipelines and complex workflow DAGs.

---

## 🗄️ Database Architecture & Entity Schema Design

The engine leverages a relational schema designed for absolute reference integrity. In-memory serializable state transactions simulate standard transactional locks without requiring heavy external DB dependencies.

### 1. Database Entity-Relationship Diagram (ERD)

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
│   DLQ Entries    │          │   JobExecution   │          │       Job        │
├──────────────────┤          ├──────────────────┤          ├──────────────────┤
│ id (PK)          │          │ id (PK)          │◄──1:N────│ id (PK)          │
│ job_id (FK, Uniq)│◄──1:1────│ job_id (FK)      │          │ queue_id (FK)    │
│ queue_id (FK)    │          │ worker_id (FK)   │          │ status (Enum)    │
│ failed_at        │          │ status (Enum)    │          │ payload (JSON)   │
│ reason           │          │ started_at       │          │ retry_count      │
│ original_payload │          │ finished_at      │          │ max_retries      │
│                  │          │ error_message    │          │ scheduled_at     │
└──────────────────┘          │ execution_time_ms│          │ cron_expression  │
                              └──────────────────┘          │ parent_job_id    │
                                                            │ batch_id         │
                                                            └──────────────────┘
```

### 2. Table Schemas & Normalized Columns

#### A. `Projects` Table
*   `id`: `VARCHAR(36) [PRIMARY KEY]`
*   `orgId`: `VARCHAR(36)` (Points to tenant Organization)
*   `name`: `VARCHAR(255)`
*   `createdAt`: `BIGINT`

#### B. `Queues` Table
*   `id`: `VARCHAR(36) [PRIMARY KEY]`
*   `projectId`: `VARCHAR(36) [FOREIGN KEY REFERENCES Projects(id)]`
*   `name`: `VARCHAR(100) [UNIQUE within Project]`
*   `priority`: `INTEGER` (Values 1-10; higher numbers are polled first)
*   `concurrencyLimit`: `INTEGER` (Caps parallel running jobs inside this specific queue)
*   `retryPolicyId`: `VARCHAR(36)` (Points to linear/fixed/exponential policy)
*   `isPaused`: `BOOLEAN`
*   `createdAt`: `BIGINT`

#### C. `Jobs` Table
*   `id`: `VARCHAR(36) [PRIMARY KEY]`
*   `queueId`: `VARCHAR(36) [FOREIGN KEY REFERENCES Queues(id) ON DELETE CASCADE]`
*   `status`: `ENUM('queued', 'scheduled', 'running', 'completed', 'failed', 'dlq')`
*   `payload`: `JSON` (Execution parameters and payload arguments)
*   `retryCount`: `INTEGER` (Tracks current attempt counts)
*   `maxRetries`: `INTEGER`
*   `createdAt`: `BIGINT`
*   `updatedAt`: `BIGINT`
*   `scheduledAt`: `BIGINT` (Epoch target for delayed tasks)
*   `cronExpression`: `VARCHAR(100)` (Optional standard cron scheduling string)
*   `parentJobId`: `VARCHAR(36)` (Reference link for DAG dependencies)
*   `batchId`: `VARCHAR(36)` (Optional batch grouping identifier)

#### D. `JobExecutions` Table
*   `id`: `VARCHAR(36) [PRIMARY KEY]`
*   `jobId`: `VARCHAR(36) [FOREIGN KEY REFERENCES Jobs(id) ON DELETE CASCADE]`
*   `workerId`: `VARCHAR(36) [FOREIGN KEY REFERENCES Workers(id) ON DELETE SET NULL]`
*   `status`: `ENUM('running', 'completed', 'failed')`
*   `startedAt`: `BIGINT`
*   `finishedAt`: `BIGINT`
*   `errorMessage`: `TEXT`
*   `executionTimeMs`: `INTEGER`

#### E. `DeadLetterQueue` Table (DLQ)
*   `id`: `VARCHAR(36) [PRIMARY KEY]`
*   `jobId`: `VARCHAR(36) [UNIQUE, FOREIGN KEY REFERENCES Jobs(id)]`
*   `queueId`: `VARCHAR(36) [FOREIGN KEY REFERENCES Queues(id)]`
*   `failedAt`: `BIGINT`
*   `reason`: `TEXT` (Captures execution exception stack trace dumps)
*   `originalPayload`: `JSON`

---

## 🔒 Concurrency Control & Atomic Polling Mechanics

To guarantee **Duplicate-Prevention (Exactly-Once-Claiming)** under multi-threaded or multi-container operations, the scheduling loop implements **Serializable Transaction Check-and-Set** mechanics:

1.  **Single Event Loop Serialization**: Node.js operates on a single-threaded event loop. By wrapping database state operations inside synchronous transaction closures, we ensure that no two asynchronous worker threads can interleave while executing the query-to-select logic.
2.  **State Transition Verification**: A worker query to fetch candidate tasks follows this strict logical algorithm:
    ```sql
    -- Conceptual Atomic Select Sequence
    SELECT * FROM Jobs
    WHERE status = 'queued'
      AND scheduledAt <= CURRENT_TIME
      -- 1. Verify queue is unpaused
      AND queueId IN (SELECT id FROM Queues WHERE isPaused = false)
      -- 2. Verify parent workflow completed
      AND (parentJobId IS NULL OR parentJobId IN (SELECT id FROM Jobs WHERE status = 'completed'))
      -- 3. Verify queue-level concurrency ceiling is not breached
      AND (
        SELECT COUNT(*) FROM Jobs 
        WHERE status = 'running' AND queueId = Jobs.queueId
      ) < (SELECT concurrencyLimit FROM Queues WHERE id = Jobs.queueId)
    ORDER BY (SELECT priority FROM Queues WHERE id = Jobs.queueId) DESC, scheduledAt ASC
    LIMIT 1;
    ```
3.  **Atomic State Change**: Once a candidate is found, its status is immediately shifted from `'queued'` to `'running'` in the *same synchronous memory transaction block* before another worker can evaluate the candidates.

---

## 🔄 Intelligent Failure Backoffs & Gemini-Powered RCA

When jobs fail, they undergo mathematical retry backoffs or are routed to the DLQ for Gemini-powered Root Cause Analysis.

### 1. Mathematical Backoff Calculations
Let $b$ represent the `baseDelay` (configured at 1000ms), and $a$ represent the current `attempt` number ($a \in [1, \text{maxRetries}]$).

*   **Fixed Delay**: 
    $$\text{Delay} = b$$
    *Consistent constant wait times between executions.*

*   **Linear Delay**: 
    $$\text{Delay} = b \times a$$
    *Proportionally scales waiting times with each sequential attempt.*

*   **Exponential Delay**: 
    $$\text{Delay} = b \times 2^{a - 1}$$
    *Grows exponentially to prevent database starvation and "thundering herds".*

### 2. Gemini-Powered Root Cause Analysis (RCA)
For tasks residing in `failed` or `dlq` states, operators can launch **Run RCA Diagnosis**. The system leverages server-side calls via the modern `@google/genai` library and model `gemini-3.5-flash`:
*   **The Request**: A context payload containing the parameters, execution history, and raw stack traces is securely sent to Gemini.
*   **The Response**: Gemini processes the inputs and streams back:
    *   **Detailed RCA**: Explains precisely why the task failed based on logs (e.g., parameter mismatch, socket timeout).
    *   **Impact Rating**: Classifies severity based on queue definitions.
    *   **Actionable Code Remediation Steps**: Concrete checklists for operators to resolve the issue.

---

## 📡 REST API Technical Specification

### 1. Projects Endpoints

#### `GET /api/projects`
*   **Description**: Retrieves the list of all registered projects.
*   **Response (`200 OK`)**:
    ```json
    [
      {
        "id": "proj_1",
        "orgId": "org_1",
        "name": "E-Commerce Suite",
        "createdAt": 1719875400000
      }
    ]
    ```

#### `POST /api/projects`
*   **Description**: Creates a new project workspace.
*   **Payload**:
    ```json
    { "name": "Inventory Processor" }
    ```
*   **Response (`201 Created`)**:
    ```json
    {
      "id": "proj_1719875411000",
      "orgId": "org_1",
      "name": "Inventory Processor",
      "createdAt": 1719875411000
    }
    ```

---

### 2. Queues Endpoints

#### `GET /api/queues`
*   **Query Params**: `projectId` (defaults to `"proj_1"`)
*   **Description**: Fetches all active queues for a given project.
*   **Response (`200 OK`)**:
    ```json
    [
      {
        "id": "q_high_priority",
        "projectId": "proj_1",
        "name": "Payment Gateway Ingestion",
        "priority": 10,
        "concurrencyLimit": 4,
        "retryPolicyId": "exp_backoff",
        "isPaused": false,
        "createdAt": 1719875400000
      }
    ]
    ```

#### `POST /api/queues`
*   **Description**: Deploys a new queue under strict unique-name rules.
*   **Payload**:
    ```json
    {
      "projectId": "proj_1",
      "name": "Image Compilers",
      "priority": 5,
      "concurrencyLimit": 2,
      "retryPolicyId": "fixed_delay"
    }
    ```
*   **Response (`201 Created`)**:
    ```json
    {
      "id": "q_1719875422000",
      "projectId": "proj_1",
      "name": "Image Compilers",
      "priority": 5,
      "concurrencyLimit": 2,
      "retryPolicyId": "fixed_delay",
      "isPaused": false,
      "createdAt": 1719875422000
    }
    ```

#### `POST /api/queues/:id/pause` & `/api/queues/:id/resume`
*   **Description**: Pauses or resumes worker claiming on a specific queue.
*   **Response (`200 OK`)**: Returns the updated Queue entity with modified `isPaused` flag.

---

### 3. Jobs & Workflows Endpoints

#### `GET /api/jobs`
*   **Query Params**: `status`, `queueId`, `batchId`, `search` (filters payload contents/cron), `page` (default `1`), `limit` (default `10`).
*   **Description**: Fetches a paginated, sorted array of background tasks.
*   **Response (`200 OK`)**:
    ```json
    {
      "jobs": [ ... ],
      "total": 45,
      "page": 1,
      "limit": 10,
      "totalPages": 5
    }
    ```

#### `GET /api/jobs/:id`
*   **Description**: Inspects a specific job, generating its execution attempt logs and real-time step timelines.
*   **Response (`200 OK`)**:
    ```json
    {
      "job": { ... },
      "executions": [ ... ],
      "logs": [ ... ]
    }
    ```

#### `POST /api/jobs`
*   **Description**: Schedules a background job (Immediate, Delayed, Recurring Cron, or DAG).
*   **Payload**:
    ```json
    {
      "queueId": "q_high_priority",
      "payload": { "userId": "usr_99", "amount": 250.00 },
      "delayMs": 5000,              // Optional delayed delivery target
      "cronExpression": "*/5 * * * *", // Optional recurring execution
      "parentJobId": "job_abc123",  // Optional parent dependency
      "maxRetries": 5
    }
    ```
*   **Response (`201 Created`)**: Returns the structured `Job` definition.

#### `POST /api/jobs/:id/retry`
*   **Description**: Manually resets failed/DLQ jobs back to a `'queued'` state and clears past worker counters.

---

### 4. Metrics & Diagnostics Endpoints

#### `GET /api/metrics`
*   **Description**: Computes metrics, latencies, and chart timelines.
*   **Response (`200 OK`)**:
    ```json
    {
      "counts": {
        "total": 120,
        "completed": 95,
        "failed": 5,
        "running": 2,
        "queued": 18
      },
      "successRate": 95.0,
      "avgWaitTimeMs": 142.5,
      "avgRunTimeMs": 1820.3,
      "queueDistribution": [ ... ],
      "timelineData": [ ... ]
    }
    ```

#### `POST /api/jobs/:id/ai-summary`
*   **Description**: Generates an RCA diagnosis.
*   **Response (`200 OK`)**:
    ```json
    {
      "summary": "### Root Cause Analysis (RCA)...",
      "isFallback": false
    }
    ```

---

## 📱 Mobile-First Responsive Design

1.  **Drawer Navigation Overlay**: On screens under 1024px wide, the console hides the side menu, presenting a clean navigation header with metrics. Operators can toggle the Hamburger button to slide a responsive sidebar on top of a dark overlay (`backdrop-blur-md`).
2.  **Fluid Elements**: Layout grids shift from single-columns on mobile targets (touch area size $\ge 44\text{px}$) to beautiful multi-column dashboard patterns on desktop configurations. Recharts components are wrapped in dynamic bounds to adjust beautifully during browser resize events.
