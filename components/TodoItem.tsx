
import React, { useState } from 'react';
import { Todo, Priority } from '../types';
import { Trash2, Edit2, CalendarClock, Check, Undo2, Tag, Repeat } from 'lucide-react';
import { useTodoStore } from '../store/useTodoStore';
import { format, isToday, isTomorrow, isValid } from 'date-fns';
import zhCN from 'date-fns/locale/zh-CN';
import { AddTodoModal } from './AddTodoModal';
import { ConfirmModal } from './ConfirmModal';

interface TodoItemProps {
  todo: Todo;
}

// Helper to parse YYYY-MM-DD to local Date object
const parseLocalDate = (dateStr: string) => {
  const [year, month, day] = dateStr.split('-').map(Number);
  return new Date(year, month - 1, day);
};

export const TodoItem: React.FC<TodoItemProps> = ({ todo }) => {
  const { toggleTodo, toggleVirtualTodo, deleteVirtualTodo, moveTodoToTrash, restoreTodo, permanentlyDeleteTodo, categories, tags, viewMode } = useTodoStore();
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

  const dateObj = parseLocalDate(todo.date);
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
  
  if (todo.time) {
      dateDisplay += ` ${todo.time}`;
  }

  const todayStr = format(new Date(), 'yyyy-MM-dd');
  const isOverdue = !todo.completed && isDateValid && todo.date < todayStr;
  const isTrashView = todo.deletedAt !== undefined;
  const isVirtual = todo.isVirtual === true;

  const handleDeleteClick = (e: React.MouseEvent) => {
      e.stopPropagation();
      if (isTrashView) {
          setIsDeleteModalOpen(true);
      } else {
          if (isVirtual && todo.id.startsWith('virtual-')) {
               // Extract UUID. "virtual-" is 8 chars.
               const sourceId = todo.id.substring(8, 8 + 36); 
               deleteVirtualTodo(sourceId, todo.date);
          } else {
              moveTodoToTrash(todo.id);
          }
      }
  };

  const handleToggle = () => {
      if (isTrashView) return;
      
      if (isVirtual) {
          // Virtual logic: "virtual-{sourceId}-{date}"
          // We need to parse sourceId.
          // Format is fixed in TodoList as `virtual-${source.id}-${selectedDate}`
          // uuid is 36 chars.
          if (todo.id.startsWith('virtual-')) {
             // Extract UUID. "virtual-" is 8 chars.
             const sourceId = todo.id.substring(8, 8 + 36); 
             // Toggle it
             toggleVirtualTodo(sourceId, todo.date);
          }
      } else {
          toggleTodo(todo.id);
      }
  };

  return (
    <>
        <div 
        className={`group relative flex items-center gap-3 p-3 pl-2 rounded-xl border transition-all duration-200 ${
            todo.completed && !isTrashView
            ? 'bg-gray-50 border-gray-100' 
            : isVirtual
                ? 'bg-white border-primary-100 border-dashed hover:border-primary-300' // Virtual Style
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
                    <div 
                        className={`w-4 h-4 rounded-full border-2 flex items-center justify-center cursor-pointer transition-colors ${
                            isVirtual ? 'border-primary-300 hover:bg-primary-50' : 'border-gray-300 hover:border-primary-500'
                        }`}
                        onClick={(e) => { e.stopPropagation(); handleToggle(); }}
                    >
                         {isVirtual && <div className="w-1.5 h-1.5 rounded-full bg-primary-200"></div>}
                    </div>
                )
            )}
        </div>

        {/* Content Area */}
        <div 
            className={`flex-1 min-w-0 select-none ${!isTrashView ? 'cursor-pointer' : ''}`}
            onClick={() => !isTrashView && handleToggle()}
            title={!isTrashView ? (todo.completed ? "标记为未完成" : "标记为完成") : undefined}
        >
            <div className="flex items-center gap-2 mb-1 flex-wrap">
                <h3 className={`text-sm font-medium truncate transition-all mr-1 ${
                    todo.completed || isTrashView ? 'text-gray-400 line-through' : isVirtual ? 'text-gray-500' : 'text-gray-900'
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
                {(!isTrashView && (viewMode !== 'date' || todo.time || isOverdue || todo.repeat)) && (
                    <span className={`flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium border ${
                        isOverdue 
                            ? 'bg-red-50 text-red-600 border-red-200' 
                            : isToday(dateObj) 
                                ? 'bg-orange-50 text-orange-600 border-orange-200' 
                                : 'bg-gray-50 text-gray-500 border-gray-200'
                    }`}>
                        <CalendarClock size={10} />
                        {isOverdue ? '已过期 ' : ''}{dateDisplay}
                        {todo.repeat && (
                            <Repeat size={10} className="ml-0.5" />
                        )}
                        {isVirtual && (
                            <span className="text-primary-400 ml-1 italic scale-75 transform origin-left">预览</span>
                        )}
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
            {!isTrashView && !isVirtual && (
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
                {isTrashView ? (
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
                    !isVirtual ? (
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
                    ) : (
                        <span className="text-[10px] text-gray-400 italic px-1">点击创建</span>
                    )
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
