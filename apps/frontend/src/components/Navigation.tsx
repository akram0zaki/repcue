/* eslint-disable no-restricted-syntax -- i18n-exempt: aria/labels constructed from t(); remaining literals are roles/tokens */
import React, { useState, useRef, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
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
  const { t } = useTranslation();
  const [showMoreMenu, setShowMoreMenu] = useState(false);
  const moreMenuRef = useRef<HTMLDivElement>(null);

  const isActive = (path: string) => location.pathname === path;

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement | null;
      // Ignore interactions originating from form controls (native pickers on mobile)
      if (target && target.closest('select, option, input, textarea, [role="combobox"]')) {
        return;
      }

      if (moreMenuRef.current && !moreMenuRef.current.contains(target as Node)) {
        setShowMoreMenu(false);
      }
    };

    // Use 'click' instead of 'mousedown' to avoid interfering with touch-based native controls on mobile
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, []);

  const mainNavItems = [
    {
      path: Routes.HOME,
      label: t('navigation.home'),
      icon: HomeIcon,
  testId: 'nav-home'
    },
    {
      path: Routes.EXERCISES,
      label: t('navigation.exercises'),
      icon: ExercisesIcon,
  testId: 'nav-exercises'
    },
    {
      path: Routes.TIMER,
      label: t('navigation.timer'),
      icon: TimerIcon,
  testId: 'nav-timer'
    },
    {
      path: Routes.WORKOUTS, // Changed from SCHEDULE
      label: t('navigation.workouts'), // Changed from 'Schedule'
      icon: ScheduleIcon, // Keep schedule icon for now as it represents calendar/planning
  testId: 'nav-workouts'
    },
    {
      path: Routes.ACTIVITY_LOG,
      label: t('navigation.progress'), // Changed from activityLog to progress
      icon: LogIcon,
  testId: 'nav-progress' // Changed from nav-activity to nav-progress
    },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 z-50">
      <div className="flex items-center py-2 px-2 max-w-md mx-auto">
        {/* Main navigation items - 5 tabs with proper spacing */}
        <div className="flex justify-between items-center flex-1 pr-2">
          {mainNavItems.map((item) => {
            const IconComponent = item.icon;
            return (
              <button
                key={item.path}
                onClick={() => navigate(item.path)}
                className={`flex flex-col items-center justify-center py-2 px-1 rounded-lg transition-colors min-w-0 ${
                  isActive(item.path)
                    ? 'bg-primary-50 dark:bg-primary-dark-disabled text-primary-500 dark:text-primary-dark-600'
                    : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
                }`}
                aria-label={`Navigate to ${item.label}`}
                data-testid={item.testId}
              >
                <IconComponent className="mb-1" size={24} />
                <span className="text-xs font-medium text-center leading-tight">{item.label}</span>
              </button>
            );
          })}
        </div>

        {/* Separator between main tabs and More button */}
        <div className="w-px h-6 bg-gray-300 dark:bg-gray-500 mx-1 flex-shrink-0"></div>

        {/* More menu button - compact, positioned on the right */}
        <div className="relative" ref={moreMenuRef}>
          <button
            onClick={() => setShowMoreMenu(!showMoreMenu)}
            className={`flex items-center justify-center w-10 h-10 rounded-lg transition-colors ${
              isActive(Routes.SETTINGS)
                ? 'bg-primary-50 dark:bg-primary-dark-disabled text-primary-500 dark:text-primary-dark-600'
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
            }`}
            aria-label="More options"
            aria-expanded={showMoreMenu}
            aria-haspopup="true"
            data-testid="nav-more"
          >
            <MoreIcon size={24} />
          </button>

          {/* Dropdown menu */}
          {showMoreMenu && (
            <div className="absolute bottom-full right-0 mb-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg min-w-[200px] max-w-[250px]">
              {/* Settings */}
              <button
                onClick={() => {
                  navigate(Routes.SETTINGS);
                  setShowMoreMenu(false);
                }}
                className="w-full px-4 py-3 text-left text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                data-testid="nav-settings"
              >
                {t('navigation.settings')}
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