import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import DashboardLayout from '../../components/layout/DashboardLayout';
import { STUDENT_NAV } from '../../components/layout/navConfig';
import ProgressRing from '../../components/common/ProgressRing';
import profileService from '../../services/profileService';
import placementScoreService from '../../services/placementScoreService';
import { IconTarget, IconTrophy, IconSpark, IconCourses, IconAssignments, IconLock, IconArrowRight } from '../../components/icons/Icon';
import styles from './Dashboard.module.css';

const Dashboard = () => {
  const navigate = useNavigate();
  const [prompted, setPrompted] = useState(false);
  const [profileComplete, setProfileComplete] = useState(true);
  const [firstName, setFirstName] = useState('');

  const [score, setScore] = useState(null); // { score, accuracy_component, speed_component, difficulty_mastery_component, misc_tests_completed }
  const [globalRank, setGlobalRank] = useState(null);
  const [streak, setStreak] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const profile = await profileService.getProfile();
        setPrompted(!!profile.profile_prompt_triggered);
        setProfileComplete(!!profile.is_profile_complete);
        setFirstName((profile.name || '').split(' ')[0]);
      } catch {
        // profile not available yet — non-blocking
      }

      try {
        const data = await placementScoreService.getLatest();
        setScore(data);
        setGlobalRank(data.global_rank ?? null);
        setStreak(data.current_streak_days ?? null);
      } catch {
        setScore(null);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const readinessScore = score?.score ?? 0;
  const miscCompleted = score?.misc_tests_completed ?? 0;
  const unlocked = miscCompleted >= 5 && readinessScore >= 80;

  return (
    <DashboardLayout navItems={STUDENT_NAV} subtitle="EdTech SaaS">
      <div className={styles.headerRow}>
        <div>
          <h1 className={styles.greeting}>Welcome back, {firstName || 'there'}.</h1>
          <p className="text-muted text-sm">Your placement readiness is looking {readinessScore >= 70 ? 'strong' : readinessScore >= 40 ? 'steady' : 'early-stage'}.</p>
        </div>
        <div className={styles.targetBadge}>
          <span className={styles.targetDot} />
          Target: Standard Company Test
        </div>
      </div>

      {prompted && !profileComplete && (
        <div className={styles.gateBanner}>
          <h2 style={{ margin: 0, fontSize: 16, color: 'var(--color-danger)' }}>Complete your profile to continue adaptive testing</h2>
          <p className="text-sm" style={{ marginTop: 8 }}>
            You've completed 3 topic-wise tests. Upload your photo, resume, and placement details to keep taking tests.
          </p>
          <button className="btn btn-primary mt-4" onClick={() => navigate('/profile')}>
            Go to Profile
          </button>
        </div>
      )}

      {/* Top Grid: Readiness Hub + side cards */}
      <div className={styles.topGrid}>
        <div className={styles.readinessCard}>
          {loading ? (
            <div style={{ width: '100%', textAlign: 'center', padding: '40px 0' }}>
              <div className="text-muted text-sm">Loading placement score…</div>
            </div>
          ) : (
            <>
              <ProgressRing value={readinessScore} size={168} strokeWidth={13} />
              <div className={styles.readinessInfo}>
                <div className={styles.readinessTitle}>Placement Readiness Hub</div>
                <p className={styles.readinessSub}>
                  {miscCompleted === 0
                    ? 'Complete your first Miscellaneous test to generate your score.'
                    : 'Based on your recent Miscellaneous tests and mock assessments.'}
                </p>

                <div className={styles.metricRow}>
                  <div className={styles.metricLabelRow}><span>Accuracy</span><span>{Math.round(score?.accuracy_component ?? 0)}%</span></div>
                  <div className="progress-track"><div className="progress-fill" style={{ width: `${score?.accuracy_component ?? 0}%` }} /></div>
                </div>
                <div className={styles.metricRow}>
                  <div className={styles.metricLabelRow}><span>Speed</span><span>{Math.round(score?.speed_component ?? 0)}%</span></div>
                  <div className="progress-track"><div className="progress-fill warning" style={{ width: `${score?.speed_component ?? 0}%` }} /></div>
                </div>
                <div className={styles.metricRow}>
                  <div className={styles.metricLabelRow}><span>Subject Mastery</span><span>{Math.round(score?.difficulty_mastery_component ?? 0)}%</span></div>
                  <div className="progress-track"><div className="progress-fill" style={{ width: `${score?.difficulty_mastery_component ?? 0}%` }} /></div>
                </div>
              </div>
            </>
          )}
        </div>

        <div className={styles.sideCards}>
          <div className={styles.sideCard}>
            <div className={styles.sideCardTop}><IconTrophy width={15} height={15} /> Global Rank</div>
            <div className={styles.sideCardValue}>{globalRank ? `#${globalRank}` : '—'}</div>
            <div className={`${styles.sideCardSub} ${globalRank ? '' : 'neutral'}`}>
              {globalRank ? 'Keep climbing this week' : 'Complete a test to get ranked'}
            </div>
          </div>
          <div className={styles.sideCard}>
            <div className={styles.sideCardTop}><IconSpark width={15} height={15} /> Current Streak</div>
            <div className={styles.sideCardValue}>{streak ? `${streak} Days` : '0 Days'}</div>
            <div className={`${styles.sideCardSub} ${streak ? '' : 'neutral'}`}>
              {streak ? 'Keep it up! Don\u2019t break the streak.' : 'Start practicing to build a streak'}
            </div>
          </div>
        </div>
      </div>

      {/* Test Selection */}
      <h2 className={styles.sectionTitle}><IconTarget width={17} height={17} /> Test Selection</h2>
      <div className={styles.testGrid}>
        <div className={styles.testCard}>
          <span className="badge badge-primary" style={{ position: 'absolute', top: 20, right: 20 }}>60+ Tests</span>
          <div className={styles.testIconWrap}><IconCourses /></div>
          <div className={styles.testTitle}>Topic Practice</div>
          <p className={styles.testDesc}>Drill down into specific Data Structures and Algorithms topics with adaptive difficulty.</p>
          <button className="btn btn-outline" onClick={() => navigate('/practice')}>
            Start Practice <IconArrowRight width={15} height={15} />
          </button>
        </div>

        <div className={styles.testCard}>
          <span className="badge badge-neutral" style={{ position: 'absolute', top: 20, right: 20 }}>New Scenario</span>
          <div className={styles.testIconWrap}><IconAssignments /></div>
          <div className={styles.testTitle}>Miscellaneous Test</div>
          <p className={styles.testDesc}>Quantitative, Verbal, and Logical reasoning across every topic — feeds your Placement Score.</p>
          <button className="btn btn-outline" onClick={() => navigate('/adaptive')}>
            Start Assessment <IconArrowRight width={15} height={15} />
          </button>
        </div>

        <div className={`${styles.testCard} ${unlocked ? '' : styles.locked}`}>
          <span
            className={`badge ${unlocked ? 'badge-primary' : 'badge-neutral'}`}
            style={{ position: 'absolute', top: 20, right: 20 }}
          >
            {unlocked ? 'Unlocked' : `${miscCompleted}/5 Tests`}
          </span>
          <div className={styles.testIconWrap}>{unlocked ? <IconAssignments /> : <IconLock />}</div>
          <div className={styles.testTitle}>Company Mock Test</div>
          <p className={styles.testDesc}>
            {unlocked
              ? 'Standard company-level placement test — timed, fixed question set.'
              : miscCompleted < 5
                ? 'Complete at least 5 Miscellaneous tests to unlock.'
                : `Your score is ${Math.round(readinessScore)}/100. Reach 80 to unlock.`}
          </p>

          {/* Unlock status: progress bar while under 5 misc tests, score breakdown once eligible */}
          {!unlocked && miscCompleted < 5 && (
            <div className={styles.unlockBlock}>
              <div className={styles.metricLabelRow}>
                <span>Miscellaneous tests</span>
                <span>{miscCompleted}/5</span>
              </div>
              <div className="progress-track">
                <div className="progress-fill" style={{ width: `${(miscCompleted / 5) * 100}%` }} />
              </div>
            </div>
          )}

          {!unlocked && miscCompleted >= 5 && (
            <div className={styles.unlockBlock}>
              <div className={styles.metricLabelRow}>
                <span>Readiness score</span>
                <span>{Math.round(readinessScore)}/80 needed</span>
              </div>
              <div className="progress-track">
                <div
                  className="progress-fill warning"
                  style={{ width: `${Math.min((readinessScore / 80) * 100, 100)}%` }}
                />
              </div>
              <div className={styles.unlockBreakdown}>
                <span>Accuracy {Math.round(score?.accuracy_component ?? 0)}%</span>
                <span>Speed {Math.round(score?.speed_component ?? 0)}%</span>
                <span>Mastery {Math.round(score?.difficulty_mastery_component ?? 0)}%</span>
              </div>
            </div>
          )}

          <button className="btn btn-outline" disabled={!unlocked} onClick={() => navigate('/company-tests')}>
            {unlocked ? 'Start Mock Test' : 'Locked'} {unlocked && <IconArrowRight width={15} height={15} />}
          </button>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default Dashboard;
