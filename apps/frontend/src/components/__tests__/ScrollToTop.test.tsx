import React from 'react';
import { render } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import ScrollToTop from '../ScrollToTop';

describe('ScrollToTop', () => {
  let scrollToSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    // Spy on window.scrollTo
    scrollToSpy = vi.spyOn(window, 'scrollTo').mockImplementation(() => {});
  });

  afterEach(() => {
    scrollToSpy.mockRestore();
  });

  it('should scroll to top on mount', () => {
    render(
      <MemoryRouter initialEntries={['/']}>
        <ScrollToTop />
      </MemoryRouter>
    );

    expect(scrollToSpy).toHaveBeenCalledWith({
      top: 0,
      left: 0,
      behavior: 'instant'
    });
  });

  it('should scroll to top when route changes', () => {
    const { rerender } = render(
      <MemoryRouter initialEntries={['/home', '/exercises']} initialIndex={0}>
        <ScrollToTop />
        <Routes>
          <Route path="/home" element={<div>Home</div>} />
          <Route path="/exercises" element={<div>Exercises</div>} />
        </Routes>
      </MemoryRouter>
    );

    expect(scrollToSpy).toHaveBeenCalledTimes(1);

    // Change route by updating the index
    rerender(
      <MemoryRouter initialEntries={['/home', '/exercises']} initialIndex={1}>
        <ScrollToTop />
        <Routes>
          <Route path="/home" element={<div>Home</div>} />
          <Route path="/exercises" element={<div>Exercises</div>} />
        </Routes>
      </MemoryRouter>
    );

    expect(scrollToSpy).toHaveBeenCalledTimes(2);
    expect(scrollToSpy).toHaveBeenLastCalledWith({
      top: 0,
      left: 0,
      behavior: 'instant'
    });
  });

  it('should not render any visible content', () => {
    const { container } = render(
      <MemoryRouter initialEntries={['/']}>
        <ScrollToTop />
      </MemoryRouter>
    );

    expect(container.firstChild).toBeNull();
  });

  it('should scroll to top for multiple route changes', () => {
    const routes = ['/home', '/exercises', '/timer', '/settings'];
    
    routes.forEach((route, index) => {
      render(
        <MemoryRouter initialEntries={[route]}>
          <ScrollToTop />
        </MemoryRouter>
      );

      expect(scrollToSpy).toHaveBeenCalledTimes(index + 1);
    });
  });

  it('should use instant scroll behavior', () => {
    render(
      <MemoryRouter initialEntries={['/']}>
        <ScrollToTop />
      </MemoryRouter>
    );

    const lastCall = scrollToSpy.mock.calls[scrollToSpy.mock.calls.length - 1];
    expect(lastCall[0]).toEqual({
      top: 0,
      left: 0,
      behavior: 'instant'
    });
  });
});
