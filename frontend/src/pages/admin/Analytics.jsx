import { useEffect, useState } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  Legend,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import DashboardLayout from '../../components/layout/DashboardLayout';
import Topbar from '../../components/layout/Topbar';
import { ADMIN_NAV } from '../../components/layout/navConfig';
import adminService from '../../services/adminService';
import {
  IconCourses,
  IconAssignments,
  IconAnalytics,
  IconTrophy,
} from '../../components/icons/Icon';
import styles from './AdminDashboard.module.css';

const TEST_TYPE_COLORS = {
  topic_adaptive: '#38bdf8',
  full_adaptive: '#a855f7',
  company: '#f59e0b',
};

const TEST_TYPE_LABELS = {
  topic_adaptive: 'Topic Adaptive',
  full_adaptive: 'Full Adaptive (Misc)',
  company: 'Company Mock',
};

const Analytics = () => {
  const [overview, setOverview] = useState(null);
  const [breakdown, setBreakdown] = useState([]);
  const [chartMode, setChartMode] = useState('stacked'); // 'stacked' | 'grouped'
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const results = await Promise.allSettled([
        adminService.getAnalyticsOverview(),
        adminService.getTopicDifficultyBreakdown(),
      ]);
      if (results[0].status === 'fulfilled') setOverview(results[0].value);
      if (results[1].status === 'fulfilled') {
        const data = results[1].value;
        setBreakdown(Array.isArray(data) ? data : data?.breakdown || []);
      }
      setLoading(false);
    };
    load();
  }, []);

  const testsByType = (overview?.tests_by_type || []).map((t) => ({
    name: TEST_TYPE_LABELS[t.test_type] || t.test_type,
    value: t.count,
    key: t.test_type,
    color: TEST_TYPE_COLORS[t.test_type] || '#94a3b8',
  }));

  const totalTests = testsByType.reduce((sum, item) => sum + item.value, 0);

  return (
    <DashboardLayout navItems={ADMIN_NAV} subtitle="EdTech SaaS · Admin">
      <Topbar
        title="Platform Analytics"
        subtitle="Question bank distribution, test attempts, and student accuracy."
        showSearch={false}
      />

      {/* KPI Stats Overview */}
      <div className={styles.statsGrid}>
        <div className={styles.statCard}>
          <div className={styles.statTop}>
            <span>Total Students</span> <IconCourses width={15} height={15} />
          </div>
          <div className={styles.statValue}>{overview?.total_users ?? '—'}</div>
          <div className={styles.statSub}>Active learner accounts</div>
        </div>

        <div className={styles.statCard}>
          <div className={styles.statTop}>
            <span>Total Questions</span> <IconAssignments width={15} height={15} />
          </div>
          <div className={styles.statValue}>{overview?.total_questions ?? '—'}</div>
          <div className={styles.statSub}>Across all topics</div>
        </div>

        <div className={styles.statCard}>
          <div className={styles.statTop}>
            <span>Tests Completed</span> <IconAnalytics width={15} height={15} />
          </div>
          <div className={styles.statValue}>{overview?.total_tests_completed ?? '0'}</div>
          <div className={styles.statSub}>Total submitted test sessions</div>
        </div>

        <div className={styles.statCard}>
          <div className={styles.statTop}>
            <span>Platform Avg Accuracy</span> <IconAnalytics width={15} height={15} />
          </div>
          <div className={styles.statValue}>
            {overview?.avg_accuracy != null ? `${Math.round(overview.avg_accuracy)}%` : '—'}
          </div>
          <div className={styles.statSub}>Across all submitted answers</div>
        </div>

        <div className={styles.statCard}>
          <div className={styles.statTop}>
            <span>Avg Placement Score</span> <IconTrophy width={15} height={15} />
          </div>
          <div className={styles.statValue}>
            {overview?.avg_placement_score != null ? Math.round(overview.avg_placement_score) : '—'}
          </div>
          <div className={styles.statSub}>Out of 100 readiness index</div>
        </div>
      </div>

      {/* Charts Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 2fr) minmax(0, 1fr)', gap: 20, marginBottom: 28 }}>
        {/* Questions per Topic x Difficulty */}
        <div className={styles.tableCard} style={{ padding: 24, display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 }}>
            <h2 style={{ fontSize: 15, fontWeight: 700, margin: 0 }}>
              Questions per Topic × Difficulty
            </h2>
            <div style={{ display: 'flex', gap: 6 }}>
              <button
                type="button"
                className={`btn btn-sm ${chartMode === 'stacked' ? 'btn-primary' : 'btn-outline'}`}
                onClick={() => setChartMode('stacked')}
                style={{ fontSize: 11, padding: '4px 8px' }}
              >
                Stacked
              </button>
              <button
                type="button"
                className={`btn btn-sm ${chartMode === 'grouped' ? 'btn-primary' : 'btn-outline'}`}
                onClick={() => setChartMode('grouped')}
                style={{ fontSize: 11, padding: '4px 8px' }}
              >
                Grouped
              </button>
            </div>
          </div>

          {loading ? (
            <div className="text-muted" style={{ padding: '60px 0', textAlign: 'center' }}>Loading chart data…</div>
          ) : breakdown.length === 0 ? (
            <div className="text-muted text-sm" style={{ padding: '60px 0', textAlign: 'center' }}>
              No question data yet — import questions via CSV to populate this chart.
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={320}>
              <BarChart data={breakdown} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                <CartesianGrid stroke="var(--color-border)" vertical={false} />
                <XAxis
                  dataKey="topic_name"
                  tick={{ fill: 'var(--color-text-faint)', fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fill: 'var(--color-text-faint)', fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip
                  contentStyle={{
                    background: 'var(--color-surface-2)',
                    border: '1px solid var(--color-border)',
                    borderRadius: 8,
                    fontSize: 12,
                  }}
                />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Bar
                  dataKey="easy_count"
                  name="Easy"
                  stackId={chartMode === 'stacked' ? 'a' : undefined}
                  fill="#4ade80"
                  radius={chartMode === 'stacked' ? [0, 0, 0, 0] : [4, 4, 0, 0]}
                />
                <Bar
                  dataKey="medium_count"
                  name="Medium"
                  stackId={chartMode === 'stacked' ? 'a' : undefined}
                  fill="#ffb020"
                  radius={chartMode === 'stacked' ? [0, 0, 0, 0] : [4, 4, 0, 0]}
                />
                <Bar
                  dataKey="hard_count"
                  name="Hard"
                  stackId={chartMode === 'stacked' ? 'a' : undefined}
                  fill="#f87171"
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Tests by Type Distribution */}
        <div className={styles.tableCard} style={{ padding: 24, display: 'flex', flexDirection: 'column' }}>
          <h2 style={{ fontSize: 15, fontWeight: 700, marginBottom: 18 }}>
            Completed Tests by Type
          </h2>

          {loading ? (
            <div className="text-muted" style={{ padding: '60px 0', textAlign: 'center' }}>Loading tests data…</div>
          ) : totalTests === 0 ? (
            <div className="text-muted text-sm" style={{ padding: '60px 0', textAlign: 'center' }}>
              No tests completed yet.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flex: 1 }}>
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie
                    data={testsByType}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={80}
                    paddingAngle={4}
                  >
                    {testsByType.map((entry) => (
                      <Cell key={entry.key} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      background: 'var(--color-surface-2)',
                      border: '1px solid var(--color-border)',
                      borderRadius: 8,
                      fontSize: 12,
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, width: '100%', marginTop: 8 }}>
                {testsByType.map((t) => (
                  <div key={t.key} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 12 }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span style={{ width: 10, height: 10, borderRadius: '50%', backgroundColor: t.color }} />
                      <span>{t.name}</span>
                    </span>
                    <span style={{ fontWeight: 700 }}>{t.value}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Detailed Topic Question Breakdown Table */}
      <h2 className={styles.sectionTitle}>Topic Question Inventory</h2>
      <div className={styles.tableCard}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Topic Name</th>
              <th>Easy</th>
              <th>Medium</th>
              <th>Hard</th>
              <th>Total Questions</th>
              <th>Distribution Status</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={6} style={{ textAlign: 'center', padding: 24, color: 'var(--color-text-muted)' }}>Loading topic details…</td></tr>
            ) : breakdown.length === 0 ? (
              <tr><td colSpan={6} style={{ textAlign: 'center', padding: 28, color: 'var(--color-text-muted)' }}>No topics found.</td></tr>
            ) : (
              breakdown.map((topic) => {
                const total = topic.total_questions;
                const hasAllLevels = topic.easy_count > 0 && topic.medium_count > 0 && topic.hard_count > 0;

                return (
                  <tr key={topic.topic_id || topic.topic_name}>
                    <td style={{ fontWeight: 600 }}>{topic.topic_name}</td>
                    <td style={{ color: '#4ade80', fontWeight: 600 }}>{topic.easy_count}</td>
                    <td style={{ color: '#ffb020', fontWeight: 600 }}>{topic.medium_count}</td>
                    <td style={{ color: '#f87171', fontWeight: 600 }}>{topic.hard_count}</td>
                    <td style={{ fontWeight: 700 }}>{total}</td>
                    <td>
                      {total === 0 ? (
                        <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 4, background: 'rgba(239, 68, 68, 0.15)', color: '#ef4444' }}>
                          Empty Topic
                        </span>
                      ) : hasAllLevels ? (
                        <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 4, background: 'rgba(74, 222, 128, 0.15)', color: '#4ade80' }}>
                          Balanced
                        </span>
                      ) : (
                        <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 4, background: 'rgba(234, 179, 8, 0.18)', color: '#facc15' }}>
                          Needs Difficulty Fill
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </DashboardLayout>
  );
};

export default Analytics;
