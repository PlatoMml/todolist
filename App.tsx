import React, { useState } from 'react';
import { Calendar } from './components/Calendar';
import { TodoList } from './components/TodoList';
import { Sidebar } from './components/Sidebar';
import { CheckSquare, Menu } from 'lucide-react';

const App: React.FC = () => {
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  return (
    <div className="h-screen flex flex-col bg-white overflow-hidden">
      
      {/* Header */}
      <header className="shrink-0 h-14 bg-white border-b border-gray-200 px-4 flex items-center justify-between z-20 relative">
        <div className="flex items-center gap-3">
            <button 
                onClick={() => setIsMobileSidebarOpen(!isMobileSidebarOpen)}
                className="lg:hidden p-2 -ml-2 text-gray-500 hover:bg-gray-100 rounded-lg"
            >
                <Menu size={20} />
            </button>
            <div className="w-8 h-8 bg-primary-600 rounded-lg flex items-center justify-center text-white">
                <CheckSquare size={16} strokeWidth={3} />
            </div>
            <div>
                <h1 className="text-base font-bold text-gray-900 tracking-tight leading-none">待办事项</h1>
            </div>
        </div>
      </header>

      {/* Main Content Area - Responsive Layout */}
      <main className="flex-1 flex flex-col md:flex-row overflow-hidden">
        
        {/* Pane 1: Sidebar (Navigation) */}
        {/* Mobile: Fixed Drawer. Desktop (lg+): Relative Column */}
        <div className={`
            fixed inset-y-0 left-0 z-40 w-64 bg-gray-50 border-r border-gray-200 transform transition-transform duration-200 lg:relative lg:translate-x-0
            ${isMobileSidebarOpen ? 'translate-x-0' : '-translate-x-full'}
        `}>
            <Sidebar className="h-full" onCloseMobile={() => setIsMobileSidebarOpen(false)} />
        </div>

        {/* Mobile Overlay */}
        {isMobileSidebarOpen && (
            <div 
                className="fixed inset-0 bg-black/20 backdrop-blur-sm z-30 lg:hidden"
                onClick={() => setIsMobileSidebarOpen(false)}
            />
        )}

        {/* Pane 2: Calendar (Middle Column) */}
        {/* Mobile (<md): Stacked on top, AUTO height to fit content. Desktop (>=md): Side column. */}
        <div className="w-full md:w-[340px] xl:w-[380px] h-auto bg-white border-b md:border-b-0 md:border-r border-gray-200 flex flex-col flex-shrink-0 z-10 relative">
             <Calendar />
        </div>

        {/* Pane 3: Todo List (Main Content) */}
        <div className="flex-1 bg-white flex flex-col min-w-0 z-0 relative h-full overflow-hidden">
            <TodoList />
        </div>
      </main>
    </div>
  );
};

export default App;