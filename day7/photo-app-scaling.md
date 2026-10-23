# SnapShare Photo App Scaling Plan

## 1. Assumptions

SnapShare is a photo-sharing application where users upload photos and view a feed containing photos from people they follow.

The following assumptions are used for the scaling calculations:

- Registered users: 10,000,000.
- Daily active users (DAU): 10% of registered users.
- Each active user uploads 1 photo per day.
- Each active user views 50 feed pages per day.
- Average original photo size: 2 MB.
- Each photo has one thumbnail of 50 KB.
- The system operates every day of the year, using 365 days for annual storage calculations.
- Average request rates are calculated over 86,400 seconds per day.
- Peak traffic is estimated at 5 times the average rate.
- Storage calculations use decimal units: 1 GB = 1,000 MB and 1 TB = 1,000 GB.
- Feed views represent requests for feed pages, not individual photos within those pages.
- Storage estimates cover original photos and thumbnails only, excluding database records, backups, replication overhead and other application data.

## 2. Daily Active Users and Traffic Calculations

### 2.1 Daily Active Users (DAU)

Daily active users are the registered users who use SnapShare on a typical day.

DAU = Registered users × Daily activity percentage

DAU = 10,000,000 × 10%

**DAU = 1,000,000 users per day**

### 2.2 Photo Uploads per Second

Each daily active user uploads one photo per day.

Daily uploads = 1,000,000 × 1 = 1,000,000 photos per day

Average uploads per second = Daily uploads ÷ 86,400

= 1,000,000 ÷ 86,400

**Average uploads = 11.57 photos per second**

Peak uploads per second = 11.57 × 5

**Peak uploads ≈ 57.87 photos per second**

### 2.3 Feed Views per Second

Each active user views 50 feed pages per day.

Daily feed views = 1,000,000 × 50

= 50,000,000 feed views per day

Average feed views per second = 50,000,000 ÷ 86,400

**Average feed views ≈ 578.70 requests per second**

Peak feed views per second = 578.70 × 5

**Peak feed views ≈ 2,893.52 requests per second**

### 2.4 Photo Storage per Year

Each uploaded photo requires storage for the original photo and its thumbnail.

Original photo storage per day:

1,000,000 × 2 MB = 2,000,000 MB = 2,000 GB = 2 TB

Thumbnail storage per day:

1,000,000 × 50 KB = 50,000,000 KB = 50 GB

Total storage per day:

2,000 GB + 50 GB = 2,050 GB = 2.05 TB

Annual original photo storage:

2 TB × 365 = 730 TB

Annual thumbnail storage:

50 GB × 365 = 18.25 TB

**Total annual photo storage = 730 TB + 18.25 TB = 748.25 TB**

This is the estimated storage for one year of newly uploaded photos and thumbnails, without compression, deletion or storage overhead. Storage requirements will accumulate as more years of content are retained.

### 2.5 Summary of Calculations

| Metric | Estimated result |
|---|---:|
| Registered users | 10 million |
| Daily active users | 1 million |
| Daily photo uploads | 1 million |
| Average uploads per second | 11.57 |
| Peak uploads per second | 57.87 |
| Daily feed views | 50 million |
| Average feed views per second | 578.70 |
| Peak feed views per second | 2,893.52 |
| Original photo storage per year | 730 TB |
| Thumbnail storage per year | 18.25 TB |
| Total storage per year | 748.25 TB |

## 3. Is SnapShare Read-Heavy or Write-Heavy?

SnapShare is a **read-heavy system** because users view 50 feed pages per day but upload only one photo per day.

Daily feed views = 50 million.

Daily uploads = 1 million.

The system therefore receives approximately 50 feed-view requests for every photo upload. Feed requests are expected to dominate application traffic, so the architecture should prioritize fast feed delivery, caching, read replicas and content delivery networks (CDNs). Uploads must also be reliable, but the system should be designed primarily to serve frequent reads efficiently.

## 4. Why Photos Should Not Be Stored Inside the Database

Original photos are large binary files, and storing them directly inside a relational database would increase database size, backups, storage costs and the time needed to retrieve and manage records.

Instead, SnapShare should store original photos and thumbnails in **object storage**, which is designed for durable, scalable storage of large files. The database should store metadata such as photo IDs, user IDs, captions, timestamps and object-storage keys or URLs. This keeps the database smaller and allows photo files to be delivered independently through a CDN.

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
7. The application confirms the successful upload without waiting for the thumbnail to be generated.
8. A background worker retrieves the job from the queue and downloads the original photo from object storage.
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