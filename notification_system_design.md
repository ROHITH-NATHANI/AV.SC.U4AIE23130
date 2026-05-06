# Campus Notifications Microservice System Design

## Stage 1: API Design & Real-time Delivery
### REST API Endpoints

1. **Get Notifications (Paginated/Cursor-based)**
   - `GET /api/v1/notifications`
   - **Query Params**: `limit=20`, `cursor=eyJwb3NpdGlvbiI6MTIzNH0=` (for cursor-based pagination), `status=unread`
   - **Headers**: `Authorization: Bearer <token>`
   - **Response (200 OK)**:
     ```json
     {
       "data": [
         {
           "id": "notif_123",
           "type": "Placement",
           "message": "Congratulations! You have a new placement opportunity.",
           "timestamp": "2026-04-22T17:50:54Z",
           "isRead": false
         }
       ],
       "next_cursor": "eyJwb3NpdGlvbiI6MTIzNX0="
     }
     ```

2. **Mark Notification as Read**
   - `PUT /api/v1/notifications/{id}/read`
   - **Headers**: `Authorization: Bearer <token>`
   - **Response (200 OK)**:
     ```json
     {
       "success": true,
       "message": "Notification marked as read"
     }
     ```

### Real-Time Delivery Mechanism
For real-time notifications, **Server-Sent Events (SSE)** or **WebSockets** should be used.
- **WebSockets** provide full-duplex communication, ideal if the client also needs to send rapid updates back to the server.
- **SSE** is a simpler, unidirectional approach (Server to Client) that is natively supported by browsers and is perfect for simply pushing new notifications to users as they arrive. I recommend **SSE** for this use case because notifications are inherently a one-way stream of events.

---

## Stage 2: Database Recommendation & Schema
### Persistent DB Choice
I recommend **PostgreSQL** (Relational Database) for the following reasons:
- **ACID Compliance**: Ensures strong consistency when marking notifications as read or managing user states.
- **JSONB Support**: Allows flexibility if notification payloads contain arbitrary metadata.
- **Advanced Indexing**: Supports powerful indexing strategies like partial indexes and composite indexes to efficiently query unread notifications.

### Schema
```sql
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    student_id VARCHAR(50) UNIQUE NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TYPE notification_type AS ENUM ('Event', 'Result', 'Placement');

CREATE TABLE notifications (
    id BIGSERIAL PRIMARY KEY,
    student_id VARCHAR(50) REFERENCES users(student_id),
    type notification_type NOT NULL,
    message TEXT NOT NULL,
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### Handling Increasing Data Volume
As the volume of notifications grows, the `notifications` table will become massive, leading to slower read/write times.
**Solutions:**
1. **Table Partitioning**: Partition the `notifications` table by `created_at` (e.g., monthly partitions) so that queries for recent notifications only scan a small subset of the data.
2. **Data Archival / Cold Storage**: Move notifications older than 6 months to a cheaper, slower datastore (like AWS S3 or a separate analytics database) and remove them from the hot database.
3. **Read Replicas**: Distribute read queries across multiple read replica databases to reduce load on the primary writer database.

---

## Stage 3: Query Analysis & Optimization
### Original Query
`SELECT * FROM notifications WHERE studentID = 1042 AND isRead = false ORDER BY createdAt DESC;`

**Is it accurate?** Yes, it correctly filters for a specific student's unread notifications and orders them newest-first.
**Why is it slow?** Without a targeted index, the database must perform a full table scan or index scan over all notifications for the user, then sort them in memory.
**Adding indexes on every column:** This is a **bad idea**. While it speeds up reads for arbitrary queries, it drastically degrades write performance because every index must be updated on every INSERT/UPDATE. It also consumes significant disk space.
**What to change:** Create a **Partial Composite Index** specifically tailored for this query:
```sql
CREATE INDEX idx_student_unread_created 
ON notifications (studentID, createdAt DESC) 
WHERE isRead = false;
```
This index only stores unread notifications, making it extremely small and fast. It also pre-sorts them by `createdAt`, completely eliminating the sorting computation cost.

### New Query (Placement notifications in the last 7 days)
```sql
SELECT student_id 
FROM notifications 
WHERE type = 'Placement' 
  AND created_at >= NOW() - INTERVAL '7 days';
