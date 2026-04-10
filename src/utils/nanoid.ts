import { nanoid } from 'nanoid';

// Prefixed ID generator matching VARCHAR(17) schema constraint
// Format: PREFIX + random chars = total 17 chars

const PREFIXES: Record<string, string> = {
  user: 'USR',
  school: 'SCH',
  admin: 'ADM',
  student: 'STD',
  industry: 'IND',
  mentor: 'MNT',
  teacher: 'TCH',
  placement: 'PLC',
  attendance: 'ATT',
  dailyLog: 'DLG',
  evaluation: 'EVL',
  assessment: 'ASM',
  audit: 'AUD',
};

export function generateId(entity: keyof typeof PREFIXES): string {
  const prefix = PREFIXES[entity];
  const randomPart = nanoid(17 - prefix.length);
  return `${prefix}${randomPart}`;
}
