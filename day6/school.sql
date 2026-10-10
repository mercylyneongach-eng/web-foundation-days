
-- Day 6 Assignment: School Database
-- Enable foreign key enforcement in SQLite.
PRAGMA foreign_keys = ON;

-- 1. CREATE TABLE STATEMENTS

CREATE TABLE students (
    student_id INTEGER PRIMARY KEY,
    student_name TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE
);

CREATE TABLE courses (
    course_id INTEGER PRIMARY KEY,
    course_name TEXT NOT NULL UNIQUE
);

CREATE TABLE enrolments (
    enrolment_id INTEGER PRIMARY KEY,
    student_id INTEGER NOT NULL,
    course_id INTEGER NOT NULL,
    grade REAL NOT NULL CHECK (grade >= 0 AND grade <= 100),

    FOREIGN KEY (student_id) REFERENCES students(student_id),
    FOREIGN KEY (course_id) REFERENCES courses(course_id),

    UNIQUE (student_id, course_id)
);

-- 2. INSERT SAMPLE DATA

INSERT INTO students (student_id, student_name, email) VALUES
(1, 'Alice Wanjiku', 'alice@example.com'),
(2, 'Brian Otieno', 'brian@example.com'),
(3, 'Carol Achieng', 'carol@example.com'),
(4, 'David Mwangi', 'david@example.com');

INSERT INTO courses (course_id, course_name) VALUES
(1, 'Database Systems'),
(2, 'Web Development'),
(3, 'Economics');

INSERT INTO enrolments
    (enrolment_id, student_id, course_id, grade)
VALUES
(1, 1, 1, 85),
(2, 1, 2, 90),
(3, 2, 1, 78),
(4, 2, 3, 88),
(5, 3, 2, 92);

-- 3. QUERY 1: All courses taken by one student, by name.
SELECT
    s.student_name,
    c.course_name,
    e.grade
FROM students AS s
JOIN enrolments AS e ON s.student_id = e.student_id
JOIN courses AS c ON e.course_id = c.course_id
WHERE s.student_name = 'Alice Wanjiku'
ORDER BY c.course_name;

-- 4. QUERY 2: All students enrolled on one course.
SELECT
    c.course_name,
    s.student_name,
    e.grade
FROM courses AS c
JOIN enrolments AS e ON c.course_id = e.course_id
JOIN students AS s ON e.student_id = s.student_id
WHERE c.course_name = 'Web Development'
ORDER BY s.student_name;

-- 5. QUERY 3: Number of students enrolled per course.
-- LEFT JOIN includes courses with zero enrolments.
SELECT
    c.course_name,
    COUNT(e.student_id) AS number_of_students
FROM courses AS c
LEFT JOIN enrolments AS e ON c.course_id = e.course_id
GROUP BY c.course_id, c.course_name
ORDER BY c.course_name;

-- 6. QUERY 4: Students who have no enrolments.
SELECT
    s.student_id,
    s.student_name,
    s.email
FROM students AS s
LEFT JOIN enrolments AS e ON s.student_id = e.student_id
WHERE e.enrolment_id IS NULL
ORDER BY s.student_name;

-- 7. QUERY 5: Update one enrolment's grade.
UPDATE enrolments
SET grade = 95
WHERE student_id = 1 AND course_id = 1;

-- Verify the updated grade.
SELECT
    s.student_name,
    c.course_name,
    e.grade
FROM enrolments AS e
JOIN students AS s ON e.student_id = s.student_id
JOIN courses AS c ON e.course_id = c.course_id
WHERE s.student_name = 'Alice Wanjiku'
  AND c.course_name = 'Database Systems';
