import React, { useState, useEffect } from 'react';
import { storageService } from '../services/storageService';
import { consentService } from '../services/consentService';
import type { Schedule } from '../types';
import { Weekday } from '../types';

// Simple tooltip component for first-time guidance
const Tooltip: React.FC<{ children: React.ReactNode; content: string; show: boolean }> = ({ 
  children, 
  content, 
  show 
}) => (
  <div className="relative">
    {children}
    {show && (
      <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 bg-gray-900 dark:bg-gray-700 text-white text-sm rounded-lg shadow-lg whitespace-nowrap z-10">
        {content}
        <div className="absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-900 dark:border-t-gray-700"></div>
      </div>
    )}
  </div>
);

const SchedulePage: React.FC = () => {
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [loading, setLoading] = useState(true);
  const [hasConsent, setHasConsent] = useState(false);
  const [showFirstTimeGuidance, setShowFirstTimeGuidance] = useState(false);

  useEffect(() => {
    const checkConsentAndLoadData = async () => {
      const consentStatus = consentService.hasConsent();
      setHasConsent(consentStatus);
      
      if (consentStatus) {
        try {
          const schedulesData = await storageService.getSchedules();
          setSchedules(schedulesData);
          
          // Show first-time guidance if no schedules exist
          if (schedulesData.length === 0) {
            const hasSeenGuidance = localStorage.getItem('schedule-guidance-seen');
            if (!hasSeenGuidance) {
              setShowFirstTimeGuidance(true);
              setTimeout(() => {
                setShowFirstTimeGuidance(false);
                localStorage.setItem('schedule-guidance-seen', 'true');
              }, 5000); // Show for 5 seconds
            }
          }
        } catch (error) {
          console.error('Failed to load schedules:', error);
        }
      }
      setLoading(false);
    };

    checkConsentAndLoadData();
  }, []);

  const weekdayNames = {
    [Weekday.MONDAY]: 'Monday',
    [Weekday.TUESDAY]: 'Tuesday', 
    [Weekday.WEDNESDAY]: 'Wednesday',
    [Weekday.THURSDAY]: 'Thursday',
    [Weekday.FRIDAY]: 'Friday',
    [Weekday.SATURDAY]: 'Saturday',
    [Weekday.SUNDAY]: 'Sunday'
  };

  const handleAddSchedule = () => {
    // TODO: Navigate to Add Schedule page when implemented in Phase 3
    console.log('Add Schedule clicked - will be implemented in Phase 3');
  };

  const handleEditWorkout = (scheduleId: string, weekday: Weekday) => {
    // TODO: Navigate to Edit Workout page when implemented in Phase 3
    console.log(`Edit workout for schedule ${scheduleId}, ${weekdayNames[weekday]} - will be implemented in Phase 3`);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 pt-16 pb-20">
        <div className="p-6 max-w-md mx-auto">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded mb-6"></div>
            <div className="space-y-4">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="h-20 bg-gray-200 dark:bg-gray-700 rounded"></div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!hasConsent) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 pt-16 pb-20">
        <div className="p-6 max-w-md mx-auto">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
              Schedule
            </h1>
            <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-700 rounded-lg p-4">
              <p className="text-yellow-800 dark:text-yellow-200">
                Please enable data storage in Settings to use the Schedule feature.
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 pt-16 pb-20">
      <div className="p-6 max-w-md mx-auto">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Schedule
          </h1>
          {schedules.length > 0 && (
            <Tooltip
              content="Add another workout schedule for different days"
              show={showFirstTimeGuidance}
            >
              <button
                onClick={handleAddSchedule}
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
              >
                Add Schedule
              </button>
            </Tooltip>
          )}
        </div>

        {schedules.length === 0 ? (
          <div className="text-center py-12">
            <div className="mb-6">
              <div className="mx-auto w-16 h-16 bg-gray-200 dark:bg-gray-700 rounded-full flex items-center justify-center">
                <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
            </div>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
              No Schedules Yet
            </h2>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              Create your first workout schedule to get started with organized training
            </p>
            <Tooltip
              content="Click here to create your first workout schedule! You'll be able to assign workouts to specific days of the week."
              show={showFirstTimeGuidance}
            >
              <button
                onClick={handleAddSchedule}
                className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-medium transition-colors"
              >
                Add Schedule
              </button>
            </Tooltip>
            
            {/* First-time guidance */}
            {showFirstTimeGuidance && (
              <div className="mt-6 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-lg p-4">
                <div className="flex items-start space-x-3">
                  <div className="flex-shrink-0">
                    <svg className="w-5 h-5 text-blue-500 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div className="text-left">
                    <h3 className="text-sm font-medium text-blue-800 dark:text-blue-300">
                      Welcome to Schedules!
                    </h3>
                    <p className="text-sm text-blue-700 dark:text-blue-400 mt-1">
                      Schedules help you organize your workouts by day of the week. Once created, you'll see your upcoming workouts on the Home page.
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            {schedules.map((schedule) => (
              <div
                key={schedule.id}
                className={`bg-white dark:bg-gray-800 rounded-lg p-4 border-2 transition-all ${
                  schedule.isActive
                    ? 'border-blue-200 dark:border-blue-700 shadow-sm'
                    : 'border-gray-200 dark:border-gray-700'
                }`}
              >
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <h3 className="font-semibold text-gray-900 dark:text-white">
                      {schedule.name}
                    </h3>
                    {schedule.isActive && (
                      <span className="inline-block bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 text-xs px-2 py-1 rounded-full mt-1">
                        Active
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">
                    {schedule.entries.length} day{schedule.entries.length !== 1 ? 's' : ''}
                  </div>
                </div>

                <div className="space-y-2">
                  {schedule.entries
                    .sort((a, b) => Object.values(Weekday).indexOf(a.weekday) - Object.values(Weekday).indexOf(b.weekday))
                    .map((entry) => (
                      <div
                        key={entry.id}
                        className={`flex justify-between items-center p-3 rounded-lg transition-colors ${
                          entry.isActive
                            ? 'bg-gray-50 dark:bg-gray-700'
                            : 'bg-gray-25 dark:bg-gray-750 opacity-60'
                        }`}
                      >
                        <div>
                          <div className="font-medium text-gray-900 dark:text-white">
                            {weekdayNames[entry.weekday]}
                          </div>
                          <div className="text-sm text-gray-600 dark:text-gray-400">
                            Workout: {entry.workoutId}
                          </div>
                        </div>
                        <Tooltip
                          content="Edit this workout - add exercises, adjust sets/reps"
                          show={showFirstTimeGuidance}
                        >
                          <button
                            onClick={() => handleEditWorkout(schedule.id, entry.weekday)}
                            className="bg-gray-100 dark:bg-gray-600 hover:bg-gray-200 dark:hover:bg-gray-500 text-gray-700 dark:text-gray-300 px-3 py-1 rounded text-sm transition-colors"
                          >
                            Edit
                          </button>
                        </Tooltip>
                      </div>
                    ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default SchedulePage;
