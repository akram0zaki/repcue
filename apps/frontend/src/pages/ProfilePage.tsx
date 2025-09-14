import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import type { UserProfile, Connection } from '../types';
import { profileService } from '../services/profileService';
import { EditIcon } from '../components/icons/NavigationIcons';
import logger from '../utils/logger';

interface ProfilePageProps {
  isOwnProfile?: boolean;
}

const ProfilePage: React.FC<ProfilePageProps> = () => {
  const { t } = useTranslation(['common', 'profile']);
  const { userId } = useParams<{ userId: string }>();
  const { user, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [connections, setConnections] = useState<Connection[]>([]);
  const [loading, setLoading] = useState(true);
  const [connectionsCount, setConnectionsCount] = useState(0);
  const [showConnectionsList, setShowConnectionsList] = useState(false);

  const targetUserId = userId || user?.id;
  const isViewingOwnProfile = !userId || userId === user?.id;

  useEffect(() => {
    const loadProfile = async () => {
      if (!targetUserId) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        const [profileData, connectionsData] = await Promise.all([
          profileService.getUserProfile(targetUserId),
          profileService.getUserConnections(targetUserId)
        ]);
        
        setProfile(profileData);
        setConnections(connectionsData || []);
        setConnectionsCount((connectionsData || []).length);
      } catch (error) {
        logger.error('Failed to load profile:', error);
      } finally {
        setLoading(false);
      }
    };

    loadProfile();
  }, [targetUserId]);

  const handleEditProfile = () => {
    navigate('/profile/edit');
  };

  const handleConnectionsClick = () => {
    if (connectionsCount > 0) {
      setShowConnectionsList(true);
    }
  };

  const handleConnectionProfile = (connectionUserId: string) => {
    navigate(`/profile/${connectionUserId}`);
    setShowConnectionsList(false);
  };

  const getInitials = (name?: string, email?: string) => {
    if (name) {
      return name
        .split(' ')
        .map(word => word.charAt(0))
        .join('')
        .toUpperCase()
        .slice(0, 2);
    }
    if (email) {
      return email.charAt(0).toUpperCase();
    }
    return '?';
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen pt-safe pb-20 bg-gray-50 dark:bg-gray-900">
        <div className="container mx-auto px-4 py-8 max-w-md text-center">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-8">
            <h1 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
              {t('profile.signInRequired')}
            </h1>
            <p className="text-gray-600 dark:text-gray-300 mb-6">
              {t('profile.signInToViewProfile')}
            </p>
            <button
              onClick={() => navigate('/settings')}
              className="w-full py-2 px-4 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors"
            >
              {t('common.signIn')}
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen pt-safe pb-20 bg-gray-50 dark:bg-gray-900">
        <div className="container mx-auto px-4 py-8 max-w-md">
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen pt-safe pb-20 bg-gray-50 dark:bg-gray-900">
        <div className="container mx-auto px-4 py-8 max-w-md text-center">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-8">
            <h1 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
              {t('profile.notFound')}
            </h1>
            <p className="text-gray-600 dark:text-gray-300 mb-6">
              {t('profile.profileNotFoundMessage')}
            </p>
            <button
              onClick={() => navigate(-1)}
              className="w-full py-2 px-4 bg-gray-600 hover:bg-gray-700 text-white font-medium rounded-lg transition-colors"
            >
              {t('common.goBack')}
            </button>
          </div>
        </div>
      </div>
    );
  }

  const displayName = profile.display_name || user?.displayName || user?.email?.split('@')[0] || t('profile.anonymous');
  const initials = getInitials(profile.display_name, user?.email);

  return (
    <div className="min-h-screen pt-safe pb-20 bg-gray-50 dark:bg-gray-900">
      <div className="container mx-auto px-4 py-4 max-w-md">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            {isViewingOwnProfile ? t('profile.myProfile') : t('profile.profile')}
          </h1>
          {isViewingOwnProfile && (
            <button
              onClick={handleEditProfile}
              className="p-2 text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
              aria-label={t('profile.editProfile')}
            >
              <EditIcon size={20} />
            </button>
          )}
        </div>

        {/* Profile Card */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 mb-4">
          {/* Avatar and Basic Info */}
          <div className="flex items-center space-x-4 mb-6">
            {user?.avatarUrl ? (
              <img
                src={user.avatarUrl}
                alt={displayName}
                className="h-16 w-16 rounded-full object-cover"
              />
            ) : (
              <div className="h-16 w-16 rounded-full bg-blue-600 dark:bg-blue-700 flex items-center justify-center text-white text-xl font-medium">
                {initials}
              </div>
            )}
            <div className="flex-1 min-w-0">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white truncate">
                {displayName}
              </h2>
              {user?.email && (
                <p className="text-sm text-gray-500 dark:text-gray-400 truncate">
                  {user.email}
                </p>
              )}
              {profile.bio && (
                <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">
                  {profile.bio}
                </p>
              )}
            </div>
          </div>

          {/* Connections Section */}
          <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
            <button
              onClick={handleConnectionsClick}
              className="flex items-center justify-between w-full p-3 bg-gray-50 dark:bg-gray-700 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors"
              disabled={connectionsCount === 0}
            >
              <div className="flex items-center space-x-3">
                <svg className="w-5 h-5 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
                <div className="text-left">
                  <p className="font-medium text-gray-900 dark:text-white">
                    {t('profile.connections')}
                  </p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {t('profile.connectionsCount', { count: connectionsCount })}
                  </p>
                </div>
              </div>
              {connectionsCount > 0 && (
                <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              )}
            </button>
          </div>

          {/* Stats Section */}
          {profile.stats && profile.privacy_settings.show_stats && (
            <div className="border-t border-gray-200 dark:border-gray-700 pt-4 mt-4">
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-3">
                {t('profile.stats')}
              </h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="text-center p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                  <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                    {profile.stats.total_workouts}
                  </p>
                  <p className="text-sm text-gray-600 dark:text-gray-300">
                    {t('profile.totalWorkouts')}
                  </p>
                </div>
                <div className="text-center p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                  <p className="text-2xl font-bold text-green-600 dark:text-green-400">
                    {profile.stats.streak_days}
                  </p>
                  <p className="text-sm text-gray-600 dark:text-gray-300">
                    {t('profile.currentStreak')}
                  </p>
                </div>
                <div className="text-center p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                  <p className="text-2xl font-bold text-purple-600 dark:text-purple-400">
                    {profile.stats.total_exercises_created}
                  </p>
                  <p className="text-sm text-gray-600 dark:text-gray-300">
                    {t('profile.exercisesCreated')}
                  </p>
                </div>
                <div className="text-center p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                  <p className="text-2xl font-bold text-orange-600 dark:text-orange-400">
                    {profile.stats.total_workouts_created}
                  </p>
                  <p className="text-sm text-gray-600 dark:text-gray-300">
                    {t('profile.workoutsCreated')}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Member Since */}
          <div className="border-t border-gray-200 dark:border-gray-700 pt-4 mt-4">
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {t('profile.memberSince', { 
                date: new Date(profile.join_date).toLocaleDateString() 
              })}
            </p>
          </div>
        </div>

        {/* Connections List Modal/Overlay */}
        {showConnectionsList && connections.length > 0 && (
          <div className="fixed inset-0 z-50 bg-black bg-opacity-50 flex items-center justify-center p-4">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-md max-h-[80vh] overflow-hidden">
              <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  {t('profile.connections')}
                </h3>
                <button
                  onClick={() => setShowConnectionsList(false)}
                  className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                  aria-label={t('common:close')}
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <div className="overflow-y-auto max-h-96">
                {connections.map((connection) => (
                  <button
                    key={connection.id}
                    onClick={() => handleConnectionProfile(connection.connected_user_id)}
                    className="w-full p-4 text-left hover:bg-gray-50 dark:hover:bg-gray-700 border-b border-gray-100 dark:border-gray-700 last:border-b-0 transition-colors"
                  >
                    <div className="flex items-center space-x-3">
                      <div className="h-10 w-10 rounded-full bg-blue-600 dark:bg-blue-700 flex items-center justify-center text-white text-sm font-medium">
                        {connection.nickname ? connection.nickname.charAt(0).toUpperCase() : '?'}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-gray-900 dark:text-white truncate">
                          {connection.nickname || t('profile.unknownUser')}
                        </p>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          {t('profile.connectedSince', { 
                            date: connection.accepted_at 
                              ? new Date(connection.accepted_at).toLocaleDateString() 
                              : t('profile.pending')
                          })}
                        </p>
                      </div>
                      <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ProfilePage;