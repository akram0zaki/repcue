/* eslint-disable no-restricted-syntax -- i18n-exempt: aria/labels constructed from t(); remaining literals are roles/tokens */
import React, { useState, useRef, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Routes } from '../types';
import {
  HomeIcon,
  ExercisesIcon,
  TimerIcon,
  ScheduleIcon,
  MoreIcon,
  CoachIcon,
  SettingsIcon
} from './icons/NavigationIcons';
import { useRTLDetection } from '../hooks/useRTLDetection';

const Navigation: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useTranslation();
  const { isRTL } = useRTLDetection();
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
      path: Routes.WORKOUTS,
      label: t('navigation.workouts'),
      icon: ScheduleIcon,
  testId: 'nav-workouts'
    },
    {
      path: Routes.COACH,
      label: t('navigation.coach'),
      icon: CoachIcon,
  testId: 'nav-coach'
    },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 z-50">
      <div className="nav-container flex items-center max-w-md mx-auto">
        {/* Main navigation items - 5 tabs with optimized spacing */}
        <div className="flex justify-between items-center flex-1">
          {mainNavItems.map((item) => {
            const IconComponent = item.icon;
            return (
              <button
                key={item.path}
                onClick={() => navigate(item.path)}
                className={`nav-item flex flex-col items-center justify-center rounded-lg transition-colors min-w-0 touch-target ${
                  isActive(item.path)
                    ? 'bg-primary-50 dark:bg-primary-dark-disabled text-primary-500 dark:text-primary-dark-600'
                    : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
                }`}
                aria-label={t('a11y.navigateTo', { label: item.label, defaultValue: 'Navigate to {{label}}' })}
                data-testid={item.testId}
              >
                <IconComponent className="mb-1" size={24} />
                <span className="text-xs font-medium text-center leading-tight">{item.label}</span>
              </button>
            );
          })}
        </div>

        {/* Separator between main tabs and More button */}
        <div className="nav-separator w-px h-5 bg-gray-300 dark:bg-gray-500"></div>

        {/* More menu button - ensure visibility */}
        <div className="relative flex-shrink-0" ref={moreMenuRef}>
          <button
            onClick={() => setShowMoreMenu(!showMoreMenu)}
            className={`nav-more-button flex items-center justify-center rounded-lg transition-colors ${
              isActive(Routes.SETTINGS)
                ? 'bg-primary-50 dark:bg-primary-dark-disabled text-primary-500 dark:text-primary-dark-600'
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
            }`}
            aria-label={t('a11y.moreOptions', 'More options')}
            aria-expanded={showMoreMenu}
            aria-haspopup="true"
            data-testid="nav-more"
          >
            <MoreIcon size={26} />
          </button>

          {/* Dropdown menu */}
          {showMoreMenu && (
            <div
              className={`absolute bottom-full mb-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg nav-dropdown ${
                isRTL ? 'nav-dropdown-rtl' : 'nav-dropdown-ltr'
              }`}
              dir={isRTL ? 'rtl' : 'ltr'}
            >
              {/* Settings */}
              <button
                onClick={() => {
                  navigate(Routes.SETTINGS);
                  setShowMoreMenu(false);
                }}
                className={`nav-dropdown-item w-full px-4 py-3 text-sm font-medium flex items-center gap-2 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors rounded-lg ${
                  isRTL ? 'flex-row-reverse justify-end' : ''
                } ${isActive(Routes.SETTINGS) ? 'bg-primary-50 dark:bg-primary-dark-disabled text-primary-500 dark:text-primary-dark-600' : ''}`}
                data-testid="nav-settings"
              >
                <SettingsIcon size={18} />
                <span>{t('navigation.settings')}</span>
              </button>

              {/* Legal link removed from main menu; moved to Settings page */}
            </div>
          )}
        </div>
      </div>
      <div className="pb-safe"></div>
    </nav>
  );
};

export default Navigation; 