import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { StarIcon } from './icons/NavigationIcons';
import { supabase } from '../config/supabase';
// TODO: Re-enable when rating functionality is restored
// import type { ExerciseRating as ExerciseRatingType } from '../types';

interface ExerciseRatingProps {
  exerciseId: string;
  currentRating?: number;
  ratingCount?: number;
  showReviewForm?: boolean;
  onRatingChange?: (newRating: number, newCount: number) => void;
  className?: string;
}

interface UserRating {
  rating: number;
  review_text?: string;
}

export const ExerciseRating: React.FC<ExerciseRatingProps> = ({
  exerciseId,
  currentRating = 0,
  ratingCount = 0,
  showReviewForm = true,
  onRatingChange,
  className = ''
}) => {
  const { t } = useTranslation();
  const [userRating, setUserRating] = useState<UserRating | null>(null);
  const [hoveredRating, setHoveredRating] = useState<number>(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showReviewInput, setShowReviewInput] = useState(false);
  const [reviewText, setReviewText] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  // Check authentication status
  useEffect(() => {
    const checkAuth = async () => {
      if (!supabase) {
        setIsAuthenticated(false);
        return;
      }
      
      const { data: { user } } = await supabase.auth.getUser();
      setIsAuthenticated(!!user);
    };
    
    checkAuth();
  }, []);

  // Load user's existing rating
  useEffect(() => {
    const loadUserRating = async () => {
      if (!supabase || !isAuthenticated) return;

      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const { data, error } = await supabase
          .from('exercise_ratings')
          .select('rating, review_text')
          .eq('exercise_id', exerciseId)
          .eq('user_id', user.id)
          .eq('deleted', false)
          .single();

        if (!error && data) {
          setUserRating({
            rating: data.rating,
            review_text: data.review_text || undefined
          });
          setReviewText(data.review_text || '');
        }
      } catch (err) {
        console.error('Error loading user rating:', err);
      }
    };

    loadUserRating();
  }, [exerciseId, isAuthenticated]);

  const handleStarClick = async (rating: number) => {
    if (!isAuthenticated || isSubmitting) return;

    setIsSubmitting(true);
    setError(null);

    try {
      if (!supabase) {
        throw new Error('Supabase not available');
      }

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('User not authenticated');
      }

      // Submit rating using Edge Function
      const response = await supabase.functions.invoke('rate-exercise', {
        body: {
          exercise_id: exerciseId,
          rating: rating,
          review_text: reviewText.trim() || undefined
        }
      });

      if (response.error) {
        throw new Error(response.error.message);
      }

      const result = response.data;
      
      // Update local state
      setUserRating({
        rating: rating,
        review_text: reviewText.trim() || undefined
      });

      // Notify parent component of the change
      if (onRatingChange) {
        onRatingChange(result.new_average, result.new_count);
      }

      setShowReviewInput(false);
    } catch (err) {
      console.error('Error submitting rating:', err);
      setError(t('rating.submitError'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleStarHover = (rating: number) => {
    if (!isAuthenticated || isSubmitting) return;
    setHoveredRating(rating);
  };

  const handleMouseLeave = () => {
    setHoveredRating(0);
  };

  const toggleReviewInput = () => {
    if (!isAuthenticated) return;
    setShowReviewInput(!showReviewInput);
  };

  const displayRating = hoveredRating || userRating?.rating || 0;

  return (
    <div className={`space-y-3 ${className}`}>
      {/* Overall Rating Display */}
      <div className="flex items-center space-x-3">
        <div className="flex items-center space-x-1">
          {[1, 2, 3, 4, 5].map((star) => (
            <StarIcon
              key={star}
              className={`h-5 w-5 ${
                star <= currentRating 
                  ? 'text-yellow-400' 
                  : 'text-gray-300 dark:text-gray-600'
              }`}
            />
          ))}
        </div>
        <span className="text-sm text-gray-600 dark:text-gray-400">
          {currentRating > 0 ? currentRating.toFixed(1) : '0.0'} ({ratingCount} {t('rating.reviews')})
        </span>
      </div>

      {/* User Rating Interface */}
      {isAuthenticated && (
        <div className="border-t pt-3">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
              {userRating ? t('rating.yourRating') : t('rating.rateThis')}
            </span>
            {showReviewForm && (
              <button
                onClick={toggleReviewInput}
                className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
              >
                {showReviewInput ? t('rating.hideReview') : t('rating.addReview')}
              </button>
            )}
          </div>

          {/* Interactive Stars */}
          <div 
            className="flex items-center space-x-1 mb-3"
            onMouseLeave={handleMouseLeave}
          >
            {[1, 2, 3, 4, 5].map((star) => (
              <button
                key={star}
                onClick={() => handleStarClick(star)}
                onMouseEnter={() => handleStarHover(star)}
                disabled={isSubmitting}
                className={`transition-colors duration-150 ${
                  isSubmitting ? 'cursor-not-allowed' : 'cursor-pointer'
                }`}
              >
                <StarIcon
                  className={`h-6 w-6 ${
                    star <= displayRating
                      ? 'text-yellow-400'
                      : 'text-gray-300 dark:text-gray-600 hover:text-yellow-300'
                  }`}
                />
              </button>
            ))}
            {displayRating > 0 && (
              <span className="ml-2 text-sm text-gray-600 dark:text-gray-400">
                {displayRating}/5
              </span>
            )}
          </div>

          {/* Review Input */}
          {showReviewInput && showReviewForm && (
            <div className="space-y-2">
              <textarea
                value={reviewText}
                onChange={(e) => setReviewText(e.target.value)}
                placeholder={t('rating.reviewPlaceholder')}
                maxLength={500}
                rows={3}
                className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg resize-none bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400"
              />
              <div className="flex justify-between items-center">
                <span className="text-xs text-gray-500 dark:text-gray-400">
                  {reviewText.length}/500 {t('rating.characters')}
                </span>
              </div>
            </div>
          )}

          {/* Existing Review Display */}
          {userRating?.review_text && !showReviewInput && (
            <div className="mt-2 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
              <p className="text-sm text-gray-700 dark:text-gray-300">
                "{userRating.review_text}"
              </p>
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div className="mt-2 p-2 bg-red-100 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded text-sm text-red-800 dark:text-red-200">
              {error}
            </div>
          )}

          {/* Loading State */}
          {isSubmitting && (
            <div className="mt-2 flex items-center space-x-2">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
              <span className="text-sm text-gray-600 dark:text-gray-400">
                {t('rating.submitting')}
              </span>
            </div>
          )}
        </div>
      )}

      {/* Login Prompt */}
      {!isAuthenticated && (
        <div className="text-sm text-gray-600 dark:text-gray-400">
          {t('rating.loginToRate')}
        </div>
      )}
    </div>
  );
};

export default ExerciseRating;