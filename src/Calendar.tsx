import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "../convex/_generated/api";

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export function Calendar() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const currentYear = currentDate.getFullYear();
  const currentMonth = currentDate.getMonth();

  const unavailability = useQuery(api.availability.getUnavailabilityForMonth, {
    year: currentYear,
    month: currentMonth,
  }) || [];

  const currentUserUnavailability = useQuery(api.availability.getCurrentUserUnavailability, {
    year: currentYear,
    month: currentMonth,
  }) || [];

  const toggleUnavailability = useMutation(api.availability.toggleUnavailability);

  // Group unavailability by date
  const unavailabilityByDate = new Map<string, string[]>();
  unavailability.forEach(record => {
    if (!unavailabilityByDate.has(record.date)) {
      unavailabilityByDate.set(record.date, []);
    }
    unavailabilityByDate.get(record.date)!.push(record.userName);
  });

  // Create a set for current user's unavailable dates
  const currentUserUnavailableDates = new Set(currentUserUnavailability);

  // Get calendar days
  const firstDayOfMonth = new Date(currentYear, currentMonth, 1);
  const lastDayOfMonth = new Date(currentYear, currentMonth + 1, 0);
  const firstDayWeekday = firstDayOfMonth.getDay();
  const daysInMonth = lastDayOfMonth.getDate();

  const calendarDays = [];
  
  // Add empty cells for days before the first day of the month
  for (let i = 0; i < firstDayWeekday; i++) {
    calendarDays.push(null);
  }
  
  // Add days of the month
  for (let day = 1; day <= daysInMonth; day++) {
    calendarDays.push(day);
  }

  const handleDayClick = async (day: number) => {
    const date = new Date(currentYear, currentMonth, day);
    const dateString = date.toISOString().split('T')[0];
    await toggleUnavailability({ date: dateString });
  };

  const navigateMonth = (direction: 'prev' | 'next') => {
    setCurrentDate(prev => {
      const newDate = new Date(prev);
      if (direction === 'prev') {
        newDate.setMonth(prev.getMonth() - 1);
      } else {
        newDate.setMonth(prev.getMonth() + 1);
      }
      return newDate;
    });
  };

  const getUnavailableUsers = (day: number) => {
    const date = new Date(currentYear, currentMonth, day);
    const dateString = date.toISOString().split('T')[0];
    return unavailabilityByDate.get(dateString) || [];
  };

  const isCurrentUserUnavailable = (day: number) => {
    const date = new Date(currentYear, currentMonth, day);
    const dateString = date.toISOString().split('T')[0];
    return currentUserUnavailableDates.has(dateString);
  };

  const isToday = (day: number) => {
    const today = new Date();
    return today.getFullYear() === currentYear &&
           today.getMonth() === currentMonth &&
           today.getDate() === day;
  };

  return (
    <div className="w-full max-w-6xl mx-auto p-6">
      {/* Header */}
      <div className="mb-6 text-center">
        <h2 className="text-3xl font-bold text-gray-900 mb-2">Friends Availability Calendar</h2>
        <p className="text-gray-600">Click on days to mark yourself as unavailable. Everyone can see who's unavailable on each day.</p>
      </div>

      {/* Calendar navigation */}
      <div className="flex items-center justify-between mb-6">
        <button
          onClick={() => navigateMonth('prev')}
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        
        <h3 className="text-2xl font-semibold">
          {MONTHS[currentMonth]} {currentYear}
        </h3>
        
        <button
          onClick={() => navigateMonth('next')}
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>

      {/* Calendar grid */}
      <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
        {/* Day headers */}
        <div className="grid grid-cols-7 border-b bg-gray-50">
          {DAYS.map(day => (
            <div key={day} className="p-4 text-center text-sm font-medium text-gray-700">
              {day}
            </div>
          ))}
        </div>

        {/* Calendar days */}
        <div className="grid grid-cols-7">
          {calendarDays.map((day, index) => {
            const unavailableUsers = day ? getUnavailableUsers(day) : [];
            const isUserUnavailable = day ? isCurrentUserUnavailable(day) : false;
            
            return (
              <div key={index} className="min-h-[120px] border-r border-b last:border-r-0 relative">
                {day && (
                  <button
                    onClick={() => handleDayClick(day)}
                    className={`w-full h-full p-2 text-left transition-colors relative flex flex-col ${
                      isUserUnavailable
                        ? 'bg-red-50 hover:bg-red-100'
                        : 'hover:bg-gray-50'
                    }`}
                  >
                    <div className={`text-sm font-medium mb-2 ${
                      isToday(day) ? 'text-blue-600 font-bold' : 'text-gray-900'
                    }`}>
                      {day}
                      {isToday(day) && (
                        <div className="inline-block ml-1 w-2 h-2 bg-blue-500 rounded-full"></div>
                      )}
                    </div>
                    
                    {/* Unavailable users badges */}
                    <div className="flex-1 flex flex-col justify-end">
                      <div className="space-y-1">
                        {unavailableUsers.map((userName, userIndex) => (
                          <div
                            key={userIndex}
                            className="inline-block px-2 py-1 bg-red-100 text-red-800 text-xs rounded-full border border-red-200"
                          >
                            {userName}
                          </div>
                        ))}
                      </div>
                    </div>
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Legend and instructions */}
      <div className="mt-6 space-y-4">
        <div className="flex flex-wrap gap-6 text-sm">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-gray-50 border rounded"></div>
            <span>Available</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-red-50 border border-red-200 rounded"></div>
            <span>You're unavailable</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="px-2 py-1 bg-red-100 text-red-800 text-xs rounded-full border border-red-200">
              Name
            </div>
            <span>Someone unavailable</span>
          </div>
        </div>
        
        <div className="text-sm text-gray-600 bg-blue-50 p-4 rounded-lg">
          <p><strong>How to use:</strong></p>
          <ul className="mt-2 space-y-1 list-disc list-inside">
            <li>Click on any day to mark yourself as unavailable (your background will turn light red)</li>
            <li>Click again on the same day to mark yourself as available again</li>
            <li>Name badges show who else is unavailable on each day</li>
            <li>Everyone can see the same shared calendar</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
