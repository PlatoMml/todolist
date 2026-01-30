
import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';

export interface ActionSheetOption {
    label: string;
    icon?: React.ReactNode;
    onClick: () => void;
    variant?: 'default' | 'danger' | 'primary';
}

interface ActionSheetProps {
    isOpen: boolean;
    onClose: () => void;
    title?: string;
    options: ActionSheetOption[];
}

export const ActionSheet: React.FC<ActionSheetProps> = ({ isOpen, onClose, title, options }) => {
    const [visible, setVisible] = useState(false);

    useEffect(() => {
        if (isOpen) {
            setVisible(true);
            // Prevent body scroll
            document.body.style.overflow = 'hidden';
        } else {
            const timer = setTimeout(() => setVisible(false), 300); // Wait for animation
            document.body.style.overflow = '';
            return () => clearTimeout(timer);
        }
    }, [isOpen]);

    if (!visible && !isOpen) return null;

    return createPortal(
        <div className="fixed inset-0 z-[200] flex justify-center items-end sm:items-center">
            {/* Backdrop */}
            <div 
                className={`absolute inset-0 bg-black/40 backdrop-blur-sm transition-opacity duration-300 ${isOpen ? 'opacity-100' : 'opacity-0'}`}
                onClick={onClose}
            />

            {/* Sheet Content */}
            <div 
                className={`
                    relative w-full max-w-sm bg-white rounded-t-2xl sm:rounded-2xl overflow-hidden shadow-2xl 
                    transition-transform duration-300 ease-out transform
                    ${isOpen ? 'translate-y-0 scale-100' : 'translate-y-full sm:translate-y-10 sm:scale-95 sm:opacity-0'}
                `}
                onClick={e => e.stopPropagation()}
            >
                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b border-gray-100 bg-gray-50/50">
                    <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wide">
                        {title || '操作'}
                    </h3>
                    <button 
                        onClick={onClose}
                        className="p-1 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-200/50"
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* Options */}
                <div className="p-2 space-y-1">
                    {options.map((option, index) => (
                        <button
                            key={index}
                            onClick={() => {
                                option.onClick();
                                onClose();
                            }}
                            className={`
                                w-full flex items-center gap-3 px-4 py-3.5 rounded-xl text-base font-medium transition-colors active:scale-[0.98]
                                ${option.variant === 'danger' ? 'text-red-600 bg-red-50 hover:bg-red-100' : ''}
                                ${option.variant === 'primary' ? 'text-primary-600 bg-primary-50 hover:bg-primary-100' : ''}
                                ${(!option.variant || option.variant === 'default') ? 'text-gray-700 hover:bg-gray-100' : ''}
                            `}
                        >
                            {option.icon && <span className="opacity-80">{option.icon}</span>}
                            <span>{option.label}</span>
                        </button>
                    ))}
                </div>

                {/* Cancel Button (Mobile Style) */}
                <div className="p-2 pt-0 sm:hidden">
                    <button 
                        onClick={onClose}
                        className="w-full py-3.5 rounded-xl text-base font-medium text-gray-500 bg-gray-100 active:bg-gray-200"
                    >
                        取消
                    </button>
                </div>
            </div>
        </div>,
        document.body
    );
};
