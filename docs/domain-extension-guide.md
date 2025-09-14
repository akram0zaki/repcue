# Domain Extension Guide: Adding New Syncable Objects

## Overview

This guide provides step-by-step instructions for adding new domain objects that participate in the sync mechanism. Following these patterns ensures consistency, maintainability, and proper integration with the existing sync infrastructure.

## Architecture Pattern

The RepCue sync system uses a **unified snake_case schema** across all layers:
- **Client (IndexedDB)**: snake_case fields
- **Server (Supabase)**: snake_case fields  
- **Network (Edge Functions)**: snake_case fields

This eliminates the need for complex field mapping and ensures data consistency.

## Step-by-Step Implementation

### 1. Define TypeScript Interfaces

**Location**: `apps/frontend/src/types/index.ts`

#### Base Interface Pattern
All syncable objects must extend `SyncMetadata`:

```typescript
// Add your new domain interface
export interface YourDomainObject extends SyncMetadata {
  // Primary key - always use string UUIDs
  id: string;
  
  // Domain-specific fields (use snake_case)
  field_name: string;
  numeric_field: number;
  boolean_field: boolean;
  optional_field?: string;
  
  // Arrays and nested objects
  tags: string[];
  metadata?: Record<string, any>;
}

// Storage version for IndexedDB (identical to domain interface)
export interface StoredYourDomainObject extends YourDomainObject {
  // No additional fields needed - storage matches domain exactly
}
```

#### Naming Conventions
- **Interface names**: PascalCase (e.g., `WorkoutPlan`, `ExerciseSet`)
- **Field names**: snake_case (e.g., `created_at`, `is_active`, `owner_id`)
- **IDs**: Always `string` type for UUIDs
- **Timestamps**: ISO string format (e.g., `updated_at: string`)

### 2. Add Database Schema

**Location**: `apps/frontend/src/services/storageService.ts`

#### Update Dexie Schema
Add your table to the V6 schema definition:

```typescript
// Version 6: Unified snake_case schema matching server exactly
this.version(6).stores({
  // Existing tables...
  exercises: 'id, name, category, exercise_type, is_favorite, updated_at, created_at, owner_id, deleted, version, dirty',
  
  // Add your new table
  your_domain_objects: 'id, field_name, numeric_field, updated_at, created_at, owner_id, deleted, version, dirty',
}).upgrade(trans => {
  return this.migrateToUnifiedSchema(trans);
});
```

#### Schema Field Guidelines
- **Primary Key**: Always `id` (not `++id`)
- **Required Indexes**: `id, updated_at, created_at, owner_id, deleted, version, dirty`
- **Domain Indexes**: Add fields commonly used in queries
- **Field Types**: Let Dexie infer types from TypeScript interfaces

### 3. Add CRUD Methods to StorageService

**Location**: `apps/frontend/src/services/storageService.ts`

#### Save Method Pattern
```typescript
public async saveYourDomainObject(object: YourDomainObject): Promise<void> {
  if (!this.canStoreData()) {
    throw new Error('Cannot store data without user consent');
  }
  
  try {
    const objectId = object.id || crypto.randomUUID();
    const objectWithSync = prepareUpsert(object, objectId);
    
    const storedObject: StoredYourDomainObject = {
      ...objectWithSync,
      // Add any storage-specific transformations here if needed
    };
    
    await this.db.your_domain_objects.put(storedObject);
  } catch (error) {
    console.error('Failed to save your domain object to IndexedDB:', error);
    await this.fallbackSave(`your_domain_object_${objectId}`, storedObject);
  }
}
```

#### Get Methods Pattern
```typescript
public async getYourDomainObjects(limit?: number): Promise<YourDomainObject[]> {
  if (!this.canStoreData()) {
    return [];
  }
  
  try {
    let query = this.db.your_domain_objects.orderBy('updated_at').reverse();
    
    if (limit) {
      query = query.limit(limit);
    }
    
    const stored = await query.toArray();
    return stored.map(this.convertStoredYourDomainObject);
  } catch (error) {
    console.warn('Failed to load your domain objects from IndexedDB:', error);
    // Add fallback logic if needed
    return [];
  }
}

public async getYourDomainObject(id: string): Promise<YourDomainObject | null> {
  if (!this.canStoreData()) {
    return null;
  }
  
  try {
    const stored = await this.db.your_domain_objects.get(id);
    return stored ? this.convertStoredYourDomainObject(stored) : null;
  } catch (error) {
    console.warn('Failed to load your domain object from IndexedDB:', error);
    return null;
  }
}
```

#### Conversion Methods
```typescript
private convertStoredYourDomainObject(stored: StoredYourDomainObject): YourDomainObject {
  return {
    ...stored,
    // Add any conversion logic here (e.g., string to Date conversions)
    // Most fields should not need conversion with unified schema
  } as YourDomainObject;
}
```

