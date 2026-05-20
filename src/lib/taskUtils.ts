import { 
  Flame, 
  Database, 
  ShieldCheck, 
  Monitor, 
  Sparkle 
} from 'lucide-react-native';

/**
 * Returns the appropriate Lucide icon component corresponding to the task type.
 * @param type The type of the task (e.g. 'Tech Debt', 'Hotfix', 'Security', 'Design', 'Bug').
 * @returns The Lucide icon component.
 */
export const getTaskIcon = (type?: string) => {
  if (type === 'Tech Debt') return Database;
  if (type === 'Hotfix' || type === 'Bug') return Flame;
  if (type === 'Security') return ShieldCheck;
  if (type === 'Design') return Sparkle;
  return Monitor;
};
