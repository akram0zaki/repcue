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
import PlatformTabBar from './platform/PlatformTabBar';
import type { TabItem, MoreMenuItem } from './platform/PlatformTabBar';

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

  // Convert to TabItem format for PlatformTabBar
  const tabs: TabItem[] = [
    {
      id: 'home',
      label: t('navigation.home'),
      icon: HomeIcon,
      isActive: isActive(Routes.HOME),
      onClick: () => navigate(Routes.HOME),
      testId: 'nav-home',
      ariaLabel: t('a11y.navigateTo', { label: t('navigation.home'), defaultValue: 'Navigate to {{label}}' })
    },
    {
      id: 'exercises',
      label: t('navigation.exercises'),
      icon: ExercisesIcon,
      isActive: isActive(Routes.EXERCISES),
      onClick: () => navigate(Routes.EXERCISES),
      testId: 'nav-exercises',
      ariaLabel: t('a11y.navigateTo', { label: t('navigation.exercises'), defaultValue: 'Navigate to {{label}}' })
    },
    {
      id: 'timer',
      label: t('navigation.timer'),
      icon: TimerIcon,
      isActive: isActive(Routes.TIMER),
      onClick: () => navigate(Routes.TIMER),
      testId: 'nav-timer',
      ariaLabel: t('a11y.navigateTo', { label: t('navigation.timer'), defaultValue: 'Navigate to {{label}}' })
    },
    {
      id: 'workouts',
      label: t('navigation.workouts'),
      icon: ScheduleIcon,
      isActive: isActive(Routes.WORKOUTS),
      onClick: () => navigate(Routes.WORKOUTS),
      testId: 'nav-workouts',
      ariaLabel: t('a11y.navigateTo', { label: t('navigation.workouts'), defaultValue: 'Navigate to {{label}}' })
    },
    {
      id: 'coach',
      label: t('navigation.coach'),
      icon: CoachIcon,
      isActive: isActive(Routes.COACH),
      onClick: () => navigate(Routes.COACH),
      testId: 'nav-coach',
      ariaLabel: t('a11y.navigateTo', { label: t('navigation.coach'), defaultValue: 'Navigate to {{label}}' })
    },
  ];

  // More menu items
  const moreItems: MoreMenuItem[] = [
    {
      id: 'settings',
      label: t('navigation.settings'),
      icon: SettingsIcon,
      isActive: isActive(Routes.SETTINGS),
      onClick: () => {
        navigate(Routes.SETTINGS);
        setShowMoreMenu(false);
      },
      testId: 'nav-settings'
    }
  ];

  return (
    <PlatformTabBar
      tabs={tabs}
      showMore={true}
      moreIcon={MoreIcon}
      isMoreOpen={showMoreMenu}
      onMoreToggle={() => setShowMoreMenu(!showMoreMenu)}
      moreItems={moreItems}
      moreMenuRef={moreMenuRef}
      moreLabel={t('a11y.moreOptions', 'More options')}
    />
  );
};

export default Navigation; 