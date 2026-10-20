export type DeckType = 'fibonacci' | 'decimal' | 'custom';

export interface DeckDefinition {
  id: string;
  ownerId: string | null;
  name: string;
  type: DeckType;
  labels: string[];
  isSystem: boolean;
}

export const FIBONACCI_LABELS = ['0', '1', '2', '3', '5', '8', '13', '21', '34', '?'];
export const DECIMAL_LABELS = ['0', '0.5', '1', '1.5', '2', '3', '5', '8', '13', '?'];

export const MAX_PLAYERS_PER_SESSION = 10;
export const MAX_UPLOAD_FILE_MB = 20;
export const SESSION_PURGE_DAYS_AFTER_COMPLETION = 7;
export const SESSION_ABANDONED_DRAFT_PURGE_DAYS = 30;

export const RETENTION_NOTICE =
  "Sessions and their files are temporary. They're deleted automatically 7 days after you complete the session — export or purge sooner if you need to keep anything.";
