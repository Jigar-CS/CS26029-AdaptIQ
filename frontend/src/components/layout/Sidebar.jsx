import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { IconLogout } from '../icons/Icon';
import styles from './Sidebar.module.css';

/**
 * Modern Warm Ivory Sidebar matching the reference design 1:1
 */
const Sidebar = ({ navItems, subtitle = 'EDTECH SAAS' }) => {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const displayName = user?.name || 'Demo Student';
  const initial = displayName.trim().charAt(0).toUpperCase() || 'D';
  const roleLabel = user?.role === 'admin' ? 'System Administrator' : 'Candidate Student';

  return (
    <aside className={styles.sidebar}>
      {/* Brand Header */}
      <div className={styles.logoSection}>
        <div className={styles.brandIconBox}>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 2a4 4 0 0 0-4 4v1a4 4 0 0 0-4 4v3a4 4 0 0 0 4 4v1a4 4 0 0 0 8 0v-1a4 4 0 0 0 4-4v-3a4 4 0 0 0-4-4V6a4 4 0 0 0-4-4z"/>
            <path d="M12 6v14"/>
            <path d="M7 10h10"/>
          </svg>
        </div>
        <div className={styles.brandInfo}>
          <span className={styles.brandName}>AdaptIQ</span>
          <span className={styles.brandTag}>{subtitle}</span>
        </div>
      </div>

      {/* Navigation Section */}
      <div className={styles.navSection}>
        <div className={styles.navHeader}>
          {user?.role === 'admin' ? 'ADMIN NAVIGATION' : 'STUDENT NAVIGATION'}
        </div>
        <nav className={styles.navList}>
          {navItems.map(({ to, label, icon: Icon }) => {
            const active = location.pathname === to || (to === '/practice' && location.pathname.startsWith('/practice'));
            return (
              <Link
                key={to}
                to={to}
                className={`${styles.navLink} ${active ? styles.navLinkActive : ''}`}
              >
                <span className={styles.linkIcon}>
                  <Icon width={18} height={18} />
                </span>
                <span className={styles.linkLabel}>{label}</span>
              </Link>
            );
          })}
        </nav>
      </div>

      {/* Sidebar Footer Elements */}
      <div className={styles.sidebarFooter}>
        {/* IRT Adaptive Engine Card */}
        <div className={styles.engineCard}>
          <div className={styles.engineHeader}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/>
            </svg>
            <span>IRT Adaptive Engine</span>
          </div>
          <p className={styles.engineDesc}>
            Difficulty dynamically scales across Easy, Medium & Hard based on 5-question response batches.
          </p>
        </div>

        {/* User Status Card */}
        <div className={styles.userCard}>
          <div className={styles.avatarCircle}>{initial}</div>
          <div className={styles.userMeta}>
            <div className={styles.userName}>{displayName}</div>
            <div className={styles.userStatus}>
              <span className={styles.statusDot}></span>
              <span>{roleLabel}</span>
            </div>
          </div>
          <button className={styles.logoutBtn} onClick={handleLogout} title="Sign Out">
            <IconLogout width={16} height={16} />
          </button>
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;
