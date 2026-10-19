import {
  ArrowRight,
  Bell,
  BookOpen,
  Bus,
  Camera,
  CalendarClock,
  CalendarDays,
  ChartColumn,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  CircleAlert,
  CircleCheck,
  CircleHelp,
  Clock,
  Columns3,
  Eye,
  EyeOff,
  Globe,
  House,
  Inbox,
  Info,
  KeyRound,
  LayoutDashboard,
  Library,
  List,
  Lock,
  LogOut,
  Mail,
  MapPin,
  Menu,
  MessagesSquare,
  MoreHorizontal,
  NotebookPen,
  Pencil,
  Phone,
  Plus,
  Receipt,
  RefreshCw,
  School,
  Search,
  Settings,
  Shield,
  Sparkles,
  Star,
  TrendingDown,
  TrendingUp,
  User,
  UserRound,
  UsersRound,
  Wallet,
  X,
  CalendarCheck,
  GraduationCap,
  type LucideIcon,
} from 'lucide-react-native';
import type { ViewStyle } from 'react-native';

import { colors } from '../theme';

/**
 * The icon vocabulary used across the mobile app. The names mirror the ones
 * used by the web app so navigation and screens stay recognisable, but the
 * components come from `lucide-react-native`.
 */
export type IconName =
  | 'dashboard'
  | 'bus'
  | 'students'
  | 'admissions'
  | 'marks'
  | 'mark'
  | 'teacher'
  | 'parents'
  | 'class'
  | 'sections'
  | 'roster'
  | 'subject'
  | 'attendance'
  | 'homework'
  | 'lesson-plan'
  | 'learning-content'
  | 'requests'
  | 'books'
  | 'finance'
  | 'timetable'
  | 'bell'
  | 'messages'
  | 'settings'
  | 'home'
  | 'reports'
  | 'logout'
  | 'plus'
  | 'refresh'
  | 'search'
  | 'close'
  | 'chevron-left'
  | 'chevron-right'
  | 'lock'
  | 'mail'
  | 'user'
  | 'shield'
  | 'sparkles'
  | 'trending'
  | 'inbox'
  | 'alert'
  | 'check'
  | 'menu'
  | 'arrow-right'
  | 'phone'
  | 'map-pin'
  | 'star'
  | 'globe'
  | 'eye'
  | 'eye-off'
  | 'key'
  | 'help'
  | 'info'
  | 'chevron-down'
  | 'more'
  | 'trending-down'
  | 'calendar-check'
  | 'receipt'
  | 'graduation'
  | 'camera'
  | 'edit';

const ICONS: Record<IconName, LucideIcon> = {
  dashboard: LayoutDashboard,
  bus: Bus,
  students: School,
  admissions: UsersRound,
  marks: ChartColumn,
  mark: NotebookPen,
  teacher: UserRound,
  parents: UsersRound,
  class: School,
  sections: Columns3,
  roster: List,
  subject: BookOpen,
  attendance: CalendarDays,
  homework: NotebookPen,
  'lesson-plan': CalendarClock,
  'learning-content': BookOpen,
  requests: Inbox,
  books: Library,
  finance: Wallet,
  timetable: Clock,
  bell: Bell,
  messages: MessagesSquare,
  settings: Settings,
  home: House,
  reports: ChartColumn,
  logout: LogOut,
  plus: Plus,
  refresh: RefreshCw,
  search: Search,
  close: X,
  'chevron-left': ChevronLeft,
  'chevron-right': ChevronRight,
  lock: Lock,
  mail: Mail,
  user: User,
  shield: Shield,
  sparkles: Sparkles,
  trending: TrendingUp,
  inbox: Inbox,
  alert: CircleAlert,
  check: CircleCheck,
  menu: Menu,
  'arrow-right': ArrowRight,
  phone: Phone,
  'map-pin': MapPin,
  star: Star,
  globe: Globe,
  eye: Eye,
  'eye-off': EyeOff,
  key: KeyRound,
  help: CircleHelp,
  info: Info,
  'chevron-down': ChevronDown,
  more: MoreHorizontal,
  'trending-down': TrendingDown,
  'calendar-check': CalendarCheck,
  receipt: Receipt,
  graduation: GraduationCap,
  camera: Camera,
  edit: Pencil,
};

export interface IconProps {
  name: IconName;
  size?: number;
  color?: string;
  style?: ViewStyle;
}

export function Icon({ name, size = 18, color, style }: IconProps) {
  const Component = ICONS[name];
  return (
    <Component
      size={size}
      color={color ?? colors.text}
      strokeWidth={1.9}
      style={style}
      accessibilityLabel={name}
    />
  );
}
