import { useEffect, useState, useCallback } from 'react';
import DashboardLayout from '../../components/layout/DashboardLayout';
import Topbar from '../../components/layout/Topbar';
import { ADMIN_NAV } from '../../components/layout/navConfig';
import adminService from '../../services/adminService';
import {
  IconSearch,
  IconFilter,
  IconClock,
  IconX,
  IconArrowLeft,
  IconArrowRight,
  IconUser,
} from '../../components/icons/Icon';
import adminStyles from './AdminDashboard.module.css';
import styles from './ActivityLogs.module.css';

const getActionBadgeClass = (actionType) => {
  if (!actionType) return styles.badgeDefault;
  const upper = actionType.toUpperCase();
  if (upper.includes('LOGIN')) return styles.badgeLogin;
  if (upper.includes('REGISTER')) return styles.badgeRegister;
  if (upper.includes('CSV') || upper.includes('IMPORT')) return styles.badgeCsv;
  if (upper.includes('DIFFICULTY')) return styles.badgeDifficulty;
  if (upper.includes('PROFILE')) return styles.badgeProfile;
  if (upper.includes('UNLOCK')) return styles.badgeUnlock;
  if (upper.includes('TEST')) return styles.badgeTest;
  return styles.badgeDefault;
};

const formatTimestamp = (ts) => {
  if (!ts) return '—';
  try {
    const d = new Date(ts);
    return d.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  } catch {
    return String(ts);
  }
};

const formatDetailsPreview = (details) => {
  if (!details) return '—';
  if (typeof details === 'object') {
    const entries = Object.entries(details).slice(0, 3);
    return entries.map(([k, v]) => `${k}: ${v}`).join(' · ');
  }
  return String(details);
};

