import { useEffect, useMemo, useState } from 'react';
import { storageService } from '../services/storageService';
import { syncService } from '../services/syncService';
import type { CatalogMembership, GlobalExercise } from '../types';

/**
 * Developer tools page for testing and debugging
 * Access at /dev-tools route
 */
export default function DevToolsPage() {
  const [dbVersion, setDbVersion] = useState<number | null>(null);
  const [status, setStatus] = useState<string>('');
  const [catalogMemberships, setCatalogMemberships] = useState<number>(0);
  // Membership inspector state
  const [selectedCatalog, setSelectedCatalog] = useState<string>('general-fitness');
  const [exerciseQuery, setExerciseQuery] = useState<string>('');
  const [exercises, setExercises] = useState<GlobalExercise[]>([]);
  const [memberships, setMemberships] = useState<CatalogMembership[]>([]);
  const [isLoadingList, setIsLoadingList] = useState(false);
  // Sync inspector state
  const [syncStatus, setSyncStatus] = useState(syncService.getSyncStatus());
  const [lastSyncResult, setLastSyncResult] = useState<null | { success: boolean; pushed: number; pulled: number; tables: number; errors: number }>(null);
  const [syncCardMsg, setSyncCardMsg] = useState<string>('');

  useEffect(() => {
    const unsubscribe = syncService.onSyncStatusChange((st) => {
      setSyncStatus(st);
    });
    return () => { unsubscribe(); };
  }, []);
  const catalogOptions = useMemo(
    () => [
      { id: 'general-fitness', label: 'General Fitness' },
      { id: 'women-health', label: "Women's Health" },
      { id: 'tai-chi', label: 'Tai Chi' },
      { id: 'aikido', label: 'Aikido' },
      { id: 'zumba', label: 'Zumba' }
    ],
    []
  );

  const checkDatabaseVersion = async () => {
    try {
      const dbs = await indexedDB.databases();
      const repCueDb = dbs.find(db => db.name === 'RepCueDB');
      setDbVersion(repCueDb?.version || null);
      setStatus(`Database version: ${repCueDb?.version || 'Not found'}`);
    } catch (error) {
      setStatus(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const checkCatalogMemberships = async () => {
    try {
      // Try to access the table
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const db = await (storageService as any).db;
      const count = await db.catalog_memberships.count();
      setCatalogMemberships(count);
      setStatus(`Found ${count} catalog memberships in IndexedDB`);
    } catch (error) {
      setStatus(`Error accessing catalog_memberships: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const refreshMembershipInspector = async () => {
    try {
      setIsLoadingList(true);
      // Load exercises quickly (global list)
      const all = await storageService.getExercisesFast();
      // Filter by query (id or name contains)
      const q = exerciseQuery.trim().toLowerCase();
      const filtered = (all as Array<{ id?: string; name?: string }>).filter((e) => {
        const id = String(e.id || '').toLowerCase();
        const name = String(e.name || '').toLowerCase();
        return q ? id.includes(q) || name.includes(q) : true;
      }) as GlobalExercise[];
      setExercises(filtered.slice(0, 50)); // cap list for view

      // Load memberships for the selected catalog
      const mems = await storageService.getCatalogMemberships(selectedCatalog);
      setMemberships(mems);
    } finally {
      setIsLoadingList(false);
    }
  };

  const addMembership = async (exerciseId: string) => {
    await storageService.addExerciseToCatalog(exerciseId, selectedCatalog, { catalog_tags: [] });
    await refreshMembershipInspector();
    setStatus(`Added ${exerciseId} to ${selectedCatalog}`);
  };

  const removeMembership = async (exerciseId: string) => {
    await storageService.removeExerciseFromCatalog(exerciseId, selectedCatalog);
    await refreshMembershipInspector();
    setStatus(`Removed ${exerciseId} from ${selectedCatalog}`);
  };

  const isInCatalog = (exerciseId: string) =>
    memberships.some((m) => m.exercise_id === exerciseId && !m.deleted);

  const forceUpgrade = async () => {
    try {
      setStatus('Closing database connection...');
      
      // Close the Dexie instance
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (storageService as any).db.close();
      
      setStatus('Database closed. Deleting RepCueDB...');
      
      // Delete the database
      await new Promise<void>((resolve, reject) => {
        const request = indexedDB.deleteDatabase('RepCueDB');
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
      });
      
      setStatus('Database deleted. Reloading page to recreate at v25...');
      
      // Wait a moment then reload
      setTimeout(() => {
        window.location.reload();
      }, 1000);
    } catch (error) {
      setStatus(`Error during force upgrade: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const reopenDatabase = async () => {
    try {
      setStatus('Attempting to reopen database...');
      
      // Close current connection
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (storageService as any).db.close();
      
      setStatus('Database closed. Reopening...');
      
      // Try to reopen - this should trigger upgrade
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (storageService as any).db.open();
      
      // Check version again
      await checkDatabaseVersion();
      
      setStatus('Database reopened. Check version above.');
    } catch (error) {
      setStatus(`Error reopening database: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  return (
    <div className="container mx-auto p-4 max-w-2xl">
      <h1 className="text-2xl font-bold mb-6">Developer Tools</h1>
      
      <div className="space-y-4">
        <div className="card p-4 bg-base-200">
          <h2 className="text-xl font-semibold mb-4">Database Version</h2>
          
          {dbVersion !== null && (
            <div className="alert alert-info mb-4">
              <span>Current Version: {dbVersion} (v{Math.floor(dbVersion / 10)})</span>
            </div>
          )}
          
          <div className="flex flex-wrap gap-2">
            <button 
              onClick={checkDatabaseVersion}
              className="btn btn-primary"
            >
              Check Version
            </button>
            
            <button 
              onClick={checkCatalogMemberships}
              className="btn btn-secondary"
            >
              Check Catalog Memberships Table
            </button>
            
            <button 
              onClick={reopenDatabase}
              className="btn btn-warning"
            >
              Reopen Database
            </button>
            
            <button 
              onClick={forceUpgrade}
              className="btn btn-error"
            >
              Force Upgrade (Delete & Recreate)
            </button>
          </div>
        </div>
        
        <div className="card p-4 bg-base-200">
          <h2 className="text-xl font-semibold mb-2">Status</h2>
          <div className="alert">
            <span>{status || 'No operations performed yet'}</span>
          </div>
          
          {catalogMemberships > 0 && (
            <div className="alert alert-success mt-2">
              <span>✅ catalog_memberships table exists with {catalogMemberships} records</span>
            </div>
          )}
        </div>

        <div className="card p-4 bg-base-200">
          <h2 className="text-xl font-semibold mb-4">Membership Inspector</h2>
          <div className="flex flex-col md:flex-row gap-2 mb-3">
            <label className="flex flex-col w-full md:w-64 text-xs font-semibold">
              <span className="mb-1">Catalog</span>
              <select
                aria-label="Select catalog"
                className="select select-bordered w-full"
                value={selectedCatalog}
                onChange={(e) => setSelectedCatalog(e.target.value)}
              >
              {catalogOptions.map((c) => (
                <option key={c.id} value={c.id}>{c.label}</option>
              ))}
              </select>
            </label>
            <input
              className="input input-bordered w-full md:flex-1"
              placeholder="Filter exercises by id or name"
              value={exerciseQuery}
              onChange={(e) => setExerciseQuery(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') { void refreshMembershipInspector(); } }}
            />
            <button className="btn btn-primary" onClick={() => void refreshMembershipInspector()} disabled={isLoadingList}>
              {isLoadingList ? 'Loading…' : 'Refresh'}
            </button>
          </div>
          <div className="text-sm opacity-70 mb-2">Showing up to 50 exercises. Green = in catalog.</div>
          <div className="max-h-96 overflow-auto divide-y">
            {exercises.map((ex) => {
              const exWithId = ex as GlobalExercise & { id: string; name: string };
              const inCat = isInCatalog(exWithId.id);
              return (
                <div key={exWithId.id} className="flex items-center justify-between py-2">
                  <div className="truncate">
                    <div className={`font-medium ${inCat ? 'text-success' : ''}`}>{exWithId.name}</div>
                    <div className="text-xs opacity-70">{exWithId.id}</div>
                  </div>
                  <div className="flex gap-2">
                    {!inCat ? (
                      <button className="btn btn-sm btn-success" onClick={() => void addMembership(exWithId.id)}>Add</button>
                    ) : (
                      <button className="btn btn-sm btn-error" onClick={() => void removeMembership(exWithId.id)}>Remove</button>
                    )}
                  </div>
                </div>
              );
            })}
            {exercises.length === 0 && (
              <div className="py-6 text-center text-sm opacity-70">No exercises match the current filter.</div>
            )}
          </div>
        </div>

        <div className="card p-4 bg-base-200">
          <h2 className="text-xl font-semibold mb-4">Sync Inspector (Dev Only)</h2>
          <div className="grid gap-3 md:grid-cols-2 mb-4">
            <div className="space-y-1 text-sm">
              <div><span className="font-semibold">Online:</span> {syncStatus.isOnline ? '✅ yes' : '❌ no'}</div>
              <div><span className="font-semibold">Syncing:</span> {syncStatus.isSyncing ? '⏳ in progress' : 'idle'}</div>
              <div><span className="font-semibold">Last Attempt:</span> {syncStatus.lastSyncAttempt ? new Date(syncStatus.lastSyncAttempt).toLocaleTimeString() : '—'}</div>
              <div><span className="font-semibold">Last Success:</span> {syncStatus.lastSuccessfulSync ? new Date(syncStatus.lastSuccessfulSync).toLocaleTimeString() : '—'}</div>
              <div><span className="font-semibold">Errors:</span> {syncStatus.errors.length}</div>
            </div>
            <div className="space-y-2">
              <button
                className="btn btn-primary w-full"
                disabled={syncStatus.isSyncing}
                onClick={async () => {
                  setSyncCardMsg('Starting light sync…');
                  const res = await syncService.sync(false);
                  setLastSyncResult({ success: res.success, pushed: res.recordsPushed, pulled: res.recordsPulled, tables: res.tablesProcessed, errors: res.errors.length });
                  setSyncCardMsg(res.success ? 'Light sync completed' : 'Light sync failed');
                }}
              >Light Sync</button>
              <button
                className="btn btn-secondary w-full"
                disabled={syncStatus.isSyncing}
                onClick={async () => {
                  setSyncCardMsg('Starting full sync…');
                  const res = await syncService.sync(true);
                  setLastSyncResult({ success: res.success, pushed: res.recordsPushed, pulled: res.recordsPulled, tables: res.tablesProcessed, errors: res.errors.length });
                  setSyncCardMsg(res.success ? 'Full sync completed' : 'Full sync failed');
                }}
              >Full Sync</button>
              <button
                className="btn btn-outline w-full"
                disabled={syncStatus.isSyncing || syncStatus.errors.length === 0}
                onClick={() => { syncService.clearErrors(); setSyncCardMsg('Cleared sync errors'); }}
              >Clear Errors</button>
            </div>
          </div>
          {syncCardMsg && (
            <div className="alert alert-info mb-2"><span>{syncCardMsg}</span></div>
          )}
          {lastSyncResult && (
            <div className={`alert ${lastSyncResult.success ? 'alert-success' : 'alert-error'} text-sm`}>
              <span>
                {lastSyncResult.success ? '✅ Sync OK' : '❌ Sync Error'} · tables {lastSyncResult.tables} · pushed {lastSyncResult.pushed} · pulled {lastSyncResult.pulled} · errors {lastSyncResult.errors}
              </span>
            </div>
          )}
          {syncStatus.errors.length > 0 && (
            <details className="mt-3">
              <summary className="cursor-pointer text-sm font-semibold">Error Details ({syncStatus.errors.length})</summary>
              <ul className="mt-2 space-y-1 text-xs">
                {syncStatus.errors.slice(0, 10).map((e, i) => (
                  <li key={i} className="truncate">
                    [{e.type}] {e.message}
                  </li>
                ))}
                {syncStatus.errors.length > 10 && <li className="opacity-60">(+ {syncStatus.errors.length - 10} more)</li>}
              </ul>
            </details>
          )}
          <p className="mt-4 text-xs opacity-70">Sync operations log detailed metadata to the console via the logger. Use after membership CRUD to validate push/pull behavior (Phase 4.5).</p>
        </div>
        
        <div className="card p-4 bg-base-300">
          <h2 className="text-xl font-semibold mb-2">Info</h2>
          <ul className="list-disc list-inside space-y-2 text-sm">
            <li>Expected version: 250 (v25)</li>
            <li>Edge browser shows version 21 as "210"</li>
            <li>Version 25 adds catalog_memberships table</li>
            <li>"Force Upgrade" will delete all local data and recreate the database</li>
            <li>"Reopen Database" attempts to upgrade without data loss</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
