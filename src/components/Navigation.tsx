import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Routes } from '../types';

const Navigation: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const isActive = (path: string) => location.pathname === path;

  const navItems = [
    {
      path: Routes.HOME,
      label: 'Home',
      icon: '🏠',
    },
    {
      path: Routes.EXERCISES,
      label: 'Exercises',
      icon: '💪',
    },
    {
      path: Routes.TIMER,
      label: 'Timer',
      icon: '⏱️',
    },
    {
      path: Routes.ACTIVITY_LOG,
      label: 'Log',
      icon: '📊',
    },
    {
      path: Routes.SETTINGS,
      label: 'Settings',
      icon: '⚙️',
    },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 z-50">
      <div className="flex justify-around items-center py-2 px-4 max-w-md mx-auto">
        {navItems.map((item) => (
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
            <span className="text-lg mb-1" role="img" aria-hidden="true">
              {item.icon}
            </span>
            <span className="text-xs font-medium">{item.label}</span>
          </button>
        ))}
      </div>
      <div className="pb-safe"></div>
    </nav>
  );
};

export default Navigation; 