import React, { useState } from 'react';
import { 
  Calendar, 
  LayoutGrid, 
  ChevronRight, 
  ChevronDown, 
  Plus, 
  Trash2,
  X
} from 'lucide-react';
import { useTodoStore } from '../store/useTodoStore';
import { Category } from '../types';
import { Button } from './Button';
import { ConfirmModal } from './ConfirmModal';

// --- Recursive Category Item Component ---
const CategoryNavItem: React.FC<{ 
  category: Category; 
  allCategories: Category[]; 
  level: number;
  isActive: boolean;
  onSelect: (id: string) => void;
  onAddSub: (id: string) => void;
  onDelete: (id: string) => void;
  todosCount: number;
}> = ({ category, allCategories, level, isActive, onSelect, onAddSub, onDelete, todosCount }) => {
  const children = allCategories.filter(c => c.parentId === category.id);
  const [isExpanded, setIsExpanded] = useState(true);

  return (
    <div className="select-none">
      <div 
        onClick={() => onSelect(category.id)}
        className={`
          group flex items-center justify-between py-1.5 px-3 mx-2 rounded-md cursor-pointer text-sm font-medium transition-colors mb-0.5
          ${isActive 
            ? 'bg-white text-primary-700 shadow-sm ring-1 ring-gray-200' 
            : 'text-gray-600 hover:bg-gray-200/50'
          }
        `}
        style={{ paddingLeft: `${level * 12 + 12}px` }}
      >
        <div className="flex items-center gap-2 overflow-hidden flex-1">
            {children.length > 0 ? (
                <button 
                onClick={(e) => { e.stopPropagation(); setIsExpanded(!isExpanded); }}
                className="p-0.5 -ml-1 hover:bg-black/5 rounded text-gray-400"
                >
                {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                </button>
            ) : (
                <span className="w-3.5"></span>
            )}
            <span className="truncate">{category.name}</span>
        </div>

        <div className="flex items-center gap-1">
             {/* Action Buttons (Visible on Hover) */}
            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity mr-1">
                <button 
                    onClick={(e) => { e.stopPropagation(); onAddSub(category.id); }}
                    className="p-1 text-gray-400 hover:text-primary-600 hover:bg-primary-50 rounded"
                    title="添加子分类"
                >
                    <Plus size={12} />
                </button>
                <button 
                    onClick={(e) => { e.stopPropagation(); onDelete(category.id); }}
                    className="p-1 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded"
                    title="删除"
                >
                    <Trash2 size={12} />
                </button>
            </div>

            {todosCount > 0 && (
            <span className={`text-xs px-1.5 py-0.5 rounded-full min-w-[20px] text-center ${
                isActive ? 'bg-primary-50 text-primary-600' : 'bg-gray-200/50 text-gray-400'
            }`}>
                {todosCount}
            </span>
            )}
        </div>
      </div>
      
      {isExpanded && children.map(child => (
        <CategoryNavItem 
          key={child.id} 
          category={child} 
          allCategories={allCategories} 
          level={level + 1}
          isActive={false} // Only highlight explicitly selected
          onSelect={onSelect}
          onAddSub={onAddSub}
          onDelete={onDelete}
          todosCount={0} 
        />
      ))}
    </div>
  );
};

// --- Helper to count active todos ---
const countTodos = (catId: string, todos: any[], categories: Category[]): number => {
    const childIds = categories.filter(c => c.parentId === catId).map(c => c.id);
    let count = todos.filter(t => t.categoryId === catId && !t.completed).length;
    childIds.forEach(id => {
        count += countTodos(id, todos, categories);
    });
    return count;
};

// --- Simple Input Modal Component ---
const CategoryInputModal: React.FC<{
    isOpen: boolean;
    onClose: () => void;
    onSubmit: (name: string) => void;
    parentName: string | null;
}> = ({ isOpen, onClose, onSubmit, parentName }) => {
    const [name, setName] = useState('');
    const inputRef = React.useRef<HTMLInputElement>(null);

    React.useEffect(() => {
        if (isOpen) {
            setName('');
            setTimeout(() => inputRef.current?.focus(), 50);
        }
    }, [isOpen]);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/20 backdrop-blur-sm" onClick={onClose}>
            <div 
                className="bg-white rounded-xl shadow-xl w-full max-w-sm p-4 animate-in zoom-in-95 duration-200"
                onClick={e => e.stopPropagation()}
            >
                <div className="flex justify-between items-center mb-4">
                    <h3 className="text-sm font-bold text-gray-800">
                        {parentName ? `在 "${parentName}" 下新建分类` : '新建根分类'}
                    </h3>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
                        <X size={16} />
                    </button>
                </div>
                <input
                    ref={inputRef}
                    type="text"
                    value={name}
                    onChange={e => setName(e.target.value)}
                    placeholder="输入分类名称..."
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 mb-4"
                    onKeyDown={e => {
                        if (e.key === 'Enter' && name.trim()) {
                            onSubmit(name);
                            onClose();
                        }
                    }}
                />
                <div className="flex justify-end gap-2">
                    <Button variant="ghost" size="sm" onClick={onClose}>取消</Button>
                    <Button size="sm" disabled={!name.trim()} onClick={() => { onSubmit(name); onClose(); }}>确定</Button>
                </div>
            </div>
        </div>
    );
}

