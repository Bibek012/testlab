
'use client';

import { collection, addDoc, serverTimestamp, Firestore } from 'firebase/firestore';

/**
 * Log an administrative action to Firestore.
 */
export async function logAction(
  db: Firestore, 
  admin: { uid: string; displayName?: string | null; email?: string | null }, 
  action: string, 
  targetId: string, 
  targetType: string,
  details: string = ""
) {
  try {
    await addDoc(collection(db, 'auditLogs'), {
      adminId: admin.uid,
      adminName: admin.displayName || admin.email || 'Unknown Admin',
      action,
      targetId,
      targetType,
      details,
      timestamp: serverTimestamp()
    });
  } catch (e) {
    console.error("Audit Logging Failed:", e);
  }
}
