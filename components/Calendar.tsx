
import React, { useState, useMemo } from 'react';
import { 
  format, 
  endOfMonth, 
  endOfWeek, 
  eachDayOfInterval, 
  isSameMonth, 
  addMonths, 
  isToday,
  addDays,
  getYear,
  getMonth
} from 'date-fns';
import startOfMonth from 'date-fns/startOfMonth';
import startOfWeek from 'date-fns/startOfWeek';
import zhCN from 'date-fns/locale/zh-CN';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useTodoStore } from '../store/useTodoStore';
import { Todo } from '../types';
import { Solar } from 'lunar-javascript';

// Helper to parse YYYY-MM-DD to local Date object
const parseLocalDate = (dateStr: string) => {
  const [year, month, day] = dateStr.split('-').map(Number);
  return new Date(year, month - 1, day);
};

// Helper to get Lunar Date Display String
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
             // or just simplify names
             const map: Record<string, string> = {
                 '元旦': '元旦', '劳动节': '劳动', '国庆节': '国庆', 
                 '妇女节': '妇女', '儿童节': '儿童', '建军节': '建军',
                 '教师节': '教师'
             };
             // Only show mapped/major solar festivals to keep UI clean, or show truncated
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
        
        // If it's the first day of the month, show month name (e.g., 正月, 二月)
        if (day === 1) {
            return { text: `${month}月`, isJieQi: false, isFestival: false };
        }

        return { text: lunar.getDayInChinese(), isJieQi: false, isFestival: false };
    } catch (e) {
        return { text: '', isJieQi: false, isFestival: false };
    }
};

