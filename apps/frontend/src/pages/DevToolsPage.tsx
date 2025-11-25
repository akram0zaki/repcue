import { useEffect, useMemo, useState } from 'react';
import { storageService } from '../services/storageService';
import { syncService } from '../services/syncService';
import { legalDocsService } from '../services/legalDocsService';
import { consentService } from '../services/consentService';
import type { CatalogMembership, GlobalExercise } from '../types';
import { getAllCatalogs } from '../data/catalogs';
import logger from '../utils/logger';

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
  
  // Legal docs & cache inspector state
  const [legalStatus, setLegalStatus] = useState<string>('');
  const [manifestData, setManifestData] = useState<string>('');
  const [cacheInfo, setCacheInfo] = useState<string>('');

  useEffect(() => {
    const unsubscribe = syncService.onSyncStatusChange((st) => {
      setSyncStatus(st);
    });
    return () => { unsubscribe(); };
  }, []);
  
  // Get all catalogs from the catalog data (including non-visible ones for dev tools)
  const catalogOptions = useMemo(
    () => getAllCatalogs().map(c => ({ id: c.id, label: c.nameKey })),
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
        
        <div className="card p-4 bg-base-200">
          <h2 className="text-xl font-semibold mb-4">Legal Documents & Cache Inspector</h2>
          
          <div className="space-y-3">
            <div className="flex flex-wrap gap-2">
              <button 
                onClick={async () => {
                  setLegalStatus('Loading manifest...');
                  await legalDocsService.initialize();
                  const manifest = legalDocsService.getCurrentManifest();
                  if (manifest) {
                    setManifestData(JSON.stringify(manifest, null, 2));
                    setLegalStatus(`✅ Loaded manifest with ${manifest.documents.length} documents (updatedAt: ${manifest.updatedAt})`);
                    logger.log('[DevTools] Manifest:', manifest);
                  } else {
                    setLegalStatus('❌ No manifest loaded');
                    setManifestData('');
                  }
                }}
                className="btn btn-primary btn-sm"
              >
                Load Current Manifest
              </button>
              
              <button 
                onClick={async () => {
                  setLegalStatus('Fetching manifest directly from server...');
                  try {
                    const response = await fetch(`/legal/manifest.json?t=${Date.now()}`, {
                      cache: 'reload',
                      headers: {
                        'Cache-Control': 'no-cache, no-store, must-revalidate',
                        'Pragma': 'no-cache'
                      }
                    });
                    const data = await response.json();
                    setManifestData(JSON.stringify(data, null, 2));
                    setLegalStatus(`✅ Direct fetch: ${data.documents?.length || 0} documents (updatedAt: ${data.updatedAt})`);
                    logger.log('[DevTools] Direct manifest fetch:', data);
                  } catch (error) {
                    setLegalStatus(`❌ Fetch error: ${error instanceof Error ? error.message : 'Unknown'}`);
                  }
                }}
                className="btn btn-secondary btn-sm"
              >
                Fetch Manifest (Direct)
              </button>
              
              <button 
                onClick={() => {
                  const acceptances = consentService.getLegalAcceptances();
                  setManifestData(JSON.stringify(acceptances, null, 2));
                  setLegalStatus(`✅ Found ${acceptances.length} stored acceptances`);
                  logger.log('[DevTools] Stored acceptances:', acceptances);
                }}
                className="btn btn-accent btn-sm"
              >
                Show Stored Acceptances
              </button>
              
              <button 
                onClick={async () => {
                  setLegalStatus('Inspecting cache storage...');
                  setCacheInfo('');
                  try {
                    const cacheNames = await caches.keys();
                    let info = `Found ${cacheNames.length} caches:\n`;
                    
                    for (const name of cacheNames) {
                      const cache = await caches.open(name);
                      const keys = await cache.keys();
                      info += `\n${name}: ${keys.length} entries\n`;
                      
                      // Check for manifest in this cache
                      const manifestKeys = keys.filter(k => k.url.includes('manifest.json'));
                      for (const key of manifestKeys) {
                        const response = await cache.match(key);
                        if (response) {
                          const data = await response.json();
                          info += `  - ${key.url}\n`;
                          info += `    updatedAt: ${data.updatedAt}\n`;
                          info += `    versions: ${data.documents?.map((d: {id: string; version: string}) => `${d.id}:${d.version}`).join(', ')}\n`;
                        }
                      }
                    }
                    
                    setCacheInfo(info);
                    setLegalStatus('✅ Cache inspection complete');
                    logger.log('[DevTools] Cache info:', info);
                  } catch (error) {
                    setCacheInfo(`Error: ${error instanceof Error ? error.message : 'Unknown'}`);
                    setLegalStatus('❌ Cache inspection failed');
                  }
                }}
                className="btn btn-info btn-sm"
              >
                Inspect Cache Storage
              </button>
              
              <button 
                onClick={async () => {
                  setLegalStatus('Clearing legal manifest cache...');
                  try {
                    const deleted = await caches.delete('legal-manifest-cache');
                    setLegalStatus(deleted ? '✅ Cache cleared' : '⚠️ Cache not found');
                    setCacheInfo('');
                    logger.log('[DevTools] Cache deletion result:', deleted);
                  } catch (error) {
                    setLegalStatus(`❌ Error: ${error instanceof Error ? error.message : 'Unknown'}`);
                  }
                }}
                className="btn btn-warning btn-sm"
              >
                Clear Legal Cache
              </button>
              
              <button 
                onClick={async () => {
                  setLegalStatus('Clearing all caches...');
                  try {
                    const cacheNames = await caches.keys();
                    await Promise.all(cacheNames.map(name => caches.delete(name)));
                    setLegalStatus(`✅ Cleared ${cacheNames.length} caches`);
                    setCacheInfo('');
                    logger.log('[DevTools] Cleared all caches:', cacheNames);
                  } catch (error) {
                    setLegalStatus(`❌ Error: ${error instanceof Error ? error.message : 'Unknown'}`);
                  }
                }}
                className="btn btn-error btn-sm"
              >
                Clear All Caches
              </button>
            </div>
            
            {legalStatus && (
              <div className="alert alert-info text-sm">
                <span>{legalStatus}</span>
              </div>
            )}
            
            {cacheInfo && (
              <div className="bg-base-300 p-3 rounded">
                <h3 className="font-semibold mb-2 text-sm">Cache Storage Info:</h3>
                <pre className="text-xs whitespace-pre-wrap overflow-x-auto">{cacheInfo}</pre>
              </div>
            )}
            
            {manifestData && (
              <div className="bg-base-300 p-3 rounded max-h-96 overflow-y-auto">
                <h3 className="font-semibold mb-2 text-sm">Manifest Data:</h3>
                <pre className="text-xs whitespace-pre-wrap">{manifestData}</pre>
              </div>
            )}
          </div>
        </div>
        
        <div className="card p-4 bg-base-200">
          <h2 className="text-xl font-semibold mb-4">🎥 Video Cache Diagnostics</h2>
          
          <div className="alert alert-info text-xs mb-3">
            <div>
              <div className="font-semibold">Platform Detection:</div>
              <div>User Agent: {navigator.userAgent}</div>
              <div>iOS Detected: {/iphone|ipad|ipod/i.test(navigator.userAgent) ? '✅ YES - Caching DISABLED' : '❌ NO - Caching ENABLED'}</div>
            </div>
          </div>
          
          <div className="space-y-3">
            <div className="flex flex-wrap gap-2">
              <button 
                onClick={async () => {
                  setStatus('Inspecting video cache...');
                  try {
                    const { VideoCacheService } = await import('../services/videoCacheService');
                    const cacheService = VideoCacheService.getInstance();
                    const stats = await cacheService.getStorageStats();
                    
                    let info = '📊 Video Cache Statistics:\n\n';
                    info += `Total Videos: ${stats.totalVideos}\n`;
                    info += `Total Size: ${(stats.totalSize / 1024 / 1024).toFixed(2)} MB\n`;
                    info += `Quota Used: ${(stats.quotaUsed / 1024 / 1024).toFixed(2)} MB\n`;
                    info += `Quota Available: ${(stats.quotaAvailable / 1024 / 1024).toFixed(2)} MB\n`;
                    info += `Quota Usage: ${stats.quotaPercentage.toFixed(1)}%\n`;
                    info += `Oldest Video: ${stats.oldestVideo ? new Date(stats.oldestVideo).toLocaleString() : 'N/A'}\n`;
                    info += `Newest Video: ${stats.newestVideo ? new Date(stats.newestVideo).toLocaleString() : 'N/A'}\n`;
                    
                    setCacheInfo(info);
                    setStatus('✅ Cache stats loaded');
                    logger.log('[DevTools] Video cache stats:', stats);
                  } catch (error) {
                    setStatus(`❌ Error: ${error instanceof Error ? error.message : 'Unknown'}`);
                    setCacheInfo(`Error loading cache stats: ${error instanceof Error ? error.message : 'Unknown'}`);
                  }
                }}
                className="btn btn-primary btn-sm"
              >
                Get Cache Stats
              </button>
              
              <button 
                onClick={async () => {
                  setStatus('Testing video URL resolution...');
                  try {
                    const testUrls = [
                      '/media/3-4-sit-ups_v1_1920x1080.mp4',
                      '/media/plank_v1_1920x1080.mp4',
                      '/media/burpees_v1_1920x1080.mp4'
                    ];
                    
                    let info = '🧪 Video URL Resolution Test:\n\n';
                    
                    for (const url of testUrls) {
                      info += `Testing: ${url}\n`;
                      const absoluteUrl = new URL(url, window.location.origin).href;
                      
                      try {
                        const { VideoCacheService } = await import('../services/videoCacheService');
                        const cacheService = VideoCacheService.getInstance();
                        
                        const cachedUrl = await cacheService.getVideo(absoluteUrl);
                        
                        if (cachedUrl) {
                          info += `  ✅ Cache HIT: ${cachedUrl.substring(0, 30)}...\n`;
                          info += `  ℹ️ Blob URL created (Safari blocks HEAD validation)\n`;
                          info += `  Blob URL: ${cachedUrl.substring(0, 50)}...\n`;
                        } else {
                          info += `  ⚠️ Cache MISS - not in IndexedDB\n`;
                        }
                      } catch (error) {
                        info += `  ❌ Error: ${error instanceof Error ? error.message : 'Unknown'}\n`;
                      }
                      
                      info += '\n';
                    }
                    
                    setCacheInfo(info);
                    setStatus('✅ URL resolution test complete');
                    logger.log('[DevTools] Video URL test complete');
                  } catch (error) {
                    setStatus(`❌ Error: ${error instanceof Error ? error.message : 'Unknown'}`);
                  }
                }}
                className="btn btn-secondary btn-sm"
              >
                Test Video URLs
              </button>
              
              <button 
                onClick={async () => {
                  setStatus('Inspecting IndexedDB video cache...');
                  try {
                    // Open IndexedDB directly
                    const dbRequest = indexedDB.open('repcue-video-cache', 1);
                    
                    dbRequest.onsuccess = async () => {
                      const db = dbRequest.result;
                      const transaction = db.transaction(['videos'], 'readonly');
                      const store = transaction.objectStore('videos');
                      const getAllRequest = store.getAll();
                      
                      getAllRequest.onsuccess = () => {
                        const videos = getAllRequest.result;
                        let info = `📦 IndexedDB Video Cache (${videos.length} entries):\n\n`;
                        
                        videos.slice(0, 10).forEach((video: {
                          id: string;
                          url: string;
                          size: number;
                          mimeType: string;
                          cachedAt: number;
                          lastAccessedAt: number;
                          expiresAt: number;
                          accessCount: number;
                        }) => {
                          info += `URL: ${video.url.substring(video.url.lastIndexOf('/') + 1)}\n`;
                          info += `  ID: ${video.id}\n`;
                          info += `  Size: ${(video.size / 1024 / 1024).toFixed(2)} MB\n`;
                          info += `  MIME: ${video.mimeType}\n`;
                          info += `  Cached: ${new Date(video.cachedAt).toLocaleString()}\n`;
                          info += `  Last Access: ${new Date(video.lastAccessedAt).toLocaleString()}\n`;
                          info += `  Expires: ${new Date(video.expiresAt).toLocaleString()}\n`;
                          info += `  Access Count: ${video.accessCount}\n`;
                          info += `  Expired: ${Date.now() > video.expiresAt ? '❌ YES' : '✅ NO'}\n`;
                          info += '\n';
                        });
                        
                        if (videos.length > 10) {
                          info += `... and ${videos.length - 10} more videos\n`;
                        }
                        
                        setCacheInfo(info);
                        setStatus(`✅ Found ${videos.length} videos in IndexedDB`);
                        logger.log('[DevTools] IndexedDB videos:', videos);
                      };
                      
                      getAllRequest.onerror = () => {
                        setStatus(`❌ Error reading from IndexedDB: ${getAllRequest.error?.message}`);
                      };
                    };
                    
                    dbRequest.onerror = () => {
                      setStatus(`❌ Error opening IndexedDB: ${dbRequest.error?.message}`);
                    };
                  } catch (error) {
                    setStatus(`❌ Error: ${error instanceof Error ? error.message : 'Unknown'}`);
                  }
                }}
                className="btn btn-accent btn-sm"
              >
                Inspect IndexedDB
              </button>
              
              <button 
                onClick={async () => {
                  if (!confirm('This will clear all cached videos. Continue?')) return;
                  
                  setStatus('Clearing video cache...');
                  try {
                    const { VideoCacheService } = await import('../services/videoCacheService');
                    const cacheService = VideoCacheService.getInstance();
                    await cacheService.clearAll();
                    
                    setStatus('✅ Video cache cleared');
                    setCacheInfo('');
                    logger.log('[DevTools] Video cache cleared');
                  } catch (error) {
                    setStatus(`❌ Error: ${error instanceof Error ? error.message : 'Unknown'}`);
                  }
                }}
                className="btn btn-warning btn-sm"
              >
                Clear Video Cache
              </button>
              
              <button 
                onClick={async () => {
                  setStatus('Fetching test video...');
                  setCacheInfo('🔄 Testing video fetch and cache...\n\n');
                  
                  try {
                    const testUrl = '/media/plank_v1_1920x1080.mp4';
                    const absoluteUrl = new URL(testUrl, window.location.origin).href;
                    
                    let info = `Testing URL: ${absoluteUrl}\n\n`;
                    
                    // Import service
                    const { VideoCacheService } = await import('../services/videoCacheService');
                    const cacheService = VideoCacheService.getInstance();
                    
                    // Try to fetch
                    info += '1️⃣ Attempting fetch and cache...\n';
                    const blobUrl = await cacheService.fetchAndCache(absoluteUrl);
                    
                    if (blobUrl) {
                      info += `✅ Fetch successful: ${blobUrl}\n\n`;
                      
                      // Validate blob URL
                      info += '2️⃣ Blob URL created successfully\n';
                      info += `ℹ️ Safari blocks HEAD validation on blob URLs\n`;
                      info += `✅ Blob URL ready for video playback\n\n`;
                      
                      // Try to retrieve from cache
                      info += '3️⃣ Retrieving from cache...\n';
                      const cachedUrl = await cacheService.getVideo(absoluteUrl);
                      
                      if (cachedUrl) {
                        info += `✅ Cache retrieval successful\n`;
                        info += `Cached URL: ${cachedUrl}\n`;
                        info += `URLs match: ${cachedUrl === blobUrl ? '✅ YES' : '⚠️ NO (different blob URLs)'}\n`;
                      } else {
                        info += `❌ Cache retrieval failed - video not found in cache\n`;
                      }
                      
                    } else {
                      info += `❌ Fetch failed - no blob URL returned\n`;
                    }
                    
                    setCacheInfo(info);
                    setStatus('✅ Test complete - check details above');
                    logger.log('[DevTools] Video fetch test complete');
                    
                  } catch (error) {
                    setCacheInfo(`❌ Test failed: ${error instanceof Error ? error.message : 'Unknown'}\n${error instanceof Error ? error.stack : ''}`);
                    setStatus(`❌ Test failed`);
                    logger.error('[DevTools] Video fetch test error:', error);
                  }
                }}
                className="btn btn-info btn-sm"
              >
                Test Fetch & Cache
              </button>
              
              <button 
                onClick={async () => {
                  setStatus('Simulating exercises page video loading...');
                  setCacheInfo('🎬 Simulating Exercise Page Video Load...\n\n');
                  
                  try {
                    let info = '';
                    
                    // Import necessary modules
                    info += '📦 Importing modules...\n';
                    const { loadExerciseMedia } = await import('../utils/loadExerciseMedia');
                    const { selectVideoVariant } = await import('../utils/selectVideoVariant');
                    const { resolveVideoUrl } = await import('../utils/resolveVideoUrl');
                    info += '✅ Modules loaded\n\n';
                    
                    // Test with first 3 exercises
                    const testExercises = ['3-4-sit-ups', 'plank', 'burpees'];
                    
                    for (const exerciseId of testExercises) {
                      info += `\n━━━ Testing: ${exerciseId} ━━━\n`;
                      
                      // Step 1: Load exercise media index
                      info += '1️⃣ Loading exercise_media.json...\n';
                      const mediaIndex = await loadExerciseMedia();
                      const media = mediaIndex[exerciseId];
                      
                      if (!media) {
                        info += `❌ No media found for ${exerciseId}\n`;
                        continue;
                      }
                      info += `✅ Media found: ${JSON.stringify(media).substring(0, 100)}...\n`;
                      
                      // Step 2: Select video variant
                      info += '2️⃣ Selecting video variant...\n';
                      const selectedPath = selectVideoVariant(
                        media,
                        window.innerWidth,
                        window.innerHeight
                      );
                      
                      if (!selectedPath) {
                        info += `❌ No video path selected\n`;
                        continue;
                      }
                      info += `✅ Selected path: ${selectedPath}\n`;
                      
                      // Step 3: Resolve video URL (this is where caching happens)
                      info += '3️⃣ Resolving video URL...\n';
                      const url = await resolveVideoUrl(selectedPath);
                      
                      if (!url) {
                        info += `❌ URL resolution failed\n`;
                        continue;
                      }
                      
                      info += `✅ URL resolved: ${url.substring(0, 50)}...\n`;
                      info += `   URL type: ${url.startsWith('blob:') ? 'BLOB' : 'HTTP'}\n`;
                      
                      // Step 4: Test if blob URL works
                      if (url.startsWith('blob:')) {
                        info += '4️⃣ Testing blob URL...\n';
                        try {
                          // Create a test video element
                          const video = document.createElement('video');
                          video.src = url;
                          video.muted = true;
                          
                          // Wait for loadedmetadata event
                          const loadPromise = new Promise((resolve, reject) => {
                            video.onloadedmetadata = () => resolve(true);
                            video.onerror = (e) => reject(e);
                            setTimeout(() => reject(new Error('Timeout')), 5000);
                          });
                          
                          await loadPromise;
                          info += `✅ Blob URL works - video metadata loaded\n`;
                          info += `   Duration: ${video.duration.toFixed(2)}s\n`;
                          info += `   Dimensions: ${video.videoWidth}x${video.videoHeight}\n`;
                        } catch (videoError) {
                          info += `❌ Blob URL failed to load in video element\n`;
                          info += `   Error: ${videoError instanceof Error ? videoError.message : 'Unknown'}\n`;
                        }
                      }
                      
                      info += '\n';
                    }
                    
                    info += '\n✅ Simulation complete\n';
                    info += 'ℹ️ Check console for detailed logs (DEBUG=true)\n';
                    
                    setCacheInfo(info);
                    setStatus('✅ Simulation complete');
                    logger.log('[DevTools] Exercise page simulation complete');
                    
                  } catch (error) {
                    setCacheInfo(`❌ Simulation failed: ${error instanceof Error ? error.message : 'Unknown'}\n${error instanceof Error ? error.stack : ''}`);
                    setStatus(`❌ Simulation failed`);
                    logger.error('[DevTools] Exercise page simulation error:', error);
                  }
                }}
                className="btn btn-success btn-sm"
              >
                🎯 Simulate Exercise Page Load
              </button>
            </div>
            
            {cacheInfo && (
              <div className="bg-base-300 p-3 rounded max-h-96 overflow-y-auto">
                <pre className="text-xs whitespace-pre-wrap font-mono">{cacheInfo}</pre>
              </div>
            )}
            
            <div className="alert alert-info text-xs">
              <div>
                <div className="font-semibold mb-1">💡 Video Cache System:</div>
                <ul className="list-disc list-inside space-y-1">
                  <li>Videos cached in IndexedDB with 90-day expiration</li>
                  <li>Blob URLs created on-demand from cached video data</li>
                  <li>Safari/iOS may invalidate blob URLs more aggressively</li>
                  <li>System validates and recreates blob URLs if invalid</li>
                  <li>Check console logs (DEBUG=true) for detailed diagnostics</li>
                </ul>
              </div>
            </div>
          </div>
        </div>

        <div className="card p-4 bg-base-300">
          <h2 className="text-xl font-semibold mb-2">Info</h2>
          <ul className="list-disc list-inside space-y-2 text-sm">
            <li>Expected version: 250 (v25)</li>
            <li>Edge browser shows version 21 as "210"</li>
            <li>Version 25 adds catalog_memberships table</li>
            <li>"Force Upgrade" will delete all local data and recreate the database</li>
            <li>"Reopen Database" attempts to upgrade without data loss</li>
            <li>Legal manifest cached by service worker - use cache tools to debug version mismatches</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
