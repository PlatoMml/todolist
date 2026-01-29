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
  History
} from 'lucide-react';
import { AddTodoModal } from './AddTodoModal';
import { Button } from './Button';
import { SortBy, SortDirection } from '../types';

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
    setSortDirection
  } = useTodoStore();
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSortMenuOpen, setIsSortMenuOpen] = useState(false);

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

  // Helper to get all descendant categories
  const getDescendantIds = (parentId: string): string[] => {
    const children = categories.filter(c => c.parentId === parentId);
    let ids = children.map(c => c.id);
    children.forEach(child => {
      ids = [...ids, ...getDescendantIds(child.id)];
    });
    return ids;
  };

  const filteredTodos = useMemo(() => {
    let result = todos;

    if (viewMode === 'date' && selectedDate) {
        result = todos.filter(t => t.date === selectedDate);
    } else if (viewMode === 'category' && selectedCategoryId) {
        const ids = [selectedCategoryId, ...getDescendantIds(selectedCategoryId)];
        result = todos.filter(t => t.categoryId && ids.includes(t.categoryId));
    } else if (viewMode === 'all') {
        result = todos;
    }

    // Sort Logic
    return [...result].sort((a, b) => {
        // 1. Completed items always at the bottom
        if (a.completed !== b.completed) return a.completed ? 1 : -1;

        // 2. Standard Sort
        let comparison = 0;
        switch (sortBy) {
            case 'title':
                comparison = a.title.localeCompare(b.title, 'zh-CN');
                break;
            case 'date':
                // Compare Date first
                comparison = a.date.localeCompare(b.date);
                // If Dates are same, compare Time
                if (comparison === 0) {
                    const timeA = a.time || ''; // treat undefined as earliest? or empty
                    const timeB = b.time || '';
                    comparison = timeA.localeCompare(timeB);
                }
                break;
            case 'createdAt':
                comparison = a.createdAt - b.createdAt;
                break;
            case 'updatedAt':
                const aUpdated = a.updatedAt || a.createdAt;
                const bUpdated = b.updatedAt || b.createdAt;
                comparison = aUpdated - bUpdated;
                break;
            default:
                comparison = 0;
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

  return (
    <div className="h-full flex flex-col bg-white overflow-hidden relative">
      {/* Header */}
      <div className="px-6 py-4 border-b border-gray-100 bg-white sticky top-0 z-10 h-24 shrink-0 flex flex-col justify-center">
        <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-3">
                <div className="p-2 bg-primary-50 rounded-lg">
                    {viewIcon}
                </div>
                <div>
                    <h2 className="text-xl font-bold text-gray-900">{viewTitle}</h2>
                    <p className="text-gray-500 text-xs mt-0.5">
                        {filteredTodos.length} 个任务
                    </p>
                </div>
            </div>
            
            <div className="flex gap-2">
                {/* Sort Button */}
                <div className="relative" id="sort-menu-container">
                    <Button 
                        variant="secondary" 
                        className="px-3 h-9"
                        onClick={() => setIsSortMenuOpen(!isSortMenuOpen)}
                        title="排序"
                    >
                        <ArrowUpDown size={16} className="text-gray-500" />
                    </Button>

                    {/* Sort Dropdown */}
                    {isSortMenuOpen && (
                        <div className="absolute right-0 top-full mt-2 w-48 bg-white rounded-xl shadow-xl border border-gray-100 z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                            <div className="p-1">
                                <div className="text-xs font-semibold text-gray-400 px-3 py-2">排序依据</div>
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
                                
                                <div className="text-xs font-semibold text-gray-400 px-3 py-2">顺序</div>
                                <div className="flex bg-gray-50 p-1 rounded-lg mx-2 mb-2">
                                    <button
                                        onClick={() => setSortDirection('asc')}
                                        className={`flex-1 text-xs py-1.5 rounded-md transition-all font-medium ${
                                            sortDirection === 'asc' ? 'bg-white shadow-sm text-primary-700' : 'text-gray-500 hover:text-gray-700'
                                        }`}
                                    >
                                        升序
                                    </button>
                                    <button
                                        onClick={() => setSortDirection('desc')}
                                        className={`flex-1 text-xs py-1.5 rounded-md transition-all font-medium ${
                                            sortDirection === 'desc' ? 'bg-white shadow-sm text-primary-700' : 'text-gray-500 hover:text-gray-700'
                                        }`}
                                    >
                                        降序
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                <Button onClick={() => setIsModalOpen(true)} className="rounded-lg px-4 py-2 flex items-center gap-2 shadow-sm h-9">
                    <Plus size={18} />
                    <span className="text-sm hidden sm:inline">新建</span>
                    <span className="text-sm sm:hidden">新建</span>
                </Button>
            </div>
        </div>
        
        {filteredTodos.length > 0 && (
            <div className="w-full h-1 bg-gray-100 rounded-full overflow-hidden mt-1">
                <div 
                    className="h-full bg-primary-500 rounded-full transition-all duration-500 ease-out"
                    style={{ width: `${progress}%` }}
                />
            </div>
        )}
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto p-4 space-y-2 scroll-smooth bg-white">
        {filteredTodos.length > 0 ? (
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
        )}
      </div>

      <AddTodoModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        defaultDate={selectedDate || format(new Date(), 'yyyy-MM-dd')}
      />
    </div>
  );
};