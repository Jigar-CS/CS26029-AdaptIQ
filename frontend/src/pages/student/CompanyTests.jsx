import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import DashboardLayout from '../../components/layout/DashboardLayout';
import Topbar from '../../components/layout/Topbar';
import { STUDENT_NAV } from '../../components/layout/navConfig';
import companyTestService from '../../services/companyTestService';
import placementScoreService from '../../services/placementScoreService';
import {
  IconTrophy, IconLock, IconUnlock, IconClock, IconAssignments,
  IconArrowRight, IconAlert, IconCheck, IconTarget,
} from '../../components/icons/Icon';
import styles from './CompanyTests.module.css';

/**
 * This portal offers a single, company-level standard mock test —
 * not separate tests per company (no TCS/Infosys/Amazon-specific suites).
 * Unlock rule: >= 5 completed Miscellaneous (full_adaptive) tests AND placement score >= 80.
 *
 * Unlock state and messaging come from the server, which owns the gate.
 */
const CompanyTests = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [testInfo, setTestInfo] = useState(null);
  const [scoreInfo, setScoreInfo] = useState(null);
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const data = await companyTestService.getStandardTest();
        setTestInfo(data);
      } catch {
        // fall back to placement score endpoint if company-tests isn't reachable
      }
      try {
        const score = await placementScoreService.getLatest();
        setScoreInfo(score);
      } catch {
        setScoreInfo(null);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const testsRequired = testInfo?.required_misc_tests ?? 5;
  const scoreRequired = testInfo?.required_placement_score ?? 80;

  const miscCompleted = testInfo?.misc_tests_completed ?? scoreInfo?.misc_tests_completed ?? 0;
  const placementScore = testInfo?.placement_score ?? scoreInfo?.score ?? 0;

  const testsMet = miscCompleted >= testsRequired;
  const scoreMet = placementScore >= scoreRequired;

  // Server decides; the local computation is only a fallback when the
  // company-tests endpoint couldn't be reached.
  const unlocked = testInfo
    ? testInfo.locked === false
    : testsMet && scoreMet;

  const hasActiveSession = testInfo?.has_active_session === true;

  const testsPct = Math.min(100, Math.round((miscCompleted / testsRequired) * 100));
  const scorePct = Math.min(100, Math.round((placementScore / scoreRequired) * 100));

  // Prefer the server's message so client and server never disagree
  const lockMessage = testInfo?.unlock_message
    || (!testsMet
      ? `Complete at least ${testsRequired} Miscellaneous tests to unlock Company Mock Tests (${miscCompleted}/${testsRequired} done).`
      : `Your score is ${Math.round(placementScore)}/100. Reach ${scoreRequired} to unlock.`);

  const handleStart = async () => {
    const testId = testInfo?.id || testInfo?.company_test_id || 'standard';
    setStarting(true);
    setError('');
    try {
      await companyTestService.start(testId);
      navigate('/company-tests/take', { state: { testId } });
    } catch (err) {
      setError(err.response?.data?.error?.message || 'This test is still locked.');
    } finally {
      setStarting(false);
    }
  };

  return (
    <DashboardLayout navItems={STUDENT_NAV} subtitle="EdTech SaaS">
      <Topbar
        title="Company Mock Hub"
        subtitle="Prepare for top-tier placements. Complete prerequisites to unlock the standard company-level mock test."
        searchPlaceholder="Search…"
      />

      {loading ? (
        <div className="text-muted">Loading eligibility…</div>
      ) : (
        <>
          {/* Eligibility Status */}
          <div className={styles.eligibilityCard}>
            <div className={styles.eligibilityLeft}>
              <div className={styles.eligibilityIcon}><IconTrophy width={22} height={22} /></div>
              <div>
                <div className={styles.eligibilityTitle}>Eligibility Status</div>
                <div className={styles.eligibilitySub}>Both requirements must be met to unlock.</div>
              </div>
            </div>

            <div className={styles.eligibilityStats}>
              <div className={styles.statBlock}>
                <div className={styles.statLabelRow}>
                  <span>{testsMet && <IconCheck width={12} height={12} />} Tests Complete</span>
                  <span>{miscCompleted}/{testsRequired}</span>
                </div>
                <div className="progress-track"><div className="progress-fill" style={{ width: `${testsPct}%` }} /></div>
              </div>
              <div className={styles.statBlock}>
                <div className={styles.statLabelRow}>
                  <span>{scoreMet && <IconCheck width={12} height={12} />} Aptitude Score</span>
                  <span>{Math.round(placementScore)}/{scoreRequired}</span>
                </div>
                <div className="progress-track"><div className={`progress-fill ${scoreMet ? '' : 'warning'}`} style={{ width: `${scorePct}%` }} /></div>
              </div>
            </div>
          </div>

          {/* Section 1 — Miscellaneous Test (always available) */}
          <h2 className={styles.sectionHeading}>
            <IconTarget width={16} height={16} /> Miscellaneous Test
            <span className="badge badge-primary" style={{ marginLeft: 10 }}>Always available</span>
          </h2>
          <div className={styles.miscCard}>
            <div className={styles.miscIcon}><IconAssignments width={22} height={22} /></div>
            <div className={styles.miscBody}>
              <div className={styles.miscTitle}>Adaptive Miscellaneous Assessment</div>
              <p className={styles.miscDesc}>
                Cross-topic adaptive test that feeds your Placement Readiness Score. This is the only
                test type that counts toward unlocking the company mock below.
              </p>
              {!testsMet && (
                <div className={styles.miscHint}>
                  {testsRequired - miscCompleted} more needed to satisfy the test-count requirement.
                </div>
              )}
            </div>
            <button className="btn btn-primary" onClick={() => navigate('/adaptive')}>
              Start Test <IconArrowRight width={15} height={15} />
            </button>
          </div>

          {/* Section 2 — Company Mock Test (gated) */}
          <h2 className={styles.sectionHeading}>
            <IconTrophy width={16} height={16} /> Company Mock Test
            <span className={`badge ${unlocked ? 'badge-primary' : 'badge-neutral'}`} style={{ marginLeft: 10 }}>
              {unlocked ? 'Unlocked' : 'Locked'}
            </span>
          </h2>

          <div className={`${styles.mainCard} ${unlocked ? styles.unlocked : ''}`}>
            <div className={styles.mainIcon}>
              {unlocked ? <IconUnlock width={28} height={28} /> : <IconLock width={28} height={28} />}
            </div>

            <div className={styles.mainBody}>
              <div className={styles.mainTop}>
                <span className={styles.mainTitle}>
                  {testInfo?.company_name || 'Standard Company Mock Test'}
                </span>
                {hasActiveSession && <span className="badge badge-neutral">In progress</span>}
              </div>
              <p className={styles.mainDesc}>
                A single, company-level standard placement assessment — fixed question set spanning aptitude, logical
                reasoning, and technical fundamentals, timed and auto-submitted like a real recruitment test.
              </p>

              <div className={styles.metaRow}>
                <div className={styles.metaItem}>
                  <IconClock width={15} height={15} /> {testInfo?.time_limit_minutes || 60} min time limit
                </div>
                <div className={styles.metaItem}>
                  <IconAssignments width={15} height={15} /> {testInfo?.question_count || 30} questions
                </div>
                {unlocked && (
                  <div className={styles.metaItem}>
                    <IconAlert width={15} height={15} /> Auto-submits when time runs out
                  </div>
                )}
              </div>

              {!unlocked && (
                <div className={styles.lockRequirement}>
                  <IconAlert width={14} height={14} />
                  {lockMessage}
                </div>
              )}

              {/* Near-threshold students see the full breakdown, not just a locked message */}
              {!unlocked && testsMet && testInfo?.breakdown && (
                <div className={styles.breakdownBox}>
                  <div className={styles.breakdownTitle}>Where your score stands</div>
                  <div className={styles.breakdownRow}>
                    <span>Accuracy (60% weight)</span>
                    <span>{Math.round(testInfo.breakdown.accuracy_component)}%</span>
                  </div>
                  <div className={styles.breakdownRow}>
                    <span>Speed (20% weight)</span>
                    <span>{Math.round(testInfo.breakdown.speed_component)}%</span>
                  </div>
                  <div className={styles.breakdownRow}>
                    <span>Difficulty mastery (20% weight)</span>
                    <span>{Math.round(testInfo.breakdown.difficulty_mastery_component)}%</span>
                  </div>
                </div>
              )}

              {error && <div className="error-text">{error}</div>}

              <div>
                <button className="btn btn-primary" disabled={!unlocked || starting} onClick={handleStart}>
                  {starting
                    ? 'Starting…'
                    : hasActiveSession
                      ? 'Resume Mock Test'
                      : 'Start Mock Test'}
                  <IconArrowRight width={15} height={15} />
                </button>
                {!unlocked && (
                  <button className="btn btn-outline" style={{ marginLeft: 12 }} onClick={() => navigate('/adaptive')}>
                    Take a Miscellaneous Test
                  </button>
                )}
              </div>
            </div>
          </div>
        </>
      )}
    </DashboardLayout>
  );
};

export default CompanyTests;
