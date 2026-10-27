# TicketHub: System Design

## 1. Requirements

TicketHub is a website that allows users to discover concerts and events, view available seats, reserve seats, pay for tickets, and access their purchased tickets.

### 1.1 Functional Requirements

- Users can register, log in, and manage their accounts.
- Users can browse, search, and view event details.
- Users can view the seating plan and current seat availability.
- Users can temporarily hold available seats while completing checkout.
- Users can pay for their orders and receive confirmation.
- Users can view their purchased tickets and order history.
- The system can expire unpaid holds and release seats for other customers.
- Administrators can create events, configure seating, and manage ticket availability.

### 1.2 Non-Functional Requirements

**Speed:** Event pages and cached information should load within two seconds under normal conditions. Seat availability and checkout operations should respond quickly, ideally within two seconds when the system is healthy.

**Correctness:** A seat must never be sold to two customers for the same event. Payments, orders, and seat allocations must remain consistent even when requests fail or are repeated.

**Fairness:** During a popular sale, users should enter through a virtual waiting room. Requests should be admitted at a controlled rate, with queue positions assigned fairly. The system should not allow users to bypass the queue by repeatedly refreshing the page.

**Scalability:** The system must handle normal browsing traffic and sudden increases in requests during popular concert sales.

**Availability:** The website should remain operational during high demand. If payment processing fails, the system should avoid confirming unpaid orders.

**Security:** Users must access only their own orders and tickets. Payment details must be handled securely through a trusted payment provider.

**Maintainability:** The system should use clearly separated components that can be tested, monitored, and updated independently.

## 2. Traffic Estimates

### 2.1 Normal Traffic

Given:
- Registered users: 2,000,000
- Daily visitors: 50,000
- Pages viewed per visitor: 10
- Tickets sold per day: 5,000

Daily page views:

50,000 × 10 = **500,000 page views per day**

Average page views per second:

500,000 ÷ 86,400 = **5.8 page views per second**

Average ticket sales per second:

5,000 ÷ 86,400 = **0.058 tickets per second**

These are daily averages. Actual traffic will vary throughout the day, so the system should be designed with additional capacity.

For planning, assume normal peak traffic is five times the daily average:

5.8 × 5 = **29 page views per second**

This five-times multiplier is a design assumption, not measured traffic.

### 2.2 Big-Sale Traffic

Given:
- People attempting to buy tickets: 200,000
- Available seats: 20,000
- Sale window: 10 minutes (600 seconds)

Average incoming purchase attempts:

200,000 ÷ 600 = **333 purchase attempts per second**

Demand-to-supply ratio:

200,000 ÷ 20,000 = **10 people per seat**

Only 10% of the interested people can obtain a seat if all 20,000 seats are sold to this group.

The 333 attempts per second is an average across the ten-minute window. The initial burst could be considerably higher.

### 2.3 Comparison

| Metric | Normal day | Big sale |
|---|---:|---:|
| Daily visitors / interested buyers | 50,000 per day | 200,000 in 10 minutes |
| Page views | 500,000 per day | Not specified |
| Average page views per second | 5.8 | Not specified |
| Estimated normal peak page views | 29 per second | Not specified |
| Purchase attempts | 5,000 tickets per day | 333 per second on average |
| Available seats | Normal inventory varies | 20,000 |

The big sale creates concentrated demand that cannot be managed by simply increasing website capacity. TicketHub also needs a waiting room, request throttling, temporary seat holds, and strict database controls.

## 3. API Design

The API allows the frontend to communicate with the backend using HTTP requests and JSON responses.

| Method and endpoint | Purpose |
|---|---|
| `GET /api/events` | Browse and search events |
| `GET /api/events/{eventId}` | View event details |
| `GET /api/events/{eventId}/seats` | View seats and their availability |
| `POST /api/events/{eventId}/holds` | Temporarily hold selected seats |
| `DELETE /api/holds/{holdId}` | Release a hold before it expires |
| `POST /api/orders/{orderId}/pay` | Initiate payment for an order |
| `GET /api/me/tickets` | View tickets belonging to the logged-in user |
| `GET /api/me/orders/{orderId}` | View the user's order details |

### API Behaviour

**Browsing events:** The events endpoint supports pagination and filtering so that the server does not return every event in one response.

**Viewing seats:** The seat endpoint returns seat identifiers, labels, prices, and availability. Availability displayed in the browser is only a snapshot; it does not guarantee that a seat remains available.

**Holding seats:** The hold endpoint requires authentication and a valid waiting-room admission token during high-demand sales. The server attempts to reserve all requested seats atomically. If any seat is unavailable, the request fails without partially reserving the selection.

A successful hold expires after a short period, such as five minutes. The server records the expiry time and prevents expired holds from being used for payment.

