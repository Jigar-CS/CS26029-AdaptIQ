# CLIAS — Long-Term Development Roadmap

### Phase 1: Foundation (Current)
- Monorepo structure (`apps/web`, `apps/api`, `apps/ai`, `packages/shared-types`, `packages/config`).
- MySQL database schema with Prisma ORM.
- Development Email & OTP registration with domain validation (`charusat.edu.in`).
- Authorized Student CSV roster import with parsing error validation.
- Server-side Role-Based Access Control (RBAC) across 6 roles.
- Question bank architecture & Practice MVP (Single MCQ flow, instant validation, explanation).
- Dedicated `LearningAnalyticsService` with difficulty-weighted EWMA mastery and historical curve.
- Modern SaaS educational dashboard with dynamic Recharts curve and topic breakdowns.
- Role shells for Faculty, Counsellor, HOD, and Head.

---

### Phase 2: Learning Intelligence & Detailed Analytics
- Bayesian Knowledge Tracing (BKT) and Item Response Theory (IRT) benchmarking.
- Granular subtopic mastery hierarchies.
- Counsellor-student assignment engine and early intervention flags.
- Aggregated department heatmaps and student learning timelines.

---

### Phase 3: AI Socratic Learning Assistant
- Misconception taxonomy and distractor mapping.
- Explanatory AI chat for incorrect answers ("Explain more simply", "Show real-world example").
- Targeted remedial question generation and immediate re-assessment.

---

### Phase 4: Dynamic Adaptive Practice
- Real-time difficulty calibration based on current student mastery.
- Spaced repetition scheduling based on Ebbinghaus forgetting curves.
- Personalized learning path generation.

---

### Phase 5: Assessment & Exam Engine
- Faculty test creation wizard (timed tests, randomized question sequences).
- Class assignment and automated grading.
- Detailed assessment performance review.

---

### Phase 6: AI-Assisted Assessment Generation
- Prompt-based test generation by learning objectives and difficulty ratios.
- RAG-based ingestion of university lecture notes, PPTs, and PDFs.
- Faculty review, distractor modification, and approval staging pipeline.

---

### Phase 7: University Institutional Intelligence
- Multi-tier analytics: Division -> Semester -> Program -> Department -> Institute.
- At-risk student predictive dropout & failure models for counsellors.
- Outcome-Based Education (OBE) and NBA/NAAC Course Outcome (CO) / Program Outcome (PO) mapping.

---

### Phase 8: AI-Assisted Assessment Integrity (Proctoring)
- On-demand face biometric enrollment and liveness detection.
- Real-time anomaly detection (tab switch, window blur, multiple faces).
- Invigilator timeline review console.

---

### Phase 9: Career & Role Skill Readiness
- Standardized benchmarks (e.g. "Google-style SDE", "Amazon-style Backend", "Data Analyst", "GATE").
- Student Skill Gap radar profiles.
- Guided bridge pathways for placement readiness.
