
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
  Folder,
  Tag as TagIcon,
  Filter,
  Clock,
  CalendarRange,
  Repeat,
  Layers,
  ArrowUpDown,
  CalendarDays,
  Type,
  History,
  Database
} from 'lucide-react';
import { useTodoStore } from '../store/useTodoStore';
import { Category, Todo, SortBy, SortDirection } from '../types';
import { Button } from './Button';
import { format, isToday, isTomorrow, addDays, isValid } from 'date-fns';
import zhCN from 'date-fns/locale/zh-CN';
import { SettingsModal } from './SettingsModal';

// Helper to parse YYYY-MM-DD to local Date object
const parseLocalDate = (dateStr: string) => {
  const [year, month, day] = dateStr.split('-').map(Number);
  return new Date(year, month - 1, day);
};

// Helper to get category path
const getCategoryPath = (catId: string | undefined, categories: Category[]) => {
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

// Helper to get formatted date string
const getTodoDateDisplay = (todo: Todo) => {
    const dateObj = parseLocalDate(todo.date);
    if (!isValid(dateObj)) return '无效日期';

    const currentYear = new Date().getFullYear();
    const todoYear = dateObj.getFullYear();
    let display = '';
    
    if (isToday(dateObj)) display = '今天';
    else if (isTomorrow(dateObj)) display = '明天';
    else if (todoYear !== currentYear) display = format(dateObj, 'yyyy-MM-dd', { locale: zhCN });
    else display = format(dateObj, 'M月d日', { locale: zhCN });
    
    if (todo.time) display += ` ${todo.time}`;
    return display;
};

// --- Helper to find category ID from touch point ---
const getCategoryIdFromPoint = (x: number, y: number): string | null => {
    const element = document.elementFromPoint(x, y);
    if (!element) return null;
    const categoryRow = element.closest('[data-category-id]');
    return categoryRow ? categoryRow.getAttribute('data-category-id') : null;
};

// --- Special All Tasks Root Item Component ---
const AllTasksNavItem: React.FC<{
    isActive: boolean;
    isExpanded: boolean;
    onToggleExpand: () => void;
    onSelect: () => void;
    onAddRoot: () => void;
    todosCount: number;
    isReordering: boolean;
    dragOverId: string | null;
    setDragOverId: (id: string | null) => void;
    onMoveCategoryToRoot: (dragId: string) => void;
}> = ({ 
    isActive, 
    isExpanded, 
    onToggleExpand, 
    onSelect, 
    onAddRoot, 
    todosCount, 
    isReordering, 
    dragOverId, 
    setDragOverId,
    onMoveCategoryToRoot
}) => {
    const ROOT_ID = 'root-all-tasks';
    const isDragOver = dragOverId === ROOT_ID;

    // Drop Handlers for Root
    const handleDragOver = (e: React.DragEvent) => {
        if (!isReordering) return;
        e.preventDefault();
        e.stopPropagation();
        e.dataTransfer.dropEffect = 'move';
        if (dragOverId !== ROOT_ID) {
            setDragOverId(ROOT_ID);
        }
    };

    const handleDrop = (e: React.DragEvent) => {
        if (!isReordering) return;
        e.preventDefault();
        e.stopPropagation();
        setDragOverId(null);
        
        const draggedId = e.dataTransfer.getData('application/x-category-id');
        if (draggedId) {
            onMoveCategoryToRoot(draggedId);
        }
    };

    return (
        <div 
            data-category-id={ROOT_ID}
            onDragOver={handleDragOver}
            onDrop={handleDrop}
            onClick={() => !isReordering && onSelect()}
            className={`
                group flex items-center justify-between py-1.5 px-3 mx-2 rounded-md transition-all mb-0.5 select-none
                ${isDragOver ? 'bg-primary-100 ring-2 ring-primary-500 ring-inset z-10' : ''}
                ${isActive 
                    ? 'bg-white text-primary-700 shadow-sm ring-1 ring-gray-200' 
                    : 'text-gray-600 hover:bg-gray-200/50'
                }
            `}
        >
             <div className="flex items-center gap-2 overflow-hidden flex-1">
                {/* Spacer for grip vertical alignment */}
                {isReordering && <span className="w-[14px] shrink-0"></span>}

                <button 
                    onClick={(e) => { e.stopPropagation(); onToggleExpand(); }}
                    className="p-0.5 -ml-1 hover:bg-black/5 rounded text-gray-400"
                >
                    {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                </button>

                <LayoutGrid 
                    size={14} 
                    className={`shrink-0 ${isActive ? 'text-primary-600' : 'text-gray-400 group-hover:text-gray-500'}`} 
                />
                <span className="truncate font-medium">所有任务</span>
            </div>

            <div className="flex items-center gap-1">
                 {/* Add Root Category Button */}
                 <button 
                    onClick={(e) => { e.stopPropagation(); onAddRoot(); }}
                    className={`p-1 text-gray-400 hover:text-primary-600 hover:bg-primary-50 rounded transition-opacity ${isReordering ? 'opacity-0' : 'opacity-0 group-hover:opacity-100'}`}
                    title="新建分类"
                >
                    <Plus size={12} />
                </button>

                {todosCount > 0 && (
                    <span className={`text-xs px-1.5 py-0.5 rounded-full min-w-[20px] text-center ${
                        isActive ? 'bg-primary-50 text-primary-600' : 'bg-gray-200/50 text-gray-400'
                    }`}>
                        {todosCount}
                    </span>
                )}
            </div>
        </div>
    );
};

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
  dragOverId: string | null;            // Shared drag state
  setDragOverId: (id: string | null) => void; // Shared drag setter
}> = ({ 
    category, 
    allCategories, 
    level, 
    isActive, 
    onSelect, 
    onAddSub, 
    onDelete, 
    onMoveCategory, 
    todosCount, 
    isReordering,
    dragOverId,
    setDragOverId
}) => {
  // Only show children that are NOT deleted
  const children = allCategories.filter(c => c.parentId === category.id && !c.deletedAt);
  const [isExpanded, setIsExpanded] = useState(true);
  
  const isDragOver = dragOverId === category.id;

  // --- Desktop Drag Handlers ---
  const handleDragStart = (e: React.DragEvent) => {
      e.dataTransfer.setData('application/x-category-id', category.id);
      e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent) => {
      if (!isReordering) return;
      e.preventDefault();
      e.stopPropagation();
      e.dataTransfer.dropEffect = 'move';
      if (dragOverId !== category.id) {
          setDragOverId(category.id);
      }
  };

  const handleDragLeave = (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
  };

  const handleDrop = (e: React.DragEvent) => {
      if (!isReordering) return;
      e.preventDefault();
      e.stopPropagation();
      setDragOverId(null);
      
      const draggedId = e.dataTransfer.getData('application/x-category-id');
      if (draggedId && draggedId !== category.id) {
          onMoveCategory(draggedId, category.id);
      }
  };

  // --- Mobile Touch Handlers ---
  const handleTouchStart = (e: React.TouchEvent) => {
      if (!isReordering) return;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
      if (!isReordering) return;
      // Prevent scrolling while dragging to reorder
      if (e.cancelable) e.preventDefault(); 
      
      const touch = e.touches[0];
      const targetId = getCategoryIdFromPoint(touch.clientX, touch.clientY);
      
      if (targetId && targetId !== category.id) {
          setDragOverId(targetId);
      } else {
          setDragOverId(null);
      }
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
      if (!isReordering) return;
      
      const touch = e.changedTouches[0];
      const targetId = getCategoryIdFromPoint(touch.clientX, touch.clientY);
      
      // Perform move
      if (targetId && targetId !== category.id) {
          onMoveCategory(category.id, targetId);
      }
      
      // Reset
      setDragOverId(null);
  };

  return (
    <div className="select-none">
      <div 
        data-category-id={category.id}
        draggable={isReordering}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onClick={() => !isReordering && onSelect(category.id)}
        className={`
          group flex items-center justify-between py-1.5 px-3 mx-2 rounded-md transition-all mb-0.5
          ${isDragOver ? 'bg-primary-100 ring-2 ring-primary-500 ring-inset z-10' : ''}
          ${isActive 
            ? 'bg-white text-primary-700 shadow-sm ring-1 ring-gray-200' 
            : 'text-gray-600 hover:bg-gray-200/50'
          }
          ${isReordering ? 'cursor-grab active:cursor-grabbing border border-dashed border-gray-200 touch-none' : 'cursor-pointer'}
        `}
        style={{ paddingLeft: `${level * 12 + 28}px` }} 
      >
        <div className="flex items-center gap-2 overflow-hidden flex-1 pointer-events-none">
            {isReordering && (
                <GripVertical size={14} className="text-gray-400 shrink-0" />
            )}

            {children.length > 0 ? (
                <button 
                onClick={(e) => { e.stopPropagation(); setIsExpanded(!isExpanded); }}
                className="p-0.5 -ml-1 hover:bg-black/5 rounded text-gray-400 pointer-events-auto"
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
          dragOverId={dragOverId}
          setDragOverId={setDragOverId}
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

// Extracted Component
const SearchResultCard: React.FC<{ 
    todo: Todo; 
    matchType: string; 
    matchText: string; 
    isCompact?: boolean;
    onClick: (todo: Todo) => void;
    categoryPath: string;
    dateDisplay: string;
    isOverdue: boolean;
}> = ({ todo, matchType, matchText, isCompact = false, onClick, categoryPath, dateDisplay, isOverdue }) => {
    return (
        <div 
            onClick={() => onClick(todo)}
            className={`group flex flex-col px-3 rounded-md cursor-pointer hover:bg-white hover:shadow-sm hover:ring-1 hover:ring-gray-200 transition-all mb-1 border border-transparent ${isCompact ? 'py-2 bg-gray-50/50' : 'py-2.5'}`}
        >
            {/* Top Row: Status + Title */}
            <div className="flex items-center gap-2 mb-1">
                <div className={`w-1.5 h-1.5 shrink-0 rounded-full ${todo.completed ? 'bg-green-400' : 'bg-primary-500'}`}></div>
                <span className={`text-sm font-medium truncate ${todo.completed ? 'text-gray-400 line-through' : 'text-gray-700'}`}>
                    {todo.title}
                </span>
            </div>
            
            {/* Middle Row: Dates */}
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 pl-3.5 mb-1">
                    {/* Due Date */}
                    <div className={`flex items-center gap-1 text-[11px] leading-tight ${
                        isOverdue 
                        ? 'text-red-600 font-medium'
                        : isToday(parseLocalDate(todo.date)) 
                            ? 'text-orange-600 font-medium' 
                            : 'text-gray-500'
                    }`}>
                        <Calendar size={11} className="shrink-0" />
                        <span>{isOverdue ? '已过期 ' : ''}{dateDisplay}</span>
                        {/* Fix: check repeat safely */}
                        {todo.repeat && (
                        <Repeat size={10} className="ml-0.5" />
                        )}
                    </div>
            </div>
            
            {/* Bottom Row: Category + Match Badge */}
            <div className="flex items-center justify-between gap-2 pl-3.5">
                {!isCompact && (
                    <div className="flex items-center gap-1.5 text-xs text-gray-400 min-w-0">
                        <FolderOpen size={11} className="shrink-0" />
                        <span className="truncate max-w-[80px]">{categoryPath}</span>
                    </div>
                )}
                
                {!isCompact && (
                    <div className={`shrink-0 text-[10px] px-1.5 py-0.5 rounded font-medium ${
                        matchType === 'tag' ? 'bg-indigo-50 text-indigo-600' :
                        matchType === 'title' ? 'bg-blue-50 text-blue-600' :
                        'bg-gray-100 text-gray-500'
                    }`}>
                        {matchType === 'tag' && <TagIcon size={8} className="inline mr-1" />}
                        {matchType === 'tag' ? `标签: ${matchText}` : matchText}
                    </div>
                )}
            </div>
        </div>
    );
};

// --- Main Sidebar Component ---
interface SidebarProps {
  className?: string;
  onCloseMobile?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ className = '', onCloseMobile }) => {
  const { 
    categories, 
    todos, 
    tags,
    viewMode, 
    selectedCategoryId, 
    setViewMode, 
    setSelectedCategory,
    setSelectedDate,
    addCategory,
    moveCategoryToTrash,
    moveCategory,
    upcomingDays,
    setUpcomingDays
  } = useTodoStore();

  // Modal State
  const [isInputModalOpen, setIsInputModalOpen] = useState(false);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false); // New: Settings Modal State
  const [targetParentId, setTargetParentId] = useState<string | null>(null);
  
  // All Tasks State
  const [isAllTasksExpanded, setIsAllTasksExpanded] = useState(true);

  // Drag State (Shared for Desktop & Mobile)
  const [dragOverId, setDragOverId] = useState<string | null>(null);

  // Search State
  const [searchQuery, setSearchQuery] = useState('');
  const [searchFilters, setSearchFilters] = useState({
      title: true,
      description: true,
      tags: true
  });
  
  // Search Sort State
  const [searchSortBy, setSearchSortBy] = useState<SortBy>('date');
  const [searchSortDirection, setSearchSortDirection] = useState<SortDirection>('asc');
  const [isSearchSortOpen, setIsSearchSortOpen] = useState(false);
  const searchSortRef = useRef<HTMLDivElement>(null);

  const [isSearchFilterOpen, setIsSearchFilterOpen] = useState(false);
  const searchFilterRef = useRef<HTMLDivElement>(null);
  const [expandedSearchGroups, setExpandedSearchGroups] = useState<Set<string>>(new Set());

  // Reorder Mode State
  const [isReordering, setIsReordering] = useState(false);
  
  // Options Menu State
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close menus when clicking outside
  useEffect(() => {
      const handleClickOutside = (event: MouseEvent) => {
          if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
              setIsMenuOpen(false);
          }
          if (searchFilterRef.current && !searchFilterRef.current.contains(event.target as Node)) {
              setIsSearchFilterOpen(false);
          }
          if (searchSortRef.current && !searchSortRef.current.contains(event.target as Node)) {
              setIsSearchSortOpen(false);
          }
      };

      if (isMenuOpen || isSearchFilterOpen || isSearchSortOpen) {
          document.addEventListener('mousedown', handleClickOutside);
      }

      return () => {
          document.removeEventListener('mousedown', handleClickOutside);
      };
  }, [isMenuOpen, isSearchFilterOpen, isSearchSortOpen]);

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

  const handleSelectUpcoming = () => {
      setViewMode('upcoming');
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

  // Wrapper to handle moving to root specifically
  const handleMoveCategoryWrapper = (dragId: string, targetId: string) => {
      if (targetId === 'root-all-tasks') {
          moveCategory(dragId, null);
      } else {
          moveCategory(dragId, targetId);
      }
  };

  // Grouped Search Logic
  const groupedSearchResults = useMemo(() => {
    if (!searchQuery.trim()) return [];
    const query = searchQuery.toLowerCase();

    // Helper to sort todos
    const compareTodos = (a: Todo, b: Todo) => {
        let comparison = 0;
        switch (searchSortBy) {
            case 'title': comparison = a.title.localeCompare(b.title, 'zh-CN'); break;
            case 'date': 
                comparison = a.date.localeCompare(b.date);
                if (comparison === 0) comparison = (a.time || '').localeCompare(b.time || '');
                break;
            case 'createdAt': comparison = a.createdAt - b.createdAt; break;
            case 'updatedAt': comparison = (a.updatedAt || a.createdAt) - (b.updatedAt || b.createdAt); break;
        }
        return searchSortDirection === 'asc' ? comparison : -comparison;
    };
    
    // 1. Find all matches (Non-deleted)
    const allMatches = todos.filter(t => !t.deletedAt).reduce((acc, t) => {
        let matchType: 'title' | 'description' | 'tag' | null = null;
        let matchText = '';

        // Check Tag Match first
        if (searchFilters.tags && t.tagIds) {
            const matchedTag = t.tagIds
                .map(id => tags.find(tag => tag.id === id))
                .find(tag => tag && tag.name.toLowerCase().includes(query));
            if (matchedTag) {
                matchType = 'tag';
                matchText = matchedTag.name;
            }
        }

        // Check Title
        if (!matchType && searchFilters.title && t.title.toLowerCase().includes(query)) {
            matchType = 'title';
            matchText = '标题匹配';
        }

        // Check Description
        if (!matchType && searchFilters.description && t.description && t.description.toLowerCase().includes(query)) {
            matchType = 'description';
            matchText = '描述匹配';
        }

        if (matchType) {
            acc.push({ todo: t, matchType, matchText });
        }
        return acc;
    }, [] as { todo: Todo, matchType: string, matchText: string }[]);

    // 2. Group matches by Title + Category
    const groups: Record<string, { 
        key: string;
        title: string; 
        categoryId?: string; 
        matches: typeof allMatches;
        primaryMatchType: string;
        primaryMatchText: string;
    }> = {};

    allMatches.forEach(match => {
        const key = `${match.todo.title.trim()}|${match.todo.categoryId || 'uncategorized'}`;
        if (!groups[key]) {
            groups[key] = {
                key,
                title: match.todo.title,
                categoryId: match.todo.categoryId,
                matches: [],
                primaryMatchType: match.matchType,
                primaryMatchText: match.matchText
            };
        }
        groups[key].matches.push(match);
        
        // Simple priority: title > tag > description
        const priority: Record<string, number> = { title: 3, tag: 2, description: 1 };
        if (priority[match.matchType] > priority[groups[key].primaryMatchType]) {
            groups[key].primaryMatchType = match.matchType;
            groups[key].primaryMatchText = match.matchText;
        }
    });

    // 3. Convert to array and sort matches within groups AND sort groups themselves
    return Object.values(groups).map(group => {
        // Sort the matches inside the group based on criteria
        group.matches.sort((a, b) => compareTodos(a.todo, b.todo));
        return group;
    }).sort((groupA, groupB) => {
        // Sort groups based on their first element (which is the "best" match according to sort criteria)
        const todoA = groupA.matches[0]?.todo;
        const todoB = groupB.matches[0]?.todo;
        
        if (!todoA && !todoB) return 0;
        if (!todoA) return 1;
        if (!todoB) return -1;

        return compareTodos(todoA, todoB);
    });

  }, [todos, tags, searchQuery, searchFilters, searchSortBy, searchSortDirection]);

  const toggleGroup = (key: string) => {
      const newSet = new Set(expandedSearchGroups);
      if (newSet.has(key)) newSet.delete(key);
      else newSet.add(key);
      setExpandedSearchGroups(newSet);
  };

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

  // Filter root categories that are not deleted
  const rootCategories = categories.filter(c => c.parentId === null && !c.deletedAt);
  
  // Counts (excluding deleted items)
  const allActiveCount = todos.filter(t => !t.completed && !t.deletedAt).length;
  const todayStr = format(new Date(), 'yyyy-MM-dd');
  const todayCount = todos.filter(t => t.date === todayStr && !t.completed && !t.deletedAt).length;
  
  // Calculate upcoming count
  const upcomingCount = useMemo(() => {
      // Safeguard against invalid upcomingDays
      const safeDays = (typeof upcomingDays === 'number' && !isNaN(upcomingDays)) ? upcomingDays : 7;
      
      const today = new Date();
      const end = addDays(today, safeDays);
      const startStr = format(today, 'yyyy-MM-dd');
      const endStr = format(end, 'yyyy-MM-dd');
      
      return todos.filter(t => {
          if (t.completed || t.deletedAt) return false;
          return t.date >= startStr && t.date <= endStr;
      }).length;
  }, [todos, upcomingDays]);

  const targetParentName = targetParentId ? categories.find(c => c.id === targetParentId)?.name || null : null;

  const sortOptions: { value: SortBy; label: string; icon: React.ReactNode }[] = [
      { value: 'date', label: '待办日期', icon: <CalendarDays size={14} /> },
      { value: 'title', label: '任务名称', icon: <Type size={14} /> },
      { value: 'createdAt', label: '创建时间', icon: <Clock size={14} /> },
      { value: 'updatedAt', label: '修改时间', icon: <History size={14} /> },
  ];

  return (
    <>
        <div className={`flex flex-col h-full bg-gray-50 ${className}`}>
            
            {/* Search Input */}
            <div className="px-3 pt-3 pb-2 shrink-0 z-20">
                <div className="relative">
                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                    <input 
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="搜索待办..."
                        className="w-full pl-9 pr-24 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 placeholder:text-gray-400"
                    />
                    
                    <div className="absolute right-1 top-1/2 -translate-y-1/2 flex items-center gap-0.5">
                         {searchQuery && (
                            <button 
                                onClick={() => setSearchQuery('')}
                                className="p-1 text-gray-400 hover:text-gray-600 mr-0.5"
                            >
                                <X size={14} />
                            </button>
                        )}
                        
                        {/* Sort Button */}
                        <div className="relative" ref={searchSortRef}>
                            <button
                                onClick={() => setIsSearchSortOpen(!isSearchSortOpen)}
                                className={`p-1.5 rounded-md transition-colors ${isSearchSortOpen ? 'bg-primary-100 text-primary-600' : 'text-gray-400 hover:text-gray-600 hover:bg-gray-100'}`}
                                title="排序"
                            >
                                <ArrowUpDown size={14} />
                            </button>
                            {/* Sort Dropdown */}
                            {isSearchSortOpen && (
                                <div className="absolute top-full right-0 mt-1 w-32 bg-white rounded-lg shadow-xl border border-gray-100 z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-100 p-1">
                                    {sortOptions.map(option => (
                                        <button
                                            key={option.value}
                                            onClick={() => { setSearchSortBy(option.value); setIsSearchSortOpen(false); }}
                                            className={`w-full flex items-center justify-between px-3 py-2 text-xs rounded-lg transition-colors ${
                                                searchSortBy === option.value ? 'bg-primary-50 text-primary-700' : 'text-gray-700 hover:bg-gray-50'
                                            }`}
                                        >
                                            <div className="flex items-center gap-2">
                                                {option.icon}
                                                <span>{option.label}</span>
                                            </div>
                                            {searchSortBy === option.value && <Check size={12} />}
                                        </button>
                                    ))}
                                    <div className="h-px bg-gray-100 my-1"></div>
                                    <div className="flex bg-gray-50 p-1 rounded-lg">
                                        <button onClick={() => setSearchSortDirection('asc')} className={`flex-1 text-xs py-1 rounded-md ${searchSortDirection === 'asc' ? 'bg-white shadow-sm text-primary-700' : 'text-gray-500 hover:bg-white hover:shadow-sm'}`}>升序</button>
                                        <button onClick={() => setSearchSortDirection('desc')} className={`flex-1 text-xs py-1 rounded-md ${searchSortDirection === 'desc' ? 'bg-white shadow-sm text-primary-700' : 'text-gray-500 hover:bg-white hover:shadow-sm'}`}>降序</button>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Filter Button */}
                        <div className="relative" ref={searchFilterRef}>
                            <button
                                onClick={() => setIsSearchFilterOpen(!isSearchFilterOpen)}
                                className={`p-1.5 rounded-md transition-colors ${isSearchFilterOpen ? 'bg-primary-100 text-primary-600' : 'text-gray-400 hover:text-gray-600 hover:bg-gray-100'}`}
                                title="搜索筛选"
                            >
                                <Filter size={14} />
                            </button>

                            {/* Filter Dropdown */}
                            {isSearchFilterOpen && (
                                <div className="absolute top-full right-0 mt-1 w-32 bg-white rounded-lg shadow-xl border border-gray-100 z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-100 p-1">
                                    <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider px-2 py-1">搜索范围</div>
                                    
                                    <label className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-gray-50 cursor-pointer text-sm text-gray-700">
                                        <input 
                                            type="checkbox" 
                                            checked={searchFilters.title}
                                            onChange={(e) => setSearchFilters({...searchFilters, title: e.target.checked})}
                                            className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                                        />
                                        标题
                                    </label>
                                    <label className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-gray-50 cursor-pointer text-sm text-gray-700">
                                        <input 
                                            type="checkbox" 
                                            checked={searchFilters.description}
                                            onChange={(e) => setSearchFilters({...searchFilters, description: e.target.checked})}
                                            className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                                        />
                                        描述
                                    </label>
                                    <label className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-gray-50 cursor-pointer text-sm text-gray-700">
                                        <input 
                                            type="checkbox" 
                                            checked={searchFilters.tags}
                                            onChange={(e) => setSearchFilters({...searchFilters, tags: e.target.checked})}
                                            className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                                        />
                                        标签
                                    </label>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {searchQuery.trim() ? (
                // --- Search Results View ---
                <div className="flex-1 overflow-y-auto pb-4 space-y-0.5 custom-scrollbar px-2">
                    <h3 className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2 px-2 mt-2">
                        搜索结果 ({groupedSearchResults.reduce((acc, g) => acc + g.matches.length, 0)})
                    </h3>
                    
                    {groupedSearchResults.length === 0 ? (
                        <div className="text-center py-8 text-sm text-gray-400">
                             {(searchFilters.title || searchFilters.description || searchFilters.tags) 
                                ? '没有找到匹配的任务' 
                                : '请至少选择一个搜索范围'}
                        </div>
                    ) : (
                        groupedSearchResults.map(group => {
                            // If only 1 match, render single item
                            if (group.matches.length === 1) {
                                const todo = group.matches[0].todo;
                                return (
                                    <SearchResultCard 
                                        key={todo.id} 
                                        todo={todo}
                                        matchType={group.primaryMatchType}
                                        matchText={group.primaryMatchText}
                                        onClick={handleSearchResultClick}
                                        categoryPath={getCategoryPath(todo.categoryId, categories)}
                                        dateDisplay={getTodoDateDisplay(todo)}
                                        isOverdue={!todo.completed && todo.date < todayStr}
                                    />
                                );
                            }

                            // If multiple matches, render Group Header + List
                            const isExpanded = expandedSearchGroups.has(group.key);
                            const topTodo = group.matches[0].todo; // The first one after sort is the representative
                            const isTopOverdue = !topTodo.completed && topTodo.date < todayStr;

                            return (
                                <div key={group.key} className="mb-2">
                                    {/* Group Header */}
                                    <div 
                                        onClick={() => toggleGroup(group.key)}
                                        className="flex items-center justify-between p-3 rounded-md cursor-pointer bg-white border border-gray-200 hover:border-gray-300 shadow-sm transition-all"
                                    >
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2 mb-1">
                                                <Layers size={14} className="text-primary-500" />
                                                <span className="text-sm font-semibold text-gray-800 truncate">
                                                    {group.title}
                                                </span>
                                                <span className="text-xs px-1.5 py-0.5 bg-gray-100 text-gray-600 rounded-full">
                                                    {group.matches.length}
                                                </span>
                                            </div>
                                            
                                            <div className="flex items-center gap-2 text-xs text-gray-500">
                                                <span className="truncate max-w-[100px]">{getCategoryPath(group.categoryId, categories)}</span>
                                                <span className="w-1 h-1 rounded-full bg-gray-300"></span>
                                                <div className={`flex items-center gap-1 ${isTopOverdue ? 'text-red-500' : ''}`}>
                                                    <Calendar size={10} />
                                                    <span>{searchSortBy === 'date' ? (searchSortDirection === 'asc' ? '最早: ' : '最晚: ') : ''}{getTodoDateDisplay(topTodo)}</span>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="text-gray-400">
                                            {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                                        </div>
                                    </div>

                                    {/* Expanded Items */}
                                    {isExpanded && (
                                        <div className="mt-1 pl-3 border-l-2 border-gray-100 ml-3 space-y-1">
                                            {group.matches.map(match => (
                                                <SearchResultCard 
                                                    key={match.todo.id} 
                                                    todo={match.todo}
                                                    matchType={match.matchType}
                                                    matchText={match.matchText}
                                                    isCompact={true}
                                                    onClick={handleSearchResultClick}
                                                    categoryPath={getCategoryPath(match.todo.categoryId, categories)}
                                                    dateDisplay={getTodoDateDisplay(match.todo)}
                                                    isOverdue={!match.todo.completed && match.todo.date < todayStr}
                                                />
                                            ))}
                                        </div>
                                    )}
                                </div>
                            );
                        })
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
                        
                        {/* Today */}
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
                        
                        {/* Upcoming - Custom Days */}
                        <div 
                            onClick={handleSelectUpcoming}
                            className={`w-full flex items-center justify-between px-3 py-1.5 mx-auto w-[calc(100%-16px)] rounded-md text-sm font-medium transition-colors cursor-pointer group ${
                                viewMode === 'upcoming'
                                    ? 'bg-white text-primary-700 shadow-sm ring-1 ring-gray-200' 
                                    : 'text-gray-600 hover:bg-gray-200/50'
                            }`}
                        >
                             <div className="flex items-center gap-3 flex-1">
                                <CalendarRange size={16} />
                                <div className="flex items-center gap-1">
                                    <span>未来</span>
                                    <input 
                                        type="number" 
                                        min="1"
                                        max="3650"
                                        value={upcomingDays}
                                        onClick={(e) => e.stopPropagation()} // Prevent triggering view change on input click
                                        onChange={(e) => {
                                            const val = parseInt(e.target.value);
                                            // Handle NaN (e.g. empty input) by defaulting to 0 or keeping current valid state?
                                            // Here we default to 0 to allow user to type "1" after clearing
                                            setUpcomingDays(isNaN(val) ? 0 : val);
                                        }}
                                        className={`w-12 px-0 text-center text-xs bg-transparent border-b border-gray-300 focus:border-primary-500 focus:outline-none focus:text-primary-700 appearance-none m-0 p-0 font-bold ${
                                            viewMode === 'upcoming' ? 'text-primary-700 border-primary-300' : 'text-gray-500'
                                        }`}
                                    />
                                    <span>天</span>
                                </div>
                            </div>
                            {upcomingCount > 0 && <span className="text-xs text-gray-400">{upcomingCount}</span>}
                        </div>
                    </div>

                    {/* Categories Group */}
                    <div className="flex-1 overflow-y-auto pb-4 space-y-0.5 custom-scrollbar relative">
                        {/* Categories Header with Settings Menu */}
                        <div 
                            className="flex items-center justify-between px-3 mb-2 mt-4 group transition-colors rounded-md py-1 mx-2 relative"
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
                                            {/* Add Root is now handled via the + button on All Tasks or empty state */}
                                            {/* We can keep this option if users prefer */}
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

                        {/* All Tasks (Root Node) */}
                        <AllTasksNavItem 
                            isActive={viewMode === 'all'}
                            isExpanded={isAllTasksExpanded}
                            onToggleExpand={() => setIsAllTasksExpanded(!isAllTasksExpanded)}
                            onSelect={handleSelectAll}
                            onAddRoot={openAddRoot}
                            todosCount={allActiveCount}
                            isReordering={isReordering}
                            dragOverId={dragOverId}
                            setDragOverId={setDragOverId}
                            onMoveCategoryToRoot={(dragId) => handleMoveCategoryWrapper(dragId, 'root-all-tasks')}
                        />

                        {/* Child Categories */}
                        {isAllTasksExpanded && (
                            <>
                                {rootCategories.length === 0 ? (
                                    <div className="ml-8 text-xs text-gray-400 py-1 cursor-pointer hover:text-primary-500" onClick={openAddRoot}>
                                        (空) + 新建分类
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
                                            onMoveCategory={handleMoveCategoryWrapper}
                                            todosCount={countTodos(cat.id, todos, categories)}
                                            isReordering={isReordering}
                                            dragOverId={dragOverId}
                                            setDragOverId={setDragOverId}
                                        />
                                    ))
                                )}
                            </>
                        )}
                        
                    </div>
                    
                    {/* Settings & Trash Link at Bottom */}
                     <div className="px-3 pb-3 mt-auto shrink-0 border-t border-gray-100 pt-2 space-y-0.5">
                         <button
                            onClick={() => setIsSettingsModalOpen(true)}
                            className="w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors text-gray-500 hover:bg-gray-200/50 hover:text-primary-600"
                        >
                            <Database size={16} />
                            <span>数据备份</span>
                        </button>

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

        <SettingsModal 
            isOpen={isSettingsModalOpen}
            onClose={() => setIsSettingsModalOpen(false)}
        />
    </>
  );
};
