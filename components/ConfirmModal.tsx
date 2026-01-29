import React from 'react';
import { createPortal } from 'react-dom';
import { AlertTriangle } from 'lucide-react';
import { Button } from './Button';

interface ConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: React.ReactNode;
}

export const ConfirmModal: React.FC<ConfirmModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
}) => {
  if (!isOpen) return null;

  return createPortal(
    <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in duration-200">
      <div 
        className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-6 flex flex-col items-center text-center">
            <div className="w-12 h-12 bg-red-100 text-red-600 rounded-full flex items-center justify-center mb-4">
                <AlertTriangle size={24} />
            </div>
            <h3 className="text-lg font-bold text-gray-900 mb-2">{title}</h3>
            <div className="text-sm text-gray-500 mb-6">{message}</div>
            
            <div className="flex gap-3 w-full">
                <Button variant="secondary" onClick={onClose} className="flex-1">
                    取消
                </Button>
                <Button 
                    variant="danger" 
                    onClick={() => { onConfirm(); onClose(); }} 
                    className="flex-1"
                >
                    删除
                </Button>
            </div>
        </div>
      </div>
    </div>,
    document.body
  );
};