#### Delete Method Pattern
```typescript
public async deleteYourDomainObject(id: string): Promise<void> {
  if (!this.canStoreData()) {
    throw new Error('Cannot delete data without user consent');
  }
  
  try {
    await this.db.your_domain_objects.update(id, {
      deleted: true,
      dirty: 1,
      op: 'delete',
      updated_at: new Date().toISOString()
    });
  } catch (error) {
    console.error('Failed to delete your domain object:', error);
    throw error;
  }
}
```

### 4. Update Sync Configuration

**Location**: `apps/frontend/src/services/syncService.ts`

#### Add to Syncable Tables
```typescript
const SYNCABLE_TABLES = [
  'user_preferences',
  'app_settings', 
  'exercises',
  'workouts',
  'activity_logs',
  'workout_sessions',
  'your_domain_objects'  // Add your table here
] as const;
```

#### Add Sync Methods
```typescript
private async syncYourDomainObjects(): Promise<SyncTableResult> {
  return this.syncTable(
    'your_domain_objects',
    () => this.storageService.getDirtyYourDomainObjects(),
    (records) => this.storageService.bulkUpsertYourDomainObjects(records),
    (ids) => this.storageService.bulkDeleteYourDomainObjects(ids)
  );
}
```

#### Add Dirty Records Method to StorageService
```typescript
public async getDirtyYourDomainObjects(): Promise<StoredYourDomainObject[]> {
  try {
    return await this.db.your_domain_objects
      .where('dirty').equals(1)
      .toArray();
  } catch (error) {
    console.warn('Failed to get dirty your domain objects:', error);
    return [];
  }
}
```

### 5. Update Server Schema

**Location**: `supabase/migrations/`

#### Create Migration File
```sql
-- Create new migration file: YYYYMMDD_add_your_domain_objects.sql
CREATE TABLE your_domain_objects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  field_name TEXT NOT NULL,
  numeric_field INTEGER NOT NULL DEFAULT 0,
  boolean_field BOOLEAN NOT NULL DEFAULT false,
  optional_field TEXT,
  tags TEXT[] DEFAULT '{}',
  metadata JSONB DEFAULT '{}',
  
  -- Sync metadata (required for all syncable tables)
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  owner_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  deleted BOOLEAN DEFAULT false,
  version INTEGER DEFAULT 1,
  
  -- Indexes for sync performance
  CONSTRAINT your_domain_objects_owner_not_null CHECK (owner_id IS NOT NULL)
);

-- Row Level Security
ALTER TABLE your_domain_objects ENABLE ROW LEVEL SECURITY;

-- Users can only access their own records
CREATE POLICY "Users can manage their own your_domain_objects"
  ON your_domain_objects FOR ALL
  USING (auth.uid() = owner_id)
  WITH CHECK (auth.uid() = owner_id);

-- Indexes for performance
CREATE INDEX idx_your_domain_objects_owner_id ON your_domain_objects(owner_id);
CREATE INDEX idx_your_domain_objects_updated_at ON your_domain_objects(updated_at);
CREATE INDEX idx_your_domain_objects_deleted ON your_domain_objects(deleted) WHERE NOT deleted;

-- Updated at trigger
CREATE TRIGGER set_your_domain_objects_updated_at
  BEFORE UPDATE ON your_domain_objects
  FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();
```

### 6. Update Edge Functions

**Location**: `supabase/functions/sync/index.ts`

#### Add to Syncable Tables
```typescript
const SYNCABLE_TABLES = [
  'user_preferences',
  'app_settings',
  'exercises', 
  'workouts',
  'activity_logs',
  'workout_sessions',
  'your_domain_objects'  // Add here
];
```

The existing sync logic will automatically handle your new table since it processes all tables in the `SYNCABLE_TABLES` array generically.

### 7. Add Test Coverage

**Location**: `apps/frontend/src/services/__tests__/`

#### Create Test File
```typescript
// storageService.yourDomainObjects.test.ts
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { StorageService } from '../storageService'
import type { YourDomainObject } from '../../types'

describe('StorageService - YourDomainObjects', () => {
  let storageService: StorageService
  
  beforeEach(() => {
    // Setup similar to existing tests
  })

  describe('saveYourDomainObject', () => {
    it('should save your domain object with sync metadata', async () => {
      const mockObject: YourDomainObject = {
        id: 'test-id',
        field_name: 'test-value',
        numeric_field: 42,
        boolean_field: true
      }
      
      await storageService.saveYourDomainObject(mockObject)
      
      expect(mockDb.your_domain_objects.put).toHaveBeenCalledWith({
        ...mockObject,
        id: expect.any(String),
        created_at: expect.any(String),
        updated_at: expect.any(String),
        owner_id: null,
        deleted: false,
        dirty: 1,
        op: 'upsert',
        version: 1
      })
    })
  })

  // Add more tests for get, delete, etc.
})
```

### 8. Update Export/Import Functions

**Location**: `apps/frontend/src/services/storageService.ts`

