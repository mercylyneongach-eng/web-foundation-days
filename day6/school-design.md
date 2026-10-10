
# School Database Design

## 1. Tables

### Students
The students table stores information about each student. It contains
student_id as the primary key, student_name and email. The student's
email is required and must be unique so that two students cannot share
the same email address.

### Courses
The courses table stores the courses offered by the school. It contains
course_id as the primary key and course_name. The course name is required
and unique to avoid duplicate course records.

### Enrolments
The enrolments table records which students take which courses and the
grades they receive. It contains enrolment_id as the primary key,
student_id and course_id as foreign keys, and grade. The foreign keys
connect enrolments to existing students and courses. The grade must be
between 0 and 100. A unique constraint on student_id and course_id
prevents duplicate enrolments for the same student and course.

## 2. Relationships

There is a one-to-many relationship between students and enrolments
because one student can have multiple enrolment records. There is also
a one-to-many relationship between courses and enrolments because one
course can have many enrolment records.

Students and courses have a many-to-many relationship. A student can
take several courses, and a course can have several students. The
enrolments table is necessary as a junction table because it connects
the two tables and stores additional information about each relationship,
such as the student's grade.

## 3. Index

I would add an index on the course_id column in the enrolments table
to help the database find enrolments for a particular course more
efficiently. This would be useful when listing students on a course
or counting enrolments per course. The unique constraint on
(student_id, course_id) already creates an index for that column
combination.

Example:
CREATE INDEX idx_enrolments_course_id
ON enrolments(course_id);

## 4. SQL or NoSQL?

I would choose a relational SQL database such as SQLite for this school
system. Students, courses and enrolments have clearly defined
relationships, and each enrolment must refer to an existing student
and course. SQL supports primary keys, foreign keys, unique constraints
and joins, helping maintain accurate and consistent records. It also
makes it straightforward to retrieve grades, list course participants
and count enrolments. A NoSQL database may be useful for flexible or
rapidly changing data structures, but a relational database is more
appropriate for this structured school enrolment system.
