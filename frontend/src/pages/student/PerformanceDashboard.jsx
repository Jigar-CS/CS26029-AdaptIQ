import { useEffect, useState, useCallback } from 'react';
import {
  LineChart, Line,
  BarChart, Bar,
  PieChart, Pie, Cell,
  XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend, ReferenceLine
} from 'recharts';
import DashboardLayout from '../../components/layout/DashboardLayout';
import Topbar from '../../components/layout/Topbar';
import { STUDENT_NAV } from '../../components/layout/navConfig';
import performanceService from '../../services/performanceService';
import placementScoreService from '../../services/placementScoreService';
import { IconSpark, IconClock, IconCheck, IconAssignments, IconTrophy } from '../../components/icons/Icon';
import styles from './PerformanceDashboard.module.css';

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background: 'var(--color-surface-2)', border: '1px solid var(--color-border)', borderRadius: 10, padding: '10px 14px' }}>
      <div className="text-xs text-muted">{label}</div>
      <div style={{ color: 'var(--color-primary)', fontWeight: 700, fontSize: 14 }}>{payload[0].value}% Accuracy</div>
    </div>
  );
};

const CustomBarTooltip = ({ active, payload }) => {
  if (!active || !payload?.length) return null;
  const data = payload[0].payload;
  return (
    <div style={{ background: 'var(--color-surface-2)', border: '1px solid var(--color-border)', borderRadius: 10, padding: '10px 14px' }}>
      <div className="text-xs text-muted">{data.fullName || data.name}</div>
      <div style={{ color: 'var(--color-primary)', fontWeight: 700, fontSize: 14 }}>{data.accuracy}% Accuracy</div>
      <div className="text-xs text-muted" style={{ marginTop: 4 }}>{data.attempted} questions attempted</div>
    </div>
  );
};

const PIE_COLORS = ['#4ade80', '#f87171'];

