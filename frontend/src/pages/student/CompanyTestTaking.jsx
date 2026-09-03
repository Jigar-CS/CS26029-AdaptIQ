import { useCallback, useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import companyTestService from '../../services/companyTestService';
import { IconClock, IconArrowRight, IconArrowLeft } from '../../components/icons/Icon';
import styles from './AdaptiveTest.module.css';
import own from './CompanyTestTaking.module.css';

const OPTION_KEYS = ['A', 'B', 'C', 'D'];

/**
 * Timed, fixed-question company mock test session (test_type = 'company').
 *
 * Difficulty never changes here. The countdown is seeded from the server's
 * `seconds_remaining` (not the full time limit) so reloading mid-test resumes
 * the real remaining time instead of handing back a fresh clock. The server
 * independently enforces the deadline, so a tampered client can't buy time.
 */
const CompanyTestTaking = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const testId = location.state?.testId;

  const [questions, setQuestions] = useState([]);
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState({});
  const [secondsLeft, setSecondsLeft] = useState(null);
  const [status, setStatus] = useState('loading');
  const [error, setError] = useState('');
  const [showExitModal, setShowExitModal] = useState(false);
  const [showSubmitModal, setShowSubmitModal] = useState(false);
  const submittingRef = useRef(false);

  useEffect(() => {
    if (!testId) {
      navigate('/company-tests');
      return;
    }
    const load = async () => {
      try {
        const data = await companyTestService.start(testId);
        setQuestions(data.questions || []);

        // Restore prior selections when resuming an in-progress session
        if (Array.isArray(data.saved_answers) && data.saved_answers.length > 0) {
          const restored = {};
          for (const a of data.saved_answers) {
            if (a.selected_option) restored[a.question_id] = a.selected_option;
          }
          setAnswers(restored);

          // Drop the student at the first unanswered question
          const firstUnanswered = (data.questions || []).findIndex((q) => !restored[q.id]);
          if (firstUnanswered > 0) setIndex(firstUnanswered);
        }

        // Prefer the server's remaining time; fall back to the full limit
        const remaining = typeof data.seconds_remaining === 'number'
          ? data.seconds_remaining
          : (data.time_limit_minutes || 60) * 60;
        setSecondsLeft(Math.max(0, Math.floor(remaining)));

        setStatus('active');
      } catch (err) {
        setError(err.response?.data?.error?.message || 'Unable to load this test.');
        setStatus('error');
      }
    };
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [testId]);

  const submitTest = useCallback(async () => {
    if (submittingRef.current) return;
    submittingRef.current = true;
    setShowSubmitModal(false);
    setStatus('submitting');
    try {
      const result = await companyTestService.complete(testId);
      navigate('/company-tests/result', { state: { result } });
    } catch (err) {
      setError(err.response?.data?.error?.message || 'Failed to submit the test.');
      setStatus('error');
      submittingRef.current = false;
    }
  }, [testId, navigate]);

  // Countdown — expiry auto-submits without asking for confirmation
  useEffect(() => {
    if (status !== 'active' || secondsLeft === null) return;
    if (secondsLeft <= 0) {
      submitTest();
      return;
    }
    const t = setTimeout(() => setSecondsLeft((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [secondsLeft, status, submitTest]);

  const formatTime = (s) => {
    const m = Math.floor(s / 60).toString().padStart(2, '0');
    const sec = (s % 60).toString().padStart(2, '0');
    return `${m}:${sec}`;
  };

  const handleSelect = async (key) => {
    const q = questions[index];
    setAnswers((prev) => ({ ...prev, [q.id]: key }));
    try {
      const res = await companyTestService.submitAnswer(testId, {
        question_id: q.id,
        selected_option: key,
      });
      // Resync the clock with the server on every answer so client drift
      // never accumulates over a long session
      if (typeof res?.seconds_remaining === 'number') {
        setSecondsLeft(Math.max(0, res.seconds_remaining));
      }
    } catch (err) {
      // Server rejected because time is already up — finalise immediately
      if (err.response?.data?.error?.code === 'TEST_EXPIRED') {
        submitTest();
      }
      // Other failures are non-blocking; the answer can be re-sent
    }
  };

  const answeredCount = Object.keys(answers).length;

  if (status === 'loading') {
    return (
      <div className={styles.page}>
        <div className={styles.frame}>
          <div className={styles.centerState}><p className="text-muted">Loading your mock test…</p></div>
        </div>
      </div>
    );
  }

  if (status === 'error') {
    return (
      <div className={styles.page}>
        <div className={styles.frame}>
          <div className={styles.centerState}>
            <p className="error-text">{error}</p>
            <button className="btn btn-outline mt-4" onClick={() => navigate('/company-tests')}>Back to Company Mock Hub</button>
          </div>
        </div>
      </div>
    );
  }

  const q = questions[index];
  if (!q) {
    return (
      <div className={styles.page}>
        <div className={styles.frame}>
          <div className={styles.centerState}><p className="text-muted">No questions configured for this test yet.</p></div>
        </div>
      </div>
    );
  }

  const selected = answers[q.id];
  const progress = Math.round(((index + 1) / questions.length) * 100);
  const unansweredCount = questions.length - answeredCount;
  const isLast = index + 1 === questions.length;

  return (
    <div className={styles.page}>
      <div className={styles.frame} style={{ borderColor: 'var(--color-primary-glow)', boxShadow: 'var(--shadow-glow-primary)' }}>
        <div className={styles.topRow}>
          <div className={styles.topBarLeft}>
            <button
              type="button"
              className={styles.backBtn}
              onClick={() => setShowExitModal(true)}
              title="Exit test session"
            >
              <IconArrowLeft width={14} height={14} />
              <span>Exit Test</span>
            </button>
            <div className={styles.timer} style={{ color: secondsLeft < 60 ? 'var(--color-danger)' : 'var(--color-text-muted)' }}>
              <IconClock width={15} height={15} /> {formatTime(secondsLeft)}
            </div>
          </div>

          <div className={styles.progressWrap}>
            <div className={styles.progressLabel}>QUESTION {index + 1} OF {questions.length}</div>
            <div className="progress-track"><div className="progress-fill" style={{ width: `${progress}%` }} /></div>
          </div>

          <span className="badge badge-primary">Company Test</span>
        </div>

        <div className={own.layout}>
          <div>
            <div className={styles.questionCard}>
              <h2 className={styles.questionTitle}>{q.question_text}</h2>
            </div>

            <div className={styles.optionsGrid}>
              {OPTION_KEYS.map((key) => {
                const optionText = q[`option_${key.toLowerCase()}`];
                if (optionText === undefined) return null;
                return (
                  <button
                    key={key}
                    type="button"
                    className={`${styles.optionCard} ${key === selected ? styles.selected : ''}`}
                    onClick={() => handleSelect(key)}
                  >
                    <span className={styles.optionLetter}>{key}</span>
                    <div className={styles.optionText}>{optionText}</div>
                  </button>
                );
              })}
            </div>

            <div className={styles.bottomBar}>
              <span className="text-sm text-muted">{answeredCount} of {questions.length} answered</span>
              <div className={own.navActions}>
                <button
                  className="btn btn-outline"
                  onClick={() => setIndex((i) => Math.max(0, i - 1))}
                  disabled={index === 0}
                >
                  <IconArrowLeft width={15} height={15} /> Previous
                </button>
                {isLast ? (
                  <button
                    className="btn btn-primary"
                    onClick={() => setShowSubmitModal(true)}
                    disabled={status === 'submitting'}
                  >
                    {status === 'submitting' ? 'Submitting…' : 'Submit Test'}
                  </button>
                ) : (
                  <button className="btn btn-primary" onClick={() => setIndex((i) => i + 1)}>
                    Next <IconArrowRight width={15} height={15} />
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Question navigator — jump freely, unlike the adaptive flow */}
          <aside className={own.navigator}>
            <div className={own.navigatorTitle}>Questions</div>
            <div className={own.navGrid}>
              {questions.map((question, i) => {
                const classes = [own.navCell];
                if (answers[question.id]) classes.push(own.answered);
                if (i === index) classes.push(own.current);
                return (
                  <button
                    key={question.id}
                    type="button"
                    className={classes.join(' ')}
                    onClick={() => setIndex(i)}
                    title={answers[question.id] ? `Answered: ${answers[question.id]}` : 'Not answered'}
                  >
                    {i + 1}
                  </button>
                );
              })}
            </div>
            <div className={own.navLegend}>
              <div className={own.legendRow}>
                <span className={`${own.legendSwatch} ${own.answered}`} /> Answered
              </div>
              <div className={own.legendRow}>
                <span className={own.legendSwatch} /> Not answered
              </div>
              <div className={own.legendRow}>
                <span className={`${own.legendSwatch} ${own.current}`} /> Current
              </div>
            </div>
            <button
              className="btn btn-primary btn-sm"
              style={{ width: '100%', marginTop: 16 }}
              onClick={() => setShowSubmitModal(true)}
              disabled={status === 'submitting'}
            >
              Submit Test
            </button>
          </aside>
        </div>
      </div>

      {/* Submit confirmation */}
      {showSubmitModal && (
        <div className={styles.modalOverlay} onClick={() => setShowSubmitModal(false)}>
          <div className={styles.modalCard} onClick={(e) => e.stopPropagation()}>
            <h3 className={styles.modalTitle}>Submit your test?</h3>
            <p className={styles.modalText}>
              Once submitted you cannot return to this session.
            </p>
            <div className={own.confirmSummary}>
              <div className={own.confirmRow}><span>Total questions</span><span>{questions.length}</span></div>
              <div className={own.confirmRow}><span>Answered</span><span>{answeredCount}</span></div>
              <div className={own.confirmRow}><span>Unanswered</span><span>{unansweredCount}</span></div>
              <div className={own.confirmRow}><span>Time remaining</span><span>{formatTime(secondsLeft)}</span></div>
            </div>
            {unansweredCount > 0 && (
              <div className={own.confirmWarn}>
                {unansweredCount} unanswered {unansweredCount === 1 ? 'question' : 'questions'} will be marked incorrect.
              </div>
            )}
            <div className={styles.modalActions}>
              <button
                type="button"
                className="btn btn-outline btn-sm"
                onClick={() => setShowSubmitModal(false)}
              >
                Keep Working
              </button>
              <button
                type="button"
                className="btn btn-primary btn-sm"
                onClick={submitTest}
                disabled={status === 'submitting'}
              >
                {status === 'submitting' ? 'Submitting…' : 'Submit Now'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Exit confirmation */}
      {showExitModal && (
        <div className={styles.modalOverlay} onClick={() => setShowExitModal(false)}>
          <div className={styles.modalCard} onClick={(e) => e.stopPropagation()}>
            <h3 className={styles.modalTitle}>Exit Company Mock Test?</h3>
            <p className={styles.modalText}>
              Your answers so far are saved and the timer keeps running on the server. You can resume
              from the Company Mock Hub, but the test will auto-submit when time runs out.
            </p>
            <div className={styles.modalActions}>
              <button
                type="button"
                className="btn btn-outline btn-sm"
                onClick={() => setShowExitModal(false)}
              >
                Resume Test
              </button>
              <button
                type="button"
                className="btn btn-danger btn-sm"
                onClick={() => navigate('/company-tests')}
              >
                Exit to Company Tests
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CompanyTestTaking;
