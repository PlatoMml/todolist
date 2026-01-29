import React, { useState } from 'react';
import { Todo, Priority } from '../types';
import { Trash2, Edit2, CalendarClock, Check } from 'lucide-react';
import { useTodoStore } from '../store/useTodoStore';
import { format, parseISO, isToday, isTomorrow } from 'date-fns';
import { zhCN } from 'date-fns/locale';
import { AddTodoModal } from './AddTodoModal';
import { ConfirmModal } from './ConfirmModal';

interface TodoItemProps {
  todo: Todo;
}

export const TodoItem: React.FC<TodoItemProps> = ({ todo }) => {
  const { toggleTodo, deleteTodo, categories, viewMode } = useTodoStore();
  const [isHovered, setIsHovered] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

  const priorityColors = {
    [Priority.HIGH]: 'bg-red-50 text-red-600 border-red-200',
    [Priority.MEDIUM]: 'bg-yellow-50 text-yellow-600 border-yellow-200',
    [Priority.LOW]: 'bg-green-50 text-green-600 border-green-200',
  };

  const categoryName = todo.categoryId 
    ? categories.find(c => c.id === todo.categoryId)?.name 
    : null;

  // Date formatting for list item
  const dateObj = parseISO(todo.date);
  let dateDisplay = '';
  if (isToday(dateObj)) dateDisplay = '今天';
  else if (isTomorrow(dateObj)) dateDisplay = '明天';
  else dateDisplay = format(dateObj, 'M月d日', { locale: zhCN });
  
  // Append time if exists
  if (todo.time) {
      dateDisplay += ` ${todo.time}`;
  }

  return (
    <>
        <div 
        className={`group relative flex items-center gap-3 p-3 pl-2 rounded-xl border transition-all duration-200 ${
            todo.completed 
            ? 'bg-gray-50 border-gray-100' 
            : 'bg-white border-gray-200 shadow-sm hover:shadow-md hover:border-primary-200'
        }`}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        >
        
        {/* Status Indicator (Check or Dot) - Non interactive, status only since row is clickable */}
        <div className="flex-shrink-0 flex items-center justify-center w-8">
            {todo.completed ? (
                    <div className="text-green-500"><Check size={18} /></div>
            ) : (
                <div className="w-1.5 h-1.5 rounded-full bg-gray-200"></div>
            )}
        </div>

        {/* Content Area - Click to Toggle Complete */}
        <div 
            className="flex-1 min-w-0 cursor-pointer select-none"
            onClick={() => toggleTodo(todo.id)}
            title={todo.completed ? "标记为未完成" : "标记为完成"}
        >
            <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                <h3 className={`text-sm font-medium truncate transition-all ${
                    todo.completed ? 'text-gray-400 line-through' : 'text-gray-900'
                }`}>
                    {todo.title}
                </h3>
                
                {categoryName && (
                    <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-gray-100 text-gray-500 border border-gray-200 truncate max-w-[80px]">
                        {categoryName}
                    </span>
                )}
                
                {/* Show Date Badge if not in Date View (OR if time is specified, show it even in date view for clarity) */}
                {(viewMode !== 'date' || todo.time) && (
                    <span className={`flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium border ${
                        isToday(dateObj) ? 'bg-orange-50 text-orange-600 border-orange-200' : 'bg-gray-50 text-gray-500 border-gray-200'
                    }`}>
                        <CalendarClock size={10} />
                        {dateDisplay}
                    </span>
                )}
            </div>
            
            {todo.description && (
            <p className="text-xs text-gray-500 truncate">{todo.description}</p>
            )}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2">
            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${priorityColors[todo.priority]}`}>
            {todo.priority}
            </span>
            
            <div className={`flex items-center gap-1 transition-opacity duration-200 ${isHovered ? 'opacity-100' : 'opacity-0 md:opacity-0'}`}>
                <button 
                    onClick={(e) => { e.stopPropagation(); setIsEditModalOpen(true); }}
                    className="p-1.5 text-gray-400 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition-colors"
                    title="编辑"
                >
                    <Edit2 size={16} />
                </button>
                <button 
                    onClick={(e) => { e.stopPropagation(); setIsDeleteModalOpen(true); }}
                    className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    title="删除"
                >
                    <Trash2 size={16} />
                </button>
            </div>
        </div>
        </div>

        <AddTodoModal 
            isOpen={isEditModalOpen} 
            onClose={() => setIsEditModalOpen(false)} 
            todoToEdit={todo}
        />

        <ConfirmModal 
            isOpen={isDeleteModalOpen}
            onClose={() => setIsDeleteModalOpen(false)}
            onConfirm={() => deleteTodo(todo.id)}
            title="删除任务"
            message="确定要删除这个待办事项吗？此操作无法撤销。"
        />
    </>
  );
};