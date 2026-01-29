import React, { useMemo, useState } from 'react';
import { useTodoStore } from '../store/useTodoStore';
import { TodoItem } from './TodoItem';
import { format, parseISO, isToday, isTomorrow } from 'date-fns';
import { zhCN } from 'date-fns/locale';
import { 
  Plus, 
  ListTodo, 
  FolderOpen, 
  Layers, 
  Calendar as CalendarIcon, 
  ArrowUpDown, 
  Check,
  Clock,
  CalendarDays,
  Type,
  History,
  Recycle,
  Trash2,
  Undo2,
  ChevronRight,
  ChevronDown,
  Folder
} from 'lucide-react';
import { AddTodoModal } from './AddTodoModal';
import { Button } from './Button';
import { SortBy, SortDirection, Category, Todo } from '../types';
import { ConfirmModal } from './ConfirmModal';

// --- Recursive Trash Explorer Components ---

interface TrashCategoryNodeProps {
    category: Category;
    allCategories: Category[];
    allTodos: Todo[];
    level: number;
    onRestoreCategory: (cat: Category) => void;
    onDeleteCategory: (id: string) => void;
    onRestoreTodo: (todo: Todo) => void;
    onDeleteTodo: (id: string) => void;
}

const TrashCategoryNode: React.FC<TrashCategoryNodeProps> = ({
    category,
    allCategories,
    allTodos,
    level,
    onRestoreCategory,
    onDeleteCategory,
    onRestoreTodo,
    onDeleteTodo
}) => {
    const [isExpanded, setIsExpanded] = useState(false);
    
    // Find children in this deleted folder
    // Note: We show ALL children here, even if they aren't explicitly deleted, 
    // because they are inaccessible in the main view due to the parent being deleted.
    const childCategories = allCategories.filter(c => c.parentId === category.id);
    const childTodos = allTodos.filter(t => t.categoryId === category.id);
    
    const isEmpty = childCategories.length === 0 && childTodos.length === 0;

    return (
        <div className="select-none">
             <div 
                className="group flex items-center justify-between py-2 px-3 rounded-md hover:bg-gray-50 border border-transparent hover:border-gray-200 transition-all mb-1"
                style={{ marginLeft: `${level * 16}px` }}
                onClick={() => !isEmpty && setIsExpanded(!isExpanded)}
            >
                <div className="flex items-center gap-3 overflow-hidden flex-1 cursor-pointer">
                    <div className={`p-1.5 rounded-md ${isExpanded ? 'bg-primary-50 text-primary-600' : 'bg-gray-100 text-gray-400'}`}>
                        <Folder size={16} />
                    </div>
                    <span className="text-sm font-medium text-gray-700 truncate line-through decoration-gray-400">
                        {category.name}
                    </span>
                    {!isEmpty && (
                        <span className="text-xs text-gray-400">
                            {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                        </span>
                    )}
                </div>

                <div className="flex items-center gap-1">
                    <button 
                        onClick={(e) => { e.stopPropagation(); onRestoreCategory(category); }}
                        className="p-1.5 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                        title="还原分类 (如父级已删除，将移至根目录)"
                    >
                        <Undo2 size={16} />
                    </button>
                    <button 
                        onClick={(e) => { e.stopPropagation(); onDeleteCategory(category.id); }}
                        className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        title="永久删除"
                    >
                        <Trash2 size={16} />
                    </button>
                </div>
            </div>

            {isExpanded && (
                <div className="border-l border-gray-100 ml-4 pl-1">
                    {/* Render Child Categories */}
                    {childCategories.map(cat => (
                        <TrashCategoryNode
                            key={cat.id}
                            category={cat}
                            allCategories={allCategories}
                            allTodos={allTodos}
                            level={level + 1}
                            onRestoreCategory={onRestoreCategory}
                            onDeleteCategory={onDeleteCategory}
                            onRestoreTodo={onRestoreTodo}
                            onDeleteTodo={onDeleteTodo}
                        />
                    ))}
                    
                    {/* Render Child Todos */}
                    {childTodos.map(todo => (
                        <div 
                            key={todo.id}
                            className="group flex items-center justify-between py-2 px-3 rounded-md hover:bg-white border border-transparent hover:border-gray-100 hover:shadow-sm transition-all mb-1 ml-4"
                        >
                            <div className="flex items-center gap-3 overflow-hidden">
                                <div className={`w-1.5 h-1.5 rounded-full ${todo.completed ? 'bg-green-400' : 'bg-gray-300'}`}></div>
                                <span className={`text-sm truncate ${todo.completed || todo.deletedAt ? 'text-gray-400 line-through' : 'text-gray-600'}`}>
                                    {todo.title}
                                </span>
                            </div>
                            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button 
                                    onClick={() => onRestoreTodo(todo)}
                                    className="p-1.5 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                                    title="还原任务 (如分类已删除，将移至无分类)"
                                >
                                    <Undo2 size={14} />
                                </button>
                                <button 
                                    onClick={() => onDeleteTodo(todo.id)}
                                    className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                    title="永久删除"
                                >
                                    <Trash2 size={14} />
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};


// --- Main TodoList Component ---
export const TodoList: React.FC = () => {
  const { 
    todos, 
    selectedDate, 
    viewMode, 
    selectedCategoryId, 
    categories,
    sortBy,
    sortDirection,
    setSortBy,
    setSortDirection,
    updateCategory,
    updateTodo,
    restoreCategory, // Simple restore (clears deletedAt)
    restoreTodo,     // Simple restore (clears deletedAt)
    permanentlyDeleteCategory,
    permanentlyDeleteTodo
  } = useTodoStore();
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSortMenuOpen, setIsSortMenuOpen] = useState(false);
  
  // State for permanent delete confirmations
  const [permDeleteCatId, setPermDeleteCatId] = useState<string | null>(null);
  const [permDeleteTodoId, setPermDeleteTodoId] = useState<string | null>(null);

  // --- Handlers for Smart Restore ---
  
  const handleSmartRestoreCategory = (cat: Category) => {
      // Check if parent is deleted
      const parent = cat.parentId ? categories.find(p => p.id === cat.parentId) : null;
      const isParentDeleted = parent ? (parent.deletedAt !== undefined) : false;

      // If parent is deleted, we must move this category to root to make it visible
      if (isParentDeleted) {
          updateCategory(cat.id, { parentId: null, deletedAt: undefined });
      } else {
          // Standard restore
          restoreCategory(cat.id);
      }
  };

  const handleSmartRestoreTodo = (todo: Todo) => {
      // Check if category is deleted
      const cat = todo.categoryId ? categories.find(c => c.id === todo.categoryId) : null;
      const isCategoryDeleted = cat ? (cat.deletedAt !== undefined) : false;

      // If category is deleted, move todo to 'no category' (root)
      if (isCategoryDeleted) {
          updateTodo(todo.id, { categoryId: undefined, deletedAt: undefined });
      } else {
          // Standard restore
          restoreTodo(todo.id);
      }
  };


  // --- Helper Logic ---
  
  // Close sort menu when clicking outside
  React.useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
        const target = e.target as HTMLElement;
        if (!target.closest('#sort-menu-container')) {
            setIsSortMenuOpen(false);
        }
    };
    if (isSortMenuOpen) {
        document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
        document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isSortMenuOpen]);

  const getDescendantIds = (parentId: string): string[] => {
    const children = categories.filter(c => c.parentId === parentId);
    let ids = children.map(c => c.id);
    children.forEach(child => {
      ids = [...ids, ...getDescendantIds(child.id)];
    });
    return ids;
  };

  const isCategoryChainDeleted = (catId?: string): boolean => {
      if (!catId) return false;
      const cat = categories.find(c => c.id === catId);
      if (!cat) return false;
      if (cat.deletedAt) return true;
      if (cat.parentId) return isCategoryChainDeleted(cat.parentId);
      return false;
  };

  // --- View Mode Logic ---

  // 1. TRASH VIEW LOGIC
  const trashRootCategories = useMemo(() => {
      if (viewMode !== 'trash') return [];
      // Show categories that are explicitly deleted
      return categories.filter(c => c.deletedAt !== undefined);
  }, [viewMode, categories]);

  const trashRootTodos = useMemo(() => {
      if (viewMode !== 'trash') return [];
      // Show todos that are explicitly deleted...
      return todos.filter(t => 
        t.deletedAt !== undefined && 
        // ...AND they are NOT inside a category that is also in the trash (to avoid duplication)
        // Actually, if a todo is deleted, it is deleted. 
        // Logic: 
        // If a todo has `deletedAt`, it appears at the root of Trash list IF:
        //   1. It has no category.
        //   2. OR its category is NOT deleted (active).
        // If its category IS deleted, it will appear inside the folder structure of that deleted category.
        (!t.categoryId || !categories.find(c => c.id === t.categoryId)?.deletedAt)
      );
  }, [viewMode, todos, categories]);


  // 2. NORMAL VIEW LOGIC (Filtered Todos)
  const filteredTodos = useMemo(() => {
    if (viewMode === 'trash') return []; // Handled separately

    let result = todos.filter(t => !t.deletedAt); // Hide deleted
    result = result.filter(t => !isCategoryChainDeleted(t.categoryId)); // Hide hidden via parent

    if (viewMode === 'date' && selectedDate) {
        result = result.filter(t => t.date === selectedDate);
    } else if (viewMode === 'category' && selectedCategoryId) {
        const ids = [selectedCategoryId, ...getDescendantIds(selectedCategoryId)];
        result = result.filter(t => t.categoryId && ids.includes(t.categoryId));
    }

    // Sort
    return [...result].sort((a, b) => {
        if (a.completed !== b.completed) return a.completed ? 1 : -1;
        let comparison = 0;
        switch (sortBy) {
            case 'title': comparison = a.title.localeCompare(b.title, 'zh-CN'); break;
            case 'date': 
                comparison = a.date.localeCompare(b.date);
                if (comparison === 0) comparison = (a.time || '').localeCompare(b.time || '');
                break;
            case 'createdAt': comparison = a.createdAt - b.createdAt; break;
            case 'updatedAt': comparison = (a.updatedAt || a.createdAt) - (b.updatedAt || b.createdAt); break;
        }
        return sortDirection === 'asc' ? comparison : -comparison;
    });
  }, [todos, selectedDate, viewMode, selectedCategoryId, categories, sortBy, sortDirection]);

  const progress = useMemo(() => {
    if (filteredTodos.length === 0) return 0;
    const completed = filteredTodos.filter(t => t.completed).length;
    return Math.round((completed / filteredTodos.length) * 100);
  }, [filteredTodos]);

  const viewTitle = useMemo(() => {
    if (viewMode === 'trash') return '回收站';
    if (viewMode === 'date' && selectedDate) {
        const date = parseISO(selectedDate);
        if (isToday(date)) return '今天';
        if (isTomorrow(date)) return '明天';
        return format(date, 'yyyy年M月d日', { locale: zhCN });
    }
    if (viewMode === 'category' && selectedCategoryId) {
        const cat = categories.find(c => c.id === selectedCategoryId);
        return cat ? cat.name : '未知分类';
    }
    return '所有任务';
  }, [viewMode, selectedDate, selectedCategoryId, categories]);

  const viewIcon = useMemo(() => {
      if (viewMode === 'trash') return <Recycle className="text-red-500" size={24} />;
      if (viewMode === 'all') return <Layers className="text-primary-500" size={24} />;
      if (viewMode === 'category') return <FolderOpen className="text-primary-500" size={24} />;
      return <CalendarIcon className="text-primary-500" size={24} />;
  }, [viewMode]);

  const sortOptions: { value: SortBy; label: string; icon: React.ReactNode }[] = [
      { value: 'date', label: '待办日期', icon: <CalendarDays size={14} /> },
      { value: 'title', label: '任务名称', icon: <Type size={14} /> },
      { value: 'createdAt', label: '创建时间', icon: <Clock size={14} /> },
      { value: 'updatedAt', label: '修改时间', icon: <History size={14} /> },
  ];

  const isEmptyTrash = viewMode === 'trash' && trashRootCategories.length === 0 && trashRootTodos.length === 0;

  return (
    <div className="h-full flex flex-col bg-white overflow-hidden relative">
      {/* Header */}
      <div className="px-6 py-4 border-b border-gray-100 bg-white sticky top-0 z-10 h-24 shrink-0 flex flex-col justify-center">
        <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-3">
                <div className={`p-2 rounded-lg ${viewMode === 'trash' ? 'bg-red-50' : 'bg-primary-50'}`}>
                    {viewIcon}
                </div>
                <div>
                    <h2 className="text-xl font-bold text-gray-900">{viewTitle}</h2>
                    <p className="text-gray-500 text-xs mt-0.5">
                        {viewMode === 'trash' 
                            ? '已删除的项目'
                            : `${filteredTodos.length} 个任务`
                        }
                    </p>
                </div>
            </div>
            
            <div className="flex gap-2">
                {viewMode !== 'trash' && (
                <div className="relative" id="sort-menu-container">
                    <Button 
                        variant="secondary" 
                        className="px-3 h-9"
                        onClick={() => setIsSortMenuOpen(!isSortMenuOpen)}
                        title="排序"
                    >
                        <ArrowUpDown size={16} className="text-gray-500" />
                    </Button>
                    {isSortMenuOpen && (
                        <div className="absolute right-0 top-full mt-2 w-48 bg-white rounded-xl shadow-xl border border-gray-100 z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                           <div className="p-1">
                                {sortOptions.map(option => (
                                    <button
                                        key={option.value}
                                        onClick={() => { setSortBy(option.value); setIsSortMenuOpen(false); }}
                                        className={`w-full flex items-center justify-between px-3 py-2 text-sm rounded-lg transition-colors ${
                                            sortBy === option.value ? 'bg-primary-50 text-primary-700' : 'text-gray-700 hover:bg-gray-50'
                                        }`}
                                    >
                                        <div className="flex items-center gap-2">
                                            {option.icon}
                                            <span>{option.label}</span>
                                        </div>
                                        {sortBy === option.value && <Check size={14} />}
                                    </button>
                                ))}
                                <div className="h-px bg-gray-100 my-1"></div>
                                <div className="flex bg-gray-50 p-1 rounded-lg mx-2 mb-2">
                                    <button onClick={() => setSortDirection('asc')} className={`flex-1 text-xs py-1.5 rounded-md ${sortDirection === 'asc' ? 'bg-white shadow-sm text-primary-700' : 'text-gray-500'}`}>升序</button>
                                    <button onClick={() => setSortDirection('desc')} className={`flex-1 text-xs py-1.5 rounded-md ${sortDirection === 'desc' ? 'bg-white shadow-sm text-primary-700' : 'text-gray-500'}`}>降序</button>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
                )}

                {viewMode !== 'trash' && (
                    <Button onClick={() => setIsModalOpen(true)} className="rounded-lg px-4 py-2 flex items-center gap-2 shadow-sm h-9">
                        <Plus size={18} />
                        <span className="text-sm hidden sm:inline">新建</span>
                    </Button>
                )}
            </div>
        </div>
        
        {viewMode !== 'trash' && filteredTodos.length > 0 && (
            <div className="w-full h-1 bg-gray-100 rounded-full overflow-hidden mt-1">
                <div 
                    className="h-full bg-primary-500 rounded-full transition-all duration-500 ease-out"
                    style={{ width: `${progress}%` }}
                />
            </div>
        )}
      </div>

      {/* List Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-2 scroll-smooth bg-white">
        
        {/* === TRASH EXPLORER VIEW === */}
        {viewMode === 'trash' ? (
            isEmptyTrash ? (
                <div className="h-full flex flex-col items-center justify-center text-gray-400 pb-20">
                    <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mb-4">
                        <Recycle size={24} className="text-gray-300" />
                    </div>
                    <p className="text-sm font-medium">回收站是空的。</p>
                </div>
            ) : (
                <div className="space-y-1">
                    {/* Render Deleted Categories Tree */}
                    {trashRootCategories.map(cat => (
                        <TrashCategoryNode
                            key={cat.id}
                            category={cat}
                            allCategories={categories}
                            allTodos={todos}
                            level={0}
                            onRestoreCategory={handleSmartRestoreCategory}
                            onDeleteCategory={setPermDeleteCatId}
                            onRestoreTodo={handleSmartRestoreTodo}
                            onDeleteTodo={setPermDeleteTodoId}
                        />
                    ))}

                    {/* Render Loose Deleted Todos (Root) */}
                    {trashRootTodos.map(todo => (
                        <div key={todo.id} className="group flex items-center justify-between py-2 px-3 rounded-md hover:bg-white border border-transparent hover:border-gray-100 hover:shadow-sm transition-all mb-1">
                            <div className="flex items-center gap-3 overflow-hidden">
                                <div className={`w-1.5 h-1.5 rounded-full ${todo.completed ? 'bg-green-400' : 'bg-gray-300'}`}></div>
                                <span className={`text-sm truncate ${todo.completed ? 'text-gray-400 line-through' : 'text-gray-600'}`}>
                                    {todo.title}
                                </span>
                                {todo.categoryId && categories.find(c => c.id === todo.categoryId) && (
                                    <span className="text-xs text-gray-400 px-1.5 py-0.5 bg-gray-100 rounded">
                                        {categories.find(c => c.id === todo.categoryId)?.name}
                                    </span>
                                )}
                            </div>
                             <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button 
                                    onClick={() => handleSmartRestoreTodo(todo)}
                                    className="p-1.5 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                                    title="还原"
                                >
                                    <Undo2 size={16} />
                                </button>
                                <button 
                                    onClick={() => setPermDeleteTodoId(todo.id)}
                                    className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                    title="永久删除"
                                >
                                    <Trash2 size={16} />
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )
        ) : (
        // === STANDARD TODO LIST VIEW ===
            filteredTodos.length > 0 ? (
                filteredTodos.map(todo => (
                    <TodoItem key={todo.id} todo={todo} />
                ))
            ) : (
                <div className="h-full flex flex-col items-center justify-center text-gray-400 pb-20">
                    <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mb-4">
                        <ListTodo size={24} className="text-gray-300" />
                    </div>
                    <p className="text-sm font-medium">列表为空。</p>
                    <Button variant="ghost" size="sm" onClick={() => setIsModalOpen(true)} className="mt-2 text-primary-600">
                    创建第一个任务
                    </Button>
                </div>
            )
        )}
      </div>

      <AddTodoModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        defaultDate={selectedDate || format(new Date(), 'yyyy-MM-dd')}
        defaultCategoryId={selectedCategoryId || undefined}
      />
      
      {/* Permanent Delete Confirmation for Category */}
      <ConfirmModal
         isOpen={!!permDeleteCatId}
         onClose={() => setPermDeleteCatId(null)}
         onConfirm={() => permDeleteCatId && permanentlyDeleteCategory(permDeleteCatId)}
         title="永久删除分类"
         message={
             <>
                此操作将<span className="font-bold text-red-600">永久删除</span>该分类及其内部所有的子分类和任务。<br/>
                此操作无法撤销。
             </>
         }
      />

       {/* Permanent Delete Confirmation for Todo */}
       <ConfirmModal
         isOpen={!!permDeleteTodoId}
         onClose={() => setPermDeleteTodoId(null)}
         onConfirm={() => permDeleteTodoId && permanentlyDeleteTodo(permDeleteTodoId)}
         title="永久删除任务"
         message="确定要永久删除这个任务吗？此操作无法撤销。"
      />
    </div>
  );
};