```

---

## Stage 4: Improving Performance on Page Load
Fetching all notifications from the DB on every page load overwhelms the database.

**Solutions & Trade-offs:**
1. **Caching with Redis**
   - *Strategy*: Cache the top 20 most recent notifications for active users in Redis. Serve requests from Redis instead of Postgres.
   - *Trade-offs*: Fast read times and massive DB offload, but introduces cache invalidation complexity (e.g., updating Redis when a notification is marked read).
2. **Push over Pull (WebSockets/SSE)**
   - *Strategy*: Instead of the client polling or fetching on every route change, the client connects once via SSE/WebSocket. The server pushes updates to the client state directly.
   - *Trade-offs*: Drastically reduces HTTP request overhead, but requires maintaining persistent connections on the server, which can be memory-intensive.
3. **Cursor-based Pagination**
   - *Strategy*: Only fetch a small chunk of notifications at a time.
   - *Trade-offs*: Prevents massive payload transfers, but the DB still gets hit on initial load.

---

## Stage 5: Synchronous Loop Analysis
### Pseudocode Shortcomings
```python
# Pseudocode block provided in prompt context
for student_id in student_ids: # 50,000 students
    send_email(student_id, msg)
    save_to_db(student_id, msg)
    push_to_app(student_id, msg)
```
- **Fails Midway**: If `save_to_db` fails for the 10,000th student, the loop crashes. The remaining 40,000 students get nothing, and it's hard to retry without sending duplicates to the first 10,000.
- **Slow Execution**: Network calls (emails, DB writes, push) are blocking. Doing this sequentially for 50,000 students could take hours.

### Should DB and Email happen together?
No. Saving to the DB is the source of truth and should be fast and transactional. Sending emails relies on external APIs (like SendGrid), which can be slow or rate-limited. They should be decoupled.

### Revised Architecture (Asynchronous Event-Driven)
Use a **Message Queue** (e.g., RabbitMQ, AWS SQS) and the **Transactional Outbox Pattern**.

```python
# Service 1: Core Notification Service (Fast, Reliable)
def broadcast_notification(student_ids, msg):
    # 1. Bulk insert to DB (Fast)
    bulk_save_to_db(student_ids, msg)
    
    # 2. Publish events to Message Queue (Fast)
    for student_id in student_ids:
        message_queue.publish("notification.created", { "student_id": student_id, "msg": msg })

# Service 2: Email Worker (Async, Retryable)
def on_notification_created_for_email(event):
    try:
        send_email(event.student_id, event.msg)
    except Exception:
        message_queue.retry_later(event)

# Service 3: Push Notification Worker (Async, Retryable)
def on_notification_created_for_push(event):
    try:
        push_to_app(event.student_id, event.msg)
    except Exception:
        message_queue.retry_later(event)
```

---

## Stage 6: Priority Inbox Architecture
To maintain a top-10 Priority Inbox efficiently as new notifications arrive continuously:

1. **In-Memory Priority Queue (Heaps)**:
   Instead of querying the DB to sort millions of notifications, maintain a Min-Heap of size 10 in memory (or in Redis using Sorted Sets) for active users.
2. **Scoring Function**:
   Compute a priority score `P = Weight(Type) + f(Recency)`. 
   Since recency changes over time, we can use an epoch-based scoring system:
   `Score = (Base_Weight_For_Type * M) + Unix_Timestamp`.
   This ensures that newer notifications naturally have higher scores, but a very high base weight (like 'Placement') can outweigh a newer, lower-tier notification.
3. **Event Stream Processing**:
   As a new notification arrives via the queue, calculate its score. Compare it with the minimum score in the user's top-10 heap. If it's higher, pop the minimum and insert the new notification. This operation is `O(log 10) = O(1)`, making it extremely fast even under heavy load.
