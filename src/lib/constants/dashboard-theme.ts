/** Body classes toggled by role dashboard layouts — keep in sync with globals.css */
export const DASHBOARD_BODY_CLASSES = {
  /** Shared theme for teacher + school admin dashboards */
  staff: 'staff-dashboard-active',
  /** Student dashboard (distinct glass-style theme) */
  student: 'student-dashboard-active',
} as const;

/** Shared content wrapper class for staff dashboard pages */
export const DASHBOARD_CONTENT_CLASS = 'dashboard-content';
