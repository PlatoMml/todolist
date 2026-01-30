
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { Todo, Priority, Category, ViewMode, SortBy, SortDirection, Tag } from '../types';
import { v4 as uuidv4 } from 'uuid';
import { addDays, addMonths, format } from 'date-fns';

interface TodoState {
  todos: Todo[];
  categories: Category[];
  tags: Tag[]; // Global tag list
  selectedDate: string | null; // ISO Date string YYYY-MM-DD
  
  viewMode: ViewMode;
  selectedCategoryId: string | null;
  upcomingDays: number; // For the custom date range view
  
  sortBy: SortBy;
  sortDirection: SortDirection;

  // Actions
  addTodo: (todo: Omit<Todo, 'id' | 'createdAt' | 'updatedAt' | 'completed'>) => void;
  toggleTodo: (id: string) => void;
  toggleVirtualTodo: (sourceId: string, date: string) => void; // New action for virtual tasks
  deleteVirtualTodo: (sourceId: string, date: string) => void; // New action for deleting virtual tasks
  updateTodo: (id: string, updates: Partial<Todo>) => void;
  
  // Delete / Trash / Restore Actions
  moveTodoToTrash: (id: string) => void;
  restoreTodo: (id: string) => void;
  permanentlyDeleteTodo: (id: string) => void;

  setSelectedDate: (date: string | null) => void;
  setSelectedCategory: (id: string | null) => void;
  setViewMode: (mode: ViewMode) => void;
  setUpcomingDays: (days: number) => void;
  setSortBy: (sortBy: SortBy) => void;
  setSortDirection: (direction: SortDirection) => void;
  
  // Category Actions
  addCategory: (name: string, parentId: string | null) => void;
  updateCategory: (id: string, updates: Partial<Category>) => void;
  moveCategory: (id: string, newParentId: string | null) => void;
  moveCategoryToTrash: (id: string) => void;
  restoreCategory: (id: string) => void;
  permanentlyDeleteCategory: (id: string) => void;

  // Tag Actions
  addTag: (name: string) => Tag; // Returns the new or existing tag

  // Data Actions
  importData: (data: { todos: Todo[], categories: Category[], tags: Tag[] }) => void;
}

// Helper to format date consistent with how we store it (YYYY-MM-DD in LOCAL TIME)
const formatDate = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

