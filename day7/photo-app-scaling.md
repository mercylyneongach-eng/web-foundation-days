# SnapShare - Scaling Plan

## 1. Assumptions

SnapShare is a photo-sharing application where users upload photos and scroll through feeds containing photos from people they follow.

The following assumptions are used:

- Registered users: 10,000,000.
- Daily active users: 10% of registered users.
- Each active user uploads 1 photo per day.
- Each active user views 50 feed pages per day.
- Average original photo size: 2 MB.
- Each photo also has a 50 KB thumbnail.
- One day contains 86,400 seconds.
- Peak traffic is estimated at 5 times average traffic.
- A year contains 365 days.
- Storage calculations use decimal units: 1 TB = 1,000 GB.
- Storage estimates exclude backups, replication overhead and other application data.

## 2. Capacity Estimates

### Daily Active Users

Daily active users (DAU) = Registered users × Daily activity rate

= 10,000,000 × 10%

**DAU = 1,000,000 users per day**

### Photo Uploads per Second

Daily uploads = 1,000,000 × 1 photo

= 1,000,000 uploads per day

Average uploads per second = 1,000,000 ÷ 86,400

= **11.57 uploads per second**

Peak uploads per second = 11.57 × 5

= **57.87 uploads per second**

### Feed Views per Second

Daily feed views = 1,000,000 × 50

= 50,000,000 feed views per day

Average feed views per second = 50,000,000 ÷ 86,400

= **578.70 feed views per second**

Peak feed views per second = 578.70 × 5

= **2,893.52 feed views per second**

### Photo Storage per Year

Each uploaded photo requires 2 MB for the original and 50 KB (0.05 MB) for the thumbnail.

Total storage per photo = 2 + 0.05 = 2.05 MB

Daily original photo storage:

1,000,000 × 2 MB = 2,000 GB = 2 TB

Daily thumbnail storage:

1,000,000 × 0.05 MB = 50 GB

Total daily storage = 2,000 GB + 50 GB = 2,050 GB = 2.05 TB

Annual original photo storage:

2 TB × 365 = 730 TB

Annual thumbnail storage:

50 GB × 365 = 18.25 TB

**Total annual photo storage = 748.25 TB, or approximately 750 TB.**

This represents one year of newly uploaded photos and thumbnails retained without compression or deletion.

### Summary of Estimates

| Metric | Estimate |
|---|---:|
| Registered users | 10 million |
| Daily active users | 1 million |
| Daily uploads | 1 million |
| Average uploads per second | 11.57 |
| Peak uploads per second | 57.87 |
| Daily feed views | 50 million |
| Average feed views per second | 578.70 |
| Peak feed views per second | 2,893.52 |
| Annual original photo storage | 730 TB |
| Annual thumbnail storage | 18.25 TB |
| Total annual storage | 748.25 TB |

## 3. Is SnapShare Read-Heavy or Write-Heavy?

SnapShare is a **read-heavy system** because users view 50 feed pages for every photo they upload.

Daily feed views = 50 million.

Daily uploads = 1 million.

This means the system handles approximately 50 feed views for every upload. Therefore, the design should prioritize fast feed delivery through a CDN, caching and database read replicas while ensuring that photo uploads remain reliable.

## 4. Where Should Photos Be Stored?

Photos should not be stored directly inside the database because large binary files would increase database size, storage costs, backup times and the workload involved in retrieving records.

Instead, original photos and thumbnails should be stored in **object storage**, which is designed to store large files durably and scale as storage requirements grow.

The database should store structured metadata such as the photo ID, owner, caption, upload time, object key and processing status. This separation keeps database queries efficient and allows photos to be delivered through a CDN.

## 5. Proposed Architecture Diagram

