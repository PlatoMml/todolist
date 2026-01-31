
import React, { useMemo, useState } from 'react';
import { useTodoStore } from '../store/useTodoStore';
import { TodoItem } from './TodoItem';
import { format, isToday, isTomorrow, addDays, addMonths } from 'date-fns';
import zhCN from 'date-fns/locale/zh-CN';
import { 
  Plus, ListTodo, FolderOpen, Layers, Calendar as CalendarIcon, ArrowUpDown, Check,
  Clock, CalendarDays, Type, History, Recycle, Trash2, Undo2, ChevronRight, ChevronDown, Folder, CalendarRange, MoreVertical,
  CheckSquare, X
} from 'lucide-react';
import { AddTodoModal } from './AddTodoModal';
import { Button } from './Button';
import { SortBy, SortDirection, Category, Todo } from '../types';
import { ConfirmModal } from './ConfirmModal';
import { ActionSheet, ActionSheetOption } from './ActionSheet';

// Helper to parse YYYY-MM-DD to local Date object
const parseLocalDate = (dateStr: string) => {
  const [year, month, day] = dateStr.split('-').map(Number);
  return new Date(year, month - 1, day);
};

// ... (TrashRow and TrashCategoryNode components remain identical, keeping them for context) ...
// Sub-component for Trash Rows to handle ActionSheet state locally
const TrashRow: React.FC<{
    item: Category | Todo;
    type: 'category' | 'todo';
    onRestore: () => void;
    onDelete: () => void;
}> = ({ item, type, onRestore, onDelete }) => {
    const [isSheetOpen, setIsSheetOpen] = useState(false);
    const title = 'name' in item ? item.name : item.title;
    const isCompleted = 'completed' in item ? item.completed : false;

    const sheetOptions: ActionSheetOption[] = [
        { label: '还原', icon: <Undo2 size={20} />, onClick: onRestore },
        { label: '永久删除', icon: <Trash2 size={20} />, onClick: onDelete, variant: 'danger' }
    ];

    return (
        <>
            <div className="group flex items-center justify-between py-2 px-3 rounded-md hover:bg-white border border-transparent hover:border-gray-100 hover:shadow-sm transition-all mb-1">
                <div className="flex items-center gap-3 overflow-hidden">
                    {type === 'category' ? (
                        <div className="p-1.5 rounded-md bg-gray-100 text-gray-400 shrink-0"><Folder size={16} /></div>
                    ) : (
                        <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${isCompleted ? 'bg-green-400' : 'bg-gray-300'}`}></div>
                    )}
                    <span className={`text-sm truncate ${type === 'todo' && (isCompleted || item.deletedAt) ? 'text-gray-400 line-through' : 'text-gray-600'} ${type === 'category' ? 'line-through decoration-gray-400' : ''}`}>
                        {title}
                    </span>
                    {type === 'todo' && 'categoryId' in item && item.categoryId && (
                       <span className="text-xs text-gray-400 px-1.5 py-0.5 bg-gray-100 rounded truncate max-w-[80px]">Cat</span>
                    )}
                </div>

                <div className="flex items-center gap-1 shrink-0">
                     {/* Desktop Hover Actions */}
                    <div className="hidden lg:flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button 
                            onClick={(e) => { e.stopPropagation(); onRestore(); }}
                            className="p-1.5 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                            title="还原"
                        >
                            <Undo2 size={16} />
                        </button>
                        <button 
                            onClick={(e) => { e.stopPropagation(); onDelete(); }}
                            className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                            title="永久删除"
                        >
                            <Trash2 size={16} />
                        </button>
                    </div>
                     {/* Mobile/Narrow Menu */}
                    <button 
                        className="lg:hidden p-1.5 text-gray-400 hover:bg-gray-100 rounded-lg"
                        onClick={(e) => { e.stopPropagation(); setIsSheetOpen(true); }}
                    >
                        <MoreVertical size={16} />
                    </button>
                </div>
            </div>
            <ActionSheet 
                isOpen={isSheetOpen} 
                onClose={() => setIsSheetOpen(false)} 
                title={title}
                options={sheetOptions}
            />
        </>
    );
};

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
    category, allCategories, allTodos, level, onRestoreCategory, onDeleteCategory, onRestoreTodo, onDeleteTodo
}) => {
    const [isExpanded, setIsExpanded] = useState(false);
    const childCategories = allCategories.filter(c => c.parentId === category.id);
    const childTodos = allTodos.filter(t => t.categoryId === category.id);
    const isEmpty = childCategories.length === 0 && childTodos.length === 0;

    const [isSheetOpen, setIsSheetOpen] = useState(false);
    const sheetOptions: ActionSheetOption[] = [
        { label: '还原分类', icon: <Undo2 size={20} />, onClick: () => onRestoreCategory(category) },
        { label: '永久删除', icon: <Trash2 size={20} />, onClick: () => onDeleteCategory(category.id), variant: 'danger' }
    ];

    return (
        <div className="select-none">
             <div 
                className="group flex items-center justify-between py-2 px-3 rounded-md hover:bg-gray-50 border border-transparent hover:border-gray-200 transition-all mb-1"
                style={{ marginLeft: `${level * 16}px` }}
                onClick={() => !isEmpty && setIsExpanded(!isExpanded)}
            >
                <div className="flex items-center gap-3 overflow-hidden flex-1 cursor-pointer">
                    <div className={`p-1.5 rounded-md ${isExpanded ? 'bg-primary-50 text-primary-600' : 'bg-gray-100 text-gray-400'} shrink-0`}>
                        <Folder size={16} />
                    </div>
                    <span className="text-sm font-medium text-gray-700 truncate line-through decoration-gray-400">
                        {category.name}
                    </span>
                    {!isEmpty && (
                        <span className="text-xs text-gray-400 shrink-0">
                            {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                        </span>
                    )}
                </div>

                <div className="flex items-center gap-1 shrink-0">
                    <div className="hidden lg:flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button 
                            onClick={(e) => { e.stopPropagation(); onRestoreCategory(category); }}
                            className="p-1.5 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                            title="还原分类"
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
                    <button 
                        className="lg:hidden p-1.5 text-gray-400 hover:bg-gray-100 rounded-lg"
                        onClick={(e) => { e.stopPropagation(); setIsSheetOpen(true); }}
                    >
                        <MoreVertical size={16} />
                    </button>
                </div>
            </div>
            <ActionSheet 
                isOpen={isSheetOpen} 
                onClose={() => setIsSheetOpen(false)} 
                title={category.name}
                options={sheetOptions}
            />

            {isExpanded && (
                <div className="border-l border-gray-100 ml-4 pl-1">
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
                    {childTodos.map(todo => (
                        <TrashRow 
                            key={todo.id} 
                            item={todo} 
                            type="todo" 
                            onRestore={() => onRestoreTodo(todo)} 
                            onDelete={() => onDeleteTodo(todo.id)} 
                        />
                    ))}
                </div>
            )}
        </div>
    );
};

export const TodoList: React.FC = () => {
  const { todos, selectedDate, viewMode, selectedCategoryId, categories, sortBy, sortDirection, upcomingDays, setSortBy, setSortDirection, updateCategory, updateTodo, restoreCategory, restoreTodo, permanentlyDeleteCategory, permanentlyDeleteTodo, toggleTodo, toggleVirtualTodo, moveTodoToTrash, deleteVirtualTodo } = useTodoStore();
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSortMenuOpen, setIsSortMenuOpen] = useState(false);
  const [permDeleteCatId, setPermDeleteCatId] = useState<string | null>(null);
  const [permDeleteTodoId, setPermDeleteTodoId] = useState<string | null>(null);
  
  // Selection Mode State
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isBatchDeleteModalOpen, setIsBatchDeleteModalOpen] = useState(false);

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

  // Reset selection when view changes
  React.useEffect(() => {
      setIsSelectionMode(false);
      setSelectedIds(new Set());
  }, [viewMode, selectedDate, selectedCategoryId]);

  const filteredTodos = useMemo(() => {
    if (viewMode === 'trash') return [];
    const isCategoryChainDeleted = (catId?: string): boolean => {
      if (!catId) return false;
      const cat = categories.find(c => c.id === catId);
      if (!cat) return false;
      if (cat.deletedAt) return true;
      if (cat.parentId) return isCategoryChainDeleted(cat.parentId);
      return false;
    };
    let result = todos.filter(t => !t.deletedAt);
    result = result.filter(t => !isCategoryChainDeleted(t.categoryId));

    if (viewMode === 'date' && selectedDate) {
        const realTasks = result.filter(t => t.date === selectedDate);
        const realTaskMap = new Map<string, { isDeleted: boolean }>();
        todos.forEach(t => { realTaskMap.set(`${t.date}|${t.title}`, { isDeleted: !!t.deletedAt }); });
        const activeRecurringTasks = todos.filter(t => t.repeat);
        const virtualTodos: Todo[] = [];
        activeRecurringTasks.forEach(source => {
            if (source.date >= selectedDate) return;
            let pointerDate = parseLocalDate(source.date);
            let safety = 0;
            while (safety < 1000) {
                if (source.repeat?.type === 'daily') { pointerDate = addDays(pointerDate, source.repeat.interval); } else if (source.repeat?.type === 'monthly') { pointerDate = addMonths(pointerDate, 1); } else { break; }
                safety++;
                const dateStr = format(pointerDate, 'yyyy-MM-dd');
                const collision = realTaskMap.get(`${dateStr}|${source.title}`);
                if (collision) { break; }
                if (dateStr === selectedDate) {
                    virtualTodos.push({ ...source, id: `virtual-${source.id}-${dateStr}`, date: dateStr, isVirtual: true, completed: false, deletedAt: undefined, });
                    break; 
                }
                if (dateStr > selectedDate) { break; }
            }
        });
        result = [...realTasks, ...virtualTodos];
    } else if (viewMode === 'category' && selectedCategoryId) {
        const getDescendantIds = (parentId: string): string[] => {
            const children = categories.filter(c => c.parentId === parentId);
            let ids = children.map(c => c.id);
            children.forEach(child => { ids = [...ids, ...getDescendantIds(child.id)]; });
            return ids;
        };
        const ids = [selectedCategoryId, ...getDescendantIds(selectedCategoryId)];
        result = result.filter(t => t.categoryId && ids.includes(t.categoryId));
    } else if (viewMode === 'upcoming') {
        const safeDays = (typeof upcomingDays === 'number' && !isNaN(upcomingDays)) ? upcomingDays : 7;
        const today = new Date(); const end = addDays(today, safeDays); const startStr = format(today, 'yyyy-MM-dd'); const endStr = format(end, 'yyyy-MM-dd');
        result = result.filter(t => t.date >= startStr && t.date <= endStr);
    }
    return [...result].sort((a, b) => {
        if (a.completed !== b.completed) return a.completed ? 1 : -1;
        let comparison = 0;
        switch (sortBy) {
            case 'title': comparison = a.title.localeCompare(b.title, 'zh-CN'); break;
            case 'date': comparison = a.date.localeCompare(b.date); if (comparison === 0) comparison = (a.time || '').localeCompare(b.time || ''); break;
            case 'createdAt': comparison = a.createdAt - b.createdAt; break;
            case 'updatedAt': comparison = (a.updatedAt || a.createdAt) - (b.updatedAt || b.createdAt); break;
        }
        return sortDirection === 'asc' ? comparison : -comparison;
    });
  }, [todos, selectedDate, viewMode, selectedCategoryId, categories, sortBy, sortDirection, upcomingDays]);

  const progress = useMemo(() => {
    if (filteredTodos.length === 0) return 0;
    const completed = filteredTodos.filter(t => t.completed).length;
    return Math.round((completed / filteredTodos.length) * 100);
  }, [filteredTodos]);

  const trashRootCategories = useMemo(() => {
      if (viewMode !== 'trash') return [];
      return categories.filter(c => c.deletedAt !== undefined);
  }, [viewMode, categories]);

  const trashRootTodos = useMemo(() => {
      if (viewMode !== 'trash') return [];
      return todos.filter(t => t.deletedAt !== undefined && (!t.categoryId || !categories.find(c => c.id === t.categoryId)?.deletedAt));
  }, [viewMode, todos, categories]);

  const handleSmartRestoreCategory = (cat: Category) => { const parent = cat.parentId ? categories.find(p => p.id === cat.parentId) : null; if (parent && parent.deletedAt) { updateCategory(cat.id, { parentId: null, deletedAt: undefined }); } else { restoreCategory(cat.id); } };
  const handleSmartRestoreTodo = (todo: Todo) => { const cat = todo.categoryId ? categories.find(c => c.id === todo.categoryId) : null; if (cat && cat.deletedAt) { updateTodo(todo.id, { categoryId: undefined, deletedAt: undefined }); } else { restoreTodo(todo.id); } };
  
  // Logic to display the View Title (Simplified for Date view)
  const viewTitle = useMemo(() => {
    if (viewMode === 'trash') return '回收站';
    if (viewMode === 'date' && selectedDate) { 
        const date = parseLocalDate(selectedDate); 
        if (isToday(date)) return '今天'; 
        if (isTomorrow(date)) return '明天'; 
        return format(date, 'M月d日', { locale: zhCN }); 
    }
    if (viewMode === 'category' && selectedCategoryId) { const cat = categories.find(c => c.id === selectedCategoryId); return cat ? cat.name : '未知分类'; }
    if (viewMode === 'upcoming') { return `未来 ${upcomingDays} 天待办`; }
    return '所有任务';
  }, [viewMode, selectedDate, selectedCategoryId, categories, upcomingDays]);
  
  // Logic to display the Subtitle (Added Weekday for Date view)
  const viewSubtitle = useMemo(() => {
      if (viewMode === 'trash') return '已删除的项目';
      
      const countText = `${filteredTodos.length} 个任务`;
      
      if (viewMode === 'date' && selectedDate) {
          const date = parseLocalDate(selectedDate);
          const weekDay = format(date, 'EEEE', { locale: zhCN }); // e.g., "星期三"
          return `${weekDay} · ${countText}`;
      }
      
      return countText;
  }, [viewMode, selectedDate, filteredTodos.length]);
  
  // Logic to display the Icon (Reverted to Standard Static Icons)
  const viewIcon = useMemo(() => {
      const iconClass = "text-primary-600";
      const wrapperClass = "p-2 bg-primary-50 rounded-lg shrink-0";
      
      if (viewMode === 'trash') return <div className="p-2 bg-red-50 rounded-lg shrink-0"><Recycle className="text-red-600" size={24} /></div>;
      if (viewMode === 'all') return <div className={wrapperClass}><Layers className={iconClass} size={24} /></div>;
      if (viewMode === 'category') return <div className={wrapperClass}><FolderOpen className={iconClass} size={24} /></div>;
      if (viewMode === 'upcoming') return <div className={wrapperClass}><CalendarRange className={iconClass} size={24} /></div>;
      
      // Default (Date view)
      return <div className={wrapperClass}><CalendarIcon className={iconClass} size={24} /></div>;
  }, [viewMode]);

  const sortOptions: { value: SortBy; label: string; icon: React.ReactNode }[] = [ { value: 'date', label: '待办日期', icon: <CalendarDays size={14} /> }, { value: 'title', label: '任务名称', icon: <Type size={14} /> }, { value: 'createdAt', label: '创建时间', icon: <Clock size={14} /> }, { value: 'updatedAt', label: '修改时间', icon: <History size={14} /> }, ];

  // Selection Logic
  const handleToggleSelect = (id: string) => {
      const newSet = new Set(selectedIds);
      if (newSet.has(id)) newSet.delete(id);
      else newSet.add(id);
      setSelectedIds(newSet);
  };

  const handleSelectAll = () => {
      if (selectedIds.size === filteredTodos.length) {
          setSelectedIds(new Set());
      } else {
          setSelectedIds(new Set(filteredTodos.map(t => t.id)));
      }
  };
  
  const handleEnterSelectionMode = (initialId: string) => {
      setIsSelectionMode(true);
      setSelectedIds(new Set([initialId]));
  };

  const batchMarkComplete = () => {
      selectedIds.forEach(id => {
          const todo = filteredTodos.find(t => t.id === id);
          if (!todo || todo.completed) return;
          if (todo.isVirtual && todo.id.startsWith('virtual-')) {
              const sourceId = todo.id.substring(8, 8 + 36);
              toggleVirtualTodo(sourceId, todo.date);
          } else {
              toggleTodo(todo.id);
          }
      });
      setIsSelectionMode(false);
  };

  const batchMarkIncomplete = () => {
      selectedIds.forEach(id => {
          const todo = filteredTodos.find(t => t.id === id);
          if (!todo || !todo.completed) return;
           // If it's a real completed task, we can toggle it back.
           // Virtual tasks in list are usually incomplete. If completed, they become real.
           if (!todo.isVirtual) {
               toggleTodo(todo.id);
           }
      });
      setIsSelectionMode(false);
  };

  const hasRecurringInSelection = useMemo(() => {
      for (const id of selectedIds) {
          const todo = filteredTodos.find(t => t.id === id);
          if (todo && (todo.repeat || todo.isVirtual)) return true;
      }
      return false;
  }, [selectedIds, filteredTodos]);

  const batchDelete = () => {
      selectedIds.forEach(id => {
          const todo = filteredTodos.find(t => t.id === id);
          if (!todo) return;
          
          if (todo.isVirtual && todo.id.startsWith('virtual-')) {
              const sourceId = todo.id.substring(8, 8 + 36);
              deleteVirtualTodo(sourceId, todo.date);
          } else {
              // For real tasks, move to trash. 
              // Note: our Store logic now handles spawning the next instance if we delete a recurring task source.
              moveTodoToTrash(todo.id);
          }
      });
      setIsSelectionMode(false);
      setIsBatchDeleteModalOpen(false);
  };

  return (
    <div className="h-full flex flex-col bg-white overflow-hidden relative">
      <div className="px-6 py-4 border-b border-gray-100 bg-white sticky top-0 z-10 h-24 shrink-0 flex flex-col justify-center transition-all">
        {isSelectionMode ? (
            // Selection Mode Header
            <div className="flex items-center justify-between animate-in fade-in slide-in-from-top-2 duration-200">
                <span className="text-lg font-bold text-gray-900">已选择 {selectedIds.size} 项</span>
                <div className="flex items-center gap-3">
                     <button onClick={handleSelectAll} className="text-primary-600 font-medium text-sm hover:bg-primary-50 px-3 py-1.5 rounded-lg transition-colors">
                        {selectedIds.size === filteredTodos.length ? '取消全选' : '全选'}
                    </button>
                     <button onClick={() => { setIsSelectionMode(false); setSelectedIds(new Set()); }} className="text-gray-500 hover:text-gray-800 font-medium text-sm px-3 py-1.5 hover:bg-gray-100 rounded-lg transition-colors">
                        退出
                     </button>
                </div>
            </div>
        ) : (
            // Normal Header
            <>
                <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-3 overflow-hidden">
                        {/* Standard Icon */}
                        {viewIcon}
                        
                        <div className="min-w-0 flex flex-col justify-center">
                            {/* Improved date display: smaller font on mobile, whitespace-nowrap, truncate if needed */}
                            <h2 className="text-lg sm:text-xl font-bold text-gray-900 truncate leading-tight whitespace-nowrap">
                                {viewTitle}
                            </h2>
                            <p className="text-gray-500 text-xs mt-0.5 truncate">
                                {viewSubtitle}
                            </p>
                        </div>
                    </div>
                    <div className="flex gap-2 shrink-0 ml-2">
                        {viewMode !== 'trash' && (
                            <>
                                {/* REMOVED: "Select" Button */}
                                
                                <div className="relative" id="sort-menu-container"><Button variant="secondary" className="px-3 h-9" onClick={() => setIsSortMenuOpen(!isSortMenuOpen)} title="排序"><ArrowUpDown size={16} className="text-gray-500" /></Button>{isSortMenuOpen && (<div className="absolute right-0 top-full mt-2 w-48 bg-white rounded-xl shadow-xl border border-gray-100 z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-200"><div className="p-1">{sortOptions.map(option => (<button key={option.value} onClick={() => { setSortBy(option.value); setIsSortMenuOpen(false); }} className={`w-full flex items-center justify-between px-3 py-2 text-sm rounded-lg transition-colors ${sortBy === option.value ? 'bg-primary-50 text-primary-700' : 'text-gray-700 hover:bg-gray-50'}`}><div className="flex items-center gap-2">{option.icon}<span>{option.label}</span></div>{sortBy === option.value && <Check size={14} />}</button>))}<div className="h-px bg-gray-100 my-1"></div><div className="flex bg-gray-50 p-1 rounded-lg mx-2 mb-2"><button onClick={() => setSortDirection('asc')} className={`flex-1 text-xs py-1.5 rounded-md ${sortDirection === 'asc' ? 'bg-white shadow-sm text-primary-700' : 'text-gray-500'}`}>升序</button><button onClick={() => setSortDirection('desc')} className={`flex-1 text-xs py-1.5 rounded-md ${sortDirection === 'desc' ? 'bg-white shadow-sm text-primary-700' : 'text-gray-500'}`}>降序</button></div></div></div>)}</div>
                                <Button onClick={() => setIsModalOpen(true)} className="rounded-lg px-4 py-2 flex items-center gap-2 shadow-sm h-9"><Plus size={18} /><span className="text-sm hidden sm:inline">新建</span></Button>
                            </>
                        )}
                    </div>
                </div>
                {viewMode !== 'trash' && filteredTodos.length > 0 && (<div className="w-full h-1 bg-gray-100 rounded-full overflow-hidden mt-1"><div className="h-full bg-primary-500 rounded-full transition-all duration-500 ease-out" style={{ width: `${progress}%` }} /></div>)}
            </>
        )}
      </div>

      <div className={`flex-1 overflow-y-auto p-4 space-y-2 scroll-smooth bg-white ${isSelectionMode ? 'pb-24' : ''}`}>
        {viewMode === 'trash' ? (
            trashRootCategories.length === 0 && trashRootTodos.length === 0 ? (<div className="h-full flex flex-col items-center justify-center text-gray-400 pb-20"><div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mb-4"><Recycle size={24} className="text-gray-300" /></div><p className="text-sm font-medium">回收站是空的。</p></div>) : (
                <div className="space-y-1">
                    {trashRootCategories.map(cat => (<TrashCategoryNode key={cat.id} category={cat} allCategories={categories} allTodos={todos} level={0} onRestoreCategory={handleSmartRestoreCategory} onDeleteCategory={setPermDeleteCatId} onRestoreTodo={handleSmartRestoreTodo} onDeleteTodo={setPermDeleteTodoId} />))}
                    {trashRootTodos.map(todo => (
                        <TrashRow 
                            key={todo.id} 
                            item={todo} 
                            type="todo" 
                            onRestore={() => handleSmartRestoreTodo(todo)} 
                            onDelete={() => setPermDeleteTodoId(todo.id)} 
                        />
                    ))}
                </div>
            )
        ) : (
            filteredTodos.length > 0 ? (filteredTodos.map(todo => (
                <TodoItem 
                    key={todo.id} 
                    todo={todo} 
                    isSelectionMode={isSelectionMode}
                    isSelected={selectedIds.has(todo.id)}
                    onToggleSelect={() => handleToggleSelect(todo.id)}
                    onLongPress={() => handleEnterSelectionMode(todo.id)} // Pass handler for long press
                />
            ))) : (<div className="h-full flex flex-col items-center justify-center text-gray-400 pb-20"><div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mb-4"><ListTodo size={24} className="text-gray-300" /></div><p className="text-sm font-medium">列表为空。</p><Button variant="ghost" size="sm" onClick={() => setIsModalOpen(true)} className="mt-2 text-primary-600">创建第一个任务</Button></div>)
        )}
      </div>

      {/* Batch Actions Footer */}
      {isSelectionMode && selectedIds.size > 0 && (
          <div className="absolute bottom-6 left-1/2 -translate-x-1/2 bg-white shadow-2xl rounded-full border border-gray-200 px-5 sm:px-6 py-3 flex items-center gap-4 sm:gap-6 animate-in slide-in-from-bottom-10 fade-in duration-300 z-50">
               <button onClick={batchMarkComplete} className="flex flex-col items-center gap-1 text-gray-500 hover:text-green-600 transition-colors">
                   <div className="p-1 rounded-full bg-gray-100 hover:bg-green-50"><Check size={20} /></div>
                   <span className="text-[10px] font-medium whitespace-nowrap">标记完成</span>
               </button>
               <button onClick={batchMarkIncomplete} className="flex flex-col items-center gap-1 text-gray-500 hover:text-orange-600 transition-colors">
                   <div className="p-1 rounded-full bg-gray-100 hover:bg-orange-50"><Undo2 size={20} /></div>
                   <span className="text-[10px] font-medium whitespace-nowrap">标记未完成</span>
               </button>
               <div className="w-px h-8 bg-gray-200"></div>
               <button onClick={() => setIsBatchDeleteModalOpen(true)} className="flex flex-col items-center gap-1 text-gray-500 hover:text-red-600 transition-colors">
                   <div className="p-1 rounded-full bg-gray-100 hover:bg-red-50"><Trash2 size={20} /></div>
                   <span className="text-[10px] font-medium whitespace-nowrap">删除</span>
               </button>
          </div>
      )}

      <AddTodoModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} defaultDate={selectedDate || format(new Date(), 'yyyy-MM-dd')} defaultCategoryId={selectedCategoryId || undefined} />
      <ConfirmModal isOpen={!!permDeleteCatId} onClose={() => setPermDeleteCatId(null)} onConfirm={() => permDeleteCatId && permanentlyDeleteCategory(permDeleteCatId)} title="永久删除分类" message={<>此操作将<span className="font-bold text-red-600">永久删除</span>该分类及其内部所有的子分类和任务。<br/>此操作无法撤销。</>} />
      <ConfirmModal isOpen={!!permDeleteTodoId} onClose={() => setPermDeleteTodoId(null)} onConfirm={() => permDeleteTodoId && permanentlyDeleteTodo(permDeleteTodoId)} title="永久删除任务" message="确定要永久删除这个任务吗？此操作无法撤销。" />
      
      {/* Batch Delete Confirmation */}
      <ConfirmModal 
        isOpen={isBatchDeleteModalOpen}
        onClose={() => setIsBatchDeleteModalOpen(false)}
        onConfirm={batchDelete}
        title="批量删除"
        message={
            hasRecurringInSelection ? (
                <span>
                    您选择了 <span className="font-bold">{selectedIds.size}</span> 个任务。<br/>
                    <span className="text-orange-600 font-bold block mt-2">注意：选中的任务中包含重复待办。</span>
                    <span className="text-gray-500 text-xs block mt-1">为避免逻辑冲突，对于重复任务，系统将仅删除本次实例，后续重复将保留。</span>
                </span>
            ) : (
                `确定要删除选中的 ${selectedIds.size} 个任务吗？`
            )
        }
      />
    </div>
  );
};
