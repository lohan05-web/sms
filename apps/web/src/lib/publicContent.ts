import type { IconName } from '../components/Icon';

export interface PublicNavItem {
  label: string;
  to: string;
}

export const PUBLIC_NAV: PublicNavItem[] = [
  { label: 'Home', to: '/site' },
  { label: 'About', to: '/site/about' },
  { label: 'Features', to: '/site/features' },
  { label: 'Modules', to: '/site/modules' },
  { label: 'Plans', to: '/site/plans' },
  { label: 'FAQ', to: '/site/faq' },
  { label: 'Contact', to: '/site/contact' },
];

export interface SiteStat {
  value: string;
  label: string;
}

export const SITE_STATS: SiteStat[] = [
  { value: '30+', label: 'Built-in modules' },
  { value: '4', label: 'Role-based portals' },
  { value: '100%', label: 'Web-based, no installs' },
  { value: '24/7', label: 'Cloud availability' },
];

export interface SiteFeature {
  icon: IconName;
  title: string;
  description: string;
}

export const SITE_FEATURES: SiteFeature[] = [
  {
    icon: 'dashboard',
    title: 'Unified dashboard',
    description:
      'A single command centre with live attendance, fee collection and academic pipeline metrics.',
  },
  {
    icon: 'admissions',
    title: 'Admissions pipeline',
    description:
      'Track every enquiry from walk-in to enrolment with follow-ups, sources and status stages.',
  },
  {
    icon: 'attendance',
    title: 'Smart attendance',
    description:
      'Mark a whole section in seconds and surface absentee trends to class teachers instantly.',
  },
  {
    icon: 'finance',
    title: 'Fees & invoicing',
    description:
      'Generate invoices in bulk, record payments and chase defaulters from a dedicated fee desk.',
  },
  {
    icon: 'marks',
    title: 'Exams & report cards',
    description:
      'Capture marks, apply grading schemes automatically and print professional report cards.',
  },
  {
    icon: 'lesson-plan',
    title: 'Lesson planning',
    description:
      'Plan lessons against the syllabus, attach resources and keep a term-by-term record.',
  },
  {
    icon: 'learning-content',
    title: 'Learning content',
    description:
      'Publish links, documents and media to the right classes as a shared content library.',
  },
  {
    icon: 'messages',
    title: 'Messaging & notices',
    description:
      'Broadcast notices and hold real-time conversations with staff, parents and students.',
  },
  {
    icon: 'reports',
    title: 'Reports & analytics',
    description:
      'Export insight on enrolment, attendance, performance and finance whenever you need it.',
  },
];

export interface SiteModule {
  icon: IconName;
  title: string;
  description: string;
}

export const SITE_MODULES: SiteModule[] = [
  {
    icon: 'admissions',
    title: 'Admissions & Enquiries',
    description: 'Capture leads, schedule follow-ups and convert enquiries into enrolled students.',
  },
  {
    icon: 'students',
    title: 'Student Information',
    description: 'Master records with photos, guardians, sections and full academic history.',
  },
  {
    icon: 'teacher',
    title: 'Staff & HR',
    description: 'Teacher profiles, class assignments, subjects and employment status.',
  },
  {
    icon: 'timetable',
    title: 'Classes & Timetable',
    description: 'Class levels, sections, subjects and a clash-free weekly timetable.',
  },
  {
    icon: 'attendance',
    title: 'Attendance',
    description: 'Daily marking, leave records and per-section attendance analytics.',
  },
  {
    icon: 'marks',
    title: 'Exams & Report Cards',
    description: 'Exam setup, marks entry, grades and printable report cards.',
  },
  {
    icon: 'homework',
    title: 'Homework & Submissions',
    description: 'Assign homework, attach material and track student submissions.',
  },
  {
    icon: 'lesson-plan',
    title: 'Lesson Plans & Syllabus',
    description: 'Plan lessons against syllabus units and record delivery progress.',
  },
  {
    icon: 'books',
    title: 'Library',
    description: 'Catalogue titles, issue loans and monitor overdue returns.',
  },
  {
    icon: 'finance',
    title: 'Fees & Payments',
    description: 'Fee structures, bulk invoicing, payments and outstanding balances.',
  },
  {
    icon: 'map-pin',
    title: 'Transport',
    description: 'Vehicles, routes, stops and student transport subscriptions.',
  },
  {
    icon: 'messages',
    title: 'Communication',
    description: 'Notices, notifications and real-time messaging in one place.',
  },
];

export interface ModuleGroup {
  title: string;
  icon: IconName;
  summary: string;
  modules: string[];
}

