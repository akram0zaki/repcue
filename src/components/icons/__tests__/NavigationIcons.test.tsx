import React from 'react';
import { render } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { 
  HomeIcon, 
  ExercisesIcon, 
  TimerIcon, 
  LogIcon, 
  SettingsIcon 
} from '../NavigationIcons';

describe('NavigationIcons', () => {
  const icons = [
    { name: 'HomeIcon', component: HomeIcon },
    { name: 'ExercisesIcon', component: ExercisesIcon },
    { name: 'TimerIcon', component: TimerIcon },
    { name: 'LogIcon', component: LogIcon },
    { name: 'SettingsIcon', component: SettingsIcon },
  ];

  icons.forEach(({ name, component: IconComponent }) => {
    describe(name, () => {
      it('renders with default props', () => {
        const { container } = render(<IconComponent />);
        const svg = container.querySelector('svg');
        
        expect(svg).toBeInTheDocument();
        expect(svg).toHaveAttribute('width', '24');
        expect(svg).toHaveAttribute('height', '24');
        expect(svg).toHaveAttribute('aria-hidden', 'true');
      });

      it('accepts custom size prop', () => {
        const { container } = render(<IconComponent size={32} />);
        const svg = container.querySelector('svg');
        
        expect(svg).toHaveAttribute('width', '32');
        expect(svg).toHaveAttribute('height', '32');
      });

      it('accepts custom className', () => {
        const { container } = render(<IconComponent className="custom-class" />);
        const svg = container.querySelector('svg');
        
        expect(svg).toHaveClass('custom-class');
      });

      it('has proper stroke attributes for consistency', () => {
        const { container } = render(<IconComponent />);
        const svg = container.querySelector('svg');
        
        expect(svg).toHaveAttribute('stroke', 'currentColor');
        expect(svg).toHaveAttribute('stroke-width', '2');
        expect(svg).toHaveAttribute('stroke-linecap', 'round');
        expect(svg).toHaveAttribute('stroke-linejoin', 'round');
      });

      it('uses currentColor for theme compatibility', () => {
        const { container } = render(<IconComponent />);
        const svg = container.querySelector('svg');
        
        expect(svg).toHaveAttribute('stroke', 'currentColor');
        expect(svg).toHaveAttribute('fill', 'none');
      });

      it('has proper viewBox for scalability', () => {
        const { container } = render(<IconComponent />);
        const svg = container.querySelector('svg');
        
        expect(svg).toHaveAttribute('viewBox', '0 0 24 24');
      });
    });
  });

  describe('Icon accessibility', () => {
    it('all icons are properly hidden from screen readers', () => {
      icons.forEach(({ component: IconComponent }) => {
        const { container } = render(<IconComponent />);
        const svg = container.querySelector('svg');
        expect(svg).toHaveAttribute('aria-hidden', 'true');
      });
    });

    it('all icons inherit color from parent', () => {
      icons.forEach(({ component: IconComponent }) => {
        const { container } = render(
          <div style={{ color: 'red' }}>
            <IconComponent />
          </div>
        );
        const svg = container.querySelector('svg');
        expect(svg).toHaveAttribute('stroke', 'currentColor');
      });
    });
  });

  describe('Icon consistency', () => {
    it('all icons have the same default size', () => {
      icons.forEach(({ component: IconComponent }) => {
        const { container } = render(<IconComponent />);
        const svg = container.querySelector('svg');
        expect(svg).toHaveAttribute('width', '24');
        expect(svg).toHaveAttribute('height', '24');
      });
    });

    it('all icons have the same stroke-width for visual consistency', () => {
      icons.forEach(({ component: IconComponent }) => {
        const { container } = render(<IconComponent />);
        const svg = container.querySelector('svg');
        expect(svg).toHaveAttribute('stroke-width', '2');
      });
    });
  });
});
