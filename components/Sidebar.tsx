import React, { useState, useMemo, useRef, useEffect } from 'react';
import { 
  Calendar, 
  LayoutGrid, 
  ChevronRight, 
  ChevronDown, 
  Plus, 
  Trash2,
  X,
  Search,
  FolderOpen,
  Recycle,
  Move,
  GripVertical,
  Settings,
  Check,
  Folder
} from 'lucide-react';
import { useTodoStore } from '../store/useTodoStore';
import { Category, Todo } from '../types';
import { Button } from './Button';

// --- Recursive Category Item Component ---
const CategoryNavItem: React.FC<{ 
  category: Category; 
  allCategories: Category[]; 
  level: number;
  isActive: boolean;
  onSelect: (id: string) => void;
  onAddSub: (id: string) => void;
  onDelete: (id: string) => void;
  onMoveCategory: (dragId: string, targetId: string) => void;
  todosCount: number;
  isReordering: boolean;
}> = ({ category, allCategories, level, isActive, onSelect, onAddSub, onDelete, onMoveCategory, todosCount, isReordering }) => {
  // Only show children that are NOT deleted
  const children = allCategories.filter(c => c.parentId === category.id && !c.deletedAt);
  const [isExpanded, setIsExpanded] = useState(true);
  const [isDragOver, setIsDragOver] = useState(false);

  // Drag Handlers
  const handleDragStart = (e: React.DragEvent) => {
      e.dataTransfer.setData('application/x-category-id', category.id);
      e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent) => {
      if (!isReordering) return;
      e.preventDefault(); // Necessary to allow dropping
      e.stopPropagation();
      e.dataTransfer.dropEffect = 'move';
      setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
      if (!isReordering) return;
      e.preventDefault();
      e.stopPropagation();
      setIsDragOver(false);
      
      const draggedId = e.dataTransfer.getData('application/x-category-id');
      if (draggedId && draggedId !== category.id) {
          onMoveCategory(draggedId, category.id);
      }
  };

  return (
    <div className="select-none">
      <div 
        draggable={isReordering}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => !isReordering && onSelect(category.id)}
        className={`
          group flex items-center justify-between py-1.5 px-3 mx-2 rounded-md transition-all mb-0.5
          ${isDragOver ? 'bg-primary-100 ring-2 ring-primary-500 ring-inset z-10' : ''}
          ${isActive 
            ? 'bg-white text-primary-700 shadow-sm ring-1 ring-gray-200' 
            : 'text-gray-600 hover:bg-gray-200/50'
          }
          ${isReordering ? 'cursor-grab active:cursor-grabbing border border-dashed border-gray-200' : 'cursor-pointer'}
        `}
        style={{ paddingLeft: `${level * 12 + 12}px` }}
      >
        <div className="flex items-center gap-2 overflow-hidden flex-1">
            {isReordering && (
                <GripVertical size={14} className="text-gray-400 shrink-0" />
            )}

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
            
            <Folder 
              size={14} 
              className={`shrink-0 ${isActive ? 'text-primary-600 fill-primary-50' : 'text-gray-400 group-hover:text-gray-500'}`} 
            />
            
            <span className="truncate">{category.name}</span>
        </div>

        <div className="flex items-center gap-1">
             {/* Action Buttons (Visible on Hover or always in Reorder mode) */}
            <div className={`flex items-center gap-1 transition-opacity mr-1 ${isReordering ? 'opacity-0' : 'opacity-0 group-hover:opacity-100'}`}>
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
                    title="移至回收站"
                >
                    <Trash2 size={12} />
                </button>
            </div>

            {todosCount > 0 && !isReordering && (
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
          onMoveCategory={onMoveCategory}
          todosCount={0} 
          isReordering={isReordering}
        />
      ))}
    </div>
  );
};

