import React, { useState } from 'react';
import { 
  format, 
  startOfMonth, 
  endOfMonth, 
  startOfWeek, 
  endOfWeek, 
  eachDayOfInterval, 
  isSameMonth, 
  addMonths, 
  subMonths,
  isToday,
  setMonth,
  setYear,
  getYear,
  getMonth
} from 'date-fns';
import { zhCN } from 'date-fns/locale';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useTodoStore } from '../store/useTodoStore';

export const Calendar: React.FC = () => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const { selectedDate, setSelectedDate, todos } = useTodoStore();

  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(monthStart);
  const startDate = startOfWeek(monthStart, { locale: zhCN });
  const endDate = endOfWeek(monthEnd, { locale: zhCN });

  const days = eachDayOfInterval({ start: startDate, end: endDate });

  const prevMonth = () => setCurrentDate(subMonths(currentDate, 1));
  const nextMonth = () => setCurrentDate(addMonths(currentDate, 1));

  const weekDays = ['日', '一', '二', '三', '四', '五', '六'];

  // Check if a day has todos
  const hasTodos = (date: Date) => {
    // FIX: Use local format instead of toISOString (which converts to UTC and causes off-by-one errors)
    const dateStr = format(date, 'yyyy-MM-dd');
    return todos.some(t => t.date === dateStr && !t.completed);
  };
  
  // Check if a day has completed todos only
  const hasCompletedTodosOnly = (date: Date) => {
    // FIX: Use local format instead of toISOString
    const dateStr = format(date, 'yyyy-MM-dd');
    const dayTodos = todos.filter(t => t.date === dateStr);
    return dayTodos.length > 0 && dayTodos.every(t => t.completed);
  };

  // Generate Year and Month Options
  const currentYear = getYear(currentDate);
  const years = Array.from({ length: 11 }, (_, i) => currentYear - 5 + i);
  const months = Array.from({ length: 12 }, (_, i) => i);

  const handleYearChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setCurrentDate(setYear(currentDate, parseInt(e.target.value)));
  };

  const handleMonthChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setCurrentDate(setMonth(currentDate, parseInt(e.target.value)));
  };

  return (
    <div className="flex flex-col h-full bg-white">
      {/* Calendar Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-100 shrink-0 h-16">
        <div className="flex items-center gap-2 text-gray-800">
            <div className="flex gap-1">
              <select 
                value={getYear(currentDate)} 
                onChange={handleYearChange}
                className="bg-transparent font-bold text-lg focus:outline-none cursor-pointer hover:bg-gray-50 rounded px-1"
              >
                {years.map(year => (
                  <option key={year} value={year}>{year}年</option>
                ))}
              </select>
              <select 
                value={getMonth(currentDate)} 
                onChange={handleMonthChange}
                className="bg-transparent font-bold text-lg focus:outline-none cursor-pointer hover:bg-gray-50 rounded px-1"
              >
                {months.map(month => (
                  <option key={month} value={month}>{month + 1}月</option>
                ))}
              </select>
            </div>
        </div>
        <div className="flex gap-1">
          <button 
            onClick={prevMonth}
            className="p-1.5 hover:bg-gray-100 rounded text-gray-500 transition-colors"
          >
            <ChevronLeft size={20} />
          </button>
          <button 
            onClick={nextMonth}
            className="p-1.5 hover:bg-gray-100 rounded text-gray-500 transition-colors"
          >
            <ChevronRight size={20} />
          </button>
        </div>
      </div>

      {/* Weekday Header */}
      <div className="grid grid-cols-7 border-b border-gray-100 shrink-0">
        {weekDays.map(day => (
          <div key={day} className="text-center text-xs font-medium text-gray-400 py-2">
            {day}
          </div>
        ))}
      </div>

      {/* Days Grid */}
      <div className="flex-1 p-2 overflow-y-auto custom-scrollbar">
        <div className="grid grid-cols-7 gap-1">
            {days.map((day, idx) => {
            const dateStr = format(day, 'yyyy-MM-dd');
            const isSelected = selectedDate === dateStr;
            const isCurrentMonth = isSameMonth(day, monthStart);
            const hasActiveTasks = hasTodos(day);
            const hasCompleted = !hasActiveTasks && hasCompletedTodosOnly(day);
            const isDayToday = isToday(day);

            return (
                <button
                key={day.toISOString()}
                onClick={() => setSelectedDate(dateStr)}
                className={`
                    relative flex flex-col items-center justify-center rounded-lg p-1 transition-all duration-200 aspect-square w-full
                    ${!isCurrentMonth ? 'text-gray-300 opacity-50' : 'text-gray-700'}
                    ${isSelected ? 'bg-primary-600 text-white shadow-md' : 'hover:bg-gray-50'}
                    ${isDayToday && !isSelected ? 'text-primary-600 font-bold bg-primary-50' : ''}
                `}
                >
                <span className={`text-sm ${isSelected || isDayToday ? 'font-semibold' : ''}`}>
                    {format(day, 'd')}
                </span>
                
                <div className="flex gap-0.5 mt-1 h-1">
                    {hasActiveTasks && (
                    <span className={`w-1 h-1 rounded-full ${isSelected ? 'bg-white' : 'bg-primary-500'}`} />
                    )}
                    {hasCompleted && (
                    <span className={`w-1 h-1 rounded-full ${isSelected ? 'bg-white/60' : 'bg-green-400'}`} />
                    )}
                </div>
                </button>
            );
            })}
        </div>
      </div>
      
      {/* Legend */}
      <div className="p-3 border-t border-gray-100 flex items-center justify-center gap-4 text-xs text-gray-400 shrink-0">
        <div className="flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-primary-500"></span>
            <span>待办</span>
        </div>
        <div className="flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-green-400"></span>
            <span>已完成</span>
        </div>
      </div>
    </div>
  );
};