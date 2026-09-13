import {
  IconDashboard,
  IconCourses,
  IconAssignments,
  IconAnalytics,
  IconCommunity,
  IconSettings,
  IconClock,
} from '../icons/Icon';

export const STUDENT_NAV = [
  { to: '/dashboard', label: 'Dashboard', icon: IconDashboard },
  { to: '/practice', label: 'Topic Practice', icon: IconCourses },
  { to: '/misc-test', label: 'Adaptive Assessment', icon: IconAssignments },
  { to: '/company-tests', label: 'Company Tests', icon: IconCommunity },
  { to: '/performance', label: 'Analytics', icon: IconAnalytics },
  { to: '/profile', label: 'My Profile', icon: IconSettings },
];

export const ADMIN_NAV = [
  { to: '/admin', label: 'Dashboard', icon: IconDashboard },
  { to: '/admin/topics', label: 'Topics', icon: IconCourses },
  { to: '/admin/questions', label: 'Questions', icon: IconAssignments },
  { to: '/admin/analytics', label: 'Analytics', icon: IconAnalytics },
  { to: '/admin/activity-logs', label: 'Activity Logs', icon: IconClock },
  { to: '/admin/users', label: 'Users', icon: IconCommunity },
  { to: '/admin/csv-import', label: 'CSV Import', icon: IconSettings },
];
