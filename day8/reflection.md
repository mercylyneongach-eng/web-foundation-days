# Day 8 Reflection

The most difficult concept in this course was understanding how to design a system that remains correct when many users make requests at the same time. I initially found it challenging to understand why checking whether a seat was available was not enough to prevent double-booking. I overcame this by learning how database transactions, row-level locks, and unique constraints work together. I now understand that the backend and database must enforce correctness rather than relying on what users see on the website.

Based on the feedback on my capstone, I would improve the clarity of my architecture diagram and explain more explicitly how each component communicates with the others. I would also strengthen my traffic estimates by including more realistic peak-load assumptions and testing how the system behaves when demand exceeds capacity. This would help me distinguish between average traffic and sudden bursts of requests.

Next, I plan to learn more about database indexing, caching, load balancing, and cloud deployment. I would also like to practise load testing an application to identify performance bottlenecks before deploying it. Finally, I want to improve my understanding of security and payment integration so that I can build systems that are not only scalable but also reliable and safe for users.

This assignment has helped me connect system design concepts to a practical problem. It has also shown me that good design involves balancing performance, correctness, fairness, and cost rather than focusing on only one requirement.
