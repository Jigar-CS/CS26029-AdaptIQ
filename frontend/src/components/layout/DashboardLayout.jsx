import Sidebar from './Sidebar';
import styles from './DashboardLayout.module.css';

/**
 * Shell used by student and admin views with Warm Ivory footer
 */
const DashboardLayout = ({ navItems, subtitle, children, footer = true }) => (
  <div className={styles.layout}>
    <Sidebar navItems={navItems} subtitle={subtitle} />
    <div className={styles.main}>
      <div className={styles.content}>{children}</div>
      {footer && (
        <footer className={styles.footer}>
          <div className={styles.footerBrandGroup}>
            <span className={styles.footerBrand}>AdaptIQ</span>
            <span className={styles.versionBadge}>v2.4 PRO</span>
          </div>
          <nav className={styles.footerLinks}>
            <a href="#privacy">Privacy Policy</a>
            <a href="#terms">Terms of Service</a>
            <a href="#irt-docs">IRT Model Docs</a>
            <a href="#support">Help & Support</a>
          </nav>
          <span className={styles.footerCopy}>© 2026 AdaptIQ AI Education Platform.</span>
        </footer>
      )}
    </div>
  </div>
);

export default DashboardLayout;
