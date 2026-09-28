# CLIAS — Proctoring & Assessment Integrity System Specification

## 1. Product Philosophy: AI-Assisted Integrity Monitoring
CLIAS explicitly treats automated proctoring as **AI-assisted integrity monitoring**, not "100% unhackable cheat prevention".

The goal is to provide faculty and invigilators with an objective, auditable timeline of anomalous behavioral events, avoiding false accusations through human review.

---

## 2. On-Demand Face Enrollment Lifecycle
Face biometric enrollment is **never** forced during initial university onboarding. It is triggered only upon enrollment into a student's first proctored institutional exam:

1. **Student Registers & Practices**: Normal credentials, no biometric friction.
2. **Proctored Exam Scheduled**: System prompts student 24 hours prior: "Identity Verification Required".
3. **Informed Consent**: Student explicitly agrees to camera analysis for test integrity.
4. **Liveness & Angle Enrollment**:
   - Pose 1: Center neutral gaze
   - Pose 2: Subtle left yaw
   - Pose 3: Subtle right yaw
   - Pose 4: Blink action for liveness verification
5. **Feature Vector Extraction**: Generate a 128-d or 512-d facial embedding (FaceNet/ArcFace). Never store raw video archives indefinitely.

---

## 3. Proctoring Event Log Hierarchy
During a proctored session, client and AI edge workers emit structured events:

- `TAB_SWITCH`: Browser lost focus to another application.
- `WINDOW_BLUR`: Window minimized or screen area obscured.
- `FULLSCREEN_EXIT`: Student exited locked fullscreen view.
- `NO_FACE`: No human face detected within bounding box for > 5 seconds.
- `MULTIPLE_FACES`: Secondary individuals detected in camera view.
- `IDENTITY_MISMATCH`: Face embedding deviates beyond Euclidean threshold from enrolled baseline.
- `CAMERA_DISABLED`: Video stream interrupted.

All events are stored with `timestamp`, `confidenceScore`, and optional 2-second thumbnail snapshot for faculty inspection.