// Helper to parse YYYY-MM-DD to local Date object
const parseLocalDate = (dateStr: string) => {
  const [year, month, day] = dateStr.split('-').map(Number);
  return new Date(year, month - 1, day);
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

// Predefined colors for tags
const TAG_COLORS = [
  '#ef4444', // red
  '#f97316', // orange
  '#f59e0b', // amber
  '#84cc16', // lime
  '#10b981', // emerald
  '#06b6d4', // cyan
  '#3b82f6', // blue
  '#6366f1', // indigo
  '#8b5cf6', // violet
  '#d946ef', // fuchsia
  '#ec4899', // pink
];

export const useTodoStore = create<TodoState>()(
  persist(
    (set, get) => ({
      todos: [],
      categories: [
        { id: 'default-1', name: '工作', parentId: null },
        { id: 'default-2', name: '生活', parentId: null },
      ],
      tags: [],
      selectedDate: formatDate(new Date()),
      viewMode: 'date',
      selectedCategoryId: null,
      upcomingDays: 7, // Default to 7 days
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
            tagIds: todoData.tagIds || [],
          },
        ],
      })),

      toggleTodo: (id) => set((state) => {
        const todoIndex = state.todos.findIndex(t => t.id === id);
        if (todoIndex === -1) return state;

        const todo = state.todos[todoIndex];
        const isCompleting = !todo.completed;
        
        let newTodos = [...state.todos];

        if (isCompleting) {
            // CASE 1: Mark as Complete
            newTodos[todoIndex] = { 
                ...todo, 
                completed: true, 
                updatedAt: Date.now() 
            };

            // IF repeat exists, create the NEXT instance
            // CRITICAL CHECK: Does a child already exist? (Avoid duplicates)
            const hasChild = state.todos.some(t => t.fromId === todo.id && !t.deletedAt);

            if (todo.repeat && !hasChild) {
                let nextDateObj = parseLocalDate(todo.date);
                
                if (todo.repeat.type === 'daily') {
                    nextDateObj = addDays(nextDateObj, todo.repeat.interval);
                } else if (todo.repeat.type === 'monthly') {
                    nextDateObj = addMonths(nextDateObj, 1);
                }
                
                const nextDateStr = formatDate(nextDateObj);

                const nextTodo: Todo = {
                    ...todo,
                    id: uuidv4(),
                    date: nextDateStr,
                    completed: false,
                    createdAt: Date.now(),
                    updatedAt: Date.now(),
                    fromId: todo.id, // LINKAGE: This task came from the current one
                };
                newTodos.push(nextTodo);
            }
        } else {
            // CASE 2: Mark as Incomplete (Undo)
            newTodos[todoIndex] = { 
                ...todo, 
                completed: false, 
                updatedAt: Date.now() 
            };
        }

        return { todos: newTodos };
      }),

      // New Action: Handle completion of a "projected" virtual recurring task
      // GAP FILLING LOGIC: If I click a task 3 days in the future, fill the 2 days in between as "Incomplete Real Tasks"
      toggleVirtualTodo: (sourceId, targetDateStr) => set((state) => {
          const sourceTodo = state.todos.find(t => t.id === sourceId);
          if (!sourceTodo || !sourceTodo.repeat) return state;

          const newTodos = [...state.todos];
          let currentDateObj = parseLocalDate(sourceTodo.date);
          
          if (sourceTodo.repeat.type === 'daily') {
              currentDateObj = addDays(currentDateObj, sourceTodo.repeat.interval);
          } else if (sourceTodo.repeat.type === 'monthly') {
              currentDateObj = addMonths(currentDateObj, 1);
          }

          let previousId = sourceId;
          let safetyCounter = 0;
          const MAX_ITERATIONS = 366; // Prevent infinite loops

          while (safetyCounter < MAX_ITERATIONS) {
              const currentDateStr = formatDate(currentDateObj);
              
              if (currentDateStr > targetDateStr) break;

              const isTargetDate = currentDateStr === targetDateStr;

              // Create the task (Real)
              const newTodo: Todo = {
                  ...sourceTodo,
                  id: uuidv4(),
                  date: currentDateStr,
                  // If it's the target (the one clicked), mark completed. 
                  // If it's an intermediate gap, keep it incomplete.
                  completed: isTargetDate, 
                  createdAt: Date.now(),
                  updatedAt: Date.now(),
                  fromId: previousId, // Linkage
              };
              
              // Remove isVirtual if it was copied over spread
              delete newTodo.isVirtual; 

              newTodos.push(newTodo);
              previousId = newTodo.id;

              if (isTargetDate) break;

              if (sourceTodo.repeat.type === 'daily') {
                  currentDateObj = addDays(currentDateObj, sourceTodo.repeat.interval);
              } else if (sourceTodo.repeat.type === 'monthly') {
                  currentDateObj = addMonths(currentDateObj, 1);
              }
              
              safetyCounter++;
          }

          // 3. Generate the ONE NEXT instance after the target
          let nextDateObj = currentDateObj; // current is at target
           if (sourceTodo.repeat.type === 'daily') {
              nextDateObj = addDays(nextDateObj, sourceTodo.repeat.interval);
          } else if (sourceTodo.repeat.type === 'monthly') {
              nextDateObj = addMonths(nextDateObj, 1);
          }
          
          const nextDateStr = formatDate(nextDateObj);

          // DUPLICATE CHECK: Prevent creating multiple future instances if one already exists
          const exists = newTodos.some(t => !t.deletedAt && t.date === nextDateStr && t.title === sourceTodo.title);

          if (!exists) {
              const nextPendingTodo: Todo = {
                  ...sourceTodo,
                  id: uuidv4(),
                  date: nextDateStr,
                  completed: false,
                  createdAt: Date.now(),
                  updatedAt: Date.now(),
                  fromId: previousId,
              };
              delete nextPendingTodo.isVirtual;
              
              newTodos.push(nextPendingTodo);
          }

          return { todos: newTodos };
      }),
      
      // New Action: Handle deletion of a "projected" virtual recurring task
      // This materializes the task as "Deleted" so it skips projection but keeps the chain alive
      deleteVirtualTodo: (sourceId, targetDateStr) => set((state) => {
          const sourceTodo = state.todos.find(t => t.id === sourceId);
          if (!sourceTodo || !sourceTodo.repeat) return state;

          const newTodos = [...state.todos];
          let currentDateObj = parseLocalDate(sourceTodo.date);
          
          if (sourceTodo.repeat.type === 'daily') {
              currentDateObj = addDays(currentDateObj, sourceTodo.repeat.interval);
          } else if (sourceTodo.repeat.type === 'monthly') {
              currentDateObj = addMonths(currentDateObj, 1);
          }

          let previousId = sourceId;
          let safetyCounter = 0;
          const MAX_ITERATIONS = 366; 

          while (safetyCounter < MAX_ITERATIONS) {
              const currentDateStr = formatDate(currentDateObj);
              if (currentDateStr > targetDateStr) break;

              const isTargetDate = currentDateStr === targetDateStr;

              // Create the task (Real)
              const newTodo: Todo = {
                  ...sourceTodo,
                  id: uuidv4(),
                  date: currentDateStr,
                  // Gaps are Incomplete (Active)
                  // Target is DELETED (so it hides from view, but stops projection from creating a virtual one)
                  completed: false, 
                  createdAt: Date.now(),
                  updatedAt: Date.now(),
                  fromId: previousId,
                  deletedAt: isTargetDate ? Date.now() : undefined, // Mark target as deleted
              };
              delete newTodo.isVirtual; 

              newTodos.push(newTodo);
              previousId = newTodo.id;

              if (isTargetDate) break;

              if (sourceTodo.repeat.type === 'daily') {
                  currentDateObj = addDays(currentDateObj, sourceTodo.repeat.interval);
              } else if (sourceTodo.repeat.type === 'monthly') {
                  currentDateObj = addMonths(currentDateObj, 1);
              }
              safetyCounter++;
          }

          // NOTE: We do NOT create the next instance here anymore.
          // By creating the Deleted instance at target date, the projection logic in TodoList.tsx
          // (which now includes deleted tasks as sources) will automatically pick up from this
          // deleted task and project the next virtual task.
          // This avoids duplicate creation if the view logic is already projecting.

          return { todos: newTodos };
      }),

      updateTodo: (id, updates) => set((state) => ({
        todos: state.todos.map((t) =>
          t.id === id ? { ...t, ...updates, updatedAt: Date.now() } : t
        ),
      })),

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

      setSelectedDate: (date) => set({ selectedDate: date, viewMode: 'date', selectedCategoryId: null }),
      setSelectedCategory: (id) => set({ selectedCategoryId: id, viewMode: 'category', selectedDate: null }),
      
      setViewMode: (mode) => set((state) => {
          if (mode === 'all') return { viewMode: 'all', selectedDate: null, selectedCategoryId: null };
          if (mode === 'date') return { viewMode: 'date', selectedDate: formatDate(new Date()), selectedCategoryId: null };
          if (mode === 'trash') return { viewMode: 'trash', selectedDate: null, selectedCategoryId: null };
          if (mode === 'upcoming') return { viewMode: 'upcoming', selectedDate: null, selectedCategoryId: null };
          return { viewMode: mode };
      }),
      
      setUpcomingDays: (days) => set({ upcomingDays: days }),
      setSortBy: (sortBy) => set({ sortBy }),
      setSortDirection: (sortDirection) => set({ sortDirection }),

      addCategory: (name, parentId) => set((state) => ({
        categories: [...state.categories, { id: uuidv4(), name, parentId }]
      })),

      updateCategory: (id, updates) => set((state) => ({
        categories: state.categories.map(c => c.id === id ? { ...c, ...updates } : c)
      })),

      moveCategory: (id, newParentId) => set((state) => {
        if (id === newParentId) return state;
        if (newParentId) {
            const descendants = getDescendantIds(state.categories, id);
            if (descendants.includes(newParentId)) return state;
        }
        return {
            categories: state.categories.map(c => c.id === id ? { ...c, parentId: newParentId } : c)
        };
      }),

      moveCategoryToTrash: (id) => set((state) => {
        const newCategories = state.categories.map(c => c.id === id ? { ...c, deletedAt: Date.now() } : c);
        const shouldResetView = state.selectedCategoryId === id;
        return {
          categories: newCategories,
          viewMode: shouldResetView ? 'all' : state.viewMode,
          selectedCategoryId: shouldResetView ? null : state.selectedCategoryId
        };
      }),

      restoreCategory: (id) => set((state) => ({
        categories: state.categories.map(c => c.id === id ? { ...c, deletedAt: undefined } : c)
      })),

      permanentlyDeleteCategory: (id) => set((state) => {
        const idsToDelete = [id, ...getDescendantIds(state.categories, id)];
        const newCategories = state.categories.filter(c => !idsToDelete.includes(c.id));
        const newTodos = state.todos.filter(t => !(t.categoryId && idsToDelete.includes(t.categoryId)));
        return { categories: newCategories, todos: newTodos };
      }),

      addTag: (name) => {
        const state = get();
        const existingTag = state.tags.find(t => t.name.toLowerCase() === name.toLowerCase());
        if (existingTag) return existingTag;
        const newTag: Tag = { id: uuidv4(), name: name, color: TAG_COLORS[state.tags.length % TAG_COLORS.length] };
        set({ tags: [...state.tags, newTag] });
        return newTag;
      },

      importData: (data) => set({
        todos: data.todos || [],
        categories: data.categories || [],
        tags: data.tags || [],
        selectedDate: formatDate(new Date()),
        selectedCategoryId: null,
        viewMode: 'date'
      })
    }),
    {
      name: 'todo-storage',
      storage: createJSONStorage(() => localStorage),
    }
  )
);