export const Calendar: React.FC = () => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const { selectedDate, setSelectedDate, todos } = useTodoStore();

  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(monthStart);
  const startDate = startOfWeek(monthStart, { locale: zhCN });
  const endDate = endOfWeek(monthEnd, { locale: zhCN });

  const days = eachDayOfInterval({ start: startDate, end: endDate });

  // Use addMonths(date, -1) instead of subMonths to minimize imports/errors
  const prevMonth = () => setCurrentDate(addMonths(currentDate, -1));
  const nextMonth = () => setCurrentDate(addMonths(currentDate, 1));

  const weekDays = ['日', '一', '二', '三', '四', '五', '六'];

  // --- Date Projection Logic for Recurrence ---
  // Calculates all dates (real + virtual) that have tasks in the current view
  const { todoDates, completedDates } = useMemo(() => {
      const activeDates = new Set<string>();
      const completedDatesSet = new Set<string>();
      const calendarStartStr = format(startDate, 'yyyy-MM-dd');
      const calendarEndStr = format(endDate, 'yyyy-MM-dd');

      // 1. Process Real Todos
      // Map for blocking logic: key = "YYYY-MM-DD|Title" -> Value: { isDeleted: boolean }
      const realTaskMap = new Map<string, { isDeleted: boolean }>();
      
      todos.forEach(t => {
          realTaskMap.set(`${t.date}|${t.title}`, { isDeleted: !!t.deletedAt });
          
          if (t.deletedAt) return; // Don't show dots for deleted tasks

          if (t.date >= calendarStartStr && t.date <= calendarEndStr) {
              if (t.completed) {
                  completedDatesSet.add(t.date);
              } else {
                  activeDates.add(t.date);
              }
          }
      });

      // 2. Project Virtual Recurring Todos
      // Include deleted recurring tasks as potential sources
      const activeRecurringTasks = todos.filter(t => 
        t.repeat
      );
      
      activeRecurringTasks.forEach(source => {
          let pointerDate = parseLocalDate(source.date);
          let safety = 0;
          
          while (safety < 1000) {
               // Advance date
               if (source.repeat?.type === 'daily') {
                  pointerDate = addDays(pointerDate, source.repeat.interval);
               } else if (source.repeat?.type === 'monthly') {
                  pointerDate = addMonths(pointerDate, 1);
               } else {
                   break;
               }
               safety++;

               const pointerDateStr = format(pointerDate, 'yyyy-MM-dd');

               // Check blockage
               const collision = realTaskMap.get(`${pointerDateStr}|${source.title}`);
               if (collision) {
                   // Stop projecting at ANY collision (Active or Deleted)
                   break;
               }

               // Stop if past view
               if (pointerDateStr > calendarEndStr) break;

               // If inside view, mark as active (virtual tasks are always active)
               if (pointerDateStr >= calendarStartStr) {
                   activeDates.add(pointerDateStr);
               }
          }
      });
      
      return {
          todoDates: activeDates,
          completedDates: completedDatesSet
      };

  }, [todos, startDate, endDate]);


  // Check if a day has todos (Real or Virtual)
  const hasTodos = (date: Date) => {
    const dateStr = format(date, 'yyyy-MM-dd');
    return todoDates.has(dateStr);
  };
  
  // Check if a day has completed todos only
  const hasCompletedTodosOnly = (date: Date) => {
    const dateStr = format(date, 'yyyy-MM-dd');
    return !todoDates.has(dateStr) && completedDates.has(dateStr);
  };

  // Generate Year Options: 1900 - 2099
  const years = Array.from({ length: 200 }, (_, i) => 1900 + i);
  const months = Array.from({ length: 12 }, (_, i) => i);

  const handleYearChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newDate = new Date(currentDate);
    newDate.setFullYear(parseInt(e.target.value));
    setCurrentDate(newDate);
  };

  const handleMonthChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newDate = new Date(currentDate);
    newDate.setMonth(parseInt(e.target.value));
    setCurrentDate(newDate);
  };

  return (
    <div className="flex flex-col h-full bg-white">
      {/* Calendar Header */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-gray-100 shrink-0 h-12">
        <div className="flex items-center gap-2 text-gray-800">
            <div className="flex gap-1">
              <select 
                value={getYear(currentDate)} 
                onChange={handleYearChange}
                className="bg-transparent font-bold text-base focus:outline-none cursor-pointer hover:bg-gray-50 rounded px-1 custom-select-year"
              >
                {years.map(year => (
                  <option key={year} value={year}>{year}年</option>
                ))}
              </select>
              <select 
                value={getMonth(currentDate)} 
                onChange={handleMonthChange}
                className="bg-transparent font-bold text-base focus:outline-none cursor-pointer hover:bg-gray-50 rounded px-1"
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
            className="p-1 hover:bg-gray-100 rounded text-gray-500 transition-colors"
          >
            <ChevronLeft size={18} />
          </button>
          <button 
            onClick={nextMonth}
            className="p-1 hover:bg-gray-100 rounded text-gray-500 transition-colors"
          >
            <ChevronRight size={18} />
          </button>
        </div>
      </div>

      {/* Weekday Header */}
      <div className="grid grid-cols-7 border-b border-gray-100 shrink-0 mb-1">
        {weekDays.map(day => (
          <div key={day} className="text-center text-xs font-medium text-gray-400 py-1.5">
            {day}
          </div>
        ))}
      </div>

      {/* Days Grid */}
      <div className="flex-1 px-2 pb-2 overflow-y-auto custom-scrollbar">
        {/* Adjusted Grid Gaps: Tight gap-y-0.5 on mobile, gap-1 on desktop */}
        <div className="grid grid-cols-7 gap-x-1 gap-y-0.5 md:gap-1 auto-rows-fr">
            {days.map((day, idx) => {
            const dateStr = format(day, 'yyyy-MM-dd');
            const isSelected = selectedDate === dateStr;
            const isCurrentMonth = isSameMonth(day, monthStart);
            const hasActiveTasks = hasTodos(day);
            const hasCompleted = hasCompletedTodosOnly(day);
            const isDayToday = isToday(day);
            const lunarInfo = getLunarDisplay(day);

            return (
                <button
                key={day.toISOString()}
                onClick={() => setSelectedDate(dateStr)}
                className={`
                    relative flex flex-col items-center justify-start py-0.5 md:py-1 rounded-lg transition-all duration-200 w-full
                    min-h-[38px] md:min-h-0 md:aspect-square md:justify-center
                    ${!isCurrentMonth ? 'text-gray-300 opacity-50' : 'text-gray-700'}
                    ${isSelected ? 'bg-primary-600 text-white shadow-md' : 'hover:bg-gray-50'}
                    ${isDayToday && !isSelected ? 'text-primary-600 font-bold bg-primary-50' : ''}
                `}
                >
                {/* Date Number: Larger on Desktop (md:text-base) */}
                <span className={`text-sm md:text-base leading-none mb-0.5 ${isSelected || isDayToday ? 'font-semibold' : ''}`}>
                    {format(day, 'd')}
                </span>

                {/* Lunar / Jieqi / Festival Display */}
                <span className={`text-[9px] md:text-[11px] scale-90 md:scale-100 leading-none mb-1 transform origin-center ${
                    isSelected ? 'text-primary-100' : 
                    (lunarInfo.isJieQi || lunarInfo.isFestival) ? 'text-primary-600 font-medium' : 
                    'text-gray-400'
                }`}>
                    {lunarInfo.text}
                </span>
                
                <div className="flex gap-0.5 h-1">
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
      <div className="py-2 px-3 border-t border-gray-100 flex items-center justify-center gap-4 text-xs text-gray-400 shrink-0">
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
