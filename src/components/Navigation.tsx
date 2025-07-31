import React, { useState, useRef, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Routes } from '../types';
import { 
  HomeIcon, 
  ExercisesIcon, 
  TimerIcon, 
  LogIcon, 
  ScheduleIcon,
  MoreIcon
} from './icons/NavigationIcons';

const Navigation: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [showMoreMenu, setShowMoreMenu] = useState(false);
  const moreMenuRef = useRef<HTMLDivElement>(null);

  const isActive = (path: string) => location.pathname === path;

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (moreMenuRef.current && !moreMenuRef.current.contains(event.target as Node)) {
        setShowMoreMenu(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const mainNavItems = [
    {
      path: Routes.HOME,
      label: 'Home',
      icon: HomeIcon,
    },
    {
      path: Routes.WORKOUTS, // Changed from SCHEDULE
      label: 'Workouts', // Changed from 'Schedule'
      icon: ScheduleIcon, // Keep schedule icon for now as it represents calendar/planning
    },
    {
      path: Routes.EXERCISES,
      label: 'Exercises',
      icon: ExercisesIcon,
    },
    {
      path: Routes.TIMER,
      label: 'Timer',
      icon: TimerIcon,
    },
    {
      path: Routes.ACTIVITY_LOG,
      label: 'Log',
      icon: LogIcon,
    },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 z-50">
      <div className="flex justify-around items-center py-2 px-4 max-w-md mx-auto">
        {mainNavItems.map((item) => {
          const IconComponent = item.icon;
          return (
            <button
              key={item.path}
              onClick={() => navigate(item.path)}
              className={`flex flex-col items-center justify-center py-2 px-3 rounded-lg transition-colors ${
                isActive(item.path)
                  ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
              }`}
              aria-label={`Navigate to ${item.label}`}
            >
              <IconComponent className="mb-1" size={20} />
              <span className="text-xs font-medium">{item.label}</span>
            </button>
          );
        })}
        
        {/* More menu button */}
        <div className="relative" ref={moreMenuRef}>
          <button
            onClick={() => setShowMoreMenu(!showMoreMenu)}
            className={`flex items-center justify-center p-2 rounded-lg transition-colors border-l border-gray-200 dark:border-gray-600 ml-2 pl-4 ${
              isActive(Routes.SETTINGS)
                ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400'
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
            }`}
            aria-label="More options"
            aria-expanded={showMoreMenu}
            aria-haspopup="true"
          >
            <MoreIcon size={20} />
          </button>

          {/* Dropdown menu */}
          {showMoreMenu && (
            <div className="absolute bottom-full right-0 mb-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg min-w-[120px]">
              <button
                onClick={() => {
                  navigate(Routes.SETTINGS);
                  setShowMoreMenu(false);
                }}
                className="w-full px-4 py-3 text-left text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-lg transition-colors"
              >
                Settings
              </button>
            </div>
          )}
        </div>
      </div>
      <div className="pb-safe"></div>
    </nav>
  );
};

export default Navigation; 