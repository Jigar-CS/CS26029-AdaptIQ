-- AdaptIQ Database Schema (Phase 1 Migration)
-- Run this in phpMyAdmin after creating the `adaptiq` database
-- MySQL 8.0+

SET FOREIGN_KEY_CHECKS = 0;

-- ============================================================
-- 1. Users
-- ============================================================
CREATE TABLE IF NOT EXISTS users (
  id                       INT AUTO_INCREMENT PRIMARY KEY,
  name                     VARCHAR(150) NOT NULL,
  email                    VARCHAR(255) NOT NULL UNIQUE,
  password_hash            VARCHAR(255) NOT NULL,
  role                     ENUM('student', 'admin') NOT NULL DEFAULT 'student',
  is_active                BOOLEAN NOT NULL DEFAULT TRUE,

  -- Profile fields (students only; NULL for admin accounts)
  phone                    VARCHAR(20)   NULL,
  college                  VARCHAR(200)  NULL,
  branch                   VARCHAR(100)  NULL,
  graduation_year          YEAR          NULL,
  cgpa                     DECIMAL(4,2)  NULL COMMENT 'Scale 0.00–10.00',
  linkedin_url             VARCHAR(300)  NULL,
  profile_photo_path       VARCHAR(500)  NULL COMMENT 'Relative path under /uploads for profile photo',
  resume_path              VARCHAR(500)  NULL COMMENT 'Relative path under /uploads for resume PDF',

  -- Profile completion gate flags
  profile_prompt_triggered BOOLEAN NOT NULL DEFAULT FALSE COMMENT 'Set TRUE after student completes their 3rd topic_adaptive test',
  is_profile_complete      BOOLEAN NOT NULL DEFAULT FALSE COMMENT 'Computed server-side: TRUE when required fields are non-NULL',

  created_at               TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at               TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  INDEX idx_email (email),
  INDEX idx_role  (role)
);