export const SITE_MODULE_GROUPS: ModuleGroup[] = [
  {
    title: 'Academics',
    icon: 'subject',
    summary: 'Everything a class teacher, coordinator or principal touches every day.',
    modules: [
      'Students & guardians',
      'Classes, sections & subjects',
      'Attendance & leave',
      'Homework & submissions',
      'Lesson plans & syllabus',
      'Learning content library',
      'Timetable',
    ],
  },
  {
    title: 'Assessment',
    icon: 'marks',
    summary: 'From exam setup to printed report cards, fully automated grading.',
    modules: ['Exam setup', 'Marks entry', 'Grading schemes', 'Report cards', 'Class performance'],
  },
  {
    title: 'Finance',
    icon: 'finance',
    summary: 'A clear ledger of what is billed, collected and outstanding.',
    modules: [
      'Fee categories & structures',
      'Bulk invoice generation',
      'Payments & receipts',
      'Fee desk & defaulters',
      'Financial reports',
    ],
  },
  {
    title: 'Operations',
    icon: 'timetable',
    summary: 'The day-to-day running of the school behind the scenes.',
    modules: ['Library & loans', 'Vehicles, routes & stops', 'Transport subscriptions', 'Audit log'],
  },
  {
    title: 'Communication',
    icon: 'messages',
    summary: 'Reach the whole school or a single parent in seconds.',
    modules: ['Notice board', 'Push notifications', 'Real-time messaging', 'Service requests & certificates'],
  },
  {
    title: 'Insight',
    icon: 'reports',
    summary: 'Role-based dashboards and exports for confident decisions.',
    modules: ['Dashboard & pipeline', 'Reports & exports', 'Role-based access', 'School settings'],
  },
];

export interface SitePlan {
  name: string;
  price: string;
  period: string;
  tagline: string;
  features: string[];
  cta: string;
  highlighted?: boolean;
}

export const SITE_PLANS: SitePlan[] = [
  {
    name: 'Starter',
    price: '$0',
    period: 'free forever',
    tagline: 'For a single school putting its first systems in place.',
    features: [
      'Up to 300 students',
      'Students, classes & attendance',
      'Exams & report cards',
      'Notice board',
      'Admin & teacher logins',
      'Email support',
    ],
    cta: 'Get started',
  },
  {
    name: 'Growth',
    price: '$2',
    period: 'per student / month',
    tagline: 'For growing schools that need finance and transport in one place.',
    features: [
      'Unlimited students',
      'Everything in Starter',
      'Fees, invoicing & payments',
      'Fee desk & defaulters',
      'Library & transport',
      'Parent & student portals',
      'Real-time messaging',
      'Priority support',
    ],
    cta: 'Book a demo',
    highlighted: true,
  },
  {
    name: 'Enterprise',
    price: 'Custom',
    period: 'annual licence',
    tagline: 'For groups and trusts running several campuses.',
    features: [
      'Multi-school & multi-campus',
      'Everything in Growth',
      'Custom branding',
      'Data migration assistance',
      'Dedicated success manager',
      'SLA & onboarding training',
    ],
    cta: 'Talk to sales',
  },
];

export interface SiteFaq {
  question: string;
  answer: string;
}

export const SITE_FAQ: SiteFaq[] = [
  {
    question: 'Do we need to install any software?',
    answer:
      'No. SmartSchool runs in the browser for administrators, teachers and parents — there is nothing to install and no servers to maintain on your side.',
  },
  {
    question: 'How long does it take to get started?',
    answer:
      'Most schools are importing students and marking attendance within a day. On Growth and Enterprise plans our team helps with data import and staff training.',
  },
  {
    question: 'Can we control who sees what?',
    answer:
      'Yes. Every role — principal, admin, accountant, teacher, librarian, parent and student — has a tailored portal and granular permissions, so staff only see what they need.',
  },
  {
    question: 'Does it handle fee receipts and outstanding balances?',
    answer:
      'Absolutely. The finance module generates invoices in bulk, records payments against them and gives you a fee desk that highlights outstanding balances and defaulters.',
  },
  {
    question: 'Is our school data safe?',
    answer:
      'Yes. Access is protected by secure sign-in and role-based permissions, sensitive actions are recorded in an audit log, and data is stored in an encrypted, backed-up database.',
  },
  {
    question: 'Can it grow with us?',
    answer:
      'It is designed to. Start with attendance and examinations, then switch on finance, transport and messaging whenever you are ready — no re-implementation required.',
  },
];

export interface SiteStep {
  title: string;
  description: string;
}

export const SITE_STEPS: SiteStep[] = [
  {
    title: 'Set up your school',
    description: 'Add classes, sections and staff, then import your student list in a few clicks.',
  },
  {
    title: 'Run the school day',
    description: 'Mark attendance, set homework, plan lessons and record marks across every section.',
  },
  {
    title: 'Stay in control',
    description: 'Watch fees, performance and the admissions pipeline from one live dashboard.',
  },
];

export interface SiteValue {
  icon: IconName;
  title: string;
  description: string;
}

export const SITE_VALUES: SiteValue[] = [
  {
    icon: 'shield',
    title: 'Reliable by design',
    description: 'Role-based security and audit trails are built in, not bolted on.',
  },
  {
    icon: 'sparkles',
    title: 'Simple to use',
    description: 'Clean, uncluttered screens that teachers understand on the very first day.',
  },
  {
    icon: 'trending',
    title: 'Built to scale',
    description: 'From a single classroom to a multi-campus group, the same platform fits.',
  },
  {
    icon: 'globe',
    title: 'Web-first',
    description: 'Reachable from any device on the school network or at home, with zero setup.',
  },
];

export interface ContactChannel {
  icon: IconName;
  label: string;
  value: string;
  href?: string;
}

export const CONTACT_CHANNELS: ContactChannel[] = [
  {
    icon: 'mail',
    label: 'Email',
    value: 'hello@smartschool.app',
    href: 'mailto:hello@smartschool.app',
  },
  {
    icon: 'phone',
    label: 'Phone',
    value: '+1 (555) 010-2020',
    href: 'tel:+15550102020',
  },
  {
    icon: 'map-pin',
    label: 'Office',
    value: 'Level 4, Learning Square, City Centre',
  },
];
