import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import type { UserProfile, Connection } from '../types';
import { profileService } from '../services/profileService';
import { StorageService } from '../services/storageService';
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
  const [editingName, setEditingName] = useState(false);
  const [nameValue, setNameValue] = useState('');
  const [editingBirthYear, setEditingBirthYear] = useState(false);
  const [birthYearValue, setBirthYearValue] = useState<number | ''>('');

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
        const storageService = StorageService.getInstance();
        
        if (isViewingOwnProfile) {
          // Load unified profile from storage
          let profileData = await storageService.getUserProfile();
          
          // Create initial profile if it doesn't exist
          if (!profileData && user?.id) {
            logger.log('Creating initial profile for user');
            const initialProfile: Partial<UserProfile> = {
              user_id: user.id,
              name: user.displayName || undefined,
              join_date: new Date().toISOString(),
            };
            
            const saved = await storageService.saveUserProfile(initialProfile);
            if (saved) {
              profileData = await storageService.getUserProfile();
            }
          }
          
          setProfile(profileData);
          setNameValue(profileData?.name || '');
          setBirthYearValue(profileData?.birth_year || '');
          
          logger.log('[ProfilePage] Loaded profile:', {
            hasProfile: !!profileData,
            hasFitness: !!profileData?.fitness,
            fitnessKeys: profileData?.fitness ? Object.keys(profileData.fitness) : [],
            fitness: profileData?.fitness
          });
        } else {
          // Load from profile service for other users
          const profileData = await profileService.getUserProfile(targetUserId);
          setProfile(profileData);
        }
        
        const connectionsData = await profileService.getUserConnections(targetUserId);
        setConnections(connectionsData || []);
        setConnectionsCount((connectionsData || []).length);
      } catch (error) {
        logger.error('Failed to load profile:', error);
      } finally {
        setLoading(false);
      }
    };

    loadProfile();
  }, [targetUserId, isViewingOwnProfile, user?.id, user?.displayName]);

  const handleConnectionsClick = () => {
    if (connectionsCount > 0) {
      setShowConnectionsList(true);
    }
  };

  const handleConnectionProfile = (connectionUserId: string) => {
    navigate(`/profile/${connectionUserId}`);
    setShowConnectionsList(false);
  };

  const handleSaveName = async () => {
    try {
      const storageService = StorageService.getInstance();
      const updatedProfile: Partial<UserProfile> = {
        ...profile,
        name: nameValue,
        user_id: user?.id || '',
      };
      
      await storageService.saveUserProfile(updatedProfile as UserProfile);
      setProfile(prev => prev ? { ...prev, name: nameValue } : null);
      setEditingName(false);
      logger.log('Profile name updated successfully');
    } catch (error) {
      logger.error('Failed to update profile name:', error);
    }
  };

  const handleCancelEdit = () => {
    setNameValue(profile?.name || '');
    setEditingName(false);
  };

  const handleSaveBirthYear = async () => {
    try {
      if (birthYearValue === '' || birthYearValue < 1900 || birthYearValue > new Date().getFullYear()) {
        return;
      }

      const storageService = StorageService.getInstance();
      const updatedProfile: Partial<UserProfile> = {
        ...profile,
        birth_year: Number(birthYearValue),
        user_id: user?.id || '',
      };
      
      await storageService.saveUserProfile(updatedProfile as UserProfile);
      setProfile(prev => prev ? { ...prev, birth_year: Number(birthYearValue) } : null);
      setEditingBirthYear(false);
      logger.log('Profile birth year updated successfully');
    } catch (error) {
      logger.error('Failed to update profile birth year:', error);
    }
  };

  const handleCancelBirthYearEdit = () => {
    setBirthYearValue(profile?.birth_year || '');
    setEditingBirthYear(false);
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
      <div className="min-h-screen pt-safe pb-20 bg-surface-secondary">
        <div className="container mx-auto px-4 py-8 max-w-md text-center">
          <div className="bg-surface-0 dark:bg-surface-800 rounded-lg shadow-lg p-8">
            <h1 className="text-h3 mb-4">
              {t('profile.signInRequired')}
            </h1>
            <p className="text-body mb-6">
              {t('profile.signInToViewProfile')}
            </p>
            <button
              onClick={() => navigate('/settings')}
              className="w-full btn-primary"
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
      <div className="min-h-screen pt-safe pb-20 bg-surface-secondary">
        <div className="container mx-auto px-4 py-8 max-w-md">
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen pt-safe pb-20 bg-surface-secondary">
        <div className="container mx-auto px-4 py-8 max-w-md text-center">
          <div className="bg-surface-0 dark:bg-surface-800 rounded-lg shadow-lg p-8">
            <h1 className="text-h3 mb-4">
              {t('profile.notFound')}
            </h1>
            <p className="text-body mb-6">
              {t('profile.profileNotFoundMessage')}
            </p>
            <button
              onClick={() => navigate(-1)}
              className="w-full btn-neutral"
            >
              {t('common.goBack')}
            </button>
          </div>
        </div>
      </div>
    );
  }

  const displayName = profile.name || user?.displayName || user?.email?.split('@')[0] || t('profile.anonymous');
  const initials = getInitials(profile.name, user?.email);

  return (
    <div className="min-h-screen pt-safe pb-20 bg-surface-secondary">
      <div className="container mx-auto px-4 py-4 max-w-md">
        {/* Header */}
        <div className="mb-4">
          <h1 className="text-h1">
            {isViewingOwnProfile ? t('profile.myProfile') : t('profile.profile')}
          </h1>
        </div>

        {/* Profile Card */}
        <div className="bg-surface-0 dark:bg-surface-800 rounded-lg shadow-sm border border-surface-200 dark:border-surface-700 p-6 mb-4">
          {/* Avatar and Basic Info */}
          <div className="flex items-start gap-4 mb-6">
            {user?.avatarUrl ? (
              <img
                src={user.avatarUrl}
                alt={displayName}
                className="h-16 w-16 rounded-full object-cover flex-shrink-0"
              />
            ) : (
              <div className="h-16 w-16 rounded-full bg-primary text-white flex items-center justify-center text-xl font-medium flex-shrink-0">
                {initials}
              </div>
            )}
            <div className="flex-1 min-w-0">
              <h2 className="text-h3 mb-1 break-words">
                {displayName}
              </h2>
              {user?.email && (
                <p className="text-caption text-text-600 dark:text-text-400 break-all">
                  {user.email}
                </p>
              )}
            </div>
          </div>

          {/* Name Field (Editable for own profile) */}
          {isViewingOwnProfile && (
            <div className="mb-4 pb-4 border-b border-surface-200 dark:border-surface-700">
              <div className="flex items-center justify-between mb-2">
                <label className="block text-sm font-medium text-text-900 dark:text-text-50">{t('profile:name')}</label>
                {!editingName && (
                  <button
                    onClick={() => setEditingName(true)}
                    className="text-sm text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300 hover:underline transition-colors font-medium"
                  >
                    {t('profile:edit')}
                  </button>
                )}
              </div>
              {editingName ? (
                <div className="flex flex-col sm:flex-row gap-2">
                  <input
                    type="text"
                    value={nameValue}
                    onChange={(e) => setNameValue(e.target.value)}
                    className="flex-1 px-3 py-2 border border-surface-200 dark:border-surface-700 rounded-lg bg-surface-0 dark:bg-surface-900 text-text-900 dark:text-text-50"
                    placeholder={t('profile:enterName')}
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={handleSaveName}
                      className="flex-1 sm:flex-none px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-dark transition-colors whitespace-nowrap text-sm"
                    >
                      {t('profile:save')}
                    </button>
                    <button
                      onClick={handleCancelEdit}
                      className="flex-1 sm:flex-none px-4 py-2 bg-surface-200 dark:bg-surface-700 text-text-900 dark:text-text-50 rounded-lg hover:bg-surface-300 dark:hover:bg-surface-600 transition-colors whitespace-nowrap text-sm"
                    >
                      {t('profile:cancel')}
                    </button>
                  </div>
                </div>
              ) : (
                <p className="text-body">
                  {profile?.name || t('profile:notSet')}
                </p>
              )}
            </div>
          )}

          {/* Birth Year Field (Editable for own profile) */}
          {isViewingOwnProfile && (
            <div className="mb-4 pb-4 border-b border-surface-200 dark:border-surface-700">
              <div className="flex items-center justify-between mb-2">
                <label className="block text-sm font-medium text-text-900 dark:text-text-50">{t('profile:birthYear')}</label>
                {!editingBirthYear && (
                  <button
                    onClick={() => setEditingBirthYear(true)}
                    className="text-sm text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300 hover:underline transition-colors font-medium"
                  >
                    {t('profile:edit')}
                  </button>
                )}
              </div>
              {editingBirthYear ? (
                <div className="flex flex-col sm:flex-row gap-2">
                  <input
                    type="number"
                    value={birthYearValue}
                    onChange={(e) => setBirthYearValue(e.target.value ? Number(e.target.value) : '')}
                    min="1900"
                    max={new Date().getFullYear()}
                    className="flex-1 px-3 py-2 border border-surface-200 dark:border-surface-700 rounded-lg bg-surface-0 dark:bg-surface-900 text-text-900 dark:text-text-50"
                    placeholder="YYYY"
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={handleSaveBirthYear}
                      className="flex-1 sm:flex-none px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-dark transition-colors whitespace-nowrap text-sm"
                    >
                      {t('profile:save')}
                    </button>
                    <button
                      onClick={handleCancelBirthYearEdit}
                      className="flex-1 sm:flex-none px-4 py-2 bg-surface-200 dark:bg-surface-700 text-text-900 dark:text-text-50 rounded-lg hover:bg-surface-300 dark:hover:bg-surface-600 transition-colors whitespace-nowrap text-sm"
                    >
                      {t('profile:cancel')}
                    </button>
                  </div>
                </div>
              ) : (
                <p className="text-body">
                  {profile?.birth_year 
                    ? `${profile.birth_year} (${t('profile:yearsOld', { count: new Date().getFullYear() - profile.birth_year })})`
                    : t('profile:notSet')
                  }
                </p>
              )}
            </div>
          )}

          {/* Bio (if present) */}
          {profile?.social?.bio && (
            <div className="mb-4 pb-4 border-b border-surface-200 dark:border-surface-700">
              <label className="block text-sm font-medium mb-2">{t('profile:bio')}</label>
              <p className="text-body">
                {profile.social.bio}
              </p>
            </div>
          )}

          {/* Connections Section */}
          <div className="mb-4 pb-4 border-b border-surface-200 dark:border-surface-700">
            <button
              onClick={handleConnectionsClick}
              className="flex items-center justify-between w-full p-3 bg-surface-100 dark:bg-surface-700 rounded-lg hover:bg-surface-200 dark:hover:bg-surface-600 transition-colors"
              disabled={connectionsCount === 0}
            >
              <div className="flex items-center gap-3">
                <svg className="w-6 h-6 text-primary-600 dark:text-primary-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
                <div className="text-left">
                  <p className="font-medium text-text-900 dark:text-text-50">
                    {t('profile:connections')}
                  </p>
                  <p className="text-caption help-text">
                    {t('profile.connectionsCount', { count: connectionsCount })}
                  </p>
                </div>
              </div>
              {connectionsCount > 0 && (
                <svg className="w-5 h-5 text-tertiary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              )}
            </button>
          </div>

          {/* Member Since */}
          {profile?.join_date && (
            <p className="text-small help-text text-center">
              {t('profile:memberSince', { 
                date: new Date(profile.join_date).toLocaleDateString() 
              })}
            </p>
          )}
        </div>

        {/* Statistics Card - Always visible with real data */}
        <div className="bg-surface-0 dark:bg-surface-800 rounded-lg shadow-lg p-6 mb-4">
          <h2 className="text-h2 mb-4">{t('profile:statistics')}</h2>
          <div className="grid grid-cols-2 gap-4">
            <div className="text-center p-3 bg-surface-50 dark:bg-surface-700 rounded-lg">
              <p className="text-2xl font-bold text-primary">
                {profile?.social?.stats?.total_workouts || 0}
              </p>
              <p className="text-caption help-text">
                {t('profile:totalWorkouts')}
              </p>
            </div>
            <div className="text-center p-3 bg-surface-50 dark:bg-surface-700 rounded-lg">
              <p className="text-2xl font-bold text-success">
                {profile?.social?.stats?.streak_days || 0}
              </p>
              <p className="text-caption help-text">
                {t('profile:currentStreak')}
              </p>
            </div>
            <div className="text-center p-3 bg-surface-50 dark:bg-surface-700 rounded-lg">
              <p className="text-2xl font-bold text-primary">
                {profile?.social?.stats?.total_exercises_created || 0}
              </p>
              <p className="text-caption help-text">
                {t('profile:exercisesCreated')}
              </p>
            </div>
            <div className="text-center p-3 bg-surface-50 dark:bg-surface-700 rounded-lg">
              <p className="text-2xl font-bold text-warning">
                {profile?.social?.stats?.total_workouts_created || 0}
              </p>
              <p className="text-caption help-text">
                {t('profile:workoutsCreated')}
              </p>
            </div>
          </div>
        </div>

        {/* Fitness Profile Card */}
        {isViewingOwnProfile && (
          <div className="bg-surface-0 dark:bg-surface-800 rounded-lg shadow-sm border border-surface-200 dark:border-surface-700 p-6 mb-4">
            <h2 className="text-h2 mb-4">{t('profile:fitnessProfile')}</h2>

            {/* Gender */}
            {profile?.gender && (
              <div className="mb-4">
                <label className="block text-sm font-medium mb-2">{t('profile:gender')}</label>
                <p className="text-body capitalize">{profile.gender}</p>
              </div>
            )}

            {/* Age */}
            {profile?.birth_year && (
              <div className="mb-4">
                <label className="block text-sm font-medium mb-2">{t('profile:age')}</label>
                <p className="text-body">
                  {t('profile:yearsOld', { count: new Date().getFullYear() - profile.birth_year })}
                </p>
              </div>
            )}

            {/* Height */}
            {profile?.fitness?.height && (
              <div className="mb-4">
                <label className="block text-sm font-medium mb-2">{t('profile:height')}</label>
                <p className="text-body">
                  {profile.fitness.height.unit === 'cm' 
                    ? `${profile.fitness.height.value} cm`
                    : `${profile.fitness.height.value} ft ${profile.fitness.height.inches || 0} in`
                  }
                </p>
              </div>
            )}

            {/* Weight */}
            {profile?.fitness?.weight && (
              <div className="mb-4">
                <label className="block text-sm font-medium mb-2">{t('profile:weight')}</label>
                <p className="text-body">
                  {profile.fitness.weight.value} {profile.fitness.weight.unit}
                </p>
              </div>
            )}

            {/* Primary Goals */}
            {profile?.fitness?.primary_goals && profile.fitness.primary_goals.length > 0 && (
              <div className="mb-4">
                <label className="block text-sm font-medium mb-2">{t('profile:fitnessGoals')}</label>
                <div className="flex flex-wrap gap-2">
                  {profile.fitness.primary_goals.map((goal) => (
                    <span
                      key={goal}
                      className="px-3 py-1 bg-primary/10 text-primary rounded-full text-sm"
                    >
                      {t(`profile:goalLabels.${goal}`)}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Training Frequency */}
            {profile?.fitness?.training_frequency && (
              <div className="mb-4">
                <label className="block text-sm font-medium mb-2">{t('profile:trainingFrequency')}</label>
                <p className="text-body">
                  {t(`profile:trainingFrequencyLabels.${profile.fitness.training_frequency}`)}
                </p>
              </div>
            )}

            {/* Training Style */}
            {profile?.fitness?.preferred_training_style && (
              <div className="mb-4">
                <label className="block text-sm font-medium mb-2">{t('profile:preferredTrainingStyle')}</label>
                <p className="text-body">
                  {t(`profile:trainingStyleLabels.${profile.fitness.preferred_training_style}`)}
                </p>
              </div>
            )}

            {!profile?.fitness && (
              <p className="text-body help-text text-center py-4">
                {t('profile:noFitnessData')}
              </p>
            )}
          </div>
        )}

        {/* Connections List Modal/Overlay */}
        {showConnectionsList && connections.length > 0 && (
          <div className="fixed inset-0 z-50 bg-black bg-opacity-50 flex items-center justify-center p-4">
            <div className="bg-surface-0 dark:bg-surface-800 rounded-lg shadow-xl w-full max-w-md max-h-[80vh] overflow-hidden">
              <div className="flex items-center justify-between p-4 border-b border-surface-200 dark:border-surface-700">
                <h3 className="text-h3">
                  {t('profile.connections')}
                </h3>
                <button
                  onClick={() => setShowConnectionsList(false)}
                  className="p-2 text-tertiary hover:text-primary transition-colors"
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
                    className="w-full p-4 text-left hover:bg-surface-50 dark:hover:bg-surface-700 border-b border-surface-100 dark:border-surface-700 last:border-b-0 transition-colors"
                  >
                    <div className="flex items-center space-x-3">
                      <div className="h-10 w-10 rounded-full bg-primary text-white flex items-center justify-center text-sm font-medium">
                        {connection.nickname ? connection.nickname.charAt(0).toUpperCase() : '?'}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-text-900 dark:text-text-50 truncate">
                          {connection.nickname || t('profile.unknownUser')}
                        </p>
                        <p className="text-caption help-text">
                          {t('profile.connectedSince', { 
                            date: connection.accepted_at 
                              ? new Date(connection.accepted_at).toLocaleDateString() 
                              : t('profile.pending')
                          })}
                        </p>
                      </div>
                      <svg className="w-5 h-5 text-tertiary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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