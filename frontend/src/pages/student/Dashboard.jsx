import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import DashboardLayout from '../../components/layout/DashboardLayout';
import Topbar from '../../components/layout/Topbar';
import { STUDENT_NAV } from '../../components/layout/navConfig';
import ProgressRing from '../../components/common/ProgressRing';
import profileService from '../../services/profileService';
import placementScoreService from '../../services/placementScoreService';
import performanceService from '../../services/performanceService';
import { IconTrophy, IconSpark, IconCourses, IconAssignments, IconLock, IconArrowRight, IconTarget } from '../../components/icons/Icon';
import styles from './Dashboard.module.css';

const Dashboard = () => {
  const navigate = useNavigate();
  const [prompted, setPrompted] = useState(false);
  const [profileComplete, setProfileComplete] = useState(true);
  const [displayName, setDisplayName] = useState('Demo');

  const [score, setScore] = useState(null);
  const [streak, setStreak] = useState(3);
  const [recommendations, setRecommendations] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const profile = await profileService.getProfile();
        setPrompted(!!profile.profile_prompt_triggered);
        setProfileComplete(!!profile.is_profile_complete);
        if (profile.name) {
          setDisplayName(profile.name.split(' ')[0]);
        }
      } catch {
        // non-blocking
      }

      try {
        const data = await placementScoreService.getLatest();
        setScore(data);
        if (data.current_streak_days) {
          setStreak(data.current_streak_days);
        }
      } catch {
        setScore(null);
      }

      try {
        const recData = await performanceService.getRecommendations();
        setRecommendations(Array.isArray(recData?.recommendations) ? recData.recommendations : []);
      } catch {
        // non-blocking
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const handleDismissRec = async (id) => {
    try {
      await performanceService.dismissRecommendation(id);
      setRecommendations((prev) => prev.filter((r) => r.id !== id));
    } catch {
      // silent
    }
  };

  const readinessScore = Math.round(score?.score ?? 0);
  const miscCompleted = score?.misc_tests_completed ?? 0;
  const unlocked = miscCompleted >= 5 && readinessScore >= 80;

  const accuracyPct = Math.round(score?.accuracy_component ?? 0);
  const speedPct = Math.round(score?.speed_component ?? 0);
  const masteryPct = Math.round(score?.difficulty_mastery_component ?? 0);

  return (
    <DashboardLayout navItems={STUDENT_NAV} subtitle="STUDENT PORTAL">
      <Topbar
        title={`Welcome back, ${displayName} 👋`}
        subtitle="Your Placement Readiness Index is currently Calibrating Benchmarks."
        showSearch={true}
        showTargetBadge={true}
      />

      <div className={styles.contentContainer}>
        {prompted && !profileComplete && (
          <div className={styles.gateBanner}>
            <div className={styles.gateText}>
              <strong>Complete your profile to continue adaptive testing.</strong>
              <span>You've completed 3 topic tests. Upload your resume and details to proceed.</span>
            </div>
            <button className="btn btn-primary btn-sm" onClick={() => navigate('/profile')}>
              Go to Profile
            </button>
          </div>
        )}

        {/* Hero Grid: Readiness Hub + Side Cards */}
        <div className={styles.heroGrid}>
          {/* Readiness Hub Card */}
          <div className={styles.readinessCard}>
            <div className={styles.ringWrapper}>
              <ProgressRing value={readinessScore} size={150} strokeWidth={12} label="PLACEMENT INDEX" />
            </div>
            <div className={styles.readinessDetails}>
              <h2 className={styles.hubTitle}>Placement Readiness Hub</h2>
              <p className={styles.hubSubtitle}>
                Synthesized from your accuracy, pacing metrics, and multi-topic difficulty mastery.
              </p>

              <div className={styles.metricsList}>
                <div className={styles.metricItem}>
                  <div className={styles.metricLabelBar}>
                    <span className={styles.metricName}>Accuracy Component</span>
                    <span className={styles.metricValue}>{accuracyPct}%</span>
                  </div>
                  <div className={styles.track}>
                    <div className={styles.bar} style={{ width: `${accuracyPct}%` }} />
                  </div>
                </div>

                <div className={styles.metricItem}>
                  <div className={styles.metricLabelBar}>
                    <span className={styles.metricName}>Response Speed Rating</span>
                    <span className={styles.metricValue}>{speedPct}%</span>
                  </div>
                  <div className={styles.track}>
                    <div className={styles.bar} style={{ width: `${speedPct}%` }} />
                  </div>
                </div>

                <div className={styles.metricItem}>
                  <div className={styles.metricLabelBar}>
                    <span className={styles.metricName}>Multi-Topic Difficulty Mastery</span>
                    <span className={styles.metricValue}>{masteryPct}%</span>
                  </div>
                  <div className={styles.track}>
                    <div className={styles.bar} style={{ width: `${masteryPct}%` }} />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Right Stat Cards */}
          <div className={styles.sideColumn}>
            <div className={styles.statCard}>
              <div className={styles.statHeader}>
                <IconTrophy width={15} height={15} />
                <span>BATCH STANDING & RANK</span>
              </div>
              <div className={styles.statLargeVal}>Top 15%</div>
              <div className={styles.statSubText}>
                <span className={styles.greenCheck}>✓</span> Active candidate benchmark
              </div>
            </div>

            <div className={styles.statCard}>
              <div className={styles.statHeader}>
                <IconSpark width={15} height={15} />
                <span>LEARNING STREAK</span>
              </div>
              <div className={styles.statLargeVal}>{streak} Days</div>
              <div className={styles.statSubText}>
                <span className={styles.sparkle}>✨</span> Daily practice bonus active
              </div>
            </div>
          </div>
        </div>

        {/* Tailored Recommendations Banner if any */}
        {recommendations.length > 0 && (
          <div className={styles.recSection}>
            <div className={styles.recHeader}>
              <IconSpark width={16} height={16} />
              <span>Diagnostic Recommendations</span>
            </div>
            <div className={styles.recList}>
              {recommendations.slice(0, 2).map((rec) => (
                <div key={rec.id} className={styles.recCard}>
                  <div className={styles.recContent}>
                    <span className={styles.recTopic}>{rec.topic_name || 'Aptitude Practice'}</span>
                    <span className={styles.recMsg}>{rec.message}</span>
                  </div>
                  <div className={styles.recActions}>
                    <button className="btn btn-outline btn-sm" onClick={() => navigate('/practice')}>
                      Practice Now
                    </button>
                    <button className={styles.dismissBtn} onClick={() => handleDismissRec(rec.id)}>
                      ✕
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Candidate Assessment Modules Section */}
        <div className={styles.sectionHeading}>
          <IconTarget width={18} height={18} />
          <h2>Candidate Assessment Modules</h2>
        </div>

        <div className={styles.moduleGrid}>
          {/* Card 1: Topic Practice */}
          <div className={styles.moduleCard}>
            <div className={styles.moduleTop}>
              <div className={styles.moduleIconBox}>
                <IconCourses width={20} height={20} />
              </div>
              <span className={styles.moduleBadge}>10 Topics</span>
            </div>
            <h3 className={styles.moduleTitle}>Topic Practice</h3>
            <p className={styles.moduleDesc}>
              Drill down into individual Quantitative, Logical, and Verbal modules with dynamic difficulty adjustment.
            </p>
            <button className={styles.moduleOutlineBtn} onClick={() => navigate('/practice')}>
              <span>Start Practice</span>
              <IconArrowRight width={14} height={14} />
            </button>
          </div>

          {/* Card 2: Comprehensive Adaptive Test */}
          <div className={styles.moduleCard}>
            <div className={styles.moduleTop}>
              <div className={styles.moduleIconBox}>
                <IconAssignments width={20} height={20} />
              </div>
              <span className={styles.moduleBadge}>Adaptive Exam</span>
            </div>
            <h3 className={styles.moduleTitle}>Comprehensive Adaptive Test</h3>
            <p className={styles.moduleDesc}>
              Full 20-question mixed assessment across all domains. Automatically updates your Placement Readiness Score.
            </p>
            <button className={styles.modulePrimaryBtn} onClick={() => navigate('/misc-test')}>
              <span>Start Assessment</span>
              <IconArrowRight width={14} height={14} />
            </button>
          </div>

          {/* Card 3: Company Mock Exam */}
          <div className={`${styles.moduleCard} ${!unlocked ? styles.lockedCard : ''}`}>
            <div className={styles.moduleTop}>
              <div className={styles.moduleIconBox}>
                <IconLock width={20} height={20} />
              </div>
              <span className={styles.moduleBadge}>{unlocked ? 'Unlocked' : `${miscCompleted}/5 Tests`}</span>
            </div>
            <h3 className={styles.moduleTitle}>Company Mock Exam</h3>
            <p className={styles.moduleDesc}>
              {unlocked
                ? 'Fixed-question, timed assessment mirroring Tier-1 placement rounds with comprehensive ranking.'
                : 'Complete at least 5 Adaptive Tests to unlock company mock assessments.'}
            </p>
            <button
              className={styles.moduleLockedBtn}
              disabled={!unlocked}
              onClick={() => unlocked && navigate('/company-tests')}
            >
              {unlocked ? 'Start Mock Test →' : 'Locked'}
            </button>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default Dashboard;
