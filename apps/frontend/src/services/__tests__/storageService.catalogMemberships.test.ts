import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { ExerciseType, type GlobalExercise, type CatalogMembership } from '../../types';

// IMPORTANT: Mock Dexie BEFORE importing StorageService to ensure constructor uses the mock

// Minimal Dexie mock focused on exercises + catalog_memberships usage paths
vi.mock('dexie', () => {
  class MockTable<T extends { id: string }> {
    private data: Map<string, T> = new Map();
    constructor(private name: string) {}
    put = vi.fn(async (record: T) => { this.data.set(record.id, record); });
    add = vi.fn(async (record: T) => { this.data.set(record.id, record); });
    get = vi.fn(async (id: string) => this.data.get(id) || null);
    update = vi.fn(async (id: string, changes: Partial<T>) => {
      const existing = this.data.get(id);
      if (existing) this.data.set(id, { ...existing, ...changes });
    });
    toArray = vi.fn(async () => Array.from(this.data.values()));
    clear = vi.fn(async () => { this.data.clear(); });
    count = vi.fn(async () => this.data.size);
    where(indexOrField: string) {
      const self = this;
      // Composite index path
      if (indexOrField === '[catalog_id+exercise_id]') {
        return {
          equals(tuple: [string, string]) {
            const [catalogId, exerciseId] = tuple;
            const match = Array.from(self.data.values()).filter((r: any) => r.catalog_id === catalogId && r.exercise_id === exerciseId);
            return { first: () => Promise.resolve(match[0] || null) } as any;
          }
        } as any;
      }
      return {
        equals(value: any) {
          let records: T[] = [];
          if (indexOrField === 'catalog_id') {
            records = Array.from(self.data.values()).filter((r: any) => r.catalog_id === value);
          } else if (indexOrField === 'exercise_id') {
            records = Array.from(self.data.values()).filter((r: any) => r.exercise_id === value);
          } else if (indexOrField === 'id') {
            records = Array.from(self.data.values()).filter((r: any) => r.id === value);
          }
          return {
            and(fn: (r: any) => boolean) {
              records = records.filter(fn);
              return {
                sortBy(sortField: string) {
                  if (sortField === 'display_order') {
                    return Promise.resolve(
                      [...records].sort((a: any, b: any) => {
                        const av = a.display_order ?? Number.MAX_SAFE_INTEGER;
                        const bv = b.display_order ?? Number.MAX_SAFE_INTEGER;
                        return av - bv;
                      })
                    );
                  }
                  return Promise.resolve(records);
                },
                toArray: () => Promise.resolve(records)
              };
            },
            first: () => Promise.resolve(records[0] || null),
            toArray: () => Promise.resolve(records)
          };
        },
        anyOf(values: any[]) {
          let records: T[] = [];
          if (indexOrField === 'id') {
            records = Array.from(self.data.values()).filter((r: any) => values.includes(r.id));
          }
            return {
              and(fn: (r: any) => boolean) {
                records = records.filter(fn);
                return { toArray: () => Promise.resolve(records) };
              },
              toArray: () => Promise.resolve(records)
            };
        }
      };
    }
  }

  return {
    default: vi.fn(() => {
      const db: any = {
        version: vi.fn(() => ({ stores: vi.fn(() => ({ upgrade: vi.fn() })) })),
        open: vi.fn().mockResolvedValue(undefined),
        exercises: new MockTable<any>('exercises'),
        catalog_memberships: new MockTable<any>('catalog_memberships'),
        transaction: vi.fn(async (_mode: string, _tables: any[], cb: () => Promise<void>) => cb())
      };
      return db;
    })
  };
});

// Mock consent service (grant by default; individual tests will override)
vi.mock('../consentService', () => ({
  consentService: {
    hasConsent: vi.fn()
  }
}));
import { consentService } from '../consentService';

// Mock auth service to supply a user id for ownership fields
vi.mock('../authService', () => ({
  authService: {
    getCurrentUser: vi.fn(() => ({ id: 'user-1' }))
  }
}));
import { authService } from '../authService';

// Import StorageService after mocks
import { StorageService } from '../storageService';

