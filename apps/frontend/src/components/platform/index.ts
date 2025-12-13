/**
 * Platform Components
 * 
 * A collection of UI components that automatically adapt to the current platform
 * (iOS, Android, or Web). These components provide a native-like experience on
 * each platform while maintaining a consistent API.
 * 
 * @module platform
 */

// Spinner components
export { 
  PlatformSpinner,
  PlatformLoadingOverlay,
  PlatformInlineLoader,
  PlatformLoadingButton,
  type PlatformSpinnerProps,
  type PlatformLoadingOverlayProps,
  type PlatformInlineLoaderProps,
  type PlatformLoadingButtonProps,
} from './PlatformSpinner';

// Modal components
export {
  PlatformModal,
  PlatformActionModal,
  type PlatformModalProps,
  type PlatformActionModalProps,
} from './PlatformModal';

// Confirm dialog components
export {
  PlatformConfirmDialog,
  type PlatformConfirmDialogProps,
} from './PlatformConfirmDialog';

// Confirmation modal (drop-in replacement for ConfirmationModal)
export {
  PlatformConfirmationModal,
} from './PlatformConfirmationModal';

// Tab bar component
export {
  default as PlatformTabBar,
  type TabItem,
  type MoreMenuItem,
  type PlatformTabBarProps,
} from './PlatformTabBar';

// Pull to refresh component
export {
  PullToRefresh,
  type PullToRefreshProps,
} from './PullToRefresh';
