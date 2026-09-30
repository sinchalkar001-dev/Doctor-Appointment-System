import {
  Baby,
  Bone,
  Brain,
  Ear,
  Eye,
  HeartHandshake,
  HeartPulse,
  Microscope,
  Pill,
  ScanFace,
  Smile,
  Stethoscope,
  Wind,
} from 'lucide-react';

/*
 * Every specialty is treated as a hospital department with its own colour and
 * pictogram, like wayfinding signage. Colour is never the only cue: the tile
 * always sits next to the department name.
 */

export const DEPARTMENT_HUES = ['red', 'orange', 'gold', 'green', 'teal', 'blue', 'violet', 'magenta'];

// Full class names so Tailwind keeps them in the production build.
export const HUE_BG = {
  red: 'bg-dept-red',
  orange: 'bg-dept-orange',
  gold: 'bg-dept-gold',
  green: 'bg-dept-green',
  teal: 'bg-dept-teal',
  blue: 'bg-dept-blue',
  violet: 'bg-dept-violet',
  magenta: 'bg-dept-magenta',
};

// Order matters: the first matching rule wins.
const RULES = [
  { pattern: /cardi|heart/i, icon: HeartPulse, hue: 'red' },
  { pattern: /neuro/i, icon: Brain, hue: 'violet' },
  { pattern: /pa?ediatr|child|infant/i, icon: Baby, hue: 'orange' },
  { pattern: /\bdent|tooth|teeth|orthodont|\boral\b/i, icon: Smile, hue: 'blue' },
  { pattern: /dermat|skin|cosmet/i, icon: ScanFace, hue: 'magenta' },
  { pattern: /ortho|bone|joint|spine|sport/i, icon: Bone, hue: 'blue' },
  { pattern: /ophthalm|optom|\beye|vision|retina/i, icon: Eye, hue: 'teal' },
  { pattern: /psychi|psycho|mental|behav/i, icon: HeartHandshake, hue: 'gold' },
  { pattern: /\bent\b|otolaryng|\bears?\b|\bnose\b|throat/i, icon: Ear, hue: 'teal' },
  { pattern: /pulmo|lung|respir|chest|asthma/i, icon: Wind, hue: 'teal' },
  { pattern: /gyn|obstet|women|matern|fertil/i, icon: Baby, hue: 'magenta' },
  { pattern: /onco|cancer|patholog|\blab|radiol/i, icon: Microscope, hue: 'violet' },
  { pattern: /pharm/i, icon: Pill, hue: 'green' },
  { pattern: /general|family|physician|practi|internal|primary/i, icon: Stethoscope, hue: 'green' },
];

function hashString(value) {
  let hash = 0;
  for (let index = 0; index < value.length; index += 1) {
    hash = (hash * 31 + value.charCodeAt(index)) >>> 0;
  }
  return hash;
}

const cache = new Map();

/** Look up the colour and pictogram for a specialty name. */
export function getDepartment(specialization) {
  const name = String(specialization || '').trim() || 'General';
  const key = name.toLowerCase();
  if (cache.has(key)) return cache.get(key);

  const rule = RULES.find(({ pattern }) => pattern.test(name));
  const department = rule
    ? { name, icon: rule.icon, hue: rule.hue }
    : { name, icon: Stethoscope, hue: DEPARTMENT_HUES[hashString(key) % DEPARTMENT_HUES.length] };

  cache.set(key, department);
  return department;
}

/** Count doctors per department, sorted by department name. */
export function groupDepartments(doctors = []) {
  const counts = new Map();
  doctors.forEach((doctor) => {
    const name = String(doctor.specialization || '').trim();
    if (!name) return;
    counts.set(name, (counts.get(name) || 0) + 1);
  });
  return [...counts.entries()]
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => a.name.localeCompare(b.name));
}