// --- Main Sidebar Component ---
interface SidebarProps {
  className?: string;
  onCloseMobile?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ className = '', onCloseMobile }) => {
  const { 
    categories, 
    todos, 
    viewMode, 
    selectedCategoryId, 
    setViewMode, 
    setSelectedCategory,
    setSelectedDate,
    addCategory,
    deleteCategory
  } = useTodoStore();

  // Modal State
  const [isInputModalOpen, setIsInputModalOpen] = useState(false);
  const [targetParentId, setTargetParentId] = useState<string | null>(null);

  // Confirm Delete State
  const [deleteConfirm, setDeleteConfirm] = useState<{ isOpen: boolean; id: string | null }>({ isOpen: false, id: null });

  const handleSelectCategory = (id: string) => {
    setSelectedCategory(id);
    if (onCloseMobile) onCloseMobile();
  };

  const handleSelectAll = () => {
    setViewMode('all');
    if (onCloseMobile) onCloseMobile();
  };

  const handleSelectToday = () => {
    setSelectedDate(new Date().toISOString().split('T')[0]);
    if (onCloseMobile) onCloseMobile();
  };

  // Add Category Handlers
  const openAddRoot = () => {
      setTargetParentId(null);
      setIsInputModalOpen(true);
  };

  const openAddSub = (parentId: string) => {
      setTargetParentId(parentId);
      setIsInputModalOpen(true);
  };

  const handleAddSubmit = (name: string) => {
      addCategory(name, targetParentId);
  };

  const handleDeleteRequest = (id: string) => {
      setDeleteConfirm({ isOpen: true, id });
  };

  const handleConfirmDelete = () => {
      if (deleteConfirm.id) {
          deleteCategory(deleteConfirm.id);
      }
      setDeleteConfirm({ isOpen: false, id: null });
  };

  const rootCategories = categories.filter(c => c.parentId === null);
  const allActiveCount = todos.filter(t => !t.completed).length;
  const todayStr = new Date().toISOString().split('T')[0];
  const todayCount = todos.filter(t => t.date === todayStr && !t.completed).length;
  
  const targetParentName = targetParentId ? categories.find(c => c.id === targetParentId)?.name || null : null;

  return (
    <>
        <div className={`flex flex-col h-full bg-gray-50 ${className}`}>
            {/* Navigation Group */}
            <div className="p-3 space-y-0.5">
                <h3 className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2 px-3 mt-2">
                    总览
                </h3>
                <button
                    onClick={handleSelectAll}
                    className={`w-full flex items-center justify-between px-3 py-1.5 mx-auto w-[calc(100%-16px)] rounded-md text-sm font-medium transition-colors ${
                        viewMode === 'all' 
                            ? 'bg-white text-primary-700 shadow-sm ring-1 ring-gray-200' 
                            : 'text-gray-600 hover:bg-gray-200/50'
                    }`}
                >
                    <div className="flex items-center gap-3">
                        <LayoutGrid size={16} />
                        <span>所有任务</span>
                    </div>
                    {allActiveCount > 0 && <span className="text-xs text-gray-400">{allActiveCount}</span>}
                </button>
                <button
                    onClick={handleSelectToday}
                    className={`w-full flex items-center justify-between px-3 py-1.5 mx-auto w-[calc(100%-16px)] rounded-md text-sm font-medium transition-colors ${
                        viewMode === 'date' && !selectedCategoryId
                            ? 'bg-white text-primary-700 shadow-sm ring-1 ring-gray-200' 
                            : 'text-gray-600 hover:bg-gray-200/50'
                    }`}
                >
                    <div className="flex items-center gap-3">
                        <Calendar size={16} />
                        <span>今日待办</span>
                    </div>
                    {todayCount > 0 && <span className="text-xs text-gray-400">{todayCount}</span>}
                </button>
            </div>

            {/* Categories Group */}
            <div className="flex-1 overflow-y-auto pb-4 space-y-0.5 custom-scrollbar">
                <div className="flex items-center justify-between px-3 mb-2 mt-4 group">
                    <h3 className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                        分类列表
                    </h3>
                    <button 
                        onClick={openAddRoot}
                        className="text-gray-400 hover:text-primary-600 hover:bg-primary-50 p-1 rounded transition-colors opacity-0 group-hover:opacity-100"
                        title="新建分类"
                    >
                        <Plus size={14} />
                    </button>
                </div>
                
                {rootCategories.length === 0 ? (
                    <div className="text-center py-4 text-sm text-gray-400 cursor-pointer hover:text-primary-500" onClick={openAddRoot}>
                        + 新建第一个分类
                    </div>
                ) : (
                    rootCategories.map(cat => (
                        <CategoryNavItem
                            key={cat.id}
                            category={cat}
                            allCategories={categories}
                            level={0}
                            isActive={selectedCategoryId === cat.id}
                            onSelect={handleSelectCategory}
                            onAddSub={openAddSub}
                            onDelete={handleDeleteRequest}
                            todosCount={countTodos(cat.id, todos, categories)}
                        />
                    ))
                )}
            </div>
        </div>

        <CategoryInputModal 
            isOpen={isInputModalOpen}
            onClose={() => setIsInputModalOpen(false)}
            onSubmit={handleAddSubmit}
            parentName={targetParentName}
        />

        <ConfirmModal 
            isOpen={deleteConfirm.isOpen}
            onClose={() => setDeleteConfirm({ ...deleteConfirm, isOpen: false })}
            onConfirm={handleConfirmDelete}
            title="删除分类"
            message={
                <>
                    确定要删除此分类吗？<br/>
                    <span className="text-red-500 font-medium">注意：这将同时删除其下所有的子分类和相关任务关联。</span>
                </>
            }
        />
    </>
  );
};