import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import DashboardLayout from '../../components/layout/DashboardLayout';
import Topbar from '../../components/layout/Topbar';
import { ADMIN_NAV } from '../../components/layout/navConfig';
import adminService from '../../services/adminService';
import {
  IconCourses,
  IconAssignments,
  IconUpload,
  IconAnalytics,
  IconCommunity,
  IconClock,
  IconArrowRight,
} from '../../components/icons/Icon';
import styles from './AdminDashboard.module.css';

const formatTimestamp = (ts) => {
  if (!ts) return '—';
  try {
    const d = new Date(ts);
    return d.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return String(ts);
  }
};

const getBadgeStyle = (actionType) => {
  const upper = (actionType || '').toUpperCase();
  if (upper.includes('LOGIN')) return { bg: 'rgba(74, 222, 128, 0.15)', color: '#4ade80' };
  if (upper.includes('REGISTER')) return { bg: 'rgba(56, 189, 248, 0.15)', color: '#38bdf8' };
  if (upper.includes('CSV') || upper.includes('IMPORT')) return { bg: 'rgba(168, 85, 247, 0.15)', color: '#c084fc' };
  if (upper.includes('DIFFICULTY')) return { bg: 'rgba(251, 146, 60, 0.15)', color: '#fb923c' };
  if (upper.includes('PROFILE')) return { bg: 'rgba(236, 72, 153, 0.15)', color: '#f472b6' };
  if (upper.includes('UNLOCK')) return { bg: 'rgba(234, 179, 8, 0.18)', color: '#facc15' };
  if (upper.includes('TEST')) return { bg: 'rgba(34, 197, 94, 0.15)', color: '#4ade80' };
  return { bg: 'var(--color-surface-2)', color: 'var(--color-text-muted)' };
};