-- ============================================================
-- 2. Topics
-- ============================================================
CREATE TABLE IF NOT EXISTS topics (
  id          INT AUTO_INCREMENT PRIMARY KEY,
  name        VARCHAR(100) NOT NULL UNIQUE,
  description TEXT,
  is_active   BOOLEAN NOT NULL DEFAULT TRUE,
  created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================
-- 3. Questions
-- ============================================================
CREATE TABLE IF NOT EXISTS questions (
  id             INT AUTO_INCREMENT PRIMARY KEY,
  topic_id       INT          NOT NULL,
  question_text  TEXT         NOT NULL,
  option_a       VARCHAR(500) NOT NULL,
  option_b       VARCHAR(500) NOT NULL,
  option_c       VARCHAR(500) NOT NULL,
  option_d       VARCHAR(500) NOT NULL,
  correct_option ENUM('A','B','C','D') NOT NULL,
  difficulty     ENUM('Easy','Medium','Hard') NOT NULL,
  explanation    TEXT,
  question_hash  CHAR(64) NOT NULL COMMENT 'SHA-256 of LOWER(TRIM(question_text)) — duplicate detection key',
  is_active      BOOLEAN NOT NULL DEFAULT TRUE,
  created_at     TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  FOREIGN KEY (topic_id) REFERENCES topics(id) ON DELETE CASCADE,
  UNIQUE KEY uniq_topic_question (topic_id, question_hash),
  INDEX idx_topic_difficulty     (topic_id, difficulty)
);

-- ============================================================
-- 4. Company Tests
-- ============================================================
CREATE TABLE IF NOT EXISTS company_tests (
  id                 INT AUTO_INCREMENT PRIMARY KEY,
  company_name       VARCHAR(100) NOT NULL,
  time_limit_minutes INT NOT NULL,
  question_count     INT NOT NULL,
  easy_count         INT NOT NULL DEFAULT 0,
  medium_count       INT NOT NULL DEFAULT 0,
  hard_count         INT NOT NULL DEFAULT 0,
  is_active          BOOLEAN NOT NULL DEFAULT TRUE,
  created_at         TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================
-- 5. Tests
-- ============================================================
CREATE TABLE IF NOT EXISTS tests (
  id              INT AUTO_INCREMENT PRIMARY KEY,
  user_id         INT NOT NULL,
  test_type       ENUM('topic_adaptive', 'full_adaptive', 'company') NOT NULL COMMENT 'All student-facing tests are adaptive',
  topic_id        INT NULL COMMENT 'Scopes topic_adaptive sessions; NULL for full_adaptive/company',
  company_test_id INT NULL COMMENT 'Set only when test_type = company',
  status          ENUM('in_progress','completed','abandoned') NOT NULL DEFAULT 'in_progress',
  started_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  expires_at      TIMESTAMP NULL COMMENT 'Server-side auto-submit deadline for timed company sessions; NULL for adaptive tests',
  completed_at    TIMESTAMP NULL,

  FOREIGN KEY (user_id)         REFERENCES users(id)         ON DELETE CASCADE,
  FOREIGN KEY (topic_id)        REFERENCES topics(id)        ON DELETE SET NULL,
  FOREIGN KEY (company_test_id) REFERENCES company_tests(id) ON DELETE SET NULL,
  INDEX idx_user_type  (user_id, test_type),
  INDEX idx_user_topic (user_id, topic_id)
);

-- ============================================================
-- 6. Test Questions
-- ============================================================
CREATE TABLE IF NOT EXISTS test_questions (
  id                 INT AUTO_INCREMENT PRIMARY KEY,
  test_id            INT NOT NULL,
  question_id        INT NOT NULL,
  sequence_number    INT NOT NULL,
  difficulty_at_time ENUM('Easy','Medium','Hard') NOT NULL,

  FOREIGN KEY (test_id)     REFERENCES tests(id)     ON DELETE CASCADE,
  FOREIGN KEY (question_id) REFERENCES questions(id) ON DELETE CASCADE,
  UNIQUE KEY uniq_test_question (test_id, question_id),
  INDEX idx_test_sequence       (test_id, sequence_number)
);

-- ============================================================
-- 7. User Answers
-- ============================================================
CREATE TABLE IF NOT EXISTS user_answers (
  id                    INT AUTO_INCREMENT PRIMARY KEY,
  test_id               INT NOT NULL,
  question_id           INT NOT NULL,
  user_id               INT NOT NULL,
  selected_option       ENUM('A','B','C','D') NULL COMMENT 'NULL if timed-out / skipped',
  is_correct            BOOLEAN NOT NULL,
  response_time_seconds DECIMAL(6,2) NOT NULL,
  answered_at           TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  FOREIGN KEY (test_id)     REFERENCES tests(id)     ON DELETE CASCADE,
  FOREIGN KEY (question_id) REFERENCES questions(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id)     REFERENCES users(id)     ON DELETE CASCADE,
  INDEX idx_user_question (user_id, question_id),
  INDEX idx_test          (test_id)
);

-- ============================================================
-- 8. Performance (denormalized per-user-per-topic aggregate)
-- ============================================================
CREATE TABLE IF NOT EXISTS performance (
  id                INT AUTO_INCREMENT PRIMARY KEY,
  user_id           INT NOT NULL,
  topic_id          INT NOT NULL,
  total_attempted   INT NOT NULL DEFAULT 0,
  total_correct     INT NOT NULL DEFAULT 0,
  avg_response_time DECIMAL(6,2) NOT NULL DEFAULT 0,
  accuracy_percent  DECIMAL(5,2) NOT NULL DEFAULT 0,
  last_updated      TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  FOREIGN KEY (user_id)  REFERENCES users(id)  ON DELETE CASCADE,
  FOREIGN KEY (topic_id) REFERENCES topics(id) ON DELETE CASCADE,
  UNIQUE KEY uniq_user_topic (user_id, topic_id)
);

-- ============================================================
-- 9. Placement Score
-- ============================================================
CREATE TABLE IF NOT EXISTS placement_score (
  id                           INT AUTO_INCREMENT PRIMARY KEY,
  user_id                      INT NOT NULL,
  score                        DECIMAL(5,2) NOT NULL COMMENT 'Composite 0–100 score',
  accuracy_component           DECIMAL(5,2) NOT NULL COMMENT '60% weight — correct % across all full_adaptive attempts',
  speed_component              DECIMAL(5,2) NOT NULL COMMENT '20% weight — normalized response time score',
  difficulty_mastery_component DECIMAL(5,2) NOT NULL COMMENT '20% weight — % of Hard questions answered correctly',
  calculated_at                TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_user_time (user_id, calculated_at)
);

-- ============================================================
-- 10. Company Questions
-- ============================================================
CREATE TABLE IF NOT EXISTS company_questions (
  id              INT AUTO_INCREMENT PRIMARY KEY,
  company_test_id INT NOT NULL,
  question_id     INT NOT NULL,

  FOREIGN KEY (company_test_id) REFERENCES company_tests(id) ON DELETE CASCADE,
  FOREIGN KEY (question_id)     REFERENCES questions(id)     ON DELETE CASCADE,
  UNIQUE KEY uniq_company_question (company_test_id, question_id)
);

-- ============================================================
-- 11. Recommendations
-- ============================================================
CREATE TABLE IF NOT EXISTS recommendations (
  id                  INT AUTO_INCREMENT PRIMARY KEY,
  user_id             INT NOT NULL,
  topic_id            INT NULL,
  message             VARCHAR(255) NOT NULL,
  recommendation_type ENUM('weak_topic','strong_topic','difficulty_suggestion','revision') NOT NULL,
  is_dismissed        BOOLEAN NOT NULL DEFAULT FALSE,
  created_at          TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  FOREIGN KEY (user_id)  REFERENCES users(id)  ON DELETE CASCADE,
  FOREIGN KEY (topic_id) REFERENCES topics(id) ON DELETE SET NULL,
  INDEX idx_user (user_id)
);

-- ============================================================
-- 12. Activity Logs
-- ============================================================
CREATE TABLE IF NOT EXISTS activity_logs (
  id          INT AUTO_INCREMENT PRIMARY KEY,
  user_id     INT NULL COMMENT 'NULL for system-level events',
  action_type VARCHAR(100) NOT NULL,
  details     JSON NULL COMMENT 'Arbitrary structured context',
  created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
  INDEX idx_user_action (user_id, action_type),
  INDEX idx_created     (created_at)
);

SET FOREIGN_KEY_CHECKS = 1;
