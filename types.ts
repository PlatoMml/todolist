export enum Priority {
  LOW = '低',
  MEDIUM = '中',
  HIGH = '高',
}

export interface Category {
  id: string;
  name: string;
  parentId: string | null;
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
}

export type CalendarViewMode = 'month' | 'week';

export type ViewMode = 'date' | 'category' | 'all';

export type SortBy = 'date' | 'title' | 'createdAt' | 'updatedAt';
export type SortDirection = 'asc' | 'desc';