**Payment:** The payment endpoint uses an idempotency key to prevent retries from creating duplicate charges or orders. A trusted payment provider processes the payment. The backend verifies the result before confirming the order.

**Viewing tickets:** The tickets endpoint requires authentication and returns only tickets belonging to the logged-in user.

### Example Responses

A successful seat hold returns an order or hold identifier, the held seats, and an expiry timestamp.

If a seat has already been held or sold, the API returns a conflict response, such as HTTP `409 Conflict`, and asks the customer to select another seat.

## 4. Data Model

TicketHub uses a relational database, such as PostgreSQL, because ticket sales require reliable transactions, constraints, and relationships.

### 4.1 Tables

**Users**

| Column | Purpose |
|---|---|
| `user_id` | Primary key |
| `name` | Customer's name |
| `email` | Unique email address |
| `password_hash` | Securely stored password hash |
| `created_at` | Account creation time |

**Events**

| Column | Purpose |
|---|---|
| `event_id` | Primary key |
| `title` | Event name |
| `venue` | Event location |
| `event_date` | Date and time of the event |
| `sale_start` | Ticket sale opening time |
| `status` | Draft, on sale, sold out, or cancelled |

**Seats**

| Column | Purpose |
|---|---|
| `seat_id` | Primary key |
| `event_id` | Foreign key to Events |
| `section` | Seating section |
| `row_label` | Row identifier |
| `seat_number` | Seat identifier within a row |
| `price` | Ticket price |
| `status` | Available, held, or sold |

Each seat belongs to one event. A database constraint on `(event_id, section, row_label, seat_number)` prevents duplicate seat definitions for the same event.

**Orders**

| Column | Purpose |
|---|---|
| `order_id` | Primary key |
| `user_id` | Foreign key to Users |
| `status` | Pending, confirmed, expired, or cancelled |
| `total_amount` | Total order value |
| `idempotency_key` | Unique identifier for safely retrying a checkout request |
| `created_at` | Order creation time |

**Order_Items**

| Column | Purpose |
|---|---|
| `order_item_id` | Primary key |
| `order_id` | Foreign key to Orders |
| `seat_id` | Foreign key to Seats, unique |
| `price_at_purchase` | Price recorded at checkout |

**Seat_Holds**

| Column | Purpose |
|---|---|
| `hold_id` | Primary key |
| `seat_id` | Foreign key to Seats, unique while the hold is active |
| `user_id` | Foreign key to Users |
| `order_id` | Foreign key to Orders |
| `expires_at` | Hold expiry timestamp |
| `status` | Active, converted, or released |

In an implementation, active holds should be represented so that the database can enforce one active hold per seat. Expired holds must be released or excluded from the active-hold constraint through a transaction-safe process.

**Payments**

| Column | Purpose |
|---|---|
| `payment_id` | Primary key |
| `order_id` | Foreign key to Orders |
| `provider_reference` | Payment provider's transaction reference |
| `amount` | Amount charged |
| `status` | Pending, successful, or failed |
| `created_at` | Payment creation time |

### 4.2 Relationships

- One user can create many orders: `Users 1 → many Orders`.
- One event has many seats: `Events 1 → many Seats`.
- One order can contain many order items: `Orders 1 → many Order_Items`.
- Each order item refers to one seat, and a seat can appear in at most one completed sale.
- A seat can have multiple historical holds, but it must have no more than one active hold at a time.
- One order can have multiple payment attempts, but only one successful payment should confirm the order.

The primary keys uniquely identify records, while foreign keys preserve relationships between tables.

## 5. Architecture Design

### 5.1 Architecture Diagram

```text
                     CUSTOMERS
                         |
                         v
                 +----------------+
                 | CDN / Web App  |
                 | Cached Assets  |
                 +----------------+
                         |
                         v
                 +----------------+
                 | Load Balancer  |
                 +----------------+
                         |
                         v
                 +----------------+
                 | API Gateway    |
                 | Rate Limiting  |
                 +----------------+
                         |
              +----------+-----------+
              |                      |
              v                      v
      +----------------+    +------------------+
      | Event Service  |    | Virtual Waiting  |
      | Browse/Search  |    | Room / Queue     |
      +----------------+    +------------------+
              |                      |
              |                      v
              |              +------------------+
              |              | Seat / Order     |
              |              | Service          |
              |              +------------------+
              |                      |
              +----------------------+
                                     |
                                     v
                           +--------------------+
                           | Relational Database|
                           | Transactions       |
                           | Constraints        |
                           +--------------------+
                                     |
                                     v
                           +--------------------+
                           | Payment Provider   |
                           +--------------------+

                Background Workers
                - Expire seat holds
                - Process payment events
                - Send ticket confirmations
```

### 5.2 Components and Their Roles

**CDN and web app:** Deliver static files such as HTML, CSS, JavaScript, event images, and other cacheable content. This reduces the load on the backend.

