
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
  toggleVirtualTodo: (sourceId: string, date: string) => void; // Complete a virtual task
  materializeVirtualTodo: (sourceId: string, date: string, updates: Partial<Todo>) => void; // Create a virtual task (e.g. after edit)
  deleteVirtualTodo: (sourceId: string, date: string) => void; 
  updateTodo: (id: string, updates: Partial<Todo>) => void;
  
  // Delete / Trash / Restore Actions
  moveTodoToTrash: (id: string) => void;
  deleteTodoSeries: (id: string) => void; 
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
            newTodos[todoIndex] = { 
                ...todo, 
                completed: true, 
                updatedAt: Date.now() 
            };
            
            if (todo.repeat) {
                let nextDateObj = parseLocalDate(todo.date);
                
                if (todo.repeat.type === 'daily') {
                    nextDateObj = addDays(nextDateObj, todo.repeat.interval);
                } else if (todo.repeat.type === 'monthly') {
                    nextDateObj = addMonths(nextDateObj, 1);
                }
                
                const nextDateStr = formatDate(nextDateObj);

                const hasChild = state.todos.some(t => 
                    t.date === nextDateStr && 
                    t.title === todo.title && 
                    (t.fromId === todo.id || !t.fromId)
                );

                if (!hasChild) {
                    const nextTodo: Todo = {
                        ...todo,
                        id: uuidv4(),
                        date: nextDateStr,
                        completed: false,
                        createdAt: Date.now(),
                        updatedAt: Date.now(),
                        fromId: todo.id,
                    };
                    newTodos.push(nextTodo);
                }
            }
        } else {
            newTodos[todoIndex] = { 
                ...todo, 
                completed: false, 
                updatedAt: Date.now() 
            };
        }

        return { todos: newTodos };
      }),

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
          const MAX_ITERATIONS = 366; 

          while (safetyCounter < MAX_ITERATIONS) {
              const currentDateStr = formatDate(currentDateObj);
              if (currentDateStr > targetDateStr) break;

              const isTargetDate = currentDateStr === targetDateStr;

              const existingIndex = newTodos.findIndex(t => 
                  t.date === currentDateStr && 
                  t.title === sourceTodo.title
              );

              if (existingIndex !== -1) {
                  const existingTodo = newTodos[existingIndex];
                  previousId = existingTodo.id;
                  if (isTargetDate) {
                      newTodos[existingIndex] = {
                          ...existingTodo,
                          completed: true,
                          deletedAt: undefined,
                          updatedAt: Date.now()
                      };
                  }
              } else {
                  const newTodo: Todo = {
                      ...sourceTodo,
                      id: uuidv4(),
                      date: currentDateStr,
                      completed: isTargetDate, 
                      createdAt: Date.now(),
                      updatedAt: Date.now(),
                      fromId: previousId, 
                      deletedAt: undefined,
                  };
                  delete newTodo.isVirtual; 
                  newTodos.push(newTodo);
                  previousId = newTodo.id;
              }

              if (isTargetDate) break;

              if (sourceTodo.repeat.type === 'daily') {
                  currentDateObj = addDays(currentDateObj, sourceTodo.repeat.interval);
              } else if (sourceTodo.repeat.type === 'monthly') {
                  currentDateObj = addMonths(currentDateObj, 1);
              }
              
              safetyCounter++;
          }

          // Generate next instance
          let nextDateObj = currentDateObj;
           if (sourceTodo.repeat.type === 'daily') {
              nextDateObj = addDays(nextDateObj, sourceTodo.repeat.interval);
          } else if (sourceTodo.repeat.type === 'monthly') {
              nextDateObj = addMonths(nextDateObj, 1);
          }
          const nextDateStr = formatDate(nextDateObj);
          const exists = newTodos.some(t => t.date === nextDateStr && t.title === sourceTodo.title);

          if (!exists) {
              const nextPendingTodo: Todo = {
                  ...sourceTodo,
                  id: uuidv4(),
                  date: nextDateStr,
                  completed: false,
                  createdAt: Date.now(),
                  updatedAt: Date.now(),
                  fromId: previousId,
                  deletedAt: undefined
              };
              delete nextPendingTodo.isVirtual;
              newTodos.push(nextPendingTodo);
          }

          return { todos: newTodos };
      }),

      // Create a REAL task from a virtual one (e.g. when editing). Does NOT mark as complete.
      materializeVirtualTodo: (sourceId, targetDateStr, updates) => set((state) => {
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

              const existingIndex = newTodos.findIndex(t => 
                  t.date === currentDateStr && 
                  t.title === sourceTodo.title
              );

              if (existingIndex !== -1) {
                  const existingTodo = newTodos[existingIndex];
                  previousId = existingTodo.id;
                  if (isTargetDate) {
                      newTodos[existingIndex] = {
                          ...existingTodo,
                          ...updates,
                          deletedAt: undefined,
                          updatedAt: Date.now()
                      };
                  }
              } else {
                  const newTodo: Todo = {
                      ...sourceTodo,
                      ...(isTargetDate ? updates : {}), // Apply updates only to target
                      id: uuidv4(),
                      date: currentDateStr,
                      completed: false, // Keep it active (Incomplete)
                      createdAt: Date.now(),
                      updatedAt: Date.now(),
                      fromId: previousId, 
                      deletedAt: undefined,
                  };
                  delete newTodo.isVirtual; 
                  newTodos.push(newTodo);
                  previousId = newTodo.id;
              }

              if (isTargetDate) break;

              if (sourceTodo.repeat.type === 'daily') {
                  currentDateObj = addDays(currentDateObj, sourceTodo.repeat.interval);
              } else if (sourceTodo.repeat.type === 'monthly') {
                  currentDateObj = addMonths(currentDateObj, 1);
              }
              safetyCounter++;
          }
          
          return { todos: newTodos };
      }),
      
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

              const existingIndex = newTodos.findIndex(t => 
                t.date === currentDateStr && 
                t.title === sourceTodo.title
              );

              if (existingIndex !== -1) {
                  const existingTodo = newTodos[existingIndex];
                  previousId = existingTodo.id;
                  if (isTargetDate) {
                      newTodos[existingIndex] = {
                          ...existingTodo,
                          deletedAt: Date.now(), 
                          updatedAt: Date.now()
                      };
                  }
              } else {
                  const newTodo: Todo = {
                      ...sourceTodo,
                      id: uuidv4(),
                      date: currentDateStr,
                      completed: false, 
                      createdAt: Date.now(),
                      updatedAt: Date.now(),
                      fromId: previousId,
                      deletedAt: isTargetDate ? Date.now() : undefined,
                  };
                  delete newTodo.isVirtual; 
                  newTodos.push(newTodo);
                  previousId = newTodo.id;
              }

              if (isTargetDate) break;

              if (sourceTodo.repeat.type === 'daily') {
                  currentDateObj = addDays(currentDateObj, sourceTodo.repeat.interval);
              } else if (sourceTodo.repeat.type === 'monthly') {
                  currentDateObj = addMonths(currentDateObj, 1);
              }
              safetyCounter++;
          }
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
      
      deleteTodoSeries: (id) => set((state) => {
        const idsToDelete = new Set<string>();
        idsToDelete.add(id);

        let found = true;
        while (found) {
            found = false;
            state.todos.forEach(t => {
                if (t.fromId && idsToDelete.has(t.fromId) && !idsToDelete.has(t.id)) {
                    idsToDelete.add(t.id);
                    found = true;
                }
            });
        }

        return {
            todos: state.todos.map(t => 
                idsToDelete.has(t.id) 
                    ? { ...t, repeat: undefined, deletedAt: Date.now() } 
                    : t
            )
        };
      }),

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
