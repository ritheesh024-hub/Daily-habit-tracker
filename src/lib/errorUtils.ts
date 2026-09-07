/**
 * User-friendly error sanitization and formatting.
 * Prevents raw stack traces and internal Firebase error strings from leaking to the UI.
 */
export function getUserFriendlyErrorMessage(error: unknown): string {
  if (!error) return 'An unexpected error occurred. Please try again.';

  const errCode = (error as any)?.code || '';
  const errMessage = (error as any)?.message || '';
  const errStr = typeof error === 'string' ? error : `${errCode} ${errMessage}`;

  // 1. Permission Denied
  if (
    errCode === 'permission-denied' ||
    errCode.includes('permission-denied') ||
    errStr.includes('PERMISSION_DENIED') ||
    errStr.includes('Missing or insufficient permissions')
  ) {
    return 'Unable to access your data. Please check your account.';
  }

  // 2. Network / Offline
  if (
    errCode === 'unavailable' ||
    errCode.includes('network') ||
    errCode === 'auth/network-request-failed' ||
    errStr.includes('Failed to fetch') ||
    errStr.includes('network-request-failed') ||
    (typeof navigator !== 'undefined' && !navigator.onLine)
  ) {
    return "You are currently offline. Changes are saved locally and will sync when you're back online.";
  }

  // 3. Session Expired
  if (
    errCode === 'auth/user-token-expired' ||
    errCode === 'auth/id-token-expired' ||
    errCode === 'auth/session-cookie-expired' ||
    errStr.includes('token-expired')
  ) {
    return 'Your session expired. Please sign in again.';
  }

  // 4. Reauthentication Required
  if (
    errCode === 'auth/requires-recent-login' ||
    errStr.includes('requires-recent-login') ||
    errStr.includes('recent-login')
  ) {
    return 'For your security, please sign in again to confirm this action.';
  }

  // 5. Popup Closed / Cancelled
  if (
    errCode === 'auth/popup-closed-by-user' ||
    errCode === 'auth/cancelled-popup-request' ||
    errStr.includes('popup-closed-by-user')
  ) {
    return 'Action was cancelled. Your account and data remain intact.';
  }

  // 6. Popup Blocked
  if (errCode === 'auth/popup-blocked' || errStr.includes('popup-blocked')) {
    return 'Sign-in popup was blocked by your browser. Please allow popups and try again.';
  }

  // 7. Unauthenticated
  if (
    errCode === 'auth/user-not-found' ||
    errStr.includes('User is not authenticated') ||
    errStr.includes('unauthenticated')
  ) {
    return 'Please sign in to access your data.';
  }

  // 8. General fallback safe message
  return 'Unable to save changes right now. Please try again.';
}
