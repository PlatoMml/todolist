import React, { useMemo, useState } from 'react';
import { useTodoStore } from '../store/useTodoStore';
import { TodoItem } from './TodoItem';
import { format, parseISO, isToday, isPast, isTomorrow } from 'date-fns';
import { zhCN } from 'date-fns/locale';
import { Plus, ListTodo, Sparkles, FolderOpen, Layers, Calendar as CalendarIcon } from 'lucide-react';
import { AddTodoModal } from './AddTodoModal';
import { Button } from './Button';
import { Category } from '../types';

export const TodoList: React.FC = () => {
  const { todos, selectedDate, viewMode, selectedCategoryId, categories } = useTodoStore();
  const [isModalOpen, setIsModalOpen] = useState(false);

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

    // Sort: Uncompleted first, then Date, then Priority, then Created
    return result.sort((a, b) => {
        if (a.completed !== b.completed) return a.completed ? 1 : -1;
        if (a.date !== b.date) return a.date.localeCompare(b.date);
        
        const pMap = { '高': 3, '中': 2, '低': 1 };
        if (pMap[a.priority] !== pMap[b.priority]) return pMap[b.priority] - pMap[a.priority];
        return b.createdAt - a.createdAt;
    });
  }, [todos, selectedDate, viewMode, selectedCategoryId, categories]);

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
            <Button onClick={() => setIsModalOpen(true)} className="rounded-lg px-4 py-2 flex items-center gap-2 shadow-sm">
                <Plus size={18} />
                <span className="text-sm">新建</span>
            </Button>
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
        defaultDate={selectedDate || new Date().toISOString().split('T')[0]}
      />
    </div>
  );
};