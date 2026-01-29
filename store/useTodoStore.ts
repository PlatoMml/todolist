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
  updateTodo: (id: string, updates: Partial<Todo>) => void;
  
  // Delete / Trash / Restore Actions
  moveTodoToTrash: (id: string) => void;
  restoreTodo: (id: string) => void;
  permanentlyDeleteTodo: (id: string) => void;

  setSelectedDate: (date: string | null) => void;
  setSelectedCategory: (id: string | null) => void;
  setViewMode: (mode: ViewMode) => void;
  setSortBy: (sortBy: SortBy) => void;
  setSortDirection: (direction: SortDirection) => void;
  
  // Category Actions
  addCategory: (name: string, parentId: string | null) => void;
  updateCategory: (id: string, updates: Partial<Category>) => void;
  moveCategory: (id: string, newParentId: string | null) => void;
  moveCategoryToTrash: (id: string) => void;
  restoreCategory: (id: string) => void;
  permanentlyDeleteCategory: (id: string) => void;
}

// Helper to format date consistent with how we store it (YYYY-MM-DD in LOCAL TIME)
const formatDate = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

// Helper to find all descendant IDs for deletion or cycle check
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

      updateTodo: (id, updates) => set((state) => ({
        todos: state.todos.map((t) =>
          t.id === id ? { ...t, ...updates, updatedAt: Date.now() } : t
        ),
      })),

      // --- Trash Logic for Todos ---

      moveTodoToTrash: (id) => set((state) => ({
        todos: state.todos.map(t => 
          t.id === id ? { ...t, deletedAt: Date.now() } : t
        )
      })),

      restoreTodo: (id) => set((state) => ({
        todos: state.todos.map(t => 
          t.id === id ? { ...t, deletedAt: undefined } : t
        )
      })),

      permanentlyDeleteTodo: (id) => set((state) => ({
        todos: state.todos.filter((t) => t.id !== id),
      })),

      // --- Navigation ---

      setSelectedDate: (date) => set({ selectedDate: date, viewMode: 'date', selectedCategoryId: null }),
      
      setSelectedCategory: (id) => set({ selectedCategoryId: id, viewMode: 'category', selectedDate: null }),
      
      setViewMode: (mode) => set((state) => {
          if (mode === 'all') return { viewMode: 'all', selectedDate: null, selectedCategoryId: null };
          if (mode === 'date') return { viewMode: 'date', selectedDate: formatDate(new Date()), selectedCategoryId: null };
          if (mode === 'trash') return { viewMode: 'trash', selectedDate: null, selectedCategoryId: null };
          return { viewMode: mode };
      }),
      
      setSortBy: (sortBy) => set({ sortBy }),
      setSortDirection: (sortDirection) => set({ sortDirection }),

      // --- Category Logic ---

      addCategory: (name, parentId) => set((state) => ({
        categories: [
          ...state.categories,
          { id: uuidv4(), name, parentId }
        ]
      })),

      updateCategory: (id, updates) => set((state) => ({
        categories: state.categories.map(c => 
            c.id === id ? { ...c, ...updates } : c
        )
      })),

      moveCategory: (id, newParentId) => set((state) => {
        // 1. Cannot move to self
        if (id === newParentId) return state;

        // 2. Cannot move to one of its own descendants (circular dependency)
        // If newParentId is not null, we check if it is a child of the moved category
        if (newParentId) {
            const descendants = getDescendantIds(state.categories, id);
            if (descendants.includes(newParentId)) {
                // Illegal move, ignore
                return state;
            }
        }

        return {
            categories: state.categories.map(c => 
                c.id === id ? { ...c, parentId: newParentId } : c
            )
        };
      }),

      moveCategoryToTrash: (id) => set((state) => {
        // We only soft-delete the specific category. 
        // The UI logic will handle hiding its children based on hierarchy.
        // This allows for perfect structural restoration.
        const newCategories = state.categories.map(c => 
          c.id === id ? { ...c, deletedAt: Date.now() } : c
        );

        // If currently viewing this category, switch to All
        const shouldResetView = state.selectedCategoryId === id;

        return {
          categories: newCategories,
          viewMode: shouldResetView ? 'all' : state.viewMode,
          selectedCategoryId: shouldResetView ? null : state.selectedCategoryId
        };
      }),

      restoreCategory: (id) => set((state) => ({
        categories: state.categories.map(c => 
          c.id === id ? { ...c, deletedAt: undefined } : c
        )
      })),

      permanentlyDeleteCategory: (id) => set((state) => {
        const idsToDelete = [id, ...getDescendantIds(state.categories, id)];
        const newCategories = state.categories.filter(c => !idsToDelete.includes(c.id));
        
        // Also permanently delete todos in these categories
        const newTodos = state.todos.filter(t => 
          !(t.categoryId && idsToDelete.includes(t.categoryId))
        );

        return {
          categories: newCategories,
          todos: newTodos,
        };
      }),
    }),
    {
      name: 'todo-storage',
      storage: createJSONStorage(() => localStorage),
    }
  )
);