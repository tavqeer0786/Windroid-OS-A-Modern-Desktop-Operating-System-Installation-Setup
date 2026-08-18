import React, { useState } from 'react';
import { Calendar as CalendarIcon, Plus, ChevronLeft, ChevronRight, Clock } from 'lucide-react';

interface CalendarAppProps {
  initialState?: {
    action?: string;
  };
}

export const CalendarApp: React.FC<CalendarAppProps> = ({ initialState }) => {
  const [events, setEvents] = useState([
    { id: '1', title: 'OS Kernel & Desktop UX Sync', time: '4:00 PM - 5:00 PM', location: 'Room 304' },
    { id: '2', title: 'System Agent Voice Benchmark', time: '6:30 PM - 7:15 PM', location: 'Lab 2B' }
  ]);
  const [showAddModal, setShowAddModal] = useState(initialState?.action === 'add_event');
  const [newEventTitle, setNewEventTitle] = useState('');
  const [newEventTime, setNewEventTime] = useState('5:30 PM');

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEventTitle.trim()) return;
    setEvents([...events, { id: `${Date.now()}`, title: newEventTitle, time: newEventTime, location: 'Virtual' }]);
    setNewEventTitle('');
    setShowAddModal(false);
  };

  return (
    <div className="h-full flex flex-col bg-white dark:bg-slate-950 text-slate-800 dark:text-slate-100 select-none">
      {/* Header */}
      <div className="h-12 px-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <CalendarIcon className="w-5 h-5 text-blue-600" />
          <span className="font-bold text-sm">August 2026</span>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold cursor-pointer flex items-center gap-1.5 shadow-xs"
        >
          <Plus className="w-4 h-4" /> Add Event
        </button>
      </div>

      {/* Main Grid */}
      <div className="flex-1 p-4 grid grid-cols-1 md:grid-cols-3 gap-4 overflow-y-auto">
        {/* Calendar Grid representation */}
        <div className="md:col-span-2 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 space-y-3">
          <div className="grid grid-cols-7 text-center font-bold text-xs text-slate-400">
            <span>SUN</span><span>MON</span><span>TUE</span><span>WED</span><span>THU</span><span>FRI</span><span>SAT</span>
          </div>
          <div className="grid grid-cols-7 gap-1 text-center font-mono text-xs">
            {Array.from({ length: 31 }).map((_, i) => {
              const day = i + 1;
              const isToday = day === 3; // August 3rd current date
              return (
                <div
                  key={day}
                  className={`py-2.5 rounded-xl font-medium ${
                    isToday
                      ? 'bg-blue-600 text-white font-bold shadow-md'
                      : 'hover:bg-slate-200/60 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300'
                  }`}
                >
                  {day}
                </div>
              );
            })}
          </div>
        </div>

        {/* Schedule List */}
        <div className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 space-y-3">
          <h4 className="font-bold text-xs uppercase tracking-wider text-slate-400">Schedule Today</h4>
          <div className="space-y-2">
            {events.map((ev) => (
              <div key={ev.id} className="p-3 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 space-y-1">
                <div className="font-semibold text-xs text-slate-800 dark:text-slate-100">{ev.title}</div>
                <div className="flex items-center gap-1.5 text-[11px] text-slate-500">
                  <Clock className="w-3 h-3 text-blue-500" />
                  <span>{ev.time}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Add Modal */}
      {showAddModal && (
        <div className="absolute inset-0 bg-transparent z-50 flex items-center justify-center p-4">
          <form onSubmit={handleAdd} className="bg-white/95 dark:bg-slate-900/95 p-5 rounded-2xl max-w-sm w-full space-y-3 shadow-2xl">
            <h3 className="font-bold text-sm">Add New Event</h3>
            <input
              type="text"
              placeholder="Event Title..."
              value={newEventTitle}
              onChange={(e) => setNewEventTitle(e.target.value)}
              className="w-full px-3 py-2 text-xs rounded-xl bg-slate-100 dark:bg-slate-800 border focus:ring-2 focus:ring-blue-500"
              autoFocus
            />
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-xs font-medium"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-3 py-1.5 rounded-xl bg-blue-600 text-white text-xs font-semibold"
              >
                Save
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
