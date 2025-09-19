// Debug script to check activity logs
// Run this in the browser console when on the RepCue app

async function debugActivityLogs() {
  console.log('=== DEBUG: Activity Logs ===');

  try {
    // Check if database exists
    const dbRequest = indexedDB.open('RepCueDB');
    dbRequest.onsuccess = function(event) {
      const db = event.target.result;
      console.log('Database version:', db.version);
      console.log('Object store names:', Array.from(db.objectStoreNames));

      // Check activity_logs table
      const transaction = db.transaction(['activity_logs'], 'readonly');
      const store = transaction.objectStore('activity_logs');

      const countRequest = store.count();
      countRequest.onsuccess = function() {
        console.log('Total activity logs count:', countRequest.result);
      };

      const getAllRequest = store.getAll();
      getAllRequest.onsuccess = function() {
        const logs = getAllRequest.result;
        console.log('All activity logs:', logs);

        // Filter for bicycle crunches
        const bicycleCrunchesLogs = logs.filter(log =>
          log.exercise_name && log.exercise_name.toLowerCase().includes('bicycle')
        );
        console.log('Bicycle Crunches logs:', bicycleCrunchesLogs);

        // Check for recent logs (last hour)
        const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
        const recentLogs = logs.filter(log => log.timestamp > oneHourAgo);
        console.log('Recent logs (last hour):', recentLogs);
      };
    };

    dbRequest.onerror = function(event) {
      console.error('Database error:', event.target.error);
    };

  } catch (error) {
    console.error('Debug error:', error);
  }
}

// Also check the RepCue global state if available
if (window.storageService) {
  window.storageService.getActivityLogs().then(logs => {
    console.log('Activity logs via storageService:', logs);
  }).catch(err => {
    console.error('Error getting logs via storageService:', err);
  });
}

// Run the debug function
debugActivityLogs();

console.log('Debug script loaded. Run debugActivityLogs() to check activity logs.');