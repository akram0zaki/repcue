import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Routes } from '../types';
import { 
  HomeIcon, 
  ExercisesIcon, 
  TimerIcon, 
  LogIcon, 
  SettingsIcon 
} from './icons/NavigationIcons';

const Navigation: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const isActive = (path: string) => location.pathname === path;

  const navItems = [
    {
      path: Routes.HOME,
      label: 'Home',
      icon: HomeIcon,
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
    {
      path: Routes.SETTINGS,
      label: 'Settings',
      icon: SettingsIcon,
    },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 z-50">
      <div className="flex justify-around items-center py-2 px-4 max-w-md mx-auto">
        {navItems.map((item) => {
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
      </div>
      <div className="pb-safe"></div>
    </nav>
  );
};

export default Navigation; 