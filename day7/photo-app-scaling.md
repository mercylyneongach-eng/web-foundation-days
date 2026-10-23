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
               +--------------+
               |     CDN      |
               | Cached photos|
               +--------------+
                      |
             Cache miss / API request
                      |
                      v
               +--------------+
               |Load Balancer |
               +--------------+
                      |
             +--------+--------+
             |        |        |
             v        v        v
          +------+ +------+ +------+
          | App  | | App  | | App  |
          |Server| |Server| |Server|
          +------+ +------+ +------+
             |        |        |
             +--------+--------+
                      |
          +-----------+-----------+
          |                       |
          v                       v
    +-------------+       +---------------+
    |    Cache    |       |   Database    |
    | Feed/metadata|      | Primary DB    |
    +-------------+       +---------------+
                                  |
                                  v
                          +---------------+
                          |  Read Replica |
                          +---------------+

       PHOTO UPLOAD AND THUMBNAIL PROCESSING

          App Server
               |
               v
       +----------------+
       | Object Storage |
       | Original photo |
       +----------------+
               |
               v
       +----------------+
       | Message Queue  |
       | Thumbnail job  |
       +----------------+
               |
               v
       +----------------+
       | Worker Service |
       | Create thumbnail|
       +----------------+
               |
               v
       +----------------+
       | Object Storage |
       |    Thumbnail   |
       +----------------+
               |
               v
       Database metadata is updated;
       the CDN can serve the thumbnail.
```

## 6. Components and the Problems They Solve

1. **CDN:** Caches and delivers photos from locations close to users, reducing latency and the amount of photo traffic reaching the application servers.
2. **Load balancer:** Distributes incoming application requests across healthy app servers to prevent any one server from becoming overloaded.
3. **App servers:** Handle application logic, authenticate users, process uploads and retrieve feed data.
4. **Cache:** Stores frequently requested feed data and metadata in fast memory, reducing repeated database queries.
5. **Primary database:** Stores authoritative user, photo, follow relationship and other application metadata.
6. **Database read replica:** Serves read queries such as feed metadata lookups, reducing read pressure on the primary database.
7. **Object storage:** Stores original photos and generated thumbnails durably without filling the database with large binary files.
8. **Message queue:** Holds thumbnail-generation jobs until workers can process them, helping absorb bursts of uploads and decoupling upload requests from image processing.
9. **Worker service:** Processes queued jobs, resizes uploaded originals into thumbnails and saves the resulting files to object storage.

## 7. Step-by-Step Photo Upload Flow

1. A user selects a photo and submits it through the SnapShare application.
2. The load balancer routes the upload request to a healthy app server.
3. The app server authenticates the user and validates the upload, including its file type and size.
4. The original photo is uploaded to object storage, where it receives a unique object key.
5. The application creates a database record containing the photo ID, user ID, object key, upload time and other relevant metadata.
6. The app server places a thumbnail-generation job on the message queue.
7. The application confirms the upload to the user without waiting for thumbnail generation to finish.
8. A worker retrieves the job from the queue, reads the original photo from object storage and generates a 50 KB thumbnail.
9. The worker saves the thumbnail in object storage and updates the photo's processing status or thumbnail reference in the database.
10. When users view their feeds, the app server retrieves the relevant feed metadata, using the cache and database read replica where appropriate.
11. The feed provides photo URLs or object references, and the CDN delivers cached photo files or fetches uncached files from object storage.

If thumbnail processing fails, the job should be retried safely, and the original photo should remain available. The application can temporarily display a placeholder until the thumbnail is ready.

## 8. Trade-Offs

### Trade-off 1: Caching versus Freshness

Caching feed data and metadata improves response times and reduces database load. However, cached information may become outdated when a user uploads a new photo or changes a follow relationship. SnapShare must balance cache performance with freshness by using suitable expiration times and invalidation strategies.

### Trade-off 2: Asynchronous Thumbnail Generation versus Immediate Availability

Generating thumbnails through a queue and worker allows uploads to complete quickly and protects app servers from heavy image-processing tasks. However, thumbnails are not available immediately, and queue delays or worker failures can affect when they appear. Retry handling, monitoring and temporary placeholders help manage this delay.

### Trade-off 3: Object Storage versus Database Simplicity

Object storage is better suited to large photo files and scales independently of the metadata database. However, it introduces additional components and requires the application to manage object keys, access permissions, file deletion and consistency between database records and stored files.

### Trade-off 4: Read Replicas versus Strongly Consistent Reads

Read replicas distribute read traffic and reduce pressure on the primary database. However, replication lag can cause a newly uploaded photo or recently updated metadata to be temporarily missing from a feed. SnapShare may need to route certain recent-write reads to the primary database or implement appropriate consistency handling.

## 9. Conclusion

SnapShare has an estimated one million daily active users, 11.57 average photo uploads per second and approximately 578.70 average feed views per second. Peak feed traffic is estimated at 2,893.52 requests per second, and new photos require approximately 748.25 TB of storage per year for originals and thumbnails.

The proposed architecture uses a CDN, load balancer, scalable app servers, caching, a primary database with a read replica, object storage, a message queue and thumbnail workers. This design prioritizes frequent feed reads while keeping photo storage scalable and image processing asynchronous. Actual production capacity should be validated through load testing, monitoring and measured usage patterns.