#### Update Export Method
```typescript
public async exportAllData(): Promise<Record<string, unknown[]>> {
  try {
    const status = await this.getMigrationStatus();
    const data: Record<string, unknown[]> = {};
    
    const tables = [
      'exercises', 
      'activity_logs', 
      'user_preferences', 
      'app_settings', 
      'workouts', 
      'workout_sessions',
      'your_domain_objects'  // Add here
    ];
    
    for (const tableName of tables) {
      try {
        data[tableName] = await this.db.table(tableName).toArray();
      } catch (error) {
        console.error(`Error exporting ${tableName}:`, error);
        data[tableName] = [];
      }
    }
    
    return {
      metadata: {
        exportTimestamp: new Date().toISOString(),
        databaseVersion: status.currentVersion,
        isV6Schema: status.isV6Schema,
        tableStats: status.tableStats
      },
      ...data
    };
  } catch (error) {
    console.error('Error exporting data:', error);
    throw error;
  }
}
```

## Important Considerations

### 1. Field Naming Rules
- **Always use snake_case**: `created_at`, not `createdAt`
- **Be descriptive**: `exercise_type`, not `type`
- **Avoid reserved words**: Use `is_active` instead of `active`
- **Consistent patterns**: `*_at` for timestamps, `is_*` for booleans

### 2. Sync Metadata Requirements
Every syncable object MUST have these fields:
```typescript
{
  id: string;           // UUID primary key
  created_at: string;   // ISO timestamp
  updated_at: string;   // ISO timestamp  
  owner_id: string | null;    // User ownership
  deleted: boolean;     // Soft delete flag
  dirty: number;        // Sync dirty flag (0 or 1)
  op: 'upsert' | 'delete';    // Last operation
  version: number;      // Optimistic concurrency
}
```

### 3. Performance Considerations
- **Index commonly queried fields**: Add them to the Dexie schema
- **Limit query results**: Use `limit()` for large datasets
- **Batch operations**: Use `bulkAdd/bulkUpdate` for multiple records
- **Avoid N+1 queries**: Fetch related data in batch operations

### 4. Security Guidelines
- **Never expose sensitive data**: No passwords, tokens, or PII in sync
- **Validate data**: Check required fields and data types
- **Sanitize inputs**: Prevent injection attacks
- **Use RLS**: All server tables must have Row Level Security

### 5. Testing Strategy
- **Unit tests**: Test CRUD operations with mocks
- **Integration tests**: Test sync flow end-to-end
- **Migration tests**: Test schema upgrades
- **Performance tests**: Test with large datasets

## Common Pitfalls to Avoid

### 1. Schema Mismatches
❌ **Wrong**: Mixed naming conventions
```typescript
interface BadExample {
  id: string;
  createdAt: string;    // camelCase - wrong!
  owner_id: string;     // snake_case - good!
}
```

✅ **Correct**: Consistent snake_case
```typescript
interface GoodExample {
  id: string;
  created_at: string;   // snake_case - correct!
  owner_id: string;     // snake_case - correct!
}
```

### 2. Missing Sync Metadata
❌ **Wrong**: Missing required sync fields
```typescript
interface BadExample {
  id: string;
  name: string;
  // Missing: created_at, updated_at, owner_id, deleted, etc.
}
```

✅ **Correct**: Extends SyncMetadata
```typescript
interface GoodExample extends SyncMetadata {
  id: string;
  name: string;
  // SyncMetadata provides all required sync fields
}
```

### 3. Incorrect Primary Keys
❌ **Wrong**: Auto-increment IDs
```typescript
// In Dexie schema
your_table: '++id, name'  // Wrong - creates integer auto-increment
```

✅ **Correct**: String UUID IDs
```typescript
// In Dexie schema
your_table: 'id, name'    // Correct - uses string UUIDs
```

### 4. Missing Error Handling
❌ **Wrong**: No error handling
```typescript
public async saveObject(obj: Object): Promise<void> {
  await this.db.objects.put(obj);  // What if this fails?
}
```

✅ **Correct**: Proper error handling with fallback
```typescript
public async saveObject(obj: Object): Promise<void> {
  try {
    await this.db.objects.put(obj);
  } catch (error) {
    console.error('Failed to save object:', error);
    await this.fallbackSave(`object_${obj.id}`, obj);
  }
}
```

## Validation Checklist

Before submitting your domain extension, verify:

- [ ] TypeScript interfaces extend `SyncMetadata`
- [ ] All field names use snake_case
- [ ] Dexie schema includes all required indexes
- [ ] CRUD methods follow established patterns
- [ ] Table added to `SYNCABLE_TABLES` array
- [ ] Server migration created with RLS policies
- [ ] Edge function updated (if needed)
- [ ] Test coverage added
- [ ] Export/import functions updated
- [ ] Error handling implemented
- [ ] Performance considerations addressed

## Example: Complete Implementation

See the existing `exercises` domain object as a complete reference implementation that follows all these patterns correctly.

## Getting Help

When implementing new domain objects:

1. **Start small**: Begin with basic CRUD operations
2. **Follow patterns**: Copy from existing implementations
3. **Test thoroughly**: Verify sync works end-to-end  
4. **Ask questions**: Consult team members early
5. **Review carefully**: Double-check naming and schema consistency

This guide ensures all future domain extensions maintain consistency with the established sync architecture and patterns.