const ActivityLogs = () => {
  const [logs, setLogs] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [actionType, setActionType] = useState('ALL');
  const [availableActions, setAvailableActions] = useState([]);
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [loading, setLoading] = useState(true);
  const [selectedLog, setSelectedLog] = useState(null);

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    try {
      const params = { page, limit: 15 };
      if (actionType !== 'ALL') params.action_type = actionType;
      if (search.trim()) params.search = search.trim();

      const data = await adminService.getActivityLogs(params);
      setLogs(data.logs || []);
      setTotal(data.total || 0);
      setTotalPages(data.totalPages || Math.ceil((data.total || 0) / 15) || 1);

      if (data.action_types && data.action_types.length > 0) {
        setAvailableActions((prev) => {
          const combined = Array.from(new Set([...prev, ...data.action_types]));
          return combined.sort();
        });
      }
    } catch (err) {
      console.error('Failed to load activity logs:', err);
    } finally {
      setLoading(false);
    }
  }, [page, actionType, search]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    setPage(1);
    setSearch(searchInput);
  };

  const handleActionChange = (e) => {
    setActionType(e.target.value);
    setPage(1);
  };

  const handleReset = () => {
    setSearchInput('');
    setSearch('');
    setActionType('ALL');
    setPage(1);
  };

  const defaultKnownActions = [
    'ALL',
    'LOGIN',
    'REGISTER',
    'CSV_IMPORT',
    'DIFFICULTY_CHANGE',
    'PROFILE_COMPLETE',
    'TEST_COMPLETED',
    'COMPANY_TEST_UNLOCKED',
    'COMPANY_TEST_COMPLETED',
    'ADAPTIVE_DIFFICULTY_EVALUATION',
  ];

  const distinctOptions = Array.from(
    new Set([...defaultKnownActions, ...availableActions])
  );

  return (
    <DashboardLayout navItems={ADMIN_NAV} subtitle="EdTech SaaS · Admin">
      <Topbar
        title="Activity Logs & Audit Trail"
        subtitle="Monitor system events, user logins, test attempts, and engine decisions."
        showSearch={false}
      />

      <div className={styles.container}>
        {/* Filters */}
        <div className={styles.filterCard}>
          <form onSubmit={handleSearchSubmit} className={styles.searchWrap}>
            <span className={styles.searchIcon}>
              <IconSearch width={16} height={16} />
            </span>
            <input
              type="text"
              placeholder="Search user name, email, or action..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              className={`form-input ${styles.searchInput}`}
            />
          </form>

          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <IconFilter width={15} height={15} style={{ color: 'var(--color-text-muted)' }} />
            <select
              value={actionType}
              onChange={handleActionChange}
              className={styles.selectInput}
              aria-label="Filter by action type"
            >
              {distinctOptions.map((opt) => (
                <option key={opt} value={opt}>
                  {opt === 'ALL' ? 'All Action Types' : opt}
                </option>
              ))}
            </select>
          </div>

          <button
            type="button"
            onClick={fetchLogs}
            className="btn btn-outline btn-sm"
            title="Refresh logs"
          >
            Refresh
          </button>

          {(search || actionType !== 'ALL') && (
            <button
              type="button"
              onClick={handleReset}
              className="btn btn-outline btn-sm"
              style={{ color: 'var(--color-text-muted)' }}
            >
              Clear Filters
            </button>
          )}

          <div style={{ marginLeft: 'auto', fontSize: 12, color: 'var(--color-text-muted)' }}>
            Total: <strong>{total}</strong> events
          </div>
        </div>

        {/* Logs Table */}
        <div className={adminStyles.tableCard}>
          <table className={adminStyles.table}>
            <thead>
              <tr>
                <th style={{ width: '180px' }}>Timestamp</th>
                <th style={{ width: '190px' }}>Action Type</th>
                <th>User</th>
                <th>Role</th>
                <th>Context Details</th>
                <th style={{ width: '90px', textAlign: 'right' }}>Details</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={6} style={{ textAlign: 'center', padding: 40, color: 'var(--color-text-muted)' }}>
                    Loading activity records…
                  </td>
                </tr>
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ textAlign: 'center', padding: 48, color: 'var(--color-text-muted)' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}>
                      <IconClock width={32} height={32} style={{ opacity: 0.4 }} />
                      <div>No activity logs found for the selected criteria.</div>
                    </div>
                  </td>
                </tr>
              ) : (
                logs.map((log) => (
                  <tr key={log.id}>
                    <td style={{ fontSize: 12, color: 'var(--color-text-muted)', whiteSpace: 'nowrap' }}>
                      {formatTimestamp(log.created_at)}
                    </td>
                    <td>
                      <span className={`${styles.badge} ${getActionBadgeClass(log.action_type)}`}>
                        {log.action_type}
                      </span>
                    </td>
                    <td>
                      {log.user_id ? (
                        <div className={styles.userCell}>
                          <span className={styles.userName}>{log.user_name || `User #${log.user_id}`}</span>
                          <span className={styles.userEmail}>{log.user_email || `ID: ${log.user_id}`}</span>
                        </div>
                      ) : (
                        <span style={{ color: 'var(--color-text-faint)', fontStyle: 'italic', fontSize: 12 }}>
                          System Event
                        </span>
                      )}
                    </td>
                    <td>
                      <span
                        style={{
                          fontSize: 11,
                          textTransform: 'capitalize',
                          padding: '2px 8px',
                          borderRadius: 4,
                          background: log.user_role === 'admin' ? 'var(--color-primary-soft)' : 'var(--color-surface-2)',
                          color: log.user_role === 'admin' ? 'var(--color-primary)' : 'var(--color-text-muted)',
                        }}
                      >
                        {log.user_role || (log.user_id ? 'user' : 'system')}
                      </span>
                    </td>
                    <td>
                      <div className={styles.detailsPreview}>
                        {formatDetailsPreview(log.details)}
                      </div>
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      {log.details ? (
                        <button
                          type="button"
                          className={styles.viewBtn}
                          onClick={() => setSelectedLog(log)}
                        >
                          View
                        </button>
                      ) : (
                        <span style={{ color: 'var(--color-text-faint)', fontSize: 12 }}>—</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>

          {/* Pagination */}
          <div className={adminStyles.pagination}>
            <span style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>
              Page <strong>{page}</strong> of <strong>{totalPages}</strong> ({total} total entries)
            </span>
            <div style={{ display: 'flex', gap: 8 }}>
              <button
                type="button"
                className="btn btn-outline btn-sm"
                disabled={page <= 1 || loading}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              >
                <IconArrowLeft width={14} height={14} /> Previous
              </button>
              <button
                type="button"
                className="btn btn-outline btn-sm"
                disabled={page >= totalPages || loading}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              >
                Next <IconArrowRight width={14} height={14} />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Structured Details Modal */}
      {selectedLog && (
        <div className={styles.jsonModalOverlay} onClick={() => setSelectedLog(null)}>
          <div className={styles.jsonModalCard} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <div className={styles.modalTitle}>
                <span className={`${styles.badge} ${getActionBadgeClass(selectedLog.action_type)}`}>
                  {selectedLog.action_type}
                </span>
                <span style={{ fontSize: 13, color: 'var(--color-text-muted)' }}>
                  Log #{selectedLog.id}
                </span>
              </div>
              <button
                type="button"
                className="btn btn-outline btn-sm"
                onClick={() => setSelectedLog(null)}
                style={{ padding: 6 }}
                aria-label="Close details"
              >
                <IconX width={14} height={14} />
              </button>
            </div>
            <div className={styles.modalBody}>
              <div style={{ marginBottom: 14, fontSize: 12, color: 'var(--color-text-muted)' }}>
                <strong>Timestamp:</strong> {formatTimestamp(selectedLog.created_at)}
                <br />
                <strong>User:</strong>{' '}
                {selectedLog.user_name ? `${selectedLog.user_name} (${selectedLog.user_email})` : 'System Event'}
              </div>

              <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 6 }}>
                Payload / Details:
              </div>
              <pre className={styles.preBlock}>
                {JSON.stringify(selectedLog.details, null, 2)}
              </pre>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
};

export default ActivityLogs;
