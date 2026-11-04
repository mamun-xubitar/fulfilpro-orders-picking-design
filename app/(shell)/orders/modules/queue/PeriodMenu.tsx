'use client';

import type { OrdersPageBundle } from '../ordersPageContext';
import { PERIODS } from '../constants';
import { DAY_LABELS, fmtCalDate, getMonthDays, MONTH_LABELS } from '../utils';
import { Icon } from './icons';
import FilterChip, { MenuOption } from './FilterChip';

/** Period chip: presets plus a two-month custom range calendar. */
export default function PeriodMenu({ p }: { p: OrdersPageBundle }) {
  const { period, dateFrom, dateTo, hoverDate, calendarNav, periodDropdownRef } = p;
  const label = period === 'custom'
    ? dateFrom && dateTo ? `${fmtCalDate(dateFrom)} – ${fmtCalDate(dateTo)}` : dateFrom ? `From ${fmtCalDate(dateFrom)}` : 'Custom'
    : period === 'all' ? 'All time' : PERIODS.find((item) => item.value === period)?.label ?? 'All time';
  const shift = (delta: number) => p.setCalendarNav((prev) => { const d = new Date(prev.year, prev.month + delta, 1); return { year: d.getFullYear(), month: d.getMonth() }; });
  const today = new Date().toISOString().split('T')[0];
  const effTo = !dateTo && hoverDate ? hoverDate : dateTo;
  const rStart = dateFrom && effTo ? (dateFrom <= effTo ? dateFrom : effTo) : dateFrom;
  const rEnd = dateFrom && effTo ? (dateFrom <= effTo ? effTo : dateFrom) : effTo;

  return (
    <FilterChip label="Period" value={label} active={period !== 'all'} open={p.periodDropdownOpen} onToggle={() => p.setPeriodDropdownOpen((prev) => !prev)} dropdownRef={periodDropdownRef}>
      {PERIODS.map((item) => (
        <MenuOption key={item.value} selected={period === item.value} onClick={() => p.handlePeriodChange(item.value)}>{item.label}</MenuOption>
      ))}
      {period === 'custom' && (
        <div className="border-t border-orders-divider p-3" onMouseLeave={() => p.setHoverDate(null)}>
          <div className="mb-2 flex items-center justify-between">
            <button type="button" aria-label="Previous month" onClick={() => shift(-1)} className="rounded p-1 text-orders-text-muted hover:bg-orders-surface-muted cursor-pointer"><Icon name="chevronDown" className="h-3.5 w-3.5 rotate-90" /></button>
            <div className="flex gap-10 text-[11px] font-semibold text-orders-text-body select-none">
              {[0, 1].map((offset) => { const d = new Date(calendarNav.year, calendarNav.month + offset, 1); return <span key={offset}>{MONTH_LABELS[d.getMonth()]} {d.getFullYear()}</span>; })}
            </div>
            <button type="button" aria-label="Next month" onClick={() => shift(1)} className="rounded p-1 text-orders-text-muted hover:bg-orders-surface-muted cursor-pointer"><Icon name="chevronDown" className="h-3.5 w-3.5 -rotate-90" /></button>
          </div>
          <div className="flex gap-4">
            {[0, 1].map((offset) => {
              const d = new Date(calendarNav.year, calendarNav.month + offset, 1);
              return (
                <div key={offset}>
                  <div className="grid grid-cols-7">{DAY_LABELS.map((dl) => <div key={dl} className="flex h-5 w-7 items-center justify-center text-[10px] font-medium text-orders-text-subtle select-none">{dl}</div>)}</div>
                  <div className="grid grid-cols-7">
                    {getMonthDays(d.getFullYear(), d.getMonth()).map((date, i) => {
                      if (!date) return <div key={i} className="h-7 w-7" />;
                      const edge = date === dateFrom || (!!dateTo && date === dateTo);
                      const inRange = !!(rStart && rEnd && date > rStart && date < rEnd);
                      const tone = edge ? 'rounded-full bg-orders-primary font-semibold text-white' : inRange ? 'bg-orders-primary-soft text-orders-primary-ink' : date === today ? 'rounded-full font-bold text-orders-primary hover:bg-orders-surface-muted' : 'rounded-full text-orders-text-body hover:bg-orders-surface-muted';
                      return (
                        <button key={date} type="button" className={`flex h-7 w-7 items-center justify-center text-[11px] cursor-pointer ${tone}`} onClick={() => p.handleCalendarDateClick(date)} onMouseEnter={() => !dateTo && p.setHoverDate(date)}>
                          {new Date(`${date}T00:00:00`).getDate()}
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
          {(dateFrom || dateTo) && (
            <div className="mt-2 flex items-center justify-between border-t border-orders-divider pt-2">
              <span className="text-[10px] text-orders-text-subtle">{dateFrom && dateTo ? `${fmtCalDate(dateFrom)} – ${fmtCalDate(dateTo)}` : `From ${fmtCalDate(dateFrom)}`}</span>
              <button type="button" onClick={() => { p.setDateFrom(''); p.setDateTo(''); p.setPeriod('all'); }} className="text-[10px] text-orders-text-subtle hover:text-orders-danger cursor-pointer">Clear dates</button>
            </div>
          )}
        </div>
      )}
    </FilterChip>
  );
}
