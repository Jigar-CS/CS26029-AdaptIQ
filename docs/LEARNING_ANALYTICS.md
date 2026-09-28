# CLIAS — Learning Analytics & Knowledge Mastery Engine

## 1. Core Philosophy: Moving Beyond Marks
Conventional testing relies on raw scores (e.g. 18/20 = 90%). However, raw scores fail to capture:
- **Recency**: Did the student master the concept yesterday, or were they lucky 3 months ago?
- **Difficulty Distribution**: Did the student solve 10 trivial questions or 5 complex algorithmic puzzles?
- **Retention & Decay**: As time elapses without practice, mastery should reflect potential decay.

CLIAS implements a dynamic **Knowledge Model** that tracks topic mastery across every student attempt.

---

## 2. Phase-1 MVP Mastery Heuristic: EWMA Model

In Phase 1, topic mastery is calculated via an **Exponentially Weighted Moving Average (EWMA)** combined with **Question Difficulty Multipliers**.

### 2.1 Difficulty Weights
- $\text{DifficultyWeight}(\text{EASY}) = 1.0$
- $\text{DifficultyWeight}(\text{MEDIUM}) = 1.25$
- $\text{DifficultyWeight}(\text{HARD}) = 1.5$

### 2.2 Attempt Value Calculation
For a single attempt $i$ on question $Q$:
$$\text{AttemptValue}_i = \begin{cases} 
\min(1.0, 0.70 \times \text{DifficultyWeight}(Q)) & \text{if correct} \\
0.0 & \text{if incorrect}
\end{cases}$$

### 2.3 EWMA Update Rule
When attempt $t$ is recorded:
$$\text{Mastery}_t = (1 - \alpha) \cdot \text{Mastery}_{t-1} + \alpha \cdot (\text{AttemptValue}_t \times 100)$$
Where:
- $\alpha = 0.25$ (Smoothing factor: recent attempts have a 25% instantaneous impact, while past attempts decay smoothly).
- If $\text{Mastery}_{t-1}$ does not yet exist (first attempt), $\text{Mastery}_1 = \text{AttemptValue}_1 \times 100$.

### 2.4 Bounds & Normalization
$$\text{DisplayMastery} = \text{clamp}(\text{Mastery}_t, 0, 100)$$

---

## 3. Historical Curve Logging
Whenever mastery is recalculated, a snapshot is saved to `LearningHistory`:
- `studentId`
- `topicId`
- `masteryScore`
- `recordedAt`
- `reason` = `PRACTICE_ATTEMPT`

This enables rendering a true, chronological learning curve ($X = \text{timestamp}, Y = \text{mastery 0-100}$) rather than a flat count of questions solved.

---

## 4. Future Evolution (Phase 2 & 3)
In subsequent phases, this heuristic will be augmented and benchmarked against:
1. **Bayesian Knowledge Tracing (BKT)**: Parameters for $P(L_0)$ (prior), $P(T)$ (learning), $P(G)$ (guess), and $P(S)$ (slip).
2. **Item Response Theory (IRT)**: 2-parameter or 3-parameter logistic models factoring in item discrimination and pseudo-guessing.
3. **Deep Knowledge Tracing (DKT)**: LSTM / Transformer models forecasting next-question performance based on attempt sequence.