// --- Helper to count active todos ---
// Modified to exclude deleted todos
const countTodos = (catId: string, todos: any[], categories: Category[]): number => {
    // Only count active children
    const childIds = categories.filter(c => c.parentId === catId && !c.deletedAt).map(c => c.id);
    // Count active todos in this category
    let count = todos.filter(t => t.categoryId === catId && !t.completed && !t.deletedAt).length;
    
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
    moveCategoryToTrash,
    moveCategory
  } = useTodoStore();

  // Modal State
  const [isInputModalOpen, setIsInputModalOpen] = useState(false);
  const [targetParentId, setTargetParentId] = useState<string | null>(null);

  // Search State
  const [searchQuery, setSearchQuery] = useState('');

  // Reorder Mode State
  const [isReordering, setIsReordering] = useState(false);
  const [isHeaderDragOver, setIsHeaderDragOver] = useState(false);
  
  // Options Menu State
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close menu when clicking outside
  useEffect(() => {
      const handleClickOutside = (event: MouseEvent) => {
          if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
              setIsMenuOpen(false);
          }
      };

      if (isMenuOpen) {
          document.addEventListener('mousedown', handleClickOutside);
      }

      return () => {
          document.removeEventListener('mousedown', handleClickOutside);
      };
  }, [isMenuOpen]);

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

  const handleSelectTrash = () => {
    setViewMode('trash');
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

  // Soft delete directly
  const handleDeleteCategory = (id: string) => {
      moveCategoryToTrash(id);
  };

  // Search Logic
  const filteredSearchResults = useMemo(() => {
    if (!searchQuery.trim()) return [];
    const query = searchQuery.toLowerCase();
    // Only search non-deleted todos
    return todos.filter(t => 
        !t.deletedAt &&
        (t.title.toLowerCase().includes(query) || 
        (t.description && t.description.toLowerCase().includes(query)))
    );
  }, [todos, searchQuery]);

  const handleSearchResultClick = (todo: Todo) => {
    // Navigate to context
    if (todo.categoryId) {
        setSelectedCategory(todo.categoryId);
    } else {
        // If no category, go to date view
        setSelectedDate(todo.date);
    }
    if (onCloseMobile) onCloseMobile();
  };

  // Calculate full category path for search results
  const getCategoryPath = (catId?: string) => {
    if (!catId) return '无分类';
    
    const path: string[] = [];
    let currentId: string | null = catId;
    
    while (currentId) {
        const cat = categories.find(c => c.id === currentId);
        if (cat) {
            path.unshift(cat.name);
            currentId = cat.parentId;
        } else {
            break;
        }
    }
    
    return path.length > 0 ? path.join(' / ') : '未知分类';
  };

  // Handle Root Drop (Making a category top-level)
  const handleRootDragOver = (e: React.DragEvent) => {
    if (!isReordering) return;
    e.preventDefault();
    e.stopPropagation();
    setIsHeaderDragOver(true);
  };

  const handleRootDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsHeaderDragOver(false);
  };

  const handleRootDrop = (e: React.DragEvent) => {
    if (!isReordering) return;
    e.preventDefault();
    e.stopPropagation();
    setIsHeaderDragOver(false);
    const draggedId = e.dataTransfer.getData('application/x-category-id');
    if (draggedId) {
        moveCategory(draggedId, null);
    }
  };

  // Filter root categories that are not deleted
  const rootCategories = categories.filter(c => c.parentId === null && !c.deletedAt);
  
  // Counts (excluding deleted items)
  const allActiveCount = todos.filter(t => !t.completed && !t.deletedAt).length;
  const todayStr = new Date().toISOString().split('T')[0];
  const todayCount = todos.filter(t => t.date === todayStr && !t.completed && !t.deletedAt).length;
  
  const targetParentName = targetParentId ? categories.find(c => c.id === targetParentId)?.name || null : null;

  return (
    <>
        <div className={`flex flex-col h-full bg-gray-50 ${className}`}>
            
            {/* Search Input */}
            <div className="px-3 pt-3 pb-2 shrink-0">
                <div className="relative">
                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                    <input 
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="搜索待办..."
                        className="w-full pl-9 pr-3 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 placeholder:text-gray-400"
                    />
                    {searchQuery && (
                        <button 
                            onClick={() => setSearchQuery('')}
                            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                        >
                            <X size={14} />
                        </button>
                    )}
                </div>
            </div>

            {searchQuery.trim() ? (
                // --- Search Results View ---
                <div className="flex-1 overflow-y-auto pb-4 space-y-0.5 custom-scrollbar px-2">
                    <h3 className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2 px-2 mt-2">
                        搜索结果 ({filteredSearchResults.length})
                    </h3>
                    
                    {filteredSearchResults.length === 0 ? (
                        <div className="text-center py-8 text-sm text-gray-400">
                            没有找到匹配的任务
                        </div>
                    ) : (
                        filteredSearchResults.map(todo => (
                            <div 
                                key={todo.id}
                                onClick={() => handleSearchResultClick(todo)}
                                className="group flex flex-col py-2 px-3 rounded-md cursor-pointer hover:bg-white hover:shadow-sm hover:ring-1 hover:ring-gray-200 transition-all mb-1"
                            >
                                <div className="flex items-center gap-2 mb-1">
                                    <div className={`w-1.5 h-1.5 rounded-full ${todo.completed ? 'bg-green-400' : 'bg-primary-500'}`}></div>
                                    <span className={`text-sm font-medium truncate ${todo.completed ? 'text-gray-400 line-through' : 'text-gray-700'}`}>
                                        {todo.title}
                                    </span>
                                </div>
                                <div className="flex items-center gap-1.5 pl-3.5 text-xs text-gray-400">
                                    <FolderOpen size={10} />
                                    <span className="truncate">{getCategoryPath(todo.categoryId)}</span>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            ) : (
                // --- Standard Navigation View ---
                <>
                    {/* Navigation Group */}
                    <div className="px-3 space-y-0.5 shrink-0">
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
                    <div className="flex-1 overflow-y-auto pb-4 space-y-0.5 custom-scrollbar relative">
                        {/* Categories Header with Settings Menu */}
                        <div 
                            className={`flex items-center justify-between px-3 mb-2 mt-4 group transition-colors rounded-md py-1 mx-2 relative ${isHeaderDragOver ? 'bg-primary-100 ring-2 ring-primary-500 ring-inset' : ''}`}
                            onDragOver={handleRootDragOver}
                            onDragLeave={handleRootDragLeave}
                            onDrop={handleRootDrop}
                        >
                            <h3 className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                                {isReordering ? '拖拽分类以移动' : '分类列表'}
                            </h3>
                            
                            <div className="relative" ref={menuRef}>
                                {isReordering ? (
                                    <button 
                                        onClick={() => setIsReordering(false)}
                                        className="p-1 text-primary-600 hover:bg-primary-50 rounded transition-colors"
                                        title="完成移动"
                                    >
                                        <Check size={14} />
                                    </button>
                                ) : (
                                    <button 
                                        onClick={() => setIsMenuOpen(!isMenuOpen)}
                                        className={`p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded transition-colors ${isMenuOpen ? 'bg-gray-100 text-gray-600' : ''}`}
                                        title="选项"
                                    >
                                        <Settings size={14} />
                                    </button>
                                )}

                                {/* Dropdown Menu */}
                                {isMenuOpen && !isReordering && (
                                    <div className="absolute right-0 top-6 w-36 bg-white rounded-xl shadow-xl border border-gray-100 z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-100">
                                        <div className="py-1">
                                            <button 
                                                onClick={() => {
                                                    setIsReordering(true);
                                                    setIsMenuOpen(false);
                                                }}
                                                className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                                            >
                                                <Move size={14} className="text-gray-500" />
                                                <span>移动/排序</span>
                                            </button>
                                            <button 
                                                onClick={() => {
                                                    openAddRoot();
                                                    setIsMenuOpen(false);
                                                }}
                                                className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                                            >
                                                <Plus size={14} className="text-gray-500" />
                                                <span>新建主分类</span>
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>
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
                                    onDelete={handleDeleteCategory}
                                    onMoveCategory={moveCategory}
                                    todosCount={countTodos(cat.id, todos, categories)}
                                    isReordering={isReordering}
                                />
                            ))
                        )}
                    </div>
                    
                    {/* Trash Link at Bottom */}
                     <div className="px-3 pb-3 mt-auto shrink-0 border-t border-gray-100 pt-2">
                         <button
                            onClick={handleSelectTrash}
                            className={`w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                                viewMode === 'trash'
                                    ? 'bg-white text-red-600 shadow-sm ring-1 ring-gray-200' 
                                    : 'text-gray-500 hover:bg-gray-200/50 hover:text-red-500'
                            }`}
                        >
                            <Recycle size={16} />
                            <span>回收站</span>
                        </button>
                     </div>
                </>
            )}
        </div>

        <CategoryInputModal 
            isOpen={isInputModalOpen}
            onClose={() => setIsInputModalOpen(false)}
            onSubmit={handleAddSubmit}
            parentName={targetParentName}
        />
    </>
  );
};