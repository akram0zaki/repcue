import { supabase } from '../config/supabase';
import type { UserFavorite } from '../types';

/**
 * Service for managing unified favorites system
 * Handles both builtin exercises (slug IDs) and user-created content (UUID IDs)
 */
export class FavoritesService {
  private static instance: FavoritesService;
  private favorites: Map<string, UserFavorite> = new Map();

  private constructor() {}

  public static getInstance(): FavoritesService {
    if (!FavoritesService.instance) {
      FavoritesService.instance = new FavoritesService();
    }
    return FavoritesService.instance;
  }

  /**
   * Get current user ID from auth
   */
  private async getCurrentUserId(): Promise<string | null> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      return user?.id || null;
    } catch {
      return null;
    }
  }

  /**
   * Check if an item is favorited
   */
  public async isFavorite(itemId: string): Promise<boolean> {
    const userId = await this.getCurrentUserId();
    if (!userId || !supabase) return false;

    try {
      const { data, error } = await supabase
        .from('user_favorites')
        .select('id')
        .eq('user_id', userId)
        .eq('item_id', itemId)
        .eq('deleted', false)
        .single();

      return !error && !!data;
    } catch (error) {
      console.error('Error checking favorite status:', error);
      return false;
    }
  }

  /**
   * Toggle favorite status for an item
   */
  public async toggleFavorite(
    itemId: string, 
    itemType: 'exercise' | 'workout' = 'exercise',
    exerciseType: 'builtin' | 'user_created' | 'shared' = 'builtin'
  ): Promise<boolean> {
    const userId = await this.getCurrentUserId();
    if (!userId || !supabase) {
      throw new Error('User not authenticated');
    }

    try {
      // Check if already favorited
      const existing = await this.isFavorite(itemId);
      
      if (existing) {
        // Remove from favorites (soft delete)
        const { error } = await supabase
          .from('user_favorites')
          .update({ 
            deleted: true, 
            updated_at: new Date().toISOString() 
          })
          .eq('user_id', userId)
          .eq('item_id', itemId);

        if (error) throw error;
        
        // Remove from local cache
        this.favorites.delete(`${userId}:${itemId}`);
        return false;
      } else {
        // Add to favorites
        const favoriteData = {
          id: crypto.randomUUID(),
          user_id: userId,
          item_id: itemId,
          item_type: itemType,
          exercise_type: exerciseType,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          deleted: false,
          version: 1,
        };

        const { error } = await supabase
          .from('user_favorites')
          .upsert(favoriteData);

        if (error) throw error;

        // Add to local cache
        this.favorites.set(`${userId}:${itemId}`, favoriteData);
        return true;
      }
    } catch (error) {
      console.error('Error toggling favorite:', error);
      throw error;
    }
  }

  /**
   * Get all favorites for current user
   */
  public async getFavorites(): Promise<UserFavorite[]> {
    const userId = await this.getCurrentUserId();
    if (!userId || !supabase) return [];

    try {
      const { data, error } = await supabase
        .from('user_favorites')
        .select('*')
        .eq('user_id', userId)
        .eq('deleted', false)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Update local cache
      this.favorites.clear();
      data?.forEach(fav => {
        // Transform to match UserFavorite type
        const userFavorite: UserFavorite = {
          ...fav,
          item_type: (fav.item_type as 'exercise' | 'workout') || 'exercise',
          exercise_type: (fav.exercise_type as 'builtin' | 'user_created' | 'shared') || 'builtin',
          created_at: fav.created_at || new Date().toISOString(),
          updated_at: fav.updated_at || new Date().toISOString(),
          version: fav.version || 1
        };
        this.favorites.set(`${userId}:${fav.item_id}`, userFavorite);
      });

      return (data || []).map(fav => ({
        ...fav,
        item_type: (fav.item_type as 'exercise' | 'workout') || 'exercise',
        exercise_type: (fav.exercise_type as 'builtin' | 'user_created' | 'shared') || 'builtin',
        created_at: fav.created_at || new Date().toISOString(),
        updated_at: fav.updated_at || new Date().toISOString(),
        version: fav.version || 1
      }));
    } catch (error) {
      console.error('Error getting favorites:', error);
      return [];
    }
  }

  /**
   * Get favorites by type
   */
  public async getFavoritesByType(itemType: 'exercise' | 'workout'): Promise<UserFavorite[]> {
    const allFavorites = await this.getFavorites();
    return allFavorites.filter(fav => fav.item_type === itemType);
  }

  /**
   * Get favorite exercise IDs (for compatibility with existing code)
   */
  public async getFavoriteExerciseIds(): Promise<string[]> {
    const favorites = await this.getFavoritesByType('exercise');
    return favorites.map(fav => fav.item_id);
  }

  /**
   * Bulk check favorites status
   */
  public async checkFavorites(itemIds: string[]): Promise<Record<string, boolean>> {
    const userId = await this.getCurrentUserId();
    if (!userId || !supabase || itemIds.length === 0) {
      return itemIds.reduce((acc, id) => ({ ...acc, [id]: false }), {});
    }

    try {
      const { data, error } = await supabase
        .from('user_favorites')
        .select('item_id')
        .eq('user_id', userId)
        .in('item_id', itemIds)
        .eq('deleted', false);

      if (error) throw error;

      const favoriteIds = new Set(data?.map(fav => fav.item_id) || []);
      return itemIds.reduce((acc, id) => ({ 
        ...acc, 
        [id]: favoriteIds.has(id) 
      }), {});
    } catch (error) {
      console.error('Error bulk checking favorites:', error);
      return itemIds.reduce((acc, id) => ({ ...acc, [id]: false }), {});
    }
  }

  /**
   * Clear local cache (useful when user logs out)
   */
  public clearCache(): void {
    this.favorites.clear();
  }
}

// Export singleton instance
export const favoritesService = FavoritesService.getInstance();