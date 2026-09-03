import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import DashboardLayout from '../../components/layout/DashboardLayout';
import Topbar from '../../components/layout/Topbar';
import { STUDENT_NAV } from '../../components/layout/navConfig';
import ProgressRing from '../../components/common/ProgressRing';
import { IconCheck, IconArrowRight, IconAlert, IconClock } from '../../components/icons/Icon';
import styles from './CompanyTestResult.module.css';

const OPTION_KEYS = ['A', 'B', 'C', 'D'];

const CompanyTestResult = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const result = location.state?.result;
  const [reviewFilter, setReviewFilter] = useState('all');

  if (!result) {
    return (
      <DashboardLayout navItems={STUDENT_NAV} subtitle="EdTech SaaS">
        <Topbar title="Test Result" showSearch={false} />
        <div className="card text-center" style={{ padding: 40 }}>
          <p className="text-muted">No recent result found.</p>
          <button className="btn btn-primary mt-4" onClick={() => navigate('/company-tests')}>Back to Company Mock Hub</button>
        </div>
      </DashboardLayout>
    );
  }

  const {
    score = 0,
    total_questions = 0,
    correct_count = 0,
    answered_count = 0,
    unanswered_count = 0,
    section_breakdown = [],
    review = [],
    auto_submitted = false,
    company_name,
  } = result;

  const incorrectCount = Math.max(0, answered_count - correct_count);

  const filteredReview = review.filter((r) => {
    if (reviewFilter === 'incorrect') return r.was_answered && !r.is_correct;
    if (reviewFilter === 'correct') return r.is_correct;
    if (reviewFilter === 'skipped') return !r.was_answered;
    return true;
  });

  const filters = [
    { key: 'all', label: `All (${review.length})` },
    { key: 'correct', label: `Correct (${correct_count})` },
    { key: 'incorrect', label: `Incorrect (${incorrectCount})` },
    { key: 'skipped', label: `Skipped (${unanswered_count})` },
  ];

  return (
    <DashboardLayout navItems={STUDENT_NAV} subtitle="EdTech SaaS">
      <Topbar
        title="Mock Test Result"
        subtitle={company_name ? `${company_name} — completed.` : 'Standard company-level assessment — completed.'}
        showSearch={false}
      />

      {auto_submitted && (
        <div className={styles.autoSubmitBanner}>
          <IconClock width={15} height={15} />
          Time ran out — this test was auto-submitted by the server. Unanswered questions were marked incorrect.
        </div>
      )}

      {/* Score summary */}
      <div className={styles.summaryCard}>
        <ProgressRing value={score} size={150} strokeWidth={12} />
        <div className={styles.summaryInfo}>
          <div className={styles.summaryTitle}>Final Score</div>
          <p className={styles.summarySub}>
            {correct_count} of {total_questions} questions correct
          </p>
          <div className={styles.statGrid}>
            <div className={styles.statItem}>
              <span className={styles.statValue}>{correct_count}</span>
              <span className={styles.statLabel}>Correct</span>
            </div>
            <div className={styles.statItem}>
              <span className={`${styles.statValue} ${styles.danger}`}>{incorrectCount}</span>
              <span className={styles.statLabel}>Incorrect</span>
            </div>
            <div className={styles.statItem}>
              <span className={`${styles.statValue} ${styles.muted}`}>{unanswered_count}</span>
              <span className={styles.statLabel}>Skipped</span>
            </div>
            <div className={styles.statItem}>
              <span className={styles.statValue}>{answered_count}</span>
              <span className={styles.statLabel}>Attempted</span>
            </div>
          </div>
          <p className={styles.scoreNote}>
            Company mock results are recorded separately and do not change your Placement Readiness Score.
          </p>
        </div>
      </div>

      {/* Section-wise breakdown */}
      {section_breakdown.length > 0 && (
        <div className={styles.card}>
          <h3 className={styles.cardTitle}>Section-wise Breakdown</h3>
          {section_breakdown.map((s) => {
            const pct = Math.round(s.accuracy);
            const cls = pct >= 70 ? '' : pct >= 40 ? 'warning' : 'danger';
            return (
              <div key={s.section} className={styles.sectionRow}>
                <div className={styles.sectionLabelRow}>
                  <span className="text-muted">{s.section}</span>
                  <span>
                    {pct}%
                    {s.total !== undefined && (
                      <span className={styles.sectionCount}> ({s.correct}/{s.total})</span>
                    )}
                  </span>
                </div>
                <div className="progress-track">
                  <div className={`progress-fill ${cls}`} style={{ width: `${pct}%` }} />
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Per-question review */}
      {review.length > 0 && (
        <div className={styles.card}>
          <div className={styles.reviewHeader}>
            <h3 className={styles.cardTitle} style={{ marginBottom: 0 }}>Answer Review</h3>
            <div className={styles.filterRow}>
              {filters.map((f) => (
                <button
                  key={f.key}
                  type="button"
                  className={`${styles.filterBtn} ${reviewFilter === f.key ? styles.filterActive : ''}`}
                  onClick={() => setReviewFilter(f.key)}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>

          {filteredReview.length === 0 ? (
            <p className="text-muted text-sm">Nothing in this category.</p>
          ) : (
            filteredReview.map((r) => {
              const stateClass = !r.was_answered
                ? styles.skipped
                : r.is_correct
                  ? styles.correct
                  : styles.incorrect;
              const stateLabel = !r.was_answered ? 'Skipped' : r.is_correct ? 'Correct' : 'Incorrect';

              return (
                <div key={r.question_id} className={`${styles.reviewItem} ${stateClass}`}>
                  <div className={styles.reviewTop}>
                    <span className={styles.reviewNum}>Q{r.sequence_number}</span>
                    <span className={styles.reviewMeta}>
                      {r.topic_name} · {r.difficulty}
                    </span>
                    <span className={`${styles.reviewState} ${stateClass}`}>
                      {r.is_correct && <IconCheck width={12} height={12} />}
                      {!r.was_answered && <IconAlert width={12} height={12} />}
                      {stateLabel}
                    </span>
                  </div>

                  <div className={styles.reviewQuestion}>{r.question_text}</div>

                  <div className={styles.reviewOptions}>
                    {OPTION_KEYS.map((key) => {
                      const text = r[`option_${key.toLowerCase()}`];
                      if (text === undefined || text === null) return null;
                      const isCorrectOpt = r.correct_option === key;
                      const isChosen = r.selected_option === key;
                      const optClasses = [styles.reviewOption];
                      if (isCorrectOpt) optClasses.push(styles.optCorrect);
                      if (isChosen && !isCorrectOpt) optClasses.push(styles.optWrong);
                      return (
                        <div key={key} className={optClasses.join(' ')}>
                          <span className={styles.optLetter}>{key}</span>
                          <span className={styles.optText}>{text}</span>
                          {isCorrectOpt && <span className={styles.optTag}>Correct</span>}
                          {isChosen && !isCorrectOpt && <span className={styles.optTag}>Your answer</span>}
                        </div>
                      );
                    })}
                  </div>

                  {r.explanation && (
                    <div className={styles.explanation}>
                      <strong>Explanation:</strong> {r.explanation}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      )}

      <div className={styles.actions}>
        <button className="btn btn-outline" onClick={() => navigate('/performance')}>View Full Analytics</button>
        <button className="btn btn-outline" onClick={() => navigate('/company-tests')}>Company Mock Hub</button>
        <button className="btn btn-primary" onClick={() => navigate('/dashboard')}>
          Back to Dashboard <IconArrowRight width={15} height={15} />
        </button>
      </div>
    </DashboardLayout>
  );
};

export default CompanyTestResult;