describe('StorageService catalog memberships', () => {
  let storage: StorageService;
  let exercise: GlobalExercise;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(consentService.hasConsent).mockReturnValue(true);
    // Reset singleton
    // @ts-expect-error private access in test
    StorageService.instance = undefined;
    storage = StorageService.getInstance();

    // Override db with focused mock tables (avoid relying on Dexie internals)
    const exerciseMap = new Map<string, any>();
    const membershipMap = new Map<string, any>();

    const exercises = {
      put: vi.fn(async (rec: any) => { exerciseMap.set(rec.id, rec); }),
      get: vi.fn(async (id: string) => exerciseMap.get(id) || null),
      update: vi.fn(async (id: string, changes: any) => {
        const ex = exerciseMap.get(id); if (ex) exerciseMap.set(id, { ...ex, ...changes });
      }),
      toArray: vi.fn(async () => Array.from(exerciseMap.values())),
      where(field: string) {
        return {
          anyOf: (ids: string[]) => {
            let records = Array.from(exerciseMap.values()).filter((r: any) => ids.includes(r.id));
            return {
              and: (fn: (r: any) => boolean) => ({ toArray: () => Promise.resolve(records.filter(fn)) })
            };
          }
        } as any;
      }
    } as any;

    const catalog_memberships = {
      add: vi.fn(async (rec: any) => { membershipMap.set(rec.id, rec); }),
      put: vi.fn(async (rec: any) => { membershipMap.set(rec.id, rec); }),
      get: vi.fn(async (id: string) => membershipMap.get(id) || null),
      where(index: string) {
        if (index === 'catalog_id') {
          return {
            equals: (catalogId: string) => {
              let records = Array.from(membershipMap.values()).filter((m: any) => m.catalog_id === catalogId);
              return {
                and: (fn: (r: any) => boolean) => ({
                  sortBy: async (field: string) => {
                    records = records.filter(fn);
                    if (field === 'display_order') {
                      return [...records].sort((a: any, b: any) => {
                        const av = a.display_order ?? Number.MAX_SAFE_INTEGER;
                        const bv = b.display_order ?? Number.MAX_SAFE_INTEGER;
                        return av - bv;
                      });
                    }
                    return records;
                  },
                  toArray: () => Promise.resolve(records.filter(fn))
                })
              };
            }
          } as any;
        }
        if (index === 'exercise_id') {
          return {
            equals: (exerciseId: string) => ({
              and: (fn: (r: any) => boolean) => ({ toArray: () => Promise.resolve(Array.from(membershipMap.values()).filter((m: any) => m.exercise_id === exerciseId).filter(fn)) })
            })
          } as any;
        }
        if (index === '[catalog_id+exercise_id]') {
          return {
            equals: ([catalogId, exerciseId]: [string, string]) => ({
              first: () => Promise.resolve(Array.from(membershipMap.values()).find((m: any) => m.catalog_id === catalogId && m.exercise_id === exerciseId) || null)
            })
          } as any;
        }
        return {} as any;
      }
    } as any;

    // @ts-expect-error override private for test
    storage.db = ({
      exercises,
      catalog_memberships
    } as any);

    exercise = {
      id: 'ex-1',
      name: 'Test Exercise',
      exercise_type: ExerciseType.REPETITION_BASED,
      is_favorite: false,
      base_tags: ['stability', 'category:core'],
      default_reps: 10,
      default_sets: 2,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      deleted: false,
      version: 1,
      op: 'upsert',
      owner_id: null
    };
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  async function seedExercise() {
    await storage.saveExercise(exercise as any); // saveExercise expects Exercise, compatible subset
  }

  it('adds, retrieves, updates and removes a catalog membership', async () => {
    await seedExercise();
    const membershipId = await storage.addExerciseToCatalog(exercise.id, 'catalog-A', {
      catalog_tags: ['kyu:6', 'equipment:bodyweight'],
      display_order: 2,
      featured: true
    });
    expect(membershipId).toBeTruthy();

    // Fetch by catalog
    const catalogMemberships = await storage.getCatalogMemberships('catalog-A');
    expect(catalogMemberships).toHaveLength(1);
    expect(catalogMemberships[0].catalog_tags).toContain('kyu:6');
    expect(catalogMemberships[0].display_order).toBe(2);
    expect(catalogMemberships[0].featured).toBe(true);
    expect(catalogMemberships[0].dirty).toBe(1);
    expect(catalogMemberships[0].op).toBe('upsert');
    expect(catalogMemberships[0].version).toBe(1);
    expect(catalogMemberships[0].owner_id).toBe('user-1');

    // getExercisesForCatalog merges tags
    const exercisesForCatalog = await storage.getExercisesForCatalog('catalog-A');
    expect(exercisesForCatalog).toHaveLength(1);
    expect(exercisesForCatalog[0].effectiveTags).toEqual([
      'stability', 'category:core', 'kyu:6', 'equipment:bodyweight'
    ]);

    // Update membership
    const updated = await storage.updateCatalogMembership(catalogMemberships[0].id, {
      catalog_tags: ['kyu:6', 'equipment:bodyweight', 'focus:balance'],
      display_order: 1,
      featured: false
    });
    expect(updated).toBe(true);
    const afterUpdate = await storage.getCatalogMemberships('catalog-A');
    expect(afterUpdate[0].display_order).toBe(1);
    expect(afterUpdate[0].featured).toBe(false);
    expect(afterUpdate[0].catalog_tags).toContain('focus:balance');

    // Remove membership
    const removed = await storage.removeExerciseFromCatalog(exercise.id, 'catalog-A');
    expect(removed).toBe(true);
    const afterRemove = await storage.getCatalogMemberships('catalog-A');
    expect(afterRemove).toHaveLength(0);
  });

  it('returns existing membership ID if already present (idempotent add)', async () => {
    await seedExercise();
    const firstId = await storage.addExerciseToCatalog(exercise.id, 'catalog-B');
    const secondId = await storage.addExerciseToCatalog(exercise.id, 'catalog-B');
    expect(secondId).toBe(firstId);
    const memberships = await storage.getCatalogMemberships('catalog-B');
    expect(memberships).toHaveLength(1);
  });

  it('sorts memberships by display_order ascending', async () => {
    await seedExercise();
    const exercise2: GlobalExercise = { ...exercise, id: 'ex-2', name: 'Second', base_tags: ['category:strength'], updated_at: new Date().toISOString(), created_at: new Date().toISOString() };
    await storage.saveExercise(exercise2 as any);
    await storage.addExerciseToCatalog(exercise.id, 'catalog-C', { display_order: 5 });
    await storage.addExerciseToCatalog(exercise2.id, 'catalog-C', { display_order: 1 });
    const memberships = await storage.getCatalogMemberships('catalog-C');
    expect(memberships.map(m => m.display_order)).toEqual([1, 5]);
  });

  it('returns empty results when consent denied', async () => {
    vi.mocked(consentService.hasConsent).mockReturnValue(false);
    const none = await storage.getCatalogMemberships('any');
    expect(none).toEqual([]);
    const addResult = await storage.addExerciseToCatalog('ex-X', 'catalog-X');
    expect(addResult).toBeNull();
  });
});
