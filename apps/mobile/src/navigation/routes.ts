/**
 * Route definitions for the mobile app.
 *
 * The route names mirror the paths the web app uses, adapted to React
 * Navigation's naming. Together they describe every screen the app can show
 * and which roles may open them.
 */
export const ROUTES = {
  public: {
    welcome: 'welcome',
    home: 'public-home',
    about: 'public-about',
    features: 'public-features',
    modules: 'public-modules',
    plans: 'public-plans',
    faq: 'public-faq',
    contact: 'public-contact',
    login: 'login-admin',
    loginTeacher: 'login-teacher',
    loginParent: 'login-parent',
  },
  admin: {
    /** The bottom-tab host that wraps Dashboard / Academics / Notifications / Profile. */
    tabs: 'tabs',
    dashboard: 'admin-dashboard',
    academics: 'academics',
    notifications: 'notifications',
    messages: 'messages',
    settings: 'settings',
    profile: 'profile',
    students: 'student-details',
    /** Exam + subject marks review/entry (Mark Management). */
    marks: 'mark-management',
    /** Generic, config-driven list screen (module key passed as a route param). */
    resource: 'resource',
    /** Small informational page (About, Help, Change password notice). */
    info: 'info',
  },
  teacher: {
    portal: 'teacher-portal',
  },
  parent: {
    portal: 'parent-portal',
    timetable: 'parent-timetable',
    results: 'parent-results',
    invoices: 'parent-invoices',
    homework: 'parent-homework',
    vehicle: 'parent-vehicle',
  },
} as const;

export type Route =
  | (typeof ROUTES.public)[keyof (typeof ROUTES.public)]
  | (typeof ROUTES.admin)[keyof (typeof ROUTES.admin)]
  | (typeof ROUTES.teacher)[keyof (typeof ROUTES.teacher)]
  | (typeof ROUTES.parent)[keyof (typeof ROUTES.parent)];

export const LOGIN_ROUTES = {
  admin: ROUTES.public.login,
  teacher: ROUTES.public.loginTeacher,
  parent: ROUTES.public.loginParent,
} as const;