const AdminDashboard = () => {
  const [overview, setOverview] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadOverview = async () => {
      setLoading(true);
      try {
        const data = await adminService.getAnalyticsOverview();
        setOverview(data);
      } catch (err) {
        console.error('Failed to load admin overview:', err);
      } finally {
        setLoading(false);
      }
    };
    loadOverview();
  }, []);

  const recentLogs = overview?.recent_activity || [];

  return (
    <DashboardLayout navItems={ADMIN_NAV} subtitle="EdTech SaaS · Admin">
      <Topbar title="Admin Overview" subtitle="Manage platform content, users, and audit trail." showSearch={false} />

      {/* Live Stat Cards */}
      <div className={styles.statsGrid}>
        <div className={styles.statCard}>
          <div className={styles.statTop}><span>Active Topics</span> <IconCourses width={15} height={15} /></div>
          <div className={styles.statValue}>{loading ? '…' : overview?.total_topics ?? '—'}</div>
          <div className={styles.statSub}>Configured for student practice</div>
        </div>

        <div className={styles.statCard}>
          <div className={styles.statTop}><span>Total Questions</span> <IconAssignments width={15} height={15} /></div>
          <div className={styles.statValue}>{loading ? '…' : overview?.total_questions ?? '—'}</div>
          <div className={styles.statSub}>Across Easy, Medium & Hard</div>
        </div>

        <div className={styles.statCard}>
          <div className={styles.statTop}><span>Registered Students</span> <IconCommunity width={15} height={15} /></div>
          <div className={styles.statValue}>{loading ? '…' : overview?.total_users ?? '—'}</div>
          <div className={styles.statSub}>Active learner accounts</div>
        </div>

        <div className={styles.statCard}>
          <div className={styles.statTop}><span>Tests Completed</span> <IconAnalytics width={15} height={15} /></div>
          <div className={styles.statValue}>{loading ? '…' : overview?.total_tests_completed ?? '0'}</div>
          <div className={styles.statSub}>Topic, Full Adaptive & Company</div>
        </div>

        <div className={styles.statCard}>
          <div className={styles.statTop}><span>Platform Avg Accuracy</span> <IconAnalytics width={15} height={15} /></div>
          <div className={styles.statValue}>
            {loading ? '…' : overview?.avg_accuracy != null ? `${Math.round(overview.avg_accuracy)}%` : '—'}
          </div>
          <div className={styles.statSub}>Overall answer submission accuracy</div>
        </div>
      </div>

      {/* Quick Actions */}
      <h2 className={styles.sectionTitle}>Management Modules</h2>
      <div className={styles.quickGrid}>
        <Link to="/admin/topics" className={styles.quickCard}>
          <div className={styles.quickIconWrap}><IconCourses /></div>
          <div className={styles.quickTitle}>Topic Management</div>
          <p className={styles.quickDesc}>Add, edit, or remove aptitude topics used by the adaptive engine.</p>
        </Link>
        <Link to="/admin/questions" className={styles.quickCard}>
          <div className={styles.quickIconWrap}><IconAssignments /></div>
          <div className={styles.quickTitle}>Question Bank CRUD</div>
          <p className={styles.quickDesc}>Create and update questions with manual or bulk search & filtering.</p>
        </Link>
        <Link to="/admin/csv-import" className={styles.quickCard}>
          <div className={styles.quickIconWrap}><IconUpload /></div>
          <div className={styles.quickTitle}>CSV Batch Import</div>
          <p className={styles.quickDesc}>Stream and validate question sets with duplicate SHA-256 detection.</p>
        </Link>
        <Link to="/admin/analytics" className={styles.quickCard}>
          <div className={styles.quickIconWrap}><IconAnalytics /></div>
          <div className={styles.quickTitle}>Platform Analytics</div>
          <p className={styles.quickDesc}>Examine question bank distribution and completion metrics.</p>
        </Link>
        <Link to="/admin/activity-logs" className={styles.quickCard}>
          <div className={styles.quickIconWrap}><IconClock /></div>
          <div className={styles.quickTitle}>Activity & Audit Logs</div>
          <p className={styles.quickDesc}>Live audit trail of user logins, tests, imports, and adaptive changes.</p>
        </Link>
        <Link to="/admin/users" className={styles.quickCard}>
          <div className={styles.quickIconWrap}><IconCommunity /></div>
          <div className={styles.quickTitle}>User Management</div>
          <p className={styles.quickDesc}>Activate, deactivate, and review student accounts and profiles.</p>
        </Link>
      </div>

      {/* Recent Activity Section */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', margin: '36px 0 16px' }}>
        <h2 style={{ fontSize: 16, fontWeight: 700, margin: 0 }}>Recent Activity Stream</h2>
        <Link
          to="/admin/activity-logs"
          style={{
            fontSize: 13,
            fontWeight: 600,
            color: 'var(--color-primary)',
            display: 'flex',
            alignItems: 'center',
            gap: 4,
            textDecoration: 'none',
          }}
        >
          View Full Audit Log <IconArrowRight width={14} height={14} />
        </Link>
      </div>

      <div className={styles.tableCard}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th style={{ width: 160 }}>Time</th>
              <th style={{ width: 200 }}>Action</th>
              <th>User</th>
              <th>Summary</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={4} style={{ textAlign: 'center', padding: 28, color: 'var(--color-text-muted)' }}>
                  Loading recent events…
                </td>
              </tr>
            ) : recentLogs.length === 0 ? (
              <tr>
                <td colSpan={4} style={{ textAlign: 'center', padding: 32, color: 'var(--color-text-muted)' }}>
                  No recent activity recorded yet.
                </td>
              </tr>
            ) : (
              recentLogs.map((log) => {
                const bStyle = getBadgeStyle(log.action_type);
                const detailsText = log.details && typeof log.details === 'object'
                  ? Object.entries(log.details).slice(0, 2).map(([k, v]) => `${k}: ${v}`).join(', ')
                  : '—';

                return (
                  <tr key={log.id}>
                    <td style={{ fontSize: 12, color: 'var(--color-text-muted)', whiteSpace: 'nowrap' }}>
                      {formatTimestamp(log.created_at)}
                    </td>
                    <td>
                      <span
                        style={{
                          display: 'inline-block',
                          padding: '3px 8px',
                          borderRadius: 9999,
                          fontSize: 11,
                          fontWeight: 700,
                          backgroundColor: bStyle.bg,
                          color: bStyle.color,
                        }}
                      >
                        {log.action_type}
                      </span>
                    </td>
                    <td>
                      {log.user_name ? (
                        <span style={{ fontWeight: 600 }}>{log.user_name}</span>
                      ) : (
                        <span style={{ fontStyle: 'italic', color: 'var(--color-text-faint)' }}>System</span>
                      )}
                    </td>
                    <td style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>
                      {detailsText}
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

export default AdminDashboard;