const PerformanceDashboard = () => {
  const [summary, setSummary] = useState({ total_attempted: 0, accuracy_percent: 0, avg_response_time: 0, tests_completed: 0 });
  const [history, setHistory] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 8, total: 0, totalPages: 1 });
  const [filterType, setFilterType] = useState('all');
  const [topics, setTopics] = useState([]);
  const [recommendations, setRecommendations] = useState([]);
  const [scoreHistory, setScoreHistory] = useState([]);
  const [latestScore, setLatestScore] = useState(null);
  const [loading, setLoading] = useState(true);
  const [tableLoading, setTableLoading] = useState(false);

  const fetchHistoryPage = useCallback(async (page, type) => {
    setTableLoading(true);
    try {
      const val = await performanceService.getHistory({ page, limit: 8, test_type: type });
      if (val) {
        const arr = Array.isArray(val.history) ? val.history : Array.isArray(val) ? val : [];
        setHistory(arr);
        if (val.pagination) {
          setPagination(val.pagination);
        }
      }
    } catch {
      // fallback
    } finally {
      setTableLoading(false);
    }
  }, []);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const results = await Promise.allSettled([
        performanceService.getSummary(),
        performanceService.getHistory({ page: 1, limit: 8, test_type: 'all' }),
        performanceService.getByTopic(),
        performanceService.getRecommendations(),
        placementScoreService.getHistory(),
        placementScoreService.getLatest(),
      ]);

      if (results[0].status === 'fulfilled' && results[0].value) {
        setSummary(results[0].value);
      }
      if (results[1].status === 'fulfilled') {
        const val = results[1].value;
        const arr = Array.isArray(val?.history) ? val.history : Array.isArray(val) ? val : [];
        setHistory(arr);
        if (val?.pagination) {
          setPagination(val.pagination);
        }
      }
      if (results[2].status === 'fulfilled') {
        const val = results[2].value;
        const arr = Array.isArray(val?.topics) ? val.topics : Array.isArray(val) ? val : [];
        setTopics(arr);
      }
      if (results[3].status === 'fulfilled') {
        const val = results[3].value;
        const arr = Array.isArray(val?.recommendations) ? val.recommendations : Array.isArray(val) ? val : [];
        setRecommendations(arr);
      }
      if (results[4].status === 'fulfilled') {
        const val = results[4].value;
        const arr = Array.isArray(val) ? val : [];
        setScoreHistory(arr);
      }
      if (results[5].status === 'fulfilled' && results[5].value) {
        setLatestScore(results[5].value);
      }
      setLoading(false);
    };
    load();
  }, []);

  const handlePageChange = (newPage) => {
    if (newPage < 1 || newPage > pagination.totalPages) return;
    fetchHistoryPage(newPage, filterType);
  };

  const handleFilterChange = (type) => {
    setFilterType(type);
    fetchHistoryPage(1, type);
  };

  // Accuracy Trend chart data (chronological)
  const chartData = [...history]
    .filter((h) => h.date)
    .reverse()
    .map((h) => ({ date: h.date, score: Math.round(h.accuracy_percent ?? 0) }));

  // Placement score trend data
  const scoreChartData = scoreHistory.map((entry) => ({
    date: entry.calculated_at ? new Date(entry.calculated_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' }) : '',
    score: Math.round(entry.score ?? 0),
    accuracy: Math.round(entry.accuracy_component ?? 0),
    speed: Math.round(entry.speed_component ?? 0),
    mastery: Math.round(entry.difficulty_mastery_component ?? 0),
  }));

  // Topic bar chart data
  const topicBarData = topics.map((t) => {
    const rawName = t.topic_name || t.name || '';
    const shortName = rawName.length > 18 ? rawName.slice(0, 16) + '…' : rawName;
    return {
      name: shortName,
      fullName: rawName,
      accuracy: Math.round(t.accuracy_percent ?? 0),
      attempted: t.total_attempted ?? 0,
    };
  });

  // Accuracy donut pie data
  const totalCorrect = Number(summary.total_correct ?? 0);
  const totalAttempted = Number(summary.total_attempted ?? 0);
  const totalIncorrect = Math.max(0, totalAttempted - totalCorrect);
  const pieData = totalAttempted > 0
    ? [
        { name: 'Correct', value: totalCorrect },
        { name: 'Incorrect / Skipped', value: totalIncorrect },
      ]
    : [{ name: 'No Attempts', value: 1 }];

  const dismissRec = async (id) => {
    try {
      await performanceService.dismissRecommendation(id);
      setRecommendations((prev) => prev.filter((r) => r.id !== id));
    } catch {/* silent */}
  };

  return (
    <DashboardLayout navItems={STUDENT_NAV} subtitle="EdTech SaaS">
      <Topbar
        title="Performance Analytics"
        subtitle="Track your learning velocity, topic mastery, and placement readiness."
        showSearch={false}
      />

      {loading && (
        <div className="text-muted text-sm" style={{ padding: '40px 0', textAlign: 'center' }}>Loading your analytics…</div>
      )}

      {!loading && (
        <>
          {/* Stat cards */}
          <div className={styles.statsGrid}>
            <div className={styles.statCard}>
              <div className={styles.statTop}><span>Total Questions</span> <IconAssignments width={15} height={15} /></div>
              <div className={styles.statValueRow}>
                <span className={styles.statValue}>{totalAttempted.toLocaleString()}</span>
              </div>
            </div>
            <div className={styles.statCard}>
              <div className={styles.statTop}><span>Overall Accuracy</span> <IconCheck width={15} height={15} /></div>
              <div className={styles.statValueRow}>
                <span className={styles.statValue} style={{ color: 'var(--color-primary)' }}>{Math.round(summary.accuracy_percent ?? 0)}%</span>
              </div>
            </div>
            <div className={styles.statCard}>
              <div className={styles.statTop}><span>Avg Time / Question</span> <IconClock width={15} height={15} /></div>
              <div className={styles.statValueRow}>
                <span className={styles.statValue}>{Math.round(summary.avg_response_time ?? 0)}s</span>
              </div>
            </div>
            <div className={styles.statCard}>
              <div className={styles.statTop}><span>Tests Completed</span> <IconAssignments width={15} height={15} /></div>
              <div className={styles.statValueRow}>
                <span className={styles.statValue}>{summary.tests_completed ?? pagination.total ?? history.length}</span>
              </div>
            </div>
          </div>

          {/* Placement Score Trend & Score Breakdown */}
          <div className={styles.mainGrid}>
            {/* Placement Score Trend Chart */}
            <div className={styles.chartCard}>
              <div className={styles.chartHeader}>
                <span className={styles.chartTitle}>Placement Score Trend</span>
                {latestScore && (
                  <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--color-primary)' }}>
                    Current: {Math.round(latestScore.score ?? 0)}/100
                  </span>
                )}
              </div>
              {scoreChartData.length === 0 ? (
                <div className="text-muted text-sm" style={{ padding: '60px 0', textAlign: 'center' }}>
                  Complete a Miscellaneous test to start tracking your Placement Score.
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={240}>
                  <LineChart data={scoreChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid stroke="var(--color-border)" vertical={false} />
                    <XAxis dataKey="date" tick={{ fill: 'var(--color-text-faint)', fontSize: 11 }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fill: 'var(--color-text-faint)', fontSize: 11 }} axisLine={false} tickLine={false} domain={[0, 100]} />
                    <Tooltip
                      contentStyle={{ background: 'var(--color-surface-2)', border: '1px solid var(--color-border)', borderRadius: 10, padding: '10px 14px' }}
                      labelStyle={{ color: 'var(--color-text-muted)', fontSize: 11 }}
                    />
                    <Legend wrapperStyle={{ fontSize: 11 }} />
                    <Line type="monotone" dataKey="score" name="Composite" stroke="var(--color-primary)" strokeWidth={3} dot={{ r: 3 }} activeDot={{ r: 5 }} />
                    <Line type="monotone" dataKey="accuracy" name="Accuracy" stroke="#4ade80" strokeWidth={1.5} dot={false} strokeDasharray="4 4" />
                    <Line type="monotone" dataKey="speed" name="Speed" stroke="#fbbf24" strokeWidth={1.5} dot={false} strokeDasharray="4 4" />
                    <Line type="monotone" dataKey="mastery" name="Mastery" stroke="#60a5fa" strokeWidth={1.5} dot={false} strokeDasharray="4 4" />
                  </LineChart>
                </ResponsiveContainer>
              )}
            </div>

            {/* Score Breakdown Component */}
            <div className={styles.insightsCard}>
              <div className={styles.insightsTitle}><IconTrophy width={15} height={15} /> Score Breakdown</div>
              {!latestScore ? (
                <div className="text-sm text-muted">Complete a Miscellaneous test to see your score breakdown.</div>
              ) : (
                <>
                  <div className={styles.insightItem} style={{ flexDirection: 'column', gap: 6 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%' }}>
                      <span><strong>Accuracy</strong> (60% weight)</span>
                      <span style={{ fontWeight: 700 }}>{Math.round(latestScore.accuracy_component)}%</span>
                    </div>
                    <div className="progress-track"><div className="progress-fill" style={{ width: `${latestScore.accuracy_component}%` }} /></div>
                  </div>
                  <div className={styles.insightItem} style={{ flexDirection: 'column', gap: 6 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%' }}>
                      <span><strong>Speed</strong> (20% weight)</span>
                      <span style={{ fontWeight: 700 }}>{Math.round(latestScore.speed_component)}%</span>
                    </div>
                    <div className="progress-track"><div className="progress-fill warning" style={{ width: `${latestScore.speed_component}%` }} /></div>
                  </div>
                  <div className={styles.insightItem} style={{ flexDirection: 'column', gap: 6 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%' }}>
                      <span><strong>Difficulty Mastery</strong> (20% weight)</span>
                      <span style={{ fontWeight: 700 }}>{Math.round(latestScore.difficulty_mastery_component)}%</span>
                    </div>
                    <div className="progress-track"><div className="progress-fill" style={{ width: `${latestScore.difficulty_mastery_component}%` }} /></div>
                  </div>
                  <div style={{ marginTop: 8, padding: '10px 14px', background: 'var(--color-surface-2)', borderRadius: 'var(--radius-md)', fontSize: 12, color: 'var(--color-text-muted)' }}>
                    Misc Tests Completed: <strong style={{ color: 'var(--color-text)' }}>{latestScore.misc_tests_completed ?? 0}</strong>
                    {latestScore.misc_tests_completed < 5 && (
                      <span> — need {5 - (latestScore.misc_tests_completed ?? 0)} more to unlock Company Tests</span>
                    )}
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Accuracy Breakdown (Donut Chart) + Rule-Based AdaptIQ Insights */}
          <div className={styles.mainGrid}>
            {/* Accuracy Donut Chart */}
            <div className={styles.chartCard}>
              <div className={styles.chartHeader}>
                <span className={styles.chartTitle}>Accuracy Distribution</span>
                <span style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>
                  {totalCorrect} correct of {totalAttempted} attempted
                </span>
              </div>
              {totalAttempted === 0 ? (
                <div className="text-muted text-sm" style={{ padding: '60px 0', textAlign: 'center' }}>
                  No question attempts recorded yet.
                </div>
              ) : (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-around', height: 240 }}>
                  <div style={{ width: '55%', height: '100%' }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={pieData}
                          innerRadius={60}
                          outerRadius={85}
                          paddingAngle={4}
                          dataKey="value"
                        >
                          {pieData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip contentStyle={{ background: 'var(--color-surface-2)', border: '1px solid var(--color-border)', borderRadius: 8, fontSize: 12 }} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13 }}>
                      <span style={{ width: 12, height: 12, borderRadius: 3, background: '#4ade80' }} />
                      <span>Correct: <strong>{totalCorrect}</strong> ({Math.round((totalCorrect / totalAttempted) * 100)}%)</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13 }}>
                      <span style={{ width: 12, height: 12, borderRadius: 3, background: '#f87171' }} />
                      <span>Incorrect / Skipped: <strong>{totalIncorrect}</strong> ({Math.round((totalIncorrect / totalAttempted) * 100)}%)</span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Rule-Based AdaptIQ Insights Panel */}
            <div className={styles.insightsCard}>
              <div className={styles.insightsTitle}><IconSpark width={15} height={15} /> AdaptIQ Insights</div>
              {recommendations.length === 0 ? (
                <div className="text-sm text-muted">Complete more tests to trigger rule-based recommendations.</div>
              ) : (
                recommendations.slice(0, 5).map((rec) => (
                  <div key={rec.id} className={styles.insightItem} style={{ justifyContent: 'space-between', gap: 8 }}>
                    <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                      <IconSpark width={14} height={14} style={{ flexShrink: 0, marginTop: 2 }} />
                      <span>{rec.message}</span>
                    </div>
                    <button
                      className="btn btn-outline btn-sm"
                      style={{ fontSize: 11, padding: '2px 8px', flexShrink: 0 }}
                      onClick={() => dismissRec(rec.id)}
                      title="Dismiss insight"
                    >
                      ✕
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Topic Proficiency Bar Chart */}
          <div className={styles.masteryCard} style={{ marginBottom: 20 }}>
            <div className={styles.masteryTitle}>Topic Accuracy Comparison</div>
            {topicBarData.length === 0 ? (
              <div className="text-sm text-muted">Attempt topic practice tests to see comparative analytics.</div>
            ) : (
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={topicBarData} margin={{ top: 15, right: 15, left: -20, bottom: 25 }}>
                  <CartesianGrid stroke="var(--color-border)" vertical={false} />
                  <XAxis
                    dataKey="name"
                    tick={{ fill: 'var(--color-text-faint)', fontSize: 11 }}
                    interval={0}
                    angle={-15}
                    textAnchor="end"
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    domain={[0, 100]}
                    tick={{ fill: 'var(--color-text-faint)', fontSize: 11 }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip content={<CustomBarTooltip />} />
                  <ReferenceLine y={70} stroke="#4ade80" strokeDasharray="3 3" label={{ value: '70% Target', fill: '#4ade80', fontSize: 10, position: 'insideTopRight' }} />
                  <Bar dataKey="accuracy" fill="var(--color-primary)" radius={[4, 4, 0, 0]} maxBarSize={40} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>

          {/* Paginated Test History Table */}
          <div className={styles.masteryCard}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 12 }}>
              <div className={styles.masteryTitle} style={{ margin: 0 }}>Attempt History</div>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <span style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>Filter:</span>
                <select
                  className="input text-sm"
                  style={{ padding: '4px 10px', height: 'auto', width: 'auto' }}
                  value={filterType}
                  onChange={(e) => handleFilterChange(e.target.value)}
                >
                  <option value="all">All Tests</option>
                  <option value="topic_adaptive">Topic Adaptive</option>
                  <option value="full_adaptive">Miscellaneous</option>
                  <option value="company">Company Mock</option>
                </select>
              </div>
            </div>

            {tableLoading ? (
              <div className="text-muted text-sm" style={{ padding: '30px 0', textAlign: 'center' }}>Updating records…</div>
            ) : history.length === 0 ? (
              <div className="text-sm text-muted">No test records found for this filter.</div>
            ) : (
              <>
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                    <thead>
                      <tr style={{ borderBottom: '1px solid var(--color-border)', color: 'var(--color-text-muted)' }}>
                        <th style={{ textAlign: 'left', padding: '8px 12px', fontWeight: 600 }}>Type</th>
                        <th style={{ textAlign: 'left', padding: '8px 12px', fontWeight: 600 }}>Topic / Assessment</th>
                        <th style={{ textAlign: 'center', padding: '8px 12px', fontWeight: 600 }}>Correct</th>
                        <th style={{ textAlign: 'center', padding: '8px 12px', fontWeight: 600 }}>Accuracy</th>
                        <th style={{ textAlign: 'center', padding: '8px 12px', fontWeight: 600 }}>Avg Pace</th>
                        <th style={{ textAlign: 'right', padding: '8px 12px', fontWeight: 600 }}>Date</th>
                      </tr>
                    </thead>
                    <tbody>
                      {history.map((h) => {
                        const pct = Math.round(h.accuracy_percent ?? 0);
                        const color = pct >= 70 ? 'var(--color-success)' : pct >= 40 ? 'var(--color-warning)' : 'var(--color-danger)';
                        const typeLabel = h.test_type === 'topic_adaptive' ? 'Topic' : h.test_type === 'full_adaptive' ? 'Misc' : 'Company';
                        return (
                          <tr key={h.test_id} style={{ borderBottom: '1px solid var(--color-border)' }}>
                            <td style={{ padding: '10px 12px' }}>
                              <span className="badge badge-neutral" style={{ fontSize: 11 }}>{typeLabel}</span>
                            </td>
                            <td style={{ padding: '10px 12px', color: 'var(--color-text-muted)' }}>{h.topic_name || '—'}</td>
                            <td style={{ padding: '10px 12px', textAlign: 'center' }}>{h.total_correct}/{h.total_answered}</td>
                            <td style={{ padding: '10px 12px', textAlign: 'center', fontWeight: 700, color }}>{pct}%</td>
                            <td style={{ padding: '10px 12px', textAlign: 'center', color: 'var(--color-text-muted)' }}>{Math.round(h.avg_response_time ?? 0)}s</td>
                            <td style={{ padding: '10px 12px', textAlign: 'right', color: 'var(--color-text-faint)', fontSize: 12 }}>{h.date || '—'}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Pagination Controls */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 16, paddingTop: 12, borderTop: '1px solid var(--color-border)', flexWrap: 'wrap', gap: 8 }}>
                  <span style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>
                    Showing Page {pagination.page} of {pagination.totalPages} ({pagination.total} total tests)
                  </span>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button
                      className="btn btn-outline btn-sm"
                      disabled={pagination.page <= 1}
                      onClick={() => handlePageChange(pagination.page - 1)}
                    >
                      Previous
                    </button>
                    <button
                      className="btn btn-outline btn-sm"
                      disabled={pagination.page >= pagination.totalPages}
                      onClick={() => handlePageChange(pagination.page + 1)}
                    >
                      Next
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </>
      )}
    </DashboardLayout>
  );
};

export default PerformanceDashboard;
