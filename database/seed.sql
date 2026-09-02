-- AdaptIQ Seed Data — Aptitude & Reasoning Sub-Topics
-- Run AFTER schema.sql

SET FOREIGN_KEY_CHECKS = 0;

-- ============================================================
-- Topics (10 Aptitude & Reasoning Sub-Topics)
-- ============================================================
TRUNCATE TABLE topics;

INSERT INTO topics (id, name, description) VALUES
  (1,  'Percentages & Profit/Loss',       'Percentage calculations, profit, loss, discount, markup'),
  (2,  'Time, Speed & Distance',         'Speed, distance, time, trains, boats, streams, relative motion'),
  (3,  'Work & Time',                    'Pipe and cisterns, joint work, individual efficiency, wages'),
  (4,  'Number Systems & Series',        'LCM, HCF, divisibility, remainder theorem, number series'),
  (5,  'Permutations & Probability',     'Combinations, arrangements, probability of events, dice, cards'),
  (6,  'Logical Deduction & Syllogisms', 'Syllogisms, Venn diagrams, statements & conclusions, logical flow'),
  (7,  'Data Interpretation',            'Bar graphs, pie charts, tables, line graphs, data sufficiency'),
  (8,  'Blood Relations & Directions',    'Family trees, relationships, directional compass, distance & orientation'),
  (9,  'Clocks & Calendars',             'Hand angles, gain/loss of time, leap years, day of the week calculations'),
  (10, 'Averages, Ratios & Mixtures',     'Ratios, proportions, weighted averages, allegation & mixture problems');

-- ============================================================
-- Users
-- Password for admin: Admin@1234
-- Password for student: Student@123
-- ============================================================
INSERT INTO users (name, email, password_hash, role) VALUES
  ('Admin',        'admin@adaptiq.com',   '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TiGniYOreWUP6iL.Zm3nW2vVJoAm', 'admin'),
  ('Demo Student', 'student@adaptiq.com', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TiGniYOreWUP6iL.Zm3nW2vVJoAm', 'student')
ON DUPLICATE KEY UPDATE name=VALUES(name);

-- ============================================================
-- Company Mock Test (single standard company-level test)
-- This portal offers one standard mock test, not per-company suites.
-- Difficulty counts must sum to question_count.
-- ============================================================
INSERT INTO company_tests
  (id, company_name, time_limit_minutes, question_count, easy_count, medium_count, hard_count)
VALUES
  (1, 'Standard Company Mock Test', 60, 30, 10, 12, 8)
ON DUPLICATE KEY UPDATE
  company_name       = VALUES(company_name),
  time_limit_minutes = VALUES(time_limit_minutes),
  question_count     = VALUES(question_count),
  easy_count         = VALUES(easy_count),
  medium_count       = VALUES(medium_count),
  hard_count         = VALUES(hard_count);

SET FOREIGN_KEY_CHECKS = 1;
