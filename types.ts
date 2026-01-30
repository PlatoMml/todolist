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
  deletedAt?: number; // timestamp if in trash
}

export type CalendarViewMode = 'month' | 'week';

export type ViewMode = 'date' | 'category' | 'all' | 'trash' | 'upcoming';

export type SortBy = 'date' | 'title' | 'createdAt' | 'updatedAt';
export type SortDirection = 'asc' | 'desc';