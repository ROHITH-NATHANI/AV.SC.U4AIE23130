# Afford Medical Microservices Evaluation

This repository contains the completed backend evaluation deliverables for Afford Medical Technologies Private Limited. The project consists of two distinct microservice implementations: the Campus Notifications Microservice and the Vehicle Maintenance Scheduler Microservice.

## Project Structure

```text
.
├── notification_system_design/
│   └── README.md                                 # Stage 1-5 Answers (System Design, DB, Scaling)
├── notification_app_be/
│   └── priority_inbox.js                         # Stage 6 Code (Priority Inbox Algorithm)
├── vehicle_scheduling/
│   └── scheduler.js                              # Vehicle Scheduler Algorithm (0/1 Knapsack)
├── postman/
│   └── My Collection.postman_collection.json     # Exported Postman tests for the Protected APIs
└── README.md
```

## 1. Campus Notifications Microservice
A backend notification platform for students to receive real-time updates regarding Placements, Events, and Results.

**Features Implemented:**
- **System Design (Stages 1-5):** REST API specifications, PostgreSQL schema design, composite index optimization, and resolution of synchronous loop failures via an Asynchronous Event Queue (Transactional Outbox Pattern).
- **Priority Inbox (Stage 6):** A Node.js algorithm that fetches data from the protected `Notifications API` and calculates a dynamic priority score for each notification. 
- **Sorting Logic:** Priority is determined by `Weight + Recency`, where weights are strictly enforced as: `Placement > Result > Event`.

**Run the Notifications Script:**
```bash
node notification_app_be/priority_inbox.js
```

## 2. Vehicle Maintenance Scheduler Microservice
An optimization microservice for planning daily vehicle maintenance at a logistics company with strict mechanic-hour budgets.

**Features Implemented:**
- **Dynamic Programming Knapsack:** Fetches available budgets from the `Depots API` and required tasks from the `Vehicles API`. 
- **Optimization:** Computes the exact optimal subset of vehicles to service to maximize the total operational impact score without exceeding the strict mechanic-hours budget. Time complexity is `O(N*W)` where N is the number of vehicles and W is the total mechanic-hours capacity.

**Run the Scheduler Script:**
```bash
node vehicle_scheduling/scheduler.js
```

## API Testing & Authentication
The evaluation required connecting to protected REST API routes (`/depots`, `/vehicles`, `/notifications`). A Postman collection containing these authenticated `GET` requests is provided in the `postman/` directory.

> **Note:** Do not run these scripts directly without an active API token. The provided `priority_inbox.js` and `scheduler.js` contain fallback mock data identical to the exam's test cases so the algorithms can still be demonstrated if the API is offline or unauthorized.
