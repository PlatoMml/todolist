
import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { X, ChevronDown, Folder, Check, Tag as TagIcon, Plus, Repeat, Minus, Calendar as CalendarIcon, ChevronLeft, ChevronRight } from 'lucide-react';
import { Priority, Category, Todo, Tag, RepeatConfig } from '../types';
import { useTodoStore } from '../store/useTodoStore';
import { Button } from './Button';
import { getDate, setDate as setDateFns, format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, eachDayOfInterval, isSameMonth, isSameDay, addMonths, subMonths, isToday } from 'date-fns';
import zhCN from 'date-fns/locale/zh-CN';
import { Solar } from 'lunar-javascript';

interface AddTodoModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultDate?: string;
  defaultCategoryId?: string;
  todoToEdit?: Todo; // Optional: if provided, we are in Edit mode
}

// Helper to get Lunar Date Display String (Copied from Calendar.tsx for consistency)
const getLunarDisplay = (date: Date): { text: string; isJieQi: boolean; isFestival: boolean } => {
    try {
        const solar = Solar.fromYmd(date.getFullYear(), date.getMonth() + 1, date.getDate());
        const lunar = solar.getLunar();
        
        // 1. Check for Lunar Festivals (Highest Priority) - e.g. 春节, 中秋, 除夕
        const lunarFestivals = lunar.getFestivals();
        if (lunarFestivals && lunarFestivals.length > 0) {
            let name = lunarFestivals[0];
            // Simplify common names for compact display
            const map: Record<string, string> = {
                '春节': '春节', '元宵节': '元宵', '端午节': '端午', '中秋节': '中秋', 
                '重阳节': '重阳', '腊八节': '腊八', '除夕': '除夕', '小年': '小年',
                '七夕节': '七夕'
            };
            return { 
                text: map[name] || name.replace('节', ''), 
                isJieQi: false, 
                isFestival: true 
            };
        }

        // 2. Check for Solar Festivals - e.g. 元旦, 国庆
        const solarFestivals = solar.getFestivals();
        if (solarFestivals && solarFestivals.length > 0) {
             let name = solarFestivals[0];
             // Filter generally recognized holidays to avoid clutter
             const map: Record<string, string> = {
                 '元旦': '元旦', '劳动节': '劳动', '国庆节': '国庆', 
                 '妇女节': '妇女', '儿童节': '儿童', '建军节': '建军',
                 '教师节': '教师'
             };
             if (map[name] || name.length <= 3) {
                 return { 
                    text: map[name] || name, 
                    isJieQi: false, 
                    isFestival: true 
                 };
             }
        }

        // 3. Check for Solar Term (JieQi)
        const jieqi = lunar.getJieQi();
        if (jieqi) {
            return { text: jieqi, isJieQi: true, isFestival: false };
        }

        // 4. Check for Lunar Day
        const day = lunar.getDay();
        const month = lunar.getMonthInChinese();
        
        if (day === 1) {
            return { text: `${month}月`, isJieQi: false, isFestival: false };
        }

        return { text: lunar.getDayInChinese(), isJieQi: false, isFestival: false };
    } catch (e) {
        return { text: '', isJieQi: false, isFestival: false };
    }
};

// --- Internal Stepper Component for Mobile Friendly Input ---
interface StepperProps {
    value: number | '';
    onChange: (val: number | '') => void;
    min?: number;
    max?: number;
    suffix?: string;
    prefix?: string;
}

