import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { Todo, Priority, Category, ViewMode, SortBy, SortDirection } from '../types';
import { v4 as uuidv4 } from 'uuid';

interface TodoState {
  todos: Todo[];
  categories: Category[];
  selectedDate: string | null; // ISO Date string YYYY-MM-DD
  
  viewMode: ViewMode;
  selectedCategoryId: string | null;
  
  sortBy: SortBy;
  sortDirection: SortDirection;

  // Actions
  addTodo: (todo: Omit<Todo, 'id' | 'createdAt' | 'updatedAt' | 'completed'>) => void;
  toggleTodo: (id: string) => void;
  deleteTodo: (id: string) => void;
  updateTodo: (id: string, updates: Partial<Todo>) => void;
  
  setSelectedDate: (date: string | null) => void;
  setSelectedCategory: (id: string | null) => void;
  setViewMode: (mode: ViewMode) => void;
  setSortBy: (sortBy: SortBy) => void;
  setSortDirection: (direction: SortDirection) => void;
  
  // Category Actions
  addCategory: (name: string, parentId: string | null) => void;
  deleteCategory: (id: string) => void;
}

// Helper to format date consistent with how we store it (YYYY-MM-DD in LOCAL TIME)
const formatDate = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

// Helper to find all descendant IDs for deletion
const getDescendantIds = (categories: Category[], parentId: string): string[] => {
  const children = categories.filter(c => c.parentId === parentId);
  let ids = children.map(c => c.id);
  children.forEach(child => {
    ids = [...ids, ...getDescendantIds(categories, child.id)];
  });
  return ids;
};

export const useTodoStore = create<TodoState>()(
  persist(
    (set, get) => ({
      todos: [],
      categories: [
        { id: 'default-1', name: '工作', parentId: null },
        { id: 'default-2', name: '生活', parentId: null },
      ],
      selectedDate: formatDate(new Date()),
      viewMode: 'date',
      selectedCategoryId: null,
      sortBy: 'date',
      sortDirection: 'asc',

      addTodo: (todoData) => set((state) => ({
        todos: [
          ...state.todos,
          {
            ...todoData,
            id: uuidv4(),
            completed: false,
            createdAt: Date.now(),
            updatedAt: Date.now(),
          },
        ],
      })),

      toggleTodo: (id) => set((state) => ({
        todos: state.todos.map((t) =>
          t.id === id ? { ...t, completed: !t.completed, updatedAt: Date.now() } : t
        ),
      })),

      deleteTodo: (id) => set((state) => ({
        todos: state.todos.filter((t) => t.id !== id),
      })),

      updateTodo: (id, updates) => set((state) => ({
        todos: state.todos.map((t) =>
          t.id === id ? { ...t, ...updates, updatedAt: Date.now() } : t
        ),
      })),

      setSelectedDate: (date) => set({ selectedDate: date, viewMode: 'date', selectedCategoryId: null }),
      
      setSelectedCategory: (id) => set({ selectedCategoryId: id, viewMode: 'category', selectedDate: null }),
      
      setViewMode: (mode) => set((state) => {
          if (mode === 'all') return { viewMode: 'all', selectedDate: null, selectedCategoryId: null };
          if (mode === 'date') return { viewMode: 'date', selectedDate: formatDate(new Date()), selectedCategoryId: null };
          return { viewMode: mode };
      }),
      
      setSortBy: (sortBy) => set({ sortBy }),
      setSortDirection: (sortDirection) => set({ sortDirection }),

      addCategory: (name, parentId) => set((state) => ({
        categories: [
          ...state.categories,
          { id: uuidv4(), name, parentId }
        ]
      })),

      deleteCategory: (id) => set((state) => {
        const idsToDelete = [id, ...getDescendantIds(state.categories, id)];
        const newCategories = state.categories.filter(c => !idsToDelete.includes(c.id));
        
        // If currently selected category is deleted, switch to All
        const shouldResetView = state.selectedCategoryId && idsToDelete.includes(state.selectedCategoryId);

        return {
          categories: newCategories,
          todos: state.todos.map(t => 
             t.categoryId && idsToDelete.includes(t.categoryId) 
             ? { ...t, categoryId: undefined } 
             : t
          ),
          viewMode: shouldResetView ? 'all' : state.viewMode,
          selectedCategoryId: shouldResetView ? null : state.selectedCategoryId
        };
      }),
    }),
    {
      name: 'todo-storage',
      storage: createJSONStorage(() => localStorage),
    }
  )
);