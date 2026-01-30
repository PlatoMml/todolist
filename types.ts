
export enum Priority {
  LOW = '低',
  MEDIUM = '中',
  HIGH = '高',
}

export interface Tag {
  id: string;
  name: string;
  color: string; // hex or tailwind class
}

export interface Category {
  id: string;
  name: string;
  parentId: string | null;
  deletedAt?: number; // timestamp if in trash
}

export interface RepeatConfig {
  type: 'daily' | 'monthly'; // 'daily' covers "Every X days"
  interval: number; // For daily, it's the number of days. For monthly, implied 1.
}

export interface Todo {
  id: string;
  title: string;
  description?: string;
  completed: boolean;
  date: string; // ISO Date string YYYY-MM-DD
  time?: string; // HH:mm format (24h)
  createdAt: number;
  updatedAt?: number;
  priority: Priority;
  categoryId?: string;
  tagIds?: string[]; // New field for tags
  repeat?: RepeatConfig; // New field for recurrence
  fromId?: string; // ID of the previous task that generated this one (for recurrence linkage)
  deletedAt?: number; // timestamp if in trash
  isVirtual?: boolean; // UI-only flag for projected recurring tasks
}

export type CalendarViewMode = 'month' | 'week';

export type ViewMode = 'date' | 'category' | 'all' | 'trash' | 'upcoming';

export type SortBy = 'date' | 'title' | 'createdAt' | 'updatedAt';
export type SortDirection = 'asc' | 'desc';
