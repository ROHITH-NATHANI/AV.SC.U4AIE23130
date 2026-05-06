# Afford Medical Microservices Evaluation

This repository contains the completed deliverables for the Backend Developer Evaluation Test.

## Projects Included

1. **Campus Notifications Microservice**
   - Includes system design, database architecture, and performance optimization details for the notification pipeline (`notification_system_design.md`).
   - Includes the Priority Inbox implementation (`notification_app_be/priority_inbox.js`) which sorts notifications based on Recency and Weight (Placement > Result > Event).

2. **Vehicle Maintenance Scheduler Microservice**
   - Includes the Dynamic Programming 0/1 Knapsack solution (`vehicle_scheduling/scheduler.js`) to find the optimal subset of vehicle repairs that maximizes the operational impact score without exceeding the daily mechanic-hours budget.

## API Testing
The exported Postman Collection is available in the `postman/` directory to test the protected GET routes (`/depots`, `/vehicles`, `/notifications`).
