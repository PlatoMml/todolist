
import React, { useState } from 'react';
import { X, Trash2, Plus, ChevronRight, ChevronDown, Folder, CornerDownRight } from 'lucide-react';
import { useTodoStore } from '../store/useTodoStore';
import { Category } from '../types';
import { Button } from './Button';

interface CategoryManagerProps {
  isOpen: boolean;
  onClose: () => void;
}

// Recursive component to render category tree
const CategoryNode: React.FC<{ 
  category: Category; 
  allCategories: Category[]; 
  level: number;
  onAddSub: (id: string) => void;
  onDelete: (id: string) => void;
}> = ({ category, allCategories, level, onAddSub, onDelete }) => {
  const children = allCategories.filter(c => c.parentId === category.id);
  const [isExpanded, setIsExpanded] = useState(true);

  return (
    <div className="select-none">
      <div 
        className="flex items-center justify-between p-2 hover:bg-gray-50 rounded-lg group transition-colors"
        style={{ paddingLeft: `${level * 16 + 8}px` }}
      >
        <div className="flex items-center gap-2 overflow-hidden">
          {children.length > 0 ? (
            <button 
              onClick={() => setIsExpanded(!isExpanded)}
              className="p-0.5 text-gray-400 hover:text-gray-600"
            >
              {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
            </button>
          ) : (
             <span className="w-4"></span> 
          )}
          <span className="text-sm font-medium text-gray-700 truncate">{category.name}</span>
        </div>

        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button 
            onClick={() => onAddSub(category.id)}
            className="p-1.5 text-gray-400 hover:text-primary-600 hover:bg-primary-50 rounded"
            title="添加子分类"
          >
            <Plus size={14} />
          </button>
          <button 
            onClick={() => onDelete(category.id)}
            className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded"
            title="删除分类"
          >
            <Trash2 size={14} />
          </button>
        </div>
      </div>
      
      {isExpanded && children.length > 0 && (
        <div className="border-l border-gray-100 ml-4">
          {children.map(child => (
            <CategoryNode 
              key={child.id} 
              category={child} 
              allCategories={allCategories} 
              level={level + 1}
              onAddSub={onAddSub}
              onDelete={onDelete}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export const CategoryManager: React.FC<CategoryManagerProps> = ({ isOpen, onClose }) => {
  const { categories, addCategory, moveCategoryToTrash } = useTodoStore();
  const [newCategoryName, setNewCategoryName] = useState('');
  const [addingToParent, setAddingToParent] = useState<string | null>(null);

  if (!isOpen) return null;

  const rootCategories = categories.filter(c => c.parentId === null);

  const handleAdd = () => {
    if (!newCategoryName.trim()) return;
    addCategory(newCategoryName, addingToParent);
    setNewCategoryName('');
    setAddingToParent(null);
  };

  const startAddSub = (parentId: string) => {
    setAddingToParent(parentId);
    setTimeout(() => document.getElementById('new-cat-input')?.focus(), 50);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/30 backdrop-blur-sm animate-in fade-in duration-200">
      <div 
        className="bg-white rounded-2xl shadow-xl w-full max-w-md h-[80vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-4 border-b border-gray-100 shrink-0">
          <div className="flex items-center gap-2">
            <Folder className="text-primary-500" size={20} />
            <h2 className="text-lg font-bold text-gray-800">分类管理</h2>
          </div>
          <button 
            onClick={onClose}
            className="p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
          {rootCategories.length === 0 && (
            <div className="text-center text-gray-400 py-8">
              <p>暂无分类，请创建。</p>
            </div>
          )}
          <div className="space-y-1">
            {rootCategories.map(cat => (
              <CategoryNode 
                key={cat.id} 
                category={cat} 
                allCategories={categories} 
                level={0}
                onAddSub={startAddSub}
                onDelete={moveCategoryToTrash}
              />
            ))}
          </div>
        </div>

        <div className="p-4 border-t border-gray-100 bg-gray-50 shrink-0">
          <div className="mb-2 flex items-center justify-between">
            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
              {addingToParent 
                ? `添加到: ${categories.find(c => c.id === addingToParent)?.name}` 
                : '添加根分类'}
            </label>
            {addingToParent && (
              <button 
                onClick={() => setAddingToParent(null)} 
                className="text-xs text-red-500 hover:underline"
              >
                取消父级
              </button>
            )}
          </div>
          <div className="flex gap-2">
            <input
              id="new-cat-input"
              type="text"
              value={newCategoryName}
              onChange={(e) => setNewCategoryName(e.target.value)}
              placeholder="分类名称..."
              className="flex-1 px-3 py-2 bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 text-sm"
              onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
            />
            <Button onClick={handleAdd} disabled={!newCategoryName.trim()} size="sm">
              添加
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};
