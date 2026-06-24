'use client';

import { MONTH_LABELS, DAY_LABELS, getMonthDays, fmtCalDate } from './utils';

type DateRangeCalendarProps = {
  dateFrom: string;
  dateTo: string;
  hoverDate: string | null;
  calendarNav: { year: number; month: number };
  onDateClick: (date: string) => void;
  onHover: (date: string | null) => void;
  onNavPrev: () => void;
  onNavNext: () => void;
  onClear: () => void;
};

export default function DateRangeCalendar({
  dateFrom, dateTo, hoverDate, calendarNav,
  onDateClick, onHover, onNavPrev, onNavNext, onClear,
}: DateRangeCalendarProps) {
  return (
    <div className="border-t border-gray-100 p-3" onMouseLeave={() => onHover(null)}>
      <div className="flex items-center justify-between mb-3">
        <button
          onClick={(e) => { e.stopPropagation(); onNavPrev(); }}
          className="p-1 rounded-lg hover:bg-gray-100 cursor-pointer text-gray-500"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <div className="flex gap-10 text-xs font-semibold text-gray-700 select-none">
          {[0, 1].map((offset) => {
            const d = new Date(calendarNav.year, calendarNav.month + offset, 1);
            return <span key={offset}>{MONTH_LABELS[d.getMonth()]} {d.getFullYear()}</span>;
          })}
        </div>
        <button
          onClick={(e) => { e.stopPropagation(); onNavNext(); }}
          className="p-1 rounded-lg hover:bg-gray-100 cursor-pointer text-gray-500"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>

      <div className="flex gap-5">
        {[0, 1].map((offset) => {
          const d = new Date(calendarNav.year, calendarNav.month + offset, 1);
          const yr = d.getFullYear();
          const mo = d.getMonth();
          const days = getMonthDays(yr, mo);
          const today = new Date().toISOString().split('T')[0];
          const effTo = !dateTo && hoverDate ? hoverDate : dateTo;
          const rStart = dateFrom && effTo ? (dateFrom <= effTo ? dateFrom : effTo) : dateFrom;
          const rEnd = dateFrom && effTo ? (dateFrom <= effTo ? effTo : dateFrom) : effTo;

          return (
            <div key={offset}>
              <div className="grid grid-cols-7 mb-1">
                {DAY_LABELS.map((dl) => (
                  <div key={dl} className="w-8 h-6 flex items-center justify-center text-xs text-gray-400 font-medium select-none">{dl}</div>
                ))}
              </div>
              <div className="grid grid-cols-7">
                {days.map((date, i) => {
                  if (!date) return <div key={i} className="w-8 h-8" />;
                  const isStart = date === dateFrom;
                  const isEnd = !!dateTo && date === dateTo;
                  const inRange = !!(rStart && rEnd && date > rStart && date < rEnd);
                  const isToday = date === today;
                  let cls = 'w-8 h-8 flex items-center justify-center text-xs select-none transition-colors cursor-pointer ';
                  if (isStart || isEnd) cls += 'bg-blue-600 text-white rounded-full font-semibold';
                  else if (inRange) cls += 'bg-blue-100 text-blue-800 hover:bg-blue-200';
                  else if (isToday) cls += 'font-bold text-blue-500 hover:bg-gray-100 rounded-full';
                  else cls += 'text-gray-700 hover:bg-gray-100 rounded-full';
                  return (
                    <div
                      key={date}
                      className={cls}
                      onClick={(e) => { e.stopPropagation(); onDateClick(date); }}
                      onMouseEnter={() => !dateTo && onHover(date)}
                    >
                      {new Date(date + 'T00:00:00').getDate()}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {(dateFrom || dateTo) && (
        <div className="mt-2 pt-2 border-t border-gray-100 flex items-center justify-between">
          <span className="text-xs text-gray-400">
            {dateFrom && dateTo ? `${fmtCalDate(dateFrom)} – ${fmtCalDate(dateTo)}` : dateFrom ? `From ${fmtCalDate(dateFrom)}` : ''}
          </span>
          <button
            onClick={(e) => { e.stopPropagation(); onClear(); }}
            className="text-xs text-gray-400 hover:text-red-500 cursor-pointer"
          >
            Clear dates
          </button>
        </div>
      )}
    </div>
  );
}
