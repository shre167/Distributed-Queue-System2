# Distributed Job Scheduler & Core Telemetry Console
Github Repository - shre167/Distributed-Queue-System2
Video Explanantion- https://youtu.be/7W3dONwG3wA

A highly performant, distributed, and fault-tolerant asynchronous job scheduling platform designed with a clean, high-contrast, Swiss-inspired typographic theme. The system separates the **REST API Ingestion Tier** from a **Concurrent Background Execution Pool**, utilizing a normalized, transactional coordinator schema to guarantee strict execution bounds, order state consistency, and prevent double-execution race conditions.

---

## 🚀 Architectural Overview & Data Flow

The platform manages high-throughput async jobs by separating the ingestion mechanism from the worker nodes. Polling workers dynamically claim work from a centralized database under serialized transaction guarantees.

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
                  │ Central Coordinator DB │
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

### Active Lifecycle Stages
1. **API Ingestion**: Client schedules standard tasks, delayed executions, cron patterns, or parallel DAG workloads via Express endpoints.
2. ** central Coordinator DB**: Acts as the transaction boundary, storing job definitions, DAG parent pointers, and queue priority weights.
3. **Worker Claiming**: Independent concurrent workers ping the coordinator, pulling queues dynamically according to priority ranks.
4. **Dead-Letter Routing (DLQ)**: Failed tasks undergo customized backoffs. If the retry threshold is breached, they slide automatically into the DLQ schema for manual developer inspection.

---

## 🗄️ Relational Database & Entity Schema Design

The coordinator database uses a fully normalized relational structure designed to avoid any orphaned states. Every entity contains unique UUID strings (`job_`, `exe_`, `q_`) and strict foreign key mapping constraints.

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
└──────────────────┘          │ error_message    │          │ scheduled_at     │
                              │ execution_time_ms│          │ cron_expression  │
                              └──────────────────┘          │ parent_job_id    │
                                                            │ batch_id         │
                                                            └──────────────────┘
```

### Table & Column Details:
*   **Users Table**: Models operators with localized roles (`admin` or `viewer`).
*   **Projects Table**: Serves as a logical workspace boundary for different applications.
*   **Queues Table**: Configures execution constraints. Holds unique name keys within projects, priority levels, and dynamic `concurrencyLimit` properties to throttle parallel worker claiming.
*   **Jobs Table**: Represents independent workloads. Contains fields for payload parameters (JSON), parent dependencies (`parentJobId`), and scheduling targets.
*   **JobExecutions Table**: Maintained as an audit timeline trail. It preserves the runtime logs, durations, and matching worker identifiers. Uses `ON DELETE CASCADE` linked to `Jobs`, and `ON DELETE SET NULL` linked to `Workers`.
*   **Dead Letter Queue (DLQ)**: Holds items exceeding retry parameters, capturing diagnostic stack dumps for fast troubleshooting.

---

## 🔒 Concurrency Control & Atomic Claims

To guarantee **Duplicate-Prevention (At-Least-Once / Exactly-Once-Claiming)** under multi-node environments, we designed a **Serializable Transaction Check-and-Set** mechanism:

1.  **Single Event Loop Serialization**: Node.js executes code inside a single-threaded runtime loop. Synchronous transaction sequences inside our engine are inherently thread-safe. Multiple active workers polling the loop never interleave during query evaluations.
2.  **Concurrency Limit Validation**: A worker checks whether the queue's active running jobs are less than its `concurrencyLimit` before selecting a candidate.
3.  **Dependency Graph Matching**: Jobs containing `parentJobId` attributes are skipped unless the parent record's status has reached `'completed'` in the database.
4.  **Check-and-Set**: The worker atomically queries, filters eligibility, and transitions the selected job's status from `'queued'` to `'running'`, while generating a fresh `JobExecution` item in the same transaction block.

---

## 🔄 Intelligent Failure Backoffs & RCA Diagnostics

If a background task crashes, the platform leverages sophisticated recovery modules:

### 1. Mathematical Backoff Strategies
*   **Fixed Delay**: Delayed by a constant factor:
    $$\text{Delay} = \text{BaseDelay}$$
*   **Linear Backoff**: Backs off proportionally with attempts:
    $$\text{Delay} = \text{BaseDelay} \times \text{Attempt}$$
*   **Exponential Backoff**: Avoids database "thundering herds" by growing exponentially:
    $$\text{Delay} = \text{BaseDelay} \times 2^{\text{Attempt} - 1}$$

### 2. Gemini-Powered RCA Failure Summarizer
For tasks ending up in `failed` or `dlq` statuses, operators can click **Run RCA Diagnosis**. The backend proxies a request to Gemini `gemini-2.5-flash` using the modern `@google/genai` SDK:
*   **Context Analysis**: Gemini evaluates parameters, system queue setups, retry histories, and stack trace error outputs.
*   **Remediation Mapping**: Instantly structures a root-cause explanation and recommends actionable code or network troubleshooting steps.

---

## 📱 Fluid Mobile-First Responsive Design

The frontend user interface is fully responsive, designed with a desktop-first precision combined with mobile-first fluidity:

1.  **Mobile Header & Collapsible Drawer**:
    *   On viewports smaller than `lg` (1024px), a sticky top navigation bar provides instant status metrics and a Hamburger button.
    *   Clicking the menu slides an elegant slide-over Navigation Sidebar from the left, layered on a dark backdrop blur (`backdrop-blur-md`).
    *   Clicking outside or tapping the close `X` trigger smoothly tucks the sidebar away.
2.  **Responsive Dashboard Layouts**:
    *   **Dashboard Overview**: Realtime Recharts telemetry graphs (concurrency load, queue distributions) adapt dimensions fluidly via custom `ResponsiveContainer` blocks.
    *   **Bento Card Grid**: Adapts dynamically from a 1-column layout on mobile, to 2-columns on tablets, and 5-columns on desktop monitors.
    *   **Interactive Modal**: Responsive modals fit comfortably on any screen width, adjusting layouts to scroll long log lists elegantly on mobile devices.

---

## 🛠️ Installation & Execution Guidelines

Follow these steps to run the complete environment locally:

### 1. Install Dependencies
```bash
npm install
```

### 2. Setup Environment Variables
Configure a `.env` file in the root based on `.env.example`:
```env
# Server Ingress Port
PORT=3000

# Server Node Environment
NODE_ENV=development

# Secure Server-Side API Key for Gemini RCA Diagnoses
GEMINI_API_KEY=your-gemini-api-key-here
```

### 3. Run Development Server
Launches the dual Express-Vite backend and starts polling simulation workers:
```bash
npm run dev
```

### 4. Build for Production
Bundles client files into static assets and compiles the Express backend using `esbuild` into a CJS-safe module to bypass serverless cold-starts:
```bash
npm run build
```

### 5. Production Start
```bash
npm run start
```