**Load balancer:** Distributes incoming requests across multiple backend instances so that one server does not handle all the traffic.

**API gateway:** Routes requests to the correct service and applies authentication checks, rate limits, and request validation.

**Virtual waiting room:** Controls the number of users admitted to the purchasing flow during a popular sale. Queue tokens help maintain an orderly admission process and reduce overload.

**Event service:** Handles event listings, search, and event details. Frequently requested public information can be cached.

**Seat and order service:** Handles seat selection, temporary holds, order creation, checkout, and ticket ownership. It uses database transactions to protect inventory.

**Relational database:** Stores users, events, seats, holds, orders, order items, and payments. Database constraints and transactions are the final protection against duplicate seat sales.

**Payment provider:** Processes payments without storing raw card details in TicketHub. Signed webhooks or verified provider responses update payment status.

**Background workers:** Expire unpaid holds, process payment notifications, and send ticket confirmations. Queues allow non-urgent work to continue without blocking checkout.

### 5.3 How the Architecture Handles a Big Sale

The CDN serves static content, while cached event information reduces repeated database reads. The load balancer distributes requests across multiple application instances.

The virtual waiting room admits customers at a controlled rate rather than allowing all 200,000 people to compete directly for seats at once. Rate limiting helps control automated or excessive requests.

Seat holds and payments use transactional database operations. Background workers process tasks such as notifications and hold cleanup, while monitoring helps operators identify errors and capacity bottlenecks.

The waiting room improves traffic management, but it does not replace database locking and constraints. Every seat allocation must still be validated by the database.

## 6. Preventing Double-Booking

The most important correctness requirement is that two customers must never purchase the same seat for the same event.

TicketHub prevents double-booking through **temporary holds, database transactions, row-level locking, and uniqueness constraints**.

### Step 1: Customer Requests a Hold

The backend begins a database transaction and locks the requested seat rows using a mechanism such as `SELECT ... FOR UPDATE`.

### Step 2: Check Availability

While holding the locks, the backend checks whether each seat is available or whether an existing hold has expired. If any seat is unavailable, the transaction is rolled back.

### Step 3: Reserve Seats Atomically

If all requested seats are available, the backend records the hold, links it to the order, sets an expiry time, and updates the seat state. It then commits the transaction.

A competing request for the same seat must wait for the first transaction or fail when it checks the updated state. It cannot successfully reserve the same seat.

### Step 4: Complete Payment

The customer pays before the hold expires. After the payment provider confirms success, TicketHub verifies that the hold and order are still valid and converts the reservation into a confirmed sale using a transaction.

The system must handle delayed payment notifications and late payments carefully. If a hold has expired and the seat has been reassigned, TicketHub must not confirm a second sale for that seat; it should follow a defined refund or payment-reconciliation process.

### Step 5: Enforce Database Constraints

The database enforces uniqueness for each seat in completed sales and prevents multiple active holds on the same seat. For example, a unique constraint on `Order_Items.seat_id` ensures that the same physical seat cannot be included in two completed order items.

All code paths that allocate seats must follow the same transactional rules. Checking availability only in the frontend is not sufficient because two customers can see the same available seat at nearly the same time.

## 7. Trade-Offs

### Trade-Off 1: Strong Consistency vs. Performance

**Choice:** Use database transactions and row-level locks for seat allocation.

**Benefit:** Prevents two customers from purchasing the same seat and keeps order data consistent.

**Cost:** Competing requests for popular seats may wait, increasing checkout latency.

**Reason:** Correct ticket ownership is more important than allowing every request to complete immediately. Caching can improve browsing performance without weakening seat-allocation correctness.

### Trade-Off 2: Fairness vs. Immediate Access

**Choice:** Use a virtual waiting room during high-demand sales.

**Benefit:** Controls the purchase rate, reduces overload, and provides an orderly admission process.

**Cost:** Customers may have to wait even when the website has sufficient capacity for some requests.

**Reason:** A queue helps manage demand and reduces the chance that users with faster devices or automated scripts dominate the sale. Queue rules should be transparent and monitored.

### Trade-Off 3: Short Holds vs. Customer Convenience

**Choice:** Use a five-minute hold by default.

**Benefit:** Seats are returned to inventory quickly when customers abandon checkout.

**Cost:** Customers who experience payment delays may lose their reservation.

**Reason:** A short hold improves inventory turnover. The system should clearly display the expiry time and handle payment failures fairly.

## Conclusion

TicketHub requires a scalable architecture for browsing and a strongly consistent process for selling seats. CDN caching, load balancing, rate limiting, and a virtual waiting room help manage high traffic. Database transactions, row-level locks, and uniqueness constraints prevent double-booking. Together, these measures support speed, correctness, and fairness during both normal operations and popular concert sales.
