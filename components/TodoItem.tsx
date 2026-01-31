
import React, { useState, useMemo } from 'react';
import { Todo, Priority } from '../types';
import { Trash2, CalendarClock, Check, Undo2, Tag, Repeat, Edit2, MoreVertical, CheckSquare } from 'lucide-react';
import { useTodoStore } from '../store/useTodoStore';
import { format, isToday, isTomorrow, isValid } from 'date-fns';
import zhCN from 'date-fns/locale/zh-CN';
import { AddTodoModal } from './AddTodoModal';
import { ConfirmModal } from './ConfirmModal';
import { DeleteRepeatModal } from './DeleteRepeatModal';
import { useLongPress } from '../hooks/useLongPress';
import { ActionSheet, ActionSheetOption } from './ActionSheet';

interface TodoItemProps {
  todo: Todo;
  isSelectionMode?: boolean;
  isSelected?: boolean;
  onToggleSelect?: () => void;
  onLongPress?: () => void; // New prop for entering selection mode
}

// Helper to parse YYYY-MM-DD to local Date object
const parseLocalDate = (dateStr: string) => {
  const [year, month, day] = dateStr.split('-').map(Number);
  return new Date(year, month - 1, day);
};

export const TodoItem: React.FC<TodoItemProps> = ({ 
    todo, 
    isSelectionMode = false, 
    isSelected = false, 
    onToggleSelect,
    onLongPress
}) => {
  const { toggleTodo, toggleVirtualTodo, deleteVirtualTodo, moveTodoToTrash, deleteTodoSeries, updateTodo, restoreTodo, permanentlyDeleteTodo, categories, tags, viewMode } = useTodoStore();
  
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isDeleteRepeatModalOpen, setIsDeleteRepeatModalOpen] = useState(false);
  
  // Action Sheet State
  const [isActionSheetOpen, setIsActionSheetOpen] = useState(false);

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

  const handleDeleteClick = (e?: React.MouseEvent) => {
      e?.stopPropagation();
      if (isTrashView) {
          setIsDeleteModalOpen(true);
      } else {
          // If repeating (has repeat config OR is virtual), show Repeat Delete Modal
          if (todo.repeat || isVirtual) {
              setIsDeleteRepeatModalOpen(true);
          } else {
              moveTodoToTrash(todo.id);
          }
      }
  };
  
  const handleDeleteRepeatOne = () => {
      if (isVirtual && todo.id.startsWith('virtual-')) {
           // Extract UUID. "virtual-" is 8 chars.
           const sourceId = todo.id.substring(8, 8 + 36); 
           deleteVirtualTodo(sourceId, todo.date);
      } else {
          moveTodoToTrash(todo.id);
      }
  };

  const handleDeleteRepeatAll = () => {
      if (isVirtual && todo.id.startsWith('virtual-')) {
           const sourceId = todo.id.substring(8, 8 + 36); 
           // For virtual task "Delete All Future", we remove repeat from source
           // We do NOT delete the source task itself, just stop it from repeating.
           updateTodo(sourceId, { repeat: undefined });
      } else {
          // For real task "Delete All Future", we delete the series (source + future)
          deleteTodoSeries(todo.id);
      }
  };

  const handleToggle = () => {
      if (isSelectionMode && onToggleSelect) {
          onToggleSelect();
          return;
      }

      if (isTrashView) return;
      
      if (isVirtual) {
          // Virtual logic: "virtual-{sourceId}-{date}"
          if (todo.id.startsWith('virtual-')) {
             const sourceId = todo.id.substring(8, 8 + 36); 
             // Toggle it (Completes it)
             toggleVirtualTodo(sourceId, todo.date);
          }
      } else {
          toggleTodo(todo.id);
      }
  };

  const handleContentClick = () => {
      if (isSelectionMode && onToggleSelect) {
          onToggleSelect();
          return;
      }

      if (isTrashView) return;
      // Allow clicking virtual tasks to view/edit (opens Modal)
      setIsEditModalOpen(true);
  };

  // Setup Long Press
  const longPressProps = useLongPress(
    () => {
        if (!isSelectionMode) {
             // CHANGE: Enter selection mode on long press
             if (onLongPress) onLongPress();
        }
    },
    handleContentClick,
    { shouldPreventDefault: true }
  );

  // Generate Action Sheet Options
  const actionSheetOptions: ActionSheetOption[] = useMemo(() => {
    const opts: ActionSheetOption[] = [];
    if (isTrashView) {
        opts.push({ 
            label: '还原任务', 
            icon: <Undo2 size={20}/>, 
            onClick: () => restoreTodo(todo.id) 
        });
        opts.push({ 
            label: '永久删除', 
            icon: <Trash2 size={20}/>, 
            onClick: () => handleDeleteClick(), 
            variant: 'danger' 
        });
    } else {
         opts.push({ 
             label: '编辑详情', 
             icon: <Edit2 size={20}/>, 
             onClick: () => setIsEditModalOpen(true) 
         });
         opts.push({ 
             label: todo.completed ? '标记为未完成' : '标记为完成', 
             icon: <Check size={20}/>, 
             onClick: handleToggle 
         });
         // Add explicit option to enter selection mode from menu as well
         if (onLongPress) {
            opts.push({
                label: '多选',
                icon: <CheckSquare size={20}/>,
                onClick: () => onLongPress()
            });
         }
         opts.push({ 
             label: '删除任务', 
             icon: <Trash2 size={20}/>, 
             onClick: () => handleDeleteClick(), 
             variant: 'danger' 
         });
    }
    return opts;
  }, [isTrashView, todo, restoreTodo, handleDeleteClick, handleToggle, onLongPress]);


  return (
    <>
        <div 
        className={`group relative flex items-center gap-3 p-3 pl-2 rounded-xl border transition-all duration-200 ${
            isSelected 
                ? 'bg-primary-50 border-primary-200 ring-1 ring-primary-200' 
                : todo.completed && !isTrashView
                    ? 'bg-gray-50 border-gray-100' 
                    : isVirtual
                        ? 'bg-white border-primary-100 border-dashed hover:border-primary-300'
                        : 'bg-white border-gray-200 shadow-sm hover:shadow-md hover:border-primary-200'
        } ${isTrashView ? 'opacity-75 bg-gray-50' : ''}`}
        >
        
        {/* Status Indicator / Selection Checkbox */}
        <div className="flex-shrink-0 flex items-center justify-center w-8">
            {isSelectionMode ? (
                // Selection Mode Checkbox
                <div 
                    className={`w-5 h-5 rounded flex items-center justify-center transition-all ${
                        isSelected 
                        ? 'bg-primary-500 border-primary-500' 
                        : 'border-2 border-gray-300 bg-white'
                    }`}
                    onClick={(e) => { e.stopPropagation(); onToggleSelect && onToggleSelect(); }}
                >
                    {isSelected && <Check size={14} className="text-white" strokeWidth={3} />}
                </div>
            ) : (
                // Standard Completion Toggle
                isTrashView ? (
                    todo.completed ? (
                        <div className="w-5 h-5 rounded bg-gray-300 flex items-center justify-center">
                            <Check size={14} className="text-white" strokeWidth={3} />
                        </div>
                    ) : (
                        <div className="w-5 h-5 rounded border-2 border-gray-300"></div>
                    )
                ) : (
                    todo.completed ? (
                            <div 
                                className="w-5 h-5 rounded bg-green-500 border border-green-500 flex items-center justify-center cursor-pointer transition-transform active:scale-90 shadow-sm"
                                onClick={(e) => { e.stopPropagation(); handleToggle(); }}
                                title="标记为未完成"
                            >
                                <Check size={14} className="text-white" strokeWidth={3} />
                            </div>
                    ) : (
                        <div 
                            className={`w-5 h-5 rounded border-2 flex items-center justify-center cursor-pointer transition-colors active:scale-90 bg-white ${
                                isVirtual ? 'border-primary-300 hover:bg-primary-50' : 'border-gray-300 hover:border-primary-500'
                            }`}
                            onClick={(e) => { e.stopPropagation(); handleToggle(); }}
                            title="标记为完成"
                        >
                             {isVirtual && <div className="w-2 h-2 rounded-sm bg-primary-200"></div>}
                        </div>
                    )
                )
            )}
        </div>

        {/* Content Area */}
        <div 
            className={`flex-1 min-w-0 select-none ${(!isTrashView && !isSelectionMode) ? 'cursor-pointer' : ''}`}
            {...longPressProps}
        >
            <div className="flex items-center gap-2 flex-wrap">
                <h3 className={`text-base font-medium truncate transition-all mr-1 ${
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
                
                {(!isTrashView) && (
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
            <p className="text-xs text-gray-500 truncate mt-1">{todo.description}</p>
            )}
        </div>

        {/* Actions Container */}
        {!isSelectionMode && (
            <div className="flex items-center gap-2 shrink-0">
                {/* Display Creation Date */}
                {!isTrashView && !isVirtual && (
                    <span className="hidden sm:inline text-[10px] text-gray-300 mr-2 font-mono" title={`创建于 ${format(todo.createdAt, 'yyyy-MM-dd HH:mm')}`}>
                        创建于 {format(todo.createdAt, 'yyyy-MM-dd')}
                    </span>
                )}

                {!isTrashView && (
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${priorityColors[todo.priority]}`}>
                    {todo.priority}
                    </span>
                )}
                
                {/* Desktop Actions */}
                <div className={`hidden lg:flex items-center gap-1 transition-opacity duration-200 opacity-0 group-hover:opacity-100`}>
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
                        <>
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

                {/* Mobile Menu */}
                <button 
                    className="lg:hidden p-1.5 text-gray-400 hover:bg-gray-100 rounded-lg"
                    onClick={(e) => { e.stopPropagation(); setIsActionSheetOpen(true); }}
                >
                    <MoreVertical size={16} />
                </button>
            </div>
        )}
        </div>

        <ActionSheet 
            isOpen={isActionSheetOpen} 
            onClose={() => setIsActionSheetOpen(false)} 
            title={todo.title}
            options={actionSheetOptions}
        />

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

        <DeleteRepeatModal
            isOpen={isDeleteRepeatModalOpen}
            onClose={() => setIsDeleteRepeatModalOpen(false)}
            onDeleteOne={handleDeleteRepeatOne}
            onDeleteAll={handleDeleteRepeatAll}
        />
    </>
  );
};
