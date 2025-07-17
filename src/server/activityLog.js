/*  OnlyFans Automation Manager
    File: activityLog.js
    Purpose: In-memory activity log for sync progress
    Created: 2025-07-17 – v1.0
*/

let syncLog = [];

export function logActivity(message) {
  const entry = `${new Date().toISOString()} ${message}`;
  syncLog.push(entry);
  if (syncLog.length > 100) syncLog.shift();
  console.log(entry);
}

export function getActivityLog() {
  return [...syncLog];
}

/*  End of File – Last modified 2025-07-17 */
