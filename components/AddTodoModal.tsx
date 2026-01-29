import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { X, ChevronDown, Folder, Check, ChevronRight } from 'lucide-react';
import { Priority, Category, Todo } from '../types';
import { useTodoStore } from '../store/useTodoStore';
import { Button } from './Button';

interface AddTodoModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultDate?: string;
  defaultCategoryId?: string;
  todoToEdit?: Todo; // Optional: if provided, we are in Edit mode
}

const getTodayDate = () => {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export const AddTodoModal: React.FC<AddTodoModalProps> = ({ 
  isOpen, 
  onClose, 
  defaultDate, 
  defaultCategoryId, 
  todoToEdit 
}) => {
  const { addTodo, updateTodo, categories } = useTodoStore();
  
  // State
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState<Priority>(Priority.MEDIUM);
  const [categoryId, setCategoryId] = useState<string>('');
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');

  // Custom Dropdown State
  const [isCategoryDropdownOpen, setIsCategoryDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsCategoryDropdownOpen(false);
      }
    };

    if (isCategoryDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isCategoryDropdownOpen]);

  // Reset or Populate form when opening
  useEffect(() => {
    if (isOpen) {
      if (todoToEdit) {
        // Edit Mode
        setTitle(todoToEdit.title);
        setDescription(todoToEdit.description || '');
        setPriority(todoToEdit.priority);
        setCategoryId(todoToEdit.categoryId || '');
        setDate(todoToEdit.date);
        setTime(todoToEdit.time || '');
      } else {
        // Create Mode
        setTitle('');
        setDescription('');
        setPriority(Priority.MEDIUM);
        setCategoryId(defaultCategoryId || '');
        setDate(defaultDate || getTodayDate());
        setTime('');
      }
      setIsCategoryDropdownOpen(false);
    }
  }, [isOpen, todoToEdit, defaultDate, defaultCategoryId]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    if (todoToEdit) {
      // Update existing
      updateTodo(todoToEdit.id, {
        title,
        description,
        priority,
        date,
        time: time || undefined,
        categoryId: categoryId || undefined,
      });
    } else {
      // Create new
      addTodo({
        title,
        description,
        priority,
        date,
        time: time || undefined,
        categoryId: categoryId || undefined,
      });
    }

    onClose();
  };

  // Flatten categories with depth for display
  const getFlattenedCategories = (parentId: string | null = null, depth = 0): { cat: Category, depth: number }[] => {
    const children = categories.filter(c => c.parentId === parentId && !c.deletedAt);
    let result: { cat: Category, depth: number }[] = [];
    children.forEach(child => {
      result.push({ cat: child, depth });
      result = [...result, ...getFlattenedCategories(child.id, depth + 1)];
    });
    return result;
  };

  const categoryOptions = getFlattenedCategories();
  const isEditMode = !!todoToEdit;
  
  const selectedCategoryName = categoryId 
    ? categories.find(c => c.id === categoryId)?.name 
    : '无分类';

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in duration-200">
      <div 
        className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-4 border-b border-gray-100 bg-gray-50/50 shrink-0">
          <h2 className="text-lg font-bold text-gray-800">
            {isEditMode ? '编辑任务' : '添加任务'}
          </h2>
          <button 
            onClick={onClose}
            className="p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        <div className="p-6 space-y-4 overflow-y-auto custom-scrollbar">
          {/* Title */}
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">
              标题
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="需要做什么？"
              className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all text-sm font-medium"
              autoFocus
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            {/* Date */}
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">
                日期
              </label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all text-sm"
              />
            </div>
             {/* Time */}
             <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">
                时间 <span className="text-gray-400 font-normal normal-case">(可选)</span>
              </label>
              <div className="relative">
                <input
                  type="time"
                  value={time}
                  onChange={(e) => setTime(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all text-sm"
                />
              </div>
            </div>
          </div>

          {/* Custom Category Select */}
          <div className="relative" ref={dropdownRef}>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">
              分类
              </label>
              
              <div 
                onClick={() => setIsCategoryDropdownOpen(!isCategoryDropdownOpen)}
                className={`
                    w-full px-3 py-2 bg-white border rounded-lg flex items-center justify-between cursor-pointer transition-all
                    ${isCategoryDropdownOpen ? 'border-primary-500 ring-2 ring-primary-500/20' : 'border-gray-200 hover:border-gray-300'}
                `}
              >
                  <div className="flex items-center gap-2 text-sm text-gray-700">
                      {categoryId ? (
                          <Folder size={16} className="text-primary-500 fill-primary-50" />
                      ) : (
                          <span className="w-4 h-4"></span>
                      )}
                      <span className={categoryId ? 'text-gray-900' : 'text-gray-500'}>
                        {selectedCategoryName}
                      </span>
                  </div>
                  <ChevronDown size={16} className={`text-gray-400 transition-transform ${isCategoryDropdownOpen ? 'rotate-180' : ''}`} />
              </div>

              {isCategoryDropdownOpen && (
                  <div className="absolute top-full left-0 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-xl z-50 max-h-60 overflow-y-auto custom-scrollbar animate-in fade-in zoom-in-95 duration-100">
                      {/* No Category Option */}
                      <div 
                          onClick={() => { setCategoryId(''); setIsCategoryDropdownOpen(false); }}
                          className="flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 cursor-pointer"
                      >
                          <div className="w-4 flex justify-center">
                             {!categoryId && <Check size={14} className="text-primary-600" />}
                          </div>
                          <span>无分类</span>
                      </div>
                      
                      {/* Divider */}
                      <div className="h-px bg-gray-100 my-1 mx-2"></div>

                      {/* Category List */}
                      {categoryOptions.length === 0 ? (
                          <div className="px-3 py-4 text-center text-xs text-gray-400">
                              暂无分类
                          </div>
                      ) : (
                        categoryOptions.map(({ cat, depth }) => (
                            <div
                                key={cat.id}
                                onClick={() => { setCategoryId(cat.id); setIsCategoryDropdownOpen(false); }}
                                className={`
                                    flex items-center gap-2 px-3 py-2 text-sm cursor-pointer transition-colors
                                    ${categoryId === cat.id ? 'bg-primary-50 text-primary-700' : 'text-gray-700 hover:bg-gray-50'}
                                `}
                                style={{ paddingLeft: `${depth * 20 + 12}px` }}
                            >
                                {/* Hierarchy Icon Logic */}
                                <div className="flex items-center justify-center w-4 shrink-0">
                                    <Folder 
                                        size={14} 
                                        className={categoryId === cat.id ? 'text-primary-600 fill-primary-100' : 'text-gray-400'} 
                                    />
                                </div>
                                
                                <span className="truncate flex-1">{cat.name}</span>
                                
                                {categoryId === cat.id && <Check size={14} className="text-primary-600 shrink-0" />}
                            </div>
                        ))
                      )}
                  </div>
              )}
          </div>

          {/* Priority */}
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">
                优先级
            </label>
            <div className="flex gap-2">
                {Object.values(Priority).map(p => (
                    <button
                        key={p}
                        type="button"
                        onClick={() => setPriority(p)}
                        className={`flex-1 py-1.5 text-xs rounded-md border transition-all ${
                            priority === p 
                            ? 'bg-primary-50 border-primary-500 text-primary-700 font-medium ring-1 ring-primary-500' 
                            : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
                        }`}
                    >
                        {p}
                    </button>
                ))}
            </div>
          </div>
          
          {/* Description */}
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">
              描述 (可选)
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="添加详细信息..."
              rows={3}
              className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all resize-none text-sm"
            />
          </div>
        </div>

        <div className="p-4 border-t border-gray-100 bg-gray-50/50 flex justify-end gap-2 shrink-0">
          <Button type="button" variant="ghost" onClick={onClose}>
            取消
          </Button>
          <Button type="button" disabled={!title.trim()} onClick={handleSubmit}>
            {isEditMode ? '保存修改' : '确认添加'}
          </Button>
        </div>
      </div>
    </div>,
    document.body
  );
};