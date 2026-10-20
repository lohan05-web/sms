import { useId } from 'react';

/**
 * Self-contained, theme-matched SVG illustrations for the public marketing
 * site. They use the navy / teal palette so they sit naturally on
 * the existing gradient theme, and they never depend on external image files
 * (so there are no broken links or network requests).
 *
 * Every illustration is decorative: the surrounding copy carries the meaning,
 * so each SVG is marked `aria-hidden` and removed from the accessibility tree.
 */

const COMMON = 'site-illus';

interface ArtProps {
  className?: string;
}

function classes(extra?: string): string {
  return extra ? `${COMMON} ${extra}` : COMMON;
}

/* -------------------------------------------------------------------------- */
/*  Hero scene — a school dashboard with floating people bubbles               */
/* -------------------------------------------------------------------------- */

export function HeroScene({ className }: ArtProps) {
  const id = useId().replace(/:/g, '');
  return (
    <svg
      className={classes(className)}
      viewBox="0 0 600 440"
      role="presentation"
      aria-hidden="true"
      focusable="false"
    >
      <defs>
        <linearGradient id={`${id}-screen`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#1b2450" />
          <stop offset="100%" stopColor="#0b1220" />
        </linearGradient>
        <linearGradient id={`${id}-brand`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#14b8a6" />
          <stop offset="100%" stopColor="#2dd4bf" />
        </linearGradient>
        <linearGradient id={`${id}-sky`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#5eead4" />
          <stop offset="100%" stopColor="#14b8a6" />
        </linearGradient>
        <linearGradient id={`${id}-soft`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#f0fdfa" />
          <stop offset="100%" stopColor="#e6fffb" />
        </linearGradient>
        <radialGradient id={`${id}-halo`} cx="50%" cy="45%" r="55%">
          <stop offset="0%" stopColor="#99f6e4" stopOpacity="0.55" />
          <stop offset="100%" stopColor="#99f6e4" stopOpacity="0" />
        </radialGradient>
      </defs>

      <circle cx="300" cy="200" r="205" fill={`url(#${id}-halo)`} />

      {/* Dashboard screen */}
      <g>
        <rect x="92" y="40" width="416" height="272" rx="22" fill={`url(#${id}-screen)`} />
        <rect
          x="92.5"
          y="40.5"
          width="415"
          height="271"
          rx="21.5"
          fill="none"
          stroke="#ffffff"
          strokeOpacity="0.12"
        />
        <circle cx="116" cy="64" r="4.5" fill="#f87171" />
        <circle cx="131" cy="64" r="4.5" fill="#fbbf24" />
        <circle cx="146" cy="64" r="4.5" fill="#34d399" />
        <rect x="112" y="86" width="118" height="11" rx="5.5" fill="#ffffff" fillOpacity="0.55" />
        <rect x="112" y="106" width="72" height="8" rx="4" fill="#ffffff" fillOpacity="0.22" />

        {/* Bar chart */}
        <rect x="112" y="196" width="22" height="70" rx="6" fill={`url(#${id}-brand)`} />
        <rect x="144" y="168" width="22" height="98" rx="6" fill={`url(#${id}-sky)`} />
        <rect x="176" y="206" width="22" height="60" rx="6" fill={`url(#${id}-brand)`} />
        <rect x="208" y="150" width="22" height="116" rx="6" fill={`url(#${id}-sky)`} />

        {/* Donut */}
        <circle cx="392" cy="176" r="46" fill="none" stroke="#ffffff" strokeOpacity="0.12" strokeWidth="16" />
        <circle
          cx="392"
          cy="176"
          r="46"
          fill="none"
          stroke={`url(#${id}-brand)`}
          strokeWidth="16"
          strokeLinecap="round"
          strokeDasharray="210 290"
          transform="rotate(-90 392 176)"
        />

        {/* Attendance rows */}
        <rect x="300" y="118" width="150" height="10" rx="5" fill="#ffffff" fillOpacity="0.5" />
        <rect x="300" y="240" width="150" height="9" rx="4.5" fill="#ffffff" fillOpacity="0.16" />
        <rect x="300" y="258" width="118" height="9" rx="4.5" fill="#ffffff" fillOpacity="0.16" />
        <rect x="300" y="276" width="134" height="9" rx="4.5" fill="#ffffff" fillOpacity="0.16" />
      </g>

      {/* People bubbles */}
      <g>
        <circle cx="150" cy="336" r="58" fill="#ffffff" />
        <circle cx="150" cy="336" r="58" fill="none" stroke="#e6fffb" />
        <circle cx="150" cy="322" r="20" fill="#f2c6a0" />
        <path d="M150 300a20 20 0 0 1 20 20c0-8-9-12-20-12s-20 4-20 12a20 20 0 0 1 20-20Z" fill="#2a2f45" />
        <path d="M112 384a38 38 0 0 1 76 0Z" fill={`url(#${id}-brand)`} />
        <path d="M134 352l16 14 16-14" fill="none" stroke="#ffffff" strokeWidth="3" strokeLinecap="round" />

        <circle cx="300" cy="356" r="52" fill="#ffffff" />
        <circle cx="300" cy="356" r="52" fill="none" stroke="#e6fffb" />
        <circle cx="300" cy="344" r="18" fill="#d29c74" />
        <path d="M300 326c-11 0-18 6-18 14 4-6 11-8 18-8s14 2 18 8c0-8-7-14-18-14Z" fill="#5b3f2e" />
        <path d="M266 398a34 34 0 0 1 68 0Z" fill={`url(#${id}-sky)`} />

        <circle cx="450" cy="340" r="54" fill="#ffffff" />
        <circle cx="450" cy="340" r="54" fill="none" stroke="#e6fffb" />
        <circle cx="450" cy="327" r="19" fill="#f2c6a0" />
        <path d="M450 308c-12 0-19 7-19 16 5-7 12-9 19-9s14 2 19 9c0-9-7-16-19-16Z" fill="#2a2f45" />
        <path d="M414 384a36 36 0 0 1 72 0Z" fill={`url(#${id}-brand)`} />
      </g>

      {/* Floating chips */}
      <g>
        <g transform="translate(40 96) rotate(-8)">
          <rect width="74" height="52" rx="14" fill="#ffffff" />
          <rect x="12" y="14" width="50" height="7" rx="3.5" fill="#ccfbf1" />
          <rect x="12" y="30" width="30" height="7" rx="3.5" fill="#e6fffb" />
        </g>

        <g transform="translate(492 120) rotate(7)">
          <rect width="66" height="66" rx="18" fill={`url(#${id}-brand)`} />
          <text
            x="33"
            y="43"
            textAnchor="middle"
            fontFamily="Inter, Segoe UI, sans-serif"
            fontSize="26"
            fontWeight="800"
            fill="#ffffff"
          >
            A+
          </text>
        </g>

        <g transform="translate(500 296) rotate(-6)">
          <rect width="60" height="60" rx="16" fill="#ffffff" />
          <path
            d="M30 16l4.4 9.2 10 1.4-7.2 7 1.7 10-8.9-4.8-8.9 4.8 1.7-10-7.2-7 10-1.4Z"
            fill="#f59e0b"
          />
        </g>

        <g transform="translate(64 268) rotate(9)">
          <rect width="60" height="60" rx="16" fill="#ffffff" />
          <path d="M18 40V24a3 3 0 0 1 3-3h18a3 3 0 0 1 3 3" fill="none" stroke={`url(#${id}-brand)`} strokeWidth="3.4" strokeLinecap="round" />
          <path d="M18 40h24a3 3 0 0 0 3-3V22" fill="none" stroke={`url(#${id}-sky)`} strokeWidth="3.4" strokeLinecap="round" />
          <path d="M15 22l15-9 15 9-15 9Z" fill={`url(#${id}-brand)`} />
        </g>
      </g>

      {/* Base shadow */}
      <ellipse cx="300" cy="424" rx="210" ry="16" fill={`url(#${id}-soft)`} opacity="0.5" />
    </svg>
  );
}

/* -------------------------------------------------------------------------- */
/*  Classroom scene — a teacher and two students at a board                    */
/* -------------------------------------------------------------------------- */

export function ClassroomArt({ className }: ArtProps) {
  const id = useId().replace(/:/g, '');
  return (
    <svg
      className={classes(className)}
      viewBox="0 0 560 380"
      role="img"
      aria-label="Illustration of a teacher presenting a lesson to two students in a classroom"
    >
      <defs>
        <linearGradient id={`${id}-board`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#1b2450" />
          <stop offset="100%" stopColor="#0f1a33" />
        </linearGradient>
        <linearGradient id={`${id}-brand`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#14b8a6" />
          <stop offset="100%" stopColor="#2dd4bf" />
        </linearGradient>
        <linearGradient id={`${id}-sky`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#5eead4" />
          <stop offset="100%" stopColor="#14b8a6" />
        </linearGradient>
        <linearGradient id={`${id}-wall`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#f5f7ff" />
          <stop offset="100%" stopColor="#e7ecfb" />
        </linearGradient>
      </defs>

      <rect x="20" y="24" width="520" height="330" rx="26" fill={`url(#${id}-wall)`} />

      {/* Blackboard */}
      <rect x="120" y="52" width="330" height="176" rx="16" fill={`url(#${id}-board)`} />
      <rect x="120" y="52" width="330" height="176" rx="16" fill="none" stroke="#ffffff" strokeOpacity="0.1" />
      <rect x="146" y="78" width="130" height="12" rx="6" fill="#ffffff" fillOpacity="0.6" />
      <rect x="146" y="102" width="86" height="9" rx="4.5" fill="#99f6e4" fillOpacity="0.8" />
      <rect x="146" y="126" width="110" height="9" rx="4.5" fill="#ffffff" fillOpacity="0.22" />
      <circle cx="392" cy="140" r="42" fill="none" stroke="#ffffff" strokeOpacity="0.14" strokeWidth="14" />
      <circle
        cx="392"
        cy="140"
        r="42"
        fill="none"
        stroke={`url(#${id}-sky)`}
        strokeWidth="14"
        strokeLinecap="round"
        strokeDasharray="150 260"
        transform="rotate(-90 392 140)"
      />
      <rect x="146" y="158" width="70" height="9" rx="4.5" fill="#ffffff" fillOpacity="0.22" />
      <rect x="146" y="180" width="96" height="9" rx="4.5" fill="#ffffff" fillOpacity="0.22" />

      {/* Teacher */}
      <g>
        <circle cx="96" cy="196" r="22" fill="#f2c6a0" />
        <path d="M96 172c-13 0-22 8-22 19 6-8 14-10 22-10s16 2 22 10c0-11-9-19-22-19Z" fill="#2a2f45" />
        <path d="M70 262a26 26 0 0 1 52 0Z" fill={`url(#${id}-brand)`} />
        <rect x="70" y="236" width="52" height="30" rx="15" fill={`url(#${id}-brand)`} />
        <path d="M122 240l54-30" stroke="#f2c6a0" strokeWidth="7" strokeLinecap="round" />
        <circle cx="178" cy="208" r="6" fill="#2a2f45" />
      </g>

      {/* Students at a desk */}
      <g>
        <rect x="300" y="300" width="210" height="16" rx="8" fill="#ccfbf1" />
        <circle cx="360" cy="256" r="20" fill="#d29c74" />
        <path d="M360 236c-12 0-20 6-20 15 5-6 12-8 20-8s15 2 20 8c0-9-8-15-20-15Z" fill="#5b3f2e" />
        <rect x="332" y="272" width="56" height="30" rx="15" fill={`url(#${id}-sky)`} />
        <circle cx="438" cy="248" r="20" fill="#f2c6a0" />
        <path d="M438 228c-12 0-20 6-20 15 5-6 12-8 20-8s15 2 20 8c0-9-8-15-20-15Z" fill="#2a2f45" />
        <rect x="410" y="264" width="56" height="38" rx="15" fill={`url(#${id}-brand)`} />
      </g>

      {/* Desk items */}
      <rect x="330" y="284" width="52" height="16" rx="4" fill="#ffffff" />
      <rect x="336" y="278" width="40" height="12" rx="3" fill="#e6fffb" />
    </svg>
  );
}

/* -------------------------------------------------------------------------- */
/*  People bubbles — teacher / student / parent                                */
/* -------------------------------------------------------------------------- */

type AvatarVariant = 'teacher' | 'student' | 'parent';

const AVATAR_PALETTE: Record<
  AvatarVariant,
  { skin: string; hair: string; shirt: string; accent: string }
> = {
  teacher: { skin: '#f2c6a0', hair: '#2a2f45', shirt: 'brand', accent: '#f59e0b' },
  student: { skin: '#d29c74', hair: '#5b3f2e', shirt: 'sky', accent: '#34d399' },
  parent: { skin: '#e8b48c', hair: '#3f2f24', shirt: 'violet', accent: '#5eead4' },
};

export function AvatarArt({ variant, className }: { variant: AvatarVariant } & ArtProps) {
  const id = useId().replace(/:/g, '');
  const p = AVATAR_PALETTE[variant];
  const fill =
    p.shirt === 'sky' ? `url(#${id}-c)` : p.shirt === 'violet' ? `url(#${id}-d)` : `url(#${id}-b)`;
  return (
    <svg
      className={classes(className)}
      viewBox="0 0 220 220"
      role="img"
      aria-label={`${variant} illustration`}
    >
      <defs>
        <linearGradient id={`${id}-b`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#14b8a6" />
          <stop offset="100%" stopColor="#2dd4bf" />
        </linearGradient>
        <linearGradient id={`${id}-c`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#5eead4" />
          <stop offset="100%" stopColor="#14b8a6" />
        </linearGradient>
        <linearGradient id={`${id}-d`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#2dd4bf" />
          <stop offset="100%" stopColor="#14b8a6" />
        </linearGradient>
      </defs>

      <circle cx="110" cy="110" r="96" fill="#f0fdfa" />
      <circle cx="110" cy="110" r="96" fill="none" stroke="#e6fffb" strokeWidth="2" />
      <circle cx="110" cy="98" r="34" fill={p.skin} />
      <path
        d="M110 64c-20 0-34 12-34 30 9-13 22-16 34-16s25 3 34 16c0-18-14-30-34-30Z"
        fill={p.hair}
      />
      <path d="M52 196a58 58 0 0 1 116 0Z" fill={fill} />
      <circle cx="168" cy="70" r="14" fill={p.accent} />
      <path d="M162 70l4 4 7-8" fill="none" stroke="#ffffff" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}

/* -------------------------------------------------------------------------- */
/*  Learning & analytics art                                                   */
/* -------------------------------------------------------------------------- */

export function LearningArt({ className }: ArtProps) {
  const id = useId().replace(/:/g, '');
  return (
    <svg
      className={classes(className)}
      viewBox="0 0 260 220"
      role="img"
      aria-label="Illustration of books, a laptop and a lightbulb representing learning"
    >
      <defs>
        <linearGradient id={`${id}-brand`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#14b8a6" />
          <stop offset="100%" stopColor="#2dd4bf" />
        </linearGradient>
        <linearGradient id={`${id}-sky`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#5eead4" />
          <stop offset="100%" stopColor="#14b8a6" />
        </linearGradient>
      </defs>
      <circle cx="130" cy="110" r="92" fill="#f0fdfa" />
      <rect x="70" y="128" width="120" height="18" rx="6" fill={`url(#${id}-brand)`} />
      <rect x="62" y="146" width="136" height="18" rx="6" fill={`url(#${id}-sky)`} />
      <rect x="78" y="110" width="104" height="18" rx="6" fill="#99f6e4" />
      <rect x="96" y="72" width="68" height="42" rx="6" fill="#ffffff" stroke="#ccfbf1" strokeWidth="2" />
      <circle cx="130" cy="52" r="20" fill={`url(#${id}-brand)`} />
      <path d="M130 40v10M130 60h.01" stroke="#ffffff" strokeWidth="3" strokeLinecap="round" />
      <path d="M120 72c4 6 16 6 20 0" fill="none" stroke="#ccfbf1" strokeWidth="3" strokeLinecap="round" />
      <circle cx="196" cy="76" r="10" fill="#f59e0b" />
    </svg>
  );
}

export function AnalyticsArt({ className }: ArtProps) {
  const id = useId().replace(/:/g, '');
  return (
    <svg
      className={classes(className)}
      viewBox="0 0 260 220"
      role="img"
      aria-label="Illustration of a dashboard with charts representing reporting"
    >
      <defs>
        <linearGradient id={`${id}-brand`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#14b8a6" />
          <stop offset="100%" stopColor="#2dd4bf" />
        </linearGradient>
        <linearGradient id={`${id}-sky`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#5eead4" />
          <stop offset="100%" stopColor="#14b8a6" />
        </linearGradient>
      </defs>
      <circle cx="130" cy="110" r="92" fill="#f0fdfa" />
      <rect x="52" y="52" width="156" height="116" rx="16" fill="#0f1a33" />
      <rect x="70" y="140" width="18" height="16" rx="5" fill={`url(#${id}-brand)`} />
      <rect x="96" y="120" width="18" height="36" rx="5" fill={`url(#${id}-sky)`} />
      <rect x="122" y="132" width="18" height="24" rx="5" fill={`url(#${id}-brand)`} />
      <rect x="148" y="104" width="18" height="52" rx="5" fill={`url(#${id}-sky)`} />
      <circle cx="184" cy="80" r="16" fill="none" stroke="#ffffff" strokeOpacity="0.2" strokeWidth="7" />
      <circle
        cx="184"
        cy="80"
        r="16"
        fill="none"
        stroke={`url(#${id}-brand)`}
        strokeWidth="7"
        strokeLinecap="round"
        strokeDasharray="66 100"
        transform="rotate(-90 184 80)"
      />
      <rect x="70" y="70" width="70" height="8" rx="4" fill="#ffffff" fillOpacity="0.5" />
      <circle cx="204" cy="164" r="12" fill="#34d399" />
    </svg>
  );
}

/* -------------------------------------------------------------------------- */
/*  Animated background decorations                                            */
/* -------------------------------------------------------------------------- */

export function DecorShapes({ className }: ArtProps) {
  return (
    <div className={className ? `${className} site-decor` : 'site-decor'} aria-hidden="true">
      <span className="site-orb site-orb--1" />
      <span className="site-orb site-orb--2" />
      <span className="site-orb site-orb--3" />
      <span className="site-shape site-shape--ring" />
      <span className="site-shape site-shape--plus">+</span>
      <span className="site-shape site-shape--dots" />
      <span className="site-shape site-shape--tri" />
    </div>
  );
}
