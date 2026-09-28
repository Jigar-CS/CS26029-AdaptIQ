# CLIAS — Project Overview

## 1. Executive Summary
**CLIAS** (CHARUSAT Learning Intelligence & Assessment System) is an AI-powered student learning intelligence, adaptive practice, assessment, analytics, and proctoring platform designed for modern higher education institutions.

Unlike conventional Learning Management Systems (LMS) that merely record static marks and test submissions, CLIAS continuously constructs and refines an evolving **Student Learning Profile / Knowledge Model**.

Every student practice interaction, attempt duration, hint request, and diagnostic result feeds a transparent, multi-dimensional knowledge graph answering four continuous questions:
1. **What has the student practiced?**
2. **What has the student actually learned?**
3. **Where is the student experiencing conceptual weaknesses?**
4. **What should the student learn or practice next to achieve mastery?**

---

## 2. Institutional Context & Independence
- **Configurable University Branding**: CLIAS uses dynamic branding environment variables (`UNIVERSITY_NAME`, `UNIVERSITY_EMAIL_DOMAIN`), enabling portability across diverse universities without code changes.
- **Zero Hard University Database Coupling**: Because access to internal ERP/SIS systems is often restricted, CLIAS implements an **Authorized Student Import Engine**. Admins/faculty upload authorized rosters via CSV, which serve as institutional identity anchors for student self-registration and automatic roster synchronization.

---

## 3. Core Architectural Principles
1. **Learning History Over Static Marks**: Attempt history is immutable. Mastery is dynamic and time-sensitive.
2. **Normalized Relational Spine**: High-frequency, multi-tenant academic hierarchies (Institute -> Department -> Program -> Course -> Topic -> Subtopic) ensure referential integrity.
3. **Multi-Role Intelligence**: Unified platform providing distinct, tailored experiences for Students, Faculty, Counsellors, Heads of Department (HOD), Academic Heads, and Super Administrators.
4. **Extensible AI Microservice**: Built with a dedicated Python FastAPI service running in parallel to handle future LLM assessment generation, misconception detection, and automated rubric grading.
