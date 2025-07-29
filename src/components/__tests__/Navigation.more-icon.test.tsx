import React from 'react';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import Navigation from '../Navigation';

const NavigationWrapper: React.FC = () => (
  <MemoryRouter>
    <Navigation />
  </MemoryRouter>
);

describe('Navigation - More Icon', () => {
  it('should render vertical more icon without label', () => {
    render(<NavigationWrapper />);
    
    // Check that the more button exists
    const moreButton = screen.getByRole('button', { name: 'More options' });
    expect(moreButton).toBeInTheDocument();
    
    // Check that there's no "More" text visible
    expect(screen.queryByText('More')).not.toBeInTheDocument();
    
    // Check that the SVG icon is present
    const svgIcon = moreButton.querySelector('svg');
    expect(svgIcon).toBeInTheDocument();
    
    // Verify the vertical dots positioning (cy="5", cy="12", cy="19")
    const circles = svgIcon?.querySelectorAll('circle');
    expect(circles).toHaveLength(3);
    
    // Check that circles are positioned vertically
    expect(circles?.[0]).toHaveAttribute('cy', '5');
    expect(circles?.[1]).toHaveAttribute('cy', '12');
    expect(circles?.[2]).toHaveAttribute('cy', '19');
    
    // All circles should have same x position (centered)
    expect(circles?.[0]).toHaveAttribute('cx', '12');
    expect(circles?.[1]).toHaveAttribute('cx', '12');
    expect(circles?.[2]).toHaveAttribute('cx', '12');
  });
  
  it('should have compact styling without label space', () => {
    render(<NavigationWrapper />);
    
    const moreButton = screen.getByRole('button', { name: 'More options' });
    
    // Should not have flex-col class (which was used for icon + label layout)
    expect(moreButton).not.toHaveClass('flex-col');
    
    // Should have flex class for centering icon only
    expect(moreButton).toHaveClass('flex', 'items-center', 'justify-center');
  });
  
  it('should render all main navigation items with labels', () => {
    render(<NavigationWrapper />);
    
    // Main nav items should still have labels
    expect(screen.getByText('Home')).toBeInTheDocument();
    expect(screen.getByText('Schedule')).toBeInTheDocument();
    expect(screen.getByText('Exercises')).toBeInTheDocument();
    expect(screen.getByText('Timer')).toBeInTheDocument();
    expect(screen.getByText('Log')).toBeInTheDocument();
    
    // But "More" should not be visible
    expect(screen.queryByText('More')).not.toBeInTheDocument();
  });
});
