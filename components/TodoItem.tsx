import React, { useState } from 'react';
import { Todo, Priority } from '../types';
import { Trash2, Edit2, CalendarClock, Check, Undo2, Tag } from 'lucide-react';
import { useTodoStore } from '../store/useTodoStore';
import { format, parseISO, isToday, isTomorrow, isValid } from 'date-fns';
import { zhCN } from 'date-fns/locale';
import { AddTodoModal } from './AddTodoModal';
import { ConfirmModal } from './ConfirmModal';

interface TodoItemProps {
  todo: Todo;
}

export const TodoItem: React.FC<TodoItemProps> = ({ todo }) => {
  const { toggleTodo, moveTodoToTrash, restoreTodo, permanentlyDeleteTodo, categories, tags, viewMode } = useTodoStore();
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

  // Resolve Tags
  const todoTags = todo.tagIds 
    ? todo.tagIds.map(id => tags.find(t => t.id === id)).filter(Boolean) as any[]
    : [];

  // Date formatting for list item
  const dateObj = parseISO(todo.date);
  const isDateValid = isValid(dateObj);
  let dateDisplay = '';
  const currentYear = new Date().getFullYear();
  
  if (isDateValid) {
      const todoYear = dateObj.getFullYear();
      if (isToday(dateObj)) dateDisplay = '今天';
      else if (isTomorrow(dateObj)) dateDisplay = '明天';
      else {
          if (todoYear !== currentYear) {
               dateDisplay = format(dateObj, 'yyyy年M月d日', { locale: zhCN });
          } else {
               dateDisplay = format(dateObj, 'M月d日', { locale: zhCN });
          }
      }
  } else {
      dateDisplay = '无效日期';
  }
  
  // Append time if exists
  if (todo.time) {
      dateDisplay += ` ${todo.time}`;
  }

  // Overdue logic
  const todayStr = format(new Date(), 'yyyy-MM-dd');
  const isOverdue = !todo.completed && isDateValid && todo.date < todayStr;

  const isTrashView = todo.deletedAt !== undefined;

  const handleDeleteClick = (e: React.MouseEvent) => {
      e.stopPropagation();
      if (isTrashView) {
          // In Trash: ask for permanent delete confirmation
          setIsDeleteModalOpen(true);
      } else {
          // Normal View: Soft delete immediately (move to trash)
          moveTodoToTrash(todo.id);
      }
  };

  return (
    <>
        <div 
        className={`group relative flex items-center gap-3 p-3 pl-2 rounded-xl border transition-all duration-200 ${
            todo.completed && !isTrashView
            ? 'bg-gray-50 border-gray-100' 
            : 'bg-white border-gray-200 shadow-sm hover:shadow-md hover:border-primary-200'
        } ${isTrashView ? 'opacity-75 bg-gray-50' : ''}`}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        >
        
        {/* Status Indicator (Check or Dot) */}
        <div className="flex-shrink-0 flex items-center justify-center w-8">
            {isTrashView ? (
                <div className="w-1.5 h-1.5 rounded-full bg-gray-300"></div>
            ) : (
                todo.completed ? (
                        <div className="text-green-500"><Check size={18} /></div>
                ) : (
                    <div className="w-1.5 h-1.5 rounded-full bg-gray-200"></div>
                )
            )}
        </div>

        {/* Content Area */}
        <div 
            className={`flex-1 min-w-0 select-none ${!isTrashView ? 'cursor-pointer' : ''}`}
            onClick={() => !isTrashView && toggleTodo(todo.id)}
            title={!isTrashView ? (todo.completed ? "标记为未完成" : "标记为完成") : undefined}
        >
            <div className="flex items-center gap-2 mb-1 flex-wrap">
                <h3 className={`text-sm font-medium truncate transition-all mr-1 ${
                    todo.completed || isTrashView ? 'text-gray-400 line-through' : 'text-gray-900'
                }`}>
                    {todo.title}
                </h3>
                
                {categoryName && (
                    <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-gray-100 text-gray-500 border border-gray-200 truncate max-w-[80px]">
                        {categoryName}
                    </span>
                )}

                {todoTags.map(tag => (
                     <span 
                        key={tag.id}
                        className="px-1.5 py-0.5 rounded text-[10px] font-medium text-white flex items-center gap-0.5"
                        style={{ backgroundColor: tag.color }}
                     >
                        <Tag size={8} />
                        {tag.name}
                     </span>
                ))}
                
                {/* Show Date Badge */}
                {(!isTrashView && (viewMode !== 'date' || todo.time || isOverdue)) && (
                    <span className={`flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium border ${
                        isOverdue 
                            ? 'bg-red-50 text-red-600 border-red-200' 
                            : isToday(dateObj) 
                                ? 'bg-orange-50 text-orange-600 border-orange-200' 
                                : 'bg-gray-50 text-gray-500 border-gray-200'
                    }`}>
                        <CalendarClock size={10} />
                        {isOverdue ? '已过期 ' : ''}{dateDisplay}
                    </span>
                )}
            </div>
            
            {todo.description && (
            <p className="text-xs text-gray-500 truncate">{todo.description}</p>
            )}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 shrink-0">
            {/* Display Creation Date */}
            {!isTrashView && (
                <span className="text-[10px] text-gray-300 mr-2 font-mono" title={`创建于 ${format(todo.createdAt, 'yyyy-MM-dd HH:mm')}`}>
                    创建于 {format(todo.createdAt, 'yyyy-MM-dd')}
                </span>
            )}

            {!isTrashView && (
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${priorityColors[todo.priority]}`}>
                {todo.priority}
                </span>
            )}
            
            <div className={`flex items-center gap-1 transition-opacity duration-200 ${isHovered ? 'opacity-100' : 'opacity-0 md:opacity-0'}`}>
                {/* ... existing buttons ... */}
                {isTrashView ? (
                    // Trash View Actions
                    <>
                        <button 
                            onClick={(e) => { e.stopPropagation(); restoreTodo(todo.id); }}
                            className="p-1.5 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                            title="还原"
                        >
                            <Undo2 size={16} />
                        </button>
                        <button 
                            onClick={handleDeleteClick}
                            className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                            title="永久删除"
                        >
                            <Trash2 size={16} />
                        </button>
                    </>
                ) : (
                    // Normal View Actions
                    <>
                        <button 
                            onClick={(e) => { e.stopPropagation(); setIsEditModalOpen(true); }}
                            className="p-1.5 text-gray-400 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition-colors"
                            title="编辑"
                        >
                            <Edit2 size={16} />
                        </button>
                        <button 
                            onClick={handleDeleteClick}
                            className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                            title="移至回收站"
                        >
                            <Trash2 size={16} />
                        </button>
                    </>
                )}
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
            onConfirm={() => permanentlyDeleteTodo(todo.id)}
            title="永久删除任务"
            message="确定要永久删除这个任务吗？此操作无法撤销。"
        />
    </>
  );
};