```text
                         USERS
                           |
                           v
                    +-------------+
                    |     CDN     |
                    | Cached photos|
                    +-------------+
                           |
                           v
                    +-------------+
                    |Load Balancer|
                    +-------------+
                           |
                +----------+----------+
                |          |          |
                v          v          v
             +------+   +------+   +------+
             | App  |   | App  |   | App  |
             |Server|   |Server|   |Server|
             +------+   +------+   +------+
                |          |          |
                +----------+----------+
                           |
                 +---------+---------+
                 |                   |
                 v                   v
           +-----------+       +-----------+
           |   Cache   |       |  Primary  |
           |Feed data  |       | Database  |
           +-----------+       +-----------+
                                     |
                                     v
                               +-----------+
                               |Read Replica|
                               +-----------+

              ASYNCHRONOUS PHOTO PROCESSING

                       App Server
                           |
                           v
                    +--------------+
                    |Object Storage|
                    |Original Photo|
                    +--------------+
                           |
                           v
                    +--------------+
                    | Message Queue|
                    | Thumbnail Job|
                    +--------------+
                           |
                           v
                    +--------------+
                    | Worker Service|
                    |Generate Thumbnail|
                    +--------------+
                           |
                           v
                    +--------------+
                    |Object Storage|
                    |  Thumbnail   |
                    +--------------+
                           |
                           v
                    Database metadata
                    updated with status
                    and thumbnail reference
```

## 6. Components and the Problems They Solve

1. **CDN:** Delivers cached photos from locations closer to users, reducing loading times and traffic reaching the origin servers.
2. **Load balancer:** Distributes incoming requests across healthy application servers to prevent any single server from becoming overloaded.
3. **App servers:** Handle user authentication, upload validation, feed requests and the application's business logic.
4. **Cache:** Stores frequently requested feed data and metadata in fast memory to reduce database queries and improve response times.
5. **Primary database:** Stores authoritative application metadata, including users, photo records, captions and follow relationships.
6. **Read replica:** Handles read queries to reduce the workload on the primary database and improve feed performance.
7. **Object storage:** Stores original photos and thumbnails durably and cost-effectively without placing large binary files inside database tables.
8. **Message queue:** Holds thumbnail-generation jobs until workers can process them, allowing uploads to complete without waiting for image processing.
9. **Worker service:** Processes queued jobs in the background, generates thumbnails and stores them in object storage.

## 7. Step-by-Step Photo Upload Flow

1. A user selects a photo and submits it to SnapShare.
2. The load balancer routes the request to a healthy application server.
3. The application server authenticates the user and validates the photo's file type and size.
4. The original photo is uploaded to object storage and assigned a unique object key.
5. The application creates a database record containing the photo ID, user ID, object key, upload time and processing status.
6. The application places a thumbnail-generation job on the message queue.
7. Once the original photo and database record are safely stored and the job is successfully queued, the application confirms the upload without waiting for thumbnail generation to finish.
8. A background worker retrieves the job from the queue and reads the original photo from object storage.
9. The worker generates a 50 KB thumbnail and saves it in object storage.
10. The worker updates the database record to indicate that the thumbnail is ready and stores its object key or reference.
11. When another user opens a feed, the application retrieves feed metadata using the cache and read replica where appropriate.
12. The CDN delivers the original photos or thumbnails from its cache, fetching uncached files from object storage when necessary.

If thumbnail generation fails, the queue should support retries, and the worker should process jobs safely without creating duplicate results. A placeholder can be displayed while the thumbnail is unavailable.

## 8. Architectural Trade-Offs

### 8.1 Caching versus Data Freshness

Caching reduces database load and makes feeds faster. However, cached data may become outdated after a new upload or follow relationship change. Appropriate expiration periods and cache invalidation are needed to balance speed with freshness.

### 8.2 Asynchronous Processing versus Immediate Availability

A message queue and background worker prevent image processing from blocking application requests, improving upload responsiveness and protecting application servers during traffic spikes. However, thumbnails may not be available immediately, and failed or delayed jobs require monitoring, retries and error handling.

### 8.3 Read Replicas versus Strong Consistency

Read replicas improve scalability by distributing read traffic. However, replication lag can cause a recently uploaded photo or updated record to be temporarily missing from a feed. The application may need to read recent changes from the primary database or use other consistency measures.

### 8.4 Object Storage versus Architectural Complexity

Object storage is suitable for large photo files and can scale independently of the database. However, it introduces additional complexity because the application must manage file references, permissions, failed uploads and consistency between stored files and database records.

## 9. Conclusion

SnapShare is a read-heavy application with an estimated one million daily active users, 11.57 average uploads per second and 578.70 average feed views per second. At five times average traffic, feed requests could reach approximately 2,894 requests per second. Annual storage for original photos and thumbnails is estimated at 748.25 TB.

The proposed architecture combines a CDN, load balancer, scalable application servers, caching, a primary database with a read replica, object storage, a message queue and background workers. This design supports fast feed delivery, scalable photo storage and reliable asynchronous thumbnail generation. Load testing and production monitoring would be needed to validate actual capacity requirements.