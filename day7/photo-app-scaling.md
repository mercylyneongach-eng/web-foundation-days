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
- Peak traffic is estimated at 5 times the average traffic.
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

This represents newly uploaded photos and thumbnails retained for one year, without compression or deletion.

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
              +-----------+
              |    CDN    |
              |Photo files|
              +-----------+
                    |
                    v
              +-------------+
              |Load Balancer|
              +-------------+
                    |
          +---------+---------+
          |         |         |
          v         v         v
       +------+  +------+  +------+
       | App  |  | App  |  | App  |
       |Server|  |Server|  |Server|
       +------+  +------+  +------+
          |         |         |
          +---------+---------+
                    |
             +------+------+
             |             |
             v             v
        +---------+   +-------------+
        |  Cache  |   | Primary DB  |
        |Feed data|   |  Metadata   |
        +---------+   +-------------+
                            |
                            v
                      +-------------+
                      | Read Replica|
                      +-------------+

          PHOTO UPLOAD AND THUMBNAIL PROCESSING

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
               |Thumbnail Job |
               +--------------+
                      |
                      v
               +--------------+
               |Worker Service|
               |Create Thumbnail
               +--------------+
                      |
                      v
               +--------------+
               |Object Storage|
               |  Thumbnail   |
               +--------------+
                      |
                      v
              Update photo metadata
                in the database
```

## 6. Components and the Problems They Solve

- **CDN:** Delivers cached photos from locations close to users, reducing loading times and traffic reaching the application servers.
- **Load balancer:** Distributes incoming API requests across healthy app servers to prevent individual servers from becoming overloaded.
- **App servers:** Handle authentication, upload validation, feed requests and application logic.
- **Cache:** Stores frequently requested feed data and metadata in fast memory, reducing database queries and improving response times.
- **Primary database:** Stores authoritative user information, follow relationships and photo metadata.
- **Read replica:** Handles feed-related read queries, reducing the workload on the primary database.
- **Object storage:** Stores original photos and thumbnails durably without filling database tables with large files.
- **Message queue:** Holds thumbnail-generation jobs until workers can process them, separating image processing from the upload request.
- **Worker service:** Processes queued jobs in the background, creates thumbnails and saves them to object storage.

## 7. Step-by-Step Photo Upload Flow

1. A user selects a photo and submits it through the application.
2. The load balancer routes the request to a healthy app server.
3. The app server authenticates the user and validates the file type and size.
4. The original photo is uploaded to object storage and assigned a unique object key.
5. The app server creates a database record containing the photo ID, owner, object key, upload time and processing status.
6. The app server places a thumbnail-generation job on the message queue.
7. Once the original photo and database record are safely stored and the job is successfully queued, the application responds with `201 Created` without waiting for thumbnail generation.
8. A worker retrieves the job from the queue and reads the original photo from object storage.
9. The worker generates the 50 KB thumbnail and saves it to object storage.
10. The worker updates the database record with the thumbnail reference and marks processing as complete.
11. The application invalidates or refreshes relevant cached feeds so followers can discover the new photo.
12. When users scroll through their feeds, the application retrieves feed metadata using the cache and read replica where appropriate, while the CDN delivers the photo files.

If thumbnail generation fails, the system should retry the job safely. A placeholder can be shown until the thumbnail is ready, and monitoring should identify jobs that continue to fail.

## 8. Architectural Trade-Offs

### 1. Speed versus Freshness

Caching feeds reduces database load and makes scrolling faster. However, cached feeds may temporarily omit new photos or show outdated information. Cache expiration and invalidation strategies help balance speed and freshness.

### 2. Fast Uploads versus Immediate Thumbnail Availability

Background thumbnail generation lets the application respond quickly without tying up app servers with image processing. However, thumbnails may take time to appear, and queue delays or worker failures require retries and monitoring.

### 3. Read Replicas versus Strong Consistency

Read replicas distribute database reads and improve scalability. However, replication lag can temporarily hide recent uploads or updates. The application may need to read recent changes from the primary database when immediate consistency is important.

### 4. Object Storage versus Simplicity

Object storage handles large photo files efficiently and scales independently of the database. However, it introduces additional complexity in managing file references, permissions, failed uploads and consistency between database records and stored objects.

## 9. Conclusion

SnapShare is a read-heavy application with one million daily active users, approximately 11.57 average photo uploads per second and 578.70 average feed views per second. Peak feed traffic is estimated at 2,893.52 requests per second. Original photos and thumbnails require approximately 748.25 TB of storage for one year of uploads.

The proposed architecture uses a CDN, load balancer, scalable app servers, cache, primary database, read replica, object storage, message queue and background worker. Separating photo files from structured database records and processing thumbnails asynchronously helps the application serve feeds efficiently while supporting reliable uploads and growing storage needs.