const StepperInput: React.FC<StepperProps> = ({ value, onChange, min = 1, max = 999, suffix, prefix }) => {
    const handleDecrement = (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        const current = typeof value === 'number' ? value : min;
        if (current > min) {
            onChange(current - 1);
        }
    };

    const handleIncrement = (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        const current = typeof value === 'number' ? value : min;
        if (current < max) {
            onChange(current + 1);
        }
    };

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const val = e.target.value;
        if (val === '') {
            onChange('');
            return;
        }
        // Only allow integers
        if (/^\d+$/.test(val)) {
            onChange(parseInt(val, 10));
        }
    };

    const handleBlur = () => {
        if (value === '' || (typeof value === 'number' && value < min)) {
            onChange(min);
        } else if (typeof value === 'number' && value > max) {
            onChange(max);
        }
    };

    return (
        <div className="flex items-center gap-3 select-none">
             {prefix && <span className="text-sm font-medium text-gray-600">{prefix}</span>}
             <div 
                className="flex items-center border border-gray-200 rounded-lg bg-white h-11 w-40 shadow-sm overflow-hidden"
                onClick={(e) => e.stopPropagation()}
             >
                <button
                    type="button"
                    onClick={handleDecrement}
                    disabled={typeof value === 'number' && value <= min}
                    className="w-12 h-full flex items-center justify-center text-gray-500 hover:text-primary-600 hover:bg-gray-50 active:bg-gray-100 transition-colors disabled:opacity-30 disabled:hover:bg-transparent border-r border-gray-100"
                >
                    <Minus size={18} />
                </button>
                <input
                    type="tel" // Triggers numeric keypad on mobile
                    inputMode="numeric"
                    pattern="[0-9]*"
                    value={value}
                    onChange={handleInputChange}
                    onBlur={handleBlur}
                    className="flex-1 w-0 h-full text-center bg-transparent border-none focus:ring-0 text-lg font-semibold text-gray-900 px-0"
                />
                <button
                    type="button"
                    onClick={handleIncrement}
                    disabled={typeof value === 'number' && value >= max}
                    className="w-12 h-full flex items-center justify-center text-gray-500 hover:text-primary-600 hover:bg-gray-50 active:bg-gray-100 transition-colors disabled:opacity-30 disabled:hover:bg-transparent border-l border-gray-100"
                >
                    <Plus size={18} />
                </button>
             </div>
             {suffix && <span className="text-sm font-medium text-gray-600">{suffix}</span>}
        </div>
    );
};

// --- Custom Mini Calendar Component ---
interface MiniCalendarProps {
    value: string;
    onChange: (dateStr: string) => void;
    onClose: () => void;
}

const MiniCalendar: React.FC<MiniCalendarProps> = ({ value, onChange, onClose }) => {
    // Initialize view based on current value or today
    const [viewDate, setViewDate] = useState(() => {
        if (value) {
            const [y, m, d] = value.split('-').map(Number);
            return new Date(y, m - 1, d);
        }
        return new Date();
    });

    const monthStart = startOfMonth(viewDate);
    const monthEnd = endOfMonth(monthStart);
    const startDate = startOfWeek(monthStart, { locale: zhCN });
    const endDate = endOfWeek(monthEnd, { locale: zhCN });
    const days = eachDayOfInterval({ start: startDate, end: endDate });

    const prevMonth = () => setViewDate(subMonths(viewDate, 1));
    const nextMonth = () => setViewDate(addMonths(viewDate, 1));

    const handleWheel = (e: React.WheelEvent) => {
        e.stopPropagation(); 
        if (e.deltaY < 0) prevMonth();
        if (e.deltaY > 0) nextMonth();
    };

    // Touch handling for swipe
    const touchStartX = useRef<number | null>(null);
    const handleTouchStart = (e: React.TouchEvent) => {
        touchStartX.current = e.touches[0].clientX;
    };
    const handleTouchEnd = (e: React.TouchEvent) => {
        if (touchStartX.current === null) return;
        const touchEndX = e.changedTouches[0].clientX;
        const diff = touchStartX.current - touchEndX;

        if (Math.abs(diff) > 50) { // Threshold for swipe
            if (diff > 0) nextMonth(); // Swipe Left -> Next
            else prevMonth(); // Swipe Right -> Prev
        }
        touchStartX.current = null;
    };

    const handleDayClick = (day: Date) => {
        onChange(format(day, 'yyyy-MM-dd'));
        onClose();
    };

    const handleToday = () => {
        const today = new Date();
        onChange(format(today, 'yyyy-MM-dd'));
        onClose();
    };
    
    const handleClear = () => {
        handleToday();
    };

    const weekDays = ['日', '一', '二', '三', '四', '五', '六'];

    return (
        <div 
            className="p-3 w-[320px] select-none"
            onWheel={handleWheel}
            onTouchStart={handleTouchStart}
            onTouchEnd={handleTouchEnd}
        >
            {/* Header */}
            <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-bold text-gray-800 pl-1">
                    {format(viewDate, 'yyyy年MM月')}
                </span>
                <div className="flex gap-1">
                    <button type="button" onClick={prevMonth} className="p-1 hover:bg-gray-100 rounded text-gray-500">
                        <ChevronLeft size={16} />
                    </button>
                    <button type="button" onClick={nextMonth} className="p-1 hover:bg-gray-100 rounded text-gray-500">
                        <ChevronRight size={16} />
                    </button>
                </div>
            </div>

            {/* Weekdays */}
            <div className="grid grid-cols-7 mb-1 text-center">
                {weekDays.map(d => (
                    <div key={d} className="text-[10px] text-gray-400 font-medium">
                        {d}
                    </div>
                ))}
            </div>

            {/* Days */}
            <div className="grid grid-cols-7 gap-1">
                {days.map((day) => {
                    const dateStr = format(day, 'yyyy-MM-dd');
                    const isSelected = value === dateStr;
                    const isCurrentMonth = isSameMonth(day, monthStart);
                    const isDayToday = isToday(day);
                    const lunarInfo = getLunarDisplay(day);

                    return (
                        <button
                            key={day.toISOString()}
                            type="button"
                            onClick={() => handleDayClick(day)}
                            className={`
                                h-10 w-full rounded-lg flex flex-col items-center justify-center transition-all mx-auto aspect-square
                                ${!isCurrentMonth ? 'text-gray-300 opacity-50' : 'text-gray-700'}
                                ${isSelected 
                                    ? 'bg-primary-600 text-white shadow-md' 
                                    : 'hover:bg-gray-100'}
                                ${isDayToday && !isSelected ? 'text-primary-600 font-bold bg-primary-50' : ''}
                            `}
                        >
                            <span className={`text-sm leading-none mb-0.5 ${isSelected ? 'font-semibold' : ''}`}>
                                {format(day, 'd')}
                            </span>
                            <span className={`text-[9px] scale-90 leading-none ${
                                isSelected ? 'text-primary-100' : 
                                (lunarInfo.isJieQi || lunarInfo.isFestival) ? 'text-primary-600 font-medium' : 
                                'text-gray-400'
                            }`}>
                                {lunarInfo.text}
                            </span>
                        </button>
                    );
                })}
            </div>

            {/* Footer Actions */}
            <div className="flex items-center justify-between mt-3 pt-2 border-t border-gray-100">
                <button 
                    type="button"
                    onClick={handleClear}
                    className="text-xs text-gray-400 hover:text-gray-600 px-2 py-1 rounded hover:bg-gray-50"
                >
                    回到今天
                </button>
                <button 
                    type="button"
                    onClick={handleToday}
                    className="text-xs text-primary-600 font-medium px-2 py-1 rounded hover:bg-primary-50"
                >
                    今天
                </button>
            </div>
        </div>
    );
};


const getTodayDate = () => {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

// Helper to parse YYYY-MM-DD to local Date object
const parseLocalDate = (dateStr: string) => {
  const [year, month, day] = dateStr.split('-').map(Number);
  return new Date(year, month - 1, day);
};

export const AddTodoModal: React.FC<AddTodoModalProps> = ({ 
  isOpen, 
  onClose, 
  defaultDate, 
  defaultCategoryId, 
  todoToEdit 
}) => {
  const { addTodo, updateTodo, materializeVirtualTodo, categories, tags, addTag } = useTodoStore();
  
  // State
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState<Priority>(Priority.MEDIUM);
  const [categoryId, setCategoryId] = useState<string>('');
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  
  // Repeat State
  const [repeatType, setRepeatType] = useState<'none' | 'daily' | 'monthly'>('none');
  const [repeatInterval, setRepeatInterval] = useState<number | ''>(1);
  const [repeatMonthlyDay, setRepeatMonthlyDay] = useState<number | ''>(1);

  const [isRepeatDropdownOpen, setIsRepeatDropdownOpen] = useState(false);
  const repeatDropdownRef = useRef<HTMLDivElement>(null);

  // Tag State
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState('');
  const [isTagDropdownOpen, setIsTagDropdownOpen] = useState(false);

  // Custom Dropdown State
  const [isCategoryDropdownOpen, setIsCategoryDropdownOpen] = useState(false);
  const categoryDropdownRef = useRef<HTMLDivElement>(null);
  const tagContainerRef = useRef<HTMLDivElement>(null);

  // Custom Date Picker State
  const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);
  const datePickerRef = useRef<HTMLDivElement>(null);

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (categoryDropdownRef.current && !categoryDropdownRef.current.contains(event.target as Node)) {
        setIsCategoryDropdownOpen(false);
      }
      if (tagContainerRef.current && !tagContainerRef.current.contains(event.target as Node)) {
        setIsTagDropdownOpen(false);
      }
      if (repeatDropdownRef.current && !repeatDropdownRef.current.contains(event.target as Node)) {
          setIsRepeatDropdownOpen(false);
      }
      if (datePickerRef.current && !datePickerRef.current.contains(event.target as Node)) {
          setIsDatePickerOpen(false);
      }
    };

    if (isCategoryDropdownOpen || isTagDropdownOpen || isRepeatDropdownOpen || isDatePickerOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isCategoryDropdownOpen, isTagDropdownOpen, isRepeatDropdownOpen, isDatePickerOpen]);

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
        setSelectedTagIds(todoToEdit.tagIds || []);
        
        // Populate Repeat
        if (todoToEdit.repeat) {
            setRepeatType(todoToEdit.repeat.type);
            setRepeatInterval(todoToEdit.repeat.interval || 1);
        } else {
            setRepeatType('none');
            setRepeatInterval(1);
        }
        // Initialize Monthly day from existing date
        const d = parseLocalDate(todoToEdit.date);
        setRepeatMonthlyDay(getDate(d));

      } else {
        // Create Mode
        setTitle('');
        setDescription('');
        setPriority(Priority.MEDIUM);
        setCategoryId(defaultCategoryId || '');
        
        const initDate = defaultDate || getTodayDate();
        setDate(initDate);
        setTime('');
        setSelectedTagIds([]);
        setRepeatType('none');
        setRepeatInterval(1);
        
        // Initialize Monthly day from default date
        const d = parseLocalDate(initDate);
        setRepeatMonthlyDay(getDate(d));
      }
      setIsCategoryDropdownOpen(false);
      setIsTagDropdownOpen(false);
      setIsRepeatDropdownOpen(false);
      setIsDatePickerOpen(false);
      setTagInput('');
    }
  }, [isOpen, todoToEdit, defaultDate, defaultCategoryId]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    
    // Validate date (must not be empty)
    let finalDate = date || getTodayDate();

    // Special Handling for Monthly Repeat Day Change
    if (repeatType === 'monthly' && typeof repeatMonthlyDay === 'number') {
        const currentD = parseLocalDate(finalDate);
        if (getDate(currentD) !== repeatMonthlyDay) {
            const newDateObj = setDateFns(currentD, repeatMonthlyDay);
            finalDate = format(newDateObj, 'yyyy-MM-dd');
        }
    }

    // Construct Repeat Config
    let repeatConfig: RepeatConfig | undefined = undefined;
    if (repeatType !== 'none') {
        repeatConfig = {
            type: repeatType,
            interval: repeatType === 'daily' ? (Number(repeatInterval) || 1) : 1
        };
    }

    const todoData = {
        title,
        description,
        priority,
        date: finalDate,
        time: time || undefined,
        categoryId: categoryId || undefined,
        tagIds: selectedTagIds,
        repeat: repeatConfig,
    };

    if (todoToEdit) {
        if (todoToEdit.isVirtual) {
            if (todoToEdit.id.startsWith('virtual-')) {
                const sourceId = todoToEdit.id.substring(8, 8 + 36); 
                materializeVirtualTodo(sourceId, todoToEdit.date, todoData);
            }
        } else {
            updateTodo(todoToEdit.id, todoData);
        }
    } else {
      addTodo(todoData);
    }

    onClose();
  };

  const handleTagInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      setTagInput(e.target.value);
      setIsTagDropdownOpen(true);
  };

  const handleAddTag = (tag: Tag) => {
      if (!selectedTagIds.includes(tag.id)) {
          setSelectedTagIds([...selectedTagIds, tag.id]);
      }
      setTagInput('');
      setIsTagDropdownOpen(false);
  };

  const handleCreateTag = () => {
      if (!tagInput.trim()) return;
      const newTag = addTag(tagInput.trim());
      handleAddTag(newTag);
  };

  const handleRemoveTag = (idToRemove: string) => {
      setSelectedTagIds(selectedTagIds.filter(id => id !== idToRemove));
  };

  const filteredTags = tags.filter(t => 
      t.name.toLowerCase().includes(tagInput.toLowerCase()) && 
      !selectedTagIds.includes(t.id)
  );

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

  const displayMonthDay = typeof repeatMonthlyDay === 'number' ? repeatMonthlyDay : (date ? getDate(parseLocalDate(date)) : new Date().getDate());

  const handleDateChange = (newDateStr: string) => {
      setDate(newDateStr);
      if (newDateStr) {
          const d = parseLocalDate(newDateStr);
          setRepeatMonthlyDay(getDate(d));
      }
  };

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in duration-200">
      <div 
        className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200"
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
            {/* Custom Date Picker Trigger */}
            <div className="relative" ref={datePickerRef}>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">
                日期
              </label>
              <div
                onClick={() => setIsDatePickerOpen(!isDatePickerOpen)}
                className={`
                    w-full px-3 py-2 bg-white border rounded-lg flex items-center gap-2 cursor-pointer transition-all text-sm
                    ${isDatePickerOpen ? 'border-primary-500 ring-2 ring-primary-500/20' : 'border-gray-200 hover:border-gray-300'}
                `}
              >
                  <CalendarIcon size={16} className="text-gray-400" />
                  <span className={date ? 'text-gray-900' : 'text-gray-500'}>
                      {date || '选择日期'}
                  </span>
              </div>
              
              {isDatePickerOpen && (
                  <div className="absolute top-full left-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-xl z-50 animate-in fade-in zoom-in-95 duration-100 overflow-hidden">
                      <MiniCalendar 
                        value={date} 
                        onChange={handleDateChange} 
                        onClose={() => setIsDatePickerOpen(false)}
                      />
                  </div>
              )}
            </div>

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

          <div className="relative" ref={repeatDropdownRef}>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">
                重复待办
              </label>
              <div 
                onClick={() => setIsRepeatDropdownOpen(!isRepeatDropdownOpen)}
                className={`
                    w-full px-3 py-2 bg-white border rounded-lg flex items-center justify-between cursor-pointer transition-all
                    ${isRepeatDropdownOpen ? 'border-primary-500 ring-2 ring-primary-500/20' : 'border-gray-200 hover:border-gray-300'}
                `}
              >
                 <div className="flex items-center gap-2 text-sm text-gray-700">
                    <Repeat size={16} className="text-gray-400" />
                    <span className={repeatType !== 'none' ? 'text-gray-900' : 'text-gray-500'}>
                        {repeatType === 'none' && '不重复'}
                        {repeatType === 'daily' && `每 ${repeatInterval} 天`}
                        {repeatType === 'monthly' && `每月 ${displayMonthDay} 日`}
                    </span>
                 </div>
                 <ChevronDown size={16} className={`text-gray-400 transition-transform ${isRepeatDropdownOpen ? 'rotate-180' : ''}`} />
              </div>

              {isRepeatDropdownOpen && (
                 <div className="absolute top-full left-0 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-xl z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-100 p-2 space-y-1">
                     
                     <button
                        type="button"
                        onClick={() => { setRepeatType('none'); setIsRepeatDropdownOpen(false); }}
                        className={`w-full text-left px-3 py-2.5 rounded text-sm transition-colors ${repeatType === 'none' ? 'bg-primary-50 text-primary-700 font-medium' : 'text-gray-700 hover:bg-gray-50'}`}
                     >
                         不重复
                     </button>
                     
                     <div 
                        onClick={() => {
                            if (repeatType === 'daily') {
                                setIsRepeatDropdownOpen(false);
                            } else {
                                setRepeatType('daily');
                            }
                        }}
                        className={`rounded-lg px-3 py-2 cursor-pointer transition-colors ${repeatType === 'daily' ? 'bg-primary-50 border border-primary-100' : 'hover:bg-gray-50 border border-transparent'}`}
                     >
                         <div className="flex items-center justify-between">
                            <span className={`text-sm ${repeatType === 'daily' ? 'text-primary-700 font-medium' : 'text-gray-700'}`}>
                                每日 / 每 N 天
                            </span>
                         </div>
                         {repeatType === 'daily' && (
                             <div className="mt-2 pl-1">
                                <StepperInput 
                                    prefix="每"
                                    suffix="天"
                                    value={repeatInterval}
                                    onChange={setRepeatInterval}
                                    min={1}
                                    max={365}
                                />
                             </div>
                         )}
                     </div>

                     <div 
                        onClick={() => {
                             if (repeatType === 'monthly') {
                                setIsRepeatDropdownOpen(false);
                            } else {
                                setRepeatType('monthly');
                            }
                        }}
                        className={`rounded-lg px-3 py-2 cursor-pointer transition-colors ${repeatType === 'monthly' ? 'bg-primary-50 border border-primary-100' : 'hover:bg-gray-50 border border-transparent'}`}
                     >
                         <div className="flex items-center justify-between">
                            <span className={`text-sm ${repeatType === 'monthly' ? 'text-primary-700 font-medium' : 'text-gray-700'}`}>
                                每月重复
                            </span>
                         </div>
                         {repeatType === 'monthly' && (
                             <div className="mt-2 pl-1">
                                <StepperInput 
                                    prefix="每月"
                                    suffix="日"
                                    value={repeatMonthlyDay}
                                    onChange={setRepeatMonthlyDay}
                                    min={1}
                                    max={31}
                                />
                             </div>
                         )}
                     </div>
                 </div>
              )}
          </div>

          <div className="relative" ref={categoryDropdownRef}>
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
                      <div 
                          onClick={() => { setCategoryId(''); setIsCategoryDropdownOpen(false); }}
                          className="flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 cursor-pointer"
                      >
                          <div className="w-4 flex justify-center">
                             {!categoryId && <Check size={14} className="text-primary-600" />}
                          </div>
                          <span>无分类</span>
                      </div>
                      
                      <div className="h-px bg-gray-100 my-1 mx-2"></div>

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
          
          <div className="relative" ref={tagContainerRef}>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">
                标签
              </label>
              
              <div className="flex flex-wrap gap-2 mb-2">
                  {selectedTagIds.map(tagId => {
                      const tag = tags.find(t => t.id === tagId);
                      if (!tag) return null;
                      return (
                          <span 
                            key={tag.id} 
                            className="inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium text-white shadow-sm"
                            style={{ backgroundColor: tag.color }}
                          >
                              {tag.name}
                              <button 
                                type="button" 
                                onClick={() => handleRemoveTag(tag.id)}
                                className="hover:bg-black/20 rounded-full p-0.5"
                              >
                                  <X size={10} />
                              </button>
                          </span>
                      );
                  })}
              </div>

              <div className="relative">
                  <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                      <TagIcon size={14} />
                  </div>
                  <input
                      type="text"
                      value={tagInput}
                      onChange={handleTagInputChange}
                      onFocus={() => setIsTagDropdownOpen(true)}
                      onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                              e.preventDefault();
                              handleCreateTag();
                          }
                      }}
                      placeholder="添加标签 (输入并回车创建)"
                      className="w-full pl-9 pr-3 py-2 bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all text-sm"
                  />
                  
                  {isTagDropdownOpen && tagInput && (
                      <div className="absolute top-full left-0 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-xl z-50 max-h-48 overflow-y-auto custom-scrollbar animate-in fade-in zoom-in-95 duration-100">
                          {filteredTags.length > 0 && (
                             <div className="p-1">
                                {filteredTags.map(tag => (
                                    <button
                                        key={tag.id}
                                        type="button"
                                        onClick={() => handleAddTag(tag)}
                                        className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2 rounded-md"
                                    >
                                        <span className="w-2 h-2 rounded-full" style={{ backgroundColor: tag.color }}></span>
                                        {tag.name}
                                    </button>
                                ))}
                                <div className="h-px bg-gray-100 my-1 mx-2"></div>
                             </div>
                          )}
                          
                          <button
                            type="button"
                            onClick={handleCreateTag}
                            className="w-full text-left px-3 py-2 text-sm text-primary-600 hover:bg-primary-50 flex items-center gap-2 font-medium"
                          >
                             <Plus size={14} />
                             创建标签 "{tagInput}"
                          </button>
                      </div>
                  )}
              </div>
          </div>

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
