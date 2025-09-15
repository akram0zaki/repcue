import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import './i18n'
import { SnackbarProvider } from './components/SnackbarProvider'

// Check if this is a shared exercise route
const isSharedRoute = window.location.pathname.startsWith('/share/')

// Dynamically import the appropriate component
const AppComponent = isSharedRoute
  ? import('./StandaloneSharedExercise.tsx').then(module => module.default)
  : import('./App.tsx').then(module => module.default)

AppComponent.then(Component => {
  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      {isSharedRoute ? (
        <Component />
      ) : (
        <SnackbarProvider>
          <Component />
        </SnackbarProvider>
      )}
    </StrictMode>,
  )
}).catch(error => {
  console.error('[main.tsx] Error loading component:', error);
})
