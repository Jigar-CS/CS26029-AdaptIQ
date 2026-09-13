import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import DashboardLayout from '../../components/layout/DashboardLayout';
import Topbar from '../../components/layout/Topbar';
import { STUDENT_NAV } from '../../components/layout/navConfig';
import companyTestService from '../../services/companyTestService';
import placementScoreService from '../../services/placementScoreService';
import {
  IconTrophy, IconLock, IconUnlock, IconClock, IconAssignments,
  IconArrowRight, IconAlert,
} from '../../components/icons/Icon';
import styles from './CompanyTests.module.css';

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
        // fallback
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
  const placementScore = Math.round(testInfo?.placement_score ?? scoreInfo?.score ?? 0);

  const testsMet = miscCompleted >= testsRequired;
  const scoreMet = placementScore >= scoreRequired;
  const unlocked = testInfo ? testInfo.locked === false : (testsMet && scoreMet);
  const hasActiveSession = testInfo?.has_active_session === true;

  const testsPct = Math.min(100, Math.round((miscCompleted / testsRequired) * 100));
  const scorePct = Math.min(100, Math.round((placementScore / 100) * 100));

  const lockMessage = testInfo?.unlock_message || (
    miscCompleted < testsRequired
      ? `Complete at least ${testsRequired} Miscellaneous tests to unlock (${miscCompleted}/${testsRequired} done).`
      : `Your score is ${placementScore}/100. Reach ${scoreRequired} to unlock.`
  );

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
    <DashboardLayout navItems={STUDENT_NAV} subtitle="EDTECH SAAS">
      <Topbar
        title="Company Mock Hub"
        subtitle="Prepare for top-tier placements. Complete prerequisites to unlock the standard company-level mock test."
        showSearch={true}
        showTargetBadge={false}
      />

      <div className={styles.container}>
        {loading ? (
          <div className={styles.loadingNotice}>Loading eligibility status…</div>
        ) : (
          <div className={styles.contentStack}>
            {/* Top Card: Eligibility Status */}
            <div className={styles.eligibilityCard}>
              <div className={styles.eligibilityHeader}>
                <div className={styles.trophyIconBox}>
                  <IconTrophy width={22} height={22} />
                </div>
                <div>
                  <h3 className={styles.eligibilityTitle}>Eligibility Status</h3>
                  <p className={styles.eligibilitySub}>Unlock requirements for the standard mock test.</p>
                </div>
              </div>

              <div className={styles.eligibilityBars}>
                <div className={styles.statProgressItem}>
                  <div className={styles.statLabelRow}>
                    <span>Tests Complete</span>
                    <span className={styles.statCount}>{miscCompleted}/{testsRequired}</span>
                  </div>
                  <div className={styles.progressTrack}>
                    <div className={styles.progressFill} style={{ width: `${testsPct}%` }} />
                  </div>
                </div>

                <div className={styles.statProgressItem}>
                  <div className={styles.statLabelRow}>
                    <span>Aptitude Score</span>
                    <span className={styles.statCount}>{placementScore}/100</span>
                  </div>
                  <div className={styles.progressTrack}>
                    <div className={styles.progressFill} style={{ width: `${scorePct}%` }} />
                  </div>
                </div>
              </div>
            </div>

            {/* Main Card: Standard Company Mock Test */}
            <div className={styles.mainCard}>
              <div className={styles.cardHeaderRow}>
                <div className={styles.mainIconBox}>
                  {unlocked ? <IconUnlock width={24} height={24} /> : <IconLock width={24} height={24} />}
                </div>
                <div className={styles.mainTitleArea}>
                  <div className={styles.titleWithBadge}>
                    <h2 className={styles.mainTitle}>
                      {testInfo?.company_name || 'Standard Company Mock Test'}
                    </h2>
                    <span className={styles.statusBadge}>
                      {unlocked ? 'Unlocked' : 'Locked'}
                    </span>
                  </div>
                  <p className={styles.mainDesc}>
                    A single, company-level standard placement assessment — fixed question set spanning aptitude, logical reasoning, and technical fundamentals, timed and auto-submitted like a real recruitment test.
                  </p>
                </div>
              </div>

              {/* Meta Info: 60 min, 30 questions */}
              <div className={styles.metaRow}>
                <div className={styles.metaItem}>
                  <IconClock width={16} height={16} />
                  <span>{testInfo?.time_limit_minutes || 60} min time limit</span>
                </div>
                <div className={styles.metaItem}>
                  <IconAssignments width={16} height={16} />
                  <span>{testInfo?.question_count || 30} questions</span>
                </div>
              </div>

              {/* Warning/Prerequisite Alert if locked */}
              {!unlocked && (
                <div className={styles.alertBox}>
                  <IconAlert width={16} height={16} />
                  <span>{lockMessage}</span>
                </div>
              )}

              {error && <div className={styles.errorText}>{error}</div>}

              {/* Dual Action Buttons */}
              <div className={styles.actionRow}>
                <button
                  className={styles.primaryBtn}
                  disabled={!unlocked || starting}
                  onClick={handleStart}
                >
                  <span>
                    {starting
                      ? 'Starting…'
                      : hasActiveSession
                      ? 'Resume Mock Test'
                      : 'Start Mock Test'}
                  </span>
                  <IconArrowRight width={14} height={14} />
                </button>

                <button
                  className={styles.secondaryBtn}
                  onClick={() => navigate('/misc-test')}
                >
                  Take a Miscellaneous Test
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

export default CompanyTests;
