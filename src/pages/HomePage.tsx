import { useNavigate } from 'react-router-dom';
import type { Exercise, AppSettings } from '../types';
import { Routes } from '../types';
import { APP_NAME, APP_DESCRIPTION } from '../constants';

interface HomePageProps {
  exercises: Exercise[];
  appSettings: AppSettings;
  onToggleFavorite: (exerciseId: string) => void;
}

const HomePage: React.FC<HomePageProps> = ({ exercises }) => {
  const navigate = useNavigate();
  return (
    <div id="main-content" className="min-h-screen pt-safe pb-20 bg-gray-50 dark:bg-gray-900">
      <div className="container mx-auto px-4 py-4 max-w-md">
        <header className="text-center mb-6">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-1">
            {APP_NAME}
          </h1>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            {APP_DESCRIPTION}
          </p>
        </header>

        <div className="space-y-4">
          {/* Quick Start Section */}
          <section>
            <div className="space-y-3">
              <button 
                className="btn-primary w-full"
                onClick={() => navigate(Routes.TIMER)}
              >
                Start Timer
              </button>
              <button 
                className="btn-secondary w-full"
                onClick={() => navigate(Routes.EXERCISES)}
              >
                Browse Exercises
              </button>
            </div>
          </section>

          {/* Favorites Section */}
          <section>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-3">
              Favorite Exercises
            </h2>
            {exercises.filter(ex => ex.isFavorite).length > 0 ? (
              <div className="space-y-2">
                {exercises
                  .filter(exercise => exercise.isFavorite)
                  .slice(0, 3)
                  .map(exercise => (
                    <button 
                      key={exercise.id} 
                      className="exercise-card w-full text-left hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                      onClick={() => navigate(Routes.TIMER)}
                    >
                      <h3 className="font-medium text-gray-900 dark:text-gray-100">
                        {exercise.name}
                      </h3>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        {exercise.description}
                      </p>
                    </button>
                  ))}
              </div>
            ) : (
              <p className="text-gray-500 dark:text-gray-400 text-center py-3 text-sm">
                No favorite exercises yet. Mark some exercises as favorites to see them here!
              </p>
            )}
          </section>

          {/* Stats Section */}
          <section>
            <div className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow-md">
              <div className="text-center">
                <div className="text-xl font-bold text-blue-600 dark:text-blue-400">
                  {exercises.length}
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400">
                  Available Exercises
                </div>
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
};

export default HomePage; 