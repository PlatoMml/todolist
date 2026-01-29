import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { Priority, Category, Todo } from '../types';
import { useTodoStore } from '../store/useTodoStore';
import { Button } from './Button';

interface AddTodoModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultDate?: string;
  todoToEdit?: Todo; // Optional: if provided, we are in Edit mode
}

const getTodayDate = () => {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export const AddTodoModal: React.FC<AddTodoModalProps> = ({ isOpen, onClose, defaultDate, todoToEdit }) => {
  const { addTodo, updateTodo, categories } = useTodoStore();
  
  // State
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState<Priority>(Priority.MEDIUM);
  const [categoryId, setCategoryId] = useState<string>('');
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');

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
        setCategoryId('');
        setDate(defaultDate || getTodayDate());
        setTime('');
      }
    }
  }, [isOpen, todoToEdit, defaultDate]);

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
    const children = categories.filter(c => c.parentId === parentId);
    let result: { cat: Category, depth: number }[] = [];
    children.forEach(child => {
      result.push({ cat: child, depth });
      result = [...result, ...getFlattenedCategories(child.id, depth + 1)];
    });
    return result;
  };

  const categoryOptions = getFlattenedCategories();
  const isEditMode = !!todoToEdit;

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in duration-200">
      <div 
        className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-4 border-b border-gray-100 bg-gray-50/50">
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

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
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

          {/* Category */}
          <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">
              分类
              </label>
              <select
                  value={categoryId}
                  onChange={(e) => setCategoryId(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all appearance-none text-sm"
              >
                  <option value="">无分类</option>
                  {categoryOptions.map(({ cat, depth }) => (
                      <option key={cat.id} value={cat.id}>
                          {'\u00A0'.repeat(depth * 3) + cat.name}
                      </option>
                  ))}
              </select>
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

          <div className="pt-2 flex justify-end gap-2">
            <Button type="button" variant="ghost" onClick={onClose}>
              取消
            </Button>
            <Button type="submit" disabled={!title.trim()}>
              {isEditMode ? '保存修改' : '确认添加'}
            </Button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
};