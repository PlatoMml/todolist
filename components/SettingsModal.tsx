
import React, { useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { X, Download, Upload, AlertTriangle, FileJson, Check, Database, Folder } from 'lucide-react';
import { useTodoStore } from '../store/useTodoStore';
import { Button } from './Button';
import { format } from 'date-fns';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose }) => {
  const { todos, categories, tags, importData } = useTodoStore();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [importStatus, setImportStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');

  if (!isOpen) return null;

  const handleExport = () => {
    try {
      // Get the latest state directly
      const currentTodos = useTodoStore.getState().todos;
      const currentCategories = useTodoStore.getState().categories;
      const currentTags = useTodoStore.getState().tags;

      const data = {
        meta: {
          version: '1.0',
          exportedAt: Date.now(),
          app: 'TodoApp'
        },
        data: {
          todos: currentTodos,
          categories: currentCategories,
          tags: currentTags
        }
      };

      const jsonString = JSON.stringify(data, null, 2);
      const blob = new Blob([jsonString], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      
      const link = document.createElement('a');
      link.href = url;
      link.download = `todo-backup-${format(new Date(), 'yyyy-MM-dd-HHmm')}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Export failed:', error);
      alert('导出失败，请重试');
    }
  };

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const result = event.target?.result as string;
        const parsed = JSON.parse(result);

        // Basic validation
        // We support both { data: { ... } } format (our export) and direct root object if needed
        const payload = parsed.data || parsed;

        if (!Array.isArray(payload.todos) || !Array.isArray(payload.categories)) {
          throw new Error('无效的数据格式：缺少必要的任务或分类数据');
        }

        // Perform Import
        importData({
          todos: payload.todos,
          categories: payload.categories,
          tags: payload.tags || []
        });

        setImportStatus('success');
        setErrorMessage('');
        
        // Reset file input
        if (fileInputRef.current) fileInputRef.current.value = '';

        setTimeout(() => {
            setImportStatus('idle');
            onClose();
        }, 1500);

      } catch (err: any) {
        console.error('Import failed:', err);
        setImportStatus('error');
        setErrorMessage(err.message || '无法解析文件');
      }
    };
    reader.readAsText(file);
  };

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in duration-200">
      <div 
        className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-4 border-b border-gray-100 bg-gray-50/50">
          <div className="flex items-center gap-2">
            <Database className="text-primary-600" size={20} />
            <h2 className="text-lg font-bold text-gray-800">数据备份与恢复</h2>
          </div>
          <button 
            onClick={onClose}
            className="p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        <div className="p-6 space-y-6">
            {/* Export Section */}
            <div className="bg-primary-50 rounded-xl p-4 border border-primary-100">
                <div className="flex items-start gap-3 mb-3">
                    <div className="p-2 bg-white rounded-lg text-primary-600 shadow-sm shrink-0">
                        <Download size={20} />
                    </div>
                    <div>
                        <h3 className="font-bold text-gray-900">导出数据</h3>
                        <p className="text-xs text-gray-500 mt-1 leading-relaxed">
                            生成一个包含所有任务、分类、标签和回收站内容的 JSON 备份文件。建议定期备份。
                        </p>
                    </div>
                </div>
                <Button onClick={handleExport} className="w-full flex items-center gap-2">
                    <FileJson size={16} />
                    下载备份文件
                </Button>
            </div>

            {/* Divider */}
            <div className="relative">
                <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-gray-100"></div>
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-white px-2 text-gray-400 font-medium">或者</span>
                </div>
            </div>

            {/* Import Section */}
            <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
                <div className="flex items-start gap-3 mb-3">
                    <div className="p-2 bg-white rounded-lg text-gray-600 shadow-sm shrink-0">
                        <Upload size={20} />
                    </div>
                    <div>
                        <h3 className="font-bold text-gray-900">导入数据</h3>
                        <p className="text-xs text-gray-500 mt-1 leading-relaxed">
                            从 JSON 文件恢复数据。
                            <br/>
                            <span className="text-red-500 font-semibold">警告：此操作将覆盖当前所有的任务和设置，无法撤销。</span>
                        </p>
                    </div>
                </div>
                
                <input 
                    type="file" 
                    accept=".json" 
                    ref={fileInputRef} 
                    className="hidden" 
                    onChange={handleFileChange}
                />
                
                <Button 
                    variant="secondary" 
                    onClick={handleImportClick} 
                    className={`w-full flex items-center gap-2 ${importStatus === 'error' ? 'border-red-300 text-red-600 bg-red-50 hover:bg-red-100' : ''}`}
                    disabled={importStatus === 'success'}
                >
                    {importStatus === 'success' ? (
                        <>
                            <Check size={16} className="text-green-600" />
                            <span className="text-green-600">导入成功</span>
                        </>
                    ) : importStatus === 'error' ? (
                        <>
                            <AlertTriangle size={16} />
                            <span>{errorMessage || '导入失败，请重试'}</span>
                        </>
                    ) : (
                        <>
                            <Folder size={16} />
                            选择备份文件...
                        </>
                    )}
                </Button>
            </div>
        </div>
      </div>
    </div>,
    document.body
  );
};
