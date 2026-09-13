import { useAuth } from '../../context/AuthContext';
import { IconSearch, IconBell } from '../icons/Icon';
import styles from './Topbar.module.css';

/**
 * Topbar matching Warm Ivory reference layout
 */
const Topbar = ({
  title,
  subtitle,
  rightSlot,
  showSearch = true,
  showTargetBadge = true,
  searchPlaceholder = 'Search...',
}) => {
  const { user } = useAuth();
  const displayName = user?.name || 'Demo';
  const initial = displayName.trim().charAt(0).toUpperCase() || 'D';

  return (
    <header className={styles.topbar}>
      <div className={styles.titleBlock}>
        <h1 className={styles.title}>{title}</h1>
        {subtitle && <p className={styles.subtitle}>{subtitle}</p>}
      </div>

      <div className={styles.actions}>
        {showTargetBadge && (
          <div className={styles.targetBadge}>
            <span className={styles.targetDot}></span>
            <span>Target: Tier-1 Tech Placement Assessment</span>
          </div>
        )}

        {showSearch && (
          <div className={styles.searchBox}>
            <IconSearch width={14} height={14} />
            <input type="text" placeholder={searchPlaceholder} />
            <span className={styles.kbdShortcut}>⌘K</span>
          </div>
        )}

        {rightSlot}

        <button className={styles.iconBtn} title="Notifications">
          <IconBell width={16} height={16} />
        </button>

        <div className={styles.avatarBtn} title={displayName}>
          {initial}
        </div>
      </div>
    </header>
  );
};

export default Topbar;
