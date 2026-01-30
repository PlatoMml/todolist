
import React from 'react';
import { createPortal } from 'react-dom';
import { AlertTriangle, Repeat } from 'lucide-react';
import { Button } from './Button';

interface DeleteRepeatModalProps {
  isOpen: boolean;
  onClose: () => void;
  onDeleteOne: () => void;
  onDeleteAll: () => void;
}

export const DeleteRepeatModal: React.FC<DeleteRepeatModalProps> = ({
  isOpen,
  onClose,
  onDeleteOne,
  onDeleteAll,
}) => {
  if (!isOpen) return null;

  return createPortal(
    <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in duration-200">
      <div 
        className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-6 flex flex-col items-center text-center">
            <div className="w-12 h-12 bg-orange-100 text-orange-600 rounded-full flex items-center justify-center mb-4">
                <Repeat size={24} />
            </div>
            <h3 className="text-lg font-bold text-gray-900 mb-2">删除重复任务</h3>
            <div className="text-sm text-gray-500 mb-6">
                这是一个重复任务，您希望如何删除？
            </div>
            
            <div className="flex flex-col gap-2 w-full">
                <Button 
                    variant="secondary" 
                    onClick={() => { onDeleteOne(); onClose(); }} 
                    className="w-full"
                >
                    仅删除本次
                </Button>
                <Button 
                    variant="danger" 
                    onClick={() => { onDeleteAll(); onClose(); }} 
                    className="w-full"
                >
                    删除本次及将来所有重复
                </Button>
                <button 
                    onClick={onClose}
                    className="mt-2 text-xs text-gray-400 hover:text-gray-600 hover:underline"
                >
                    取消
                </button>
            </div>
        </div>
      </div>
    </div>,
    document.body
  );
};
