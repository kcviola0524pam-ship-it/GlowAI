/**
 * Clean up localStorage on app startup to remove invalid/corrupted entries.
 * This handles cases where localStorage has the string "undefined" or other invalid data.
 */
export function cleanupStorage() {
  const keysToCheck = [
    'gym_user',
    'gym_token',
    'darkMode',
    'portalColors',
    'customLogo',
  ];

  keysToCheck.forEach((key) => {
    try {
      const value = localStorage.getItem(key);
      
      // Remove if the value is literally "undefined", "null", or empty string
      if (value === 'undefined' || value === 'null' || value === '') {
        localStorage.removeItem(key);
        console.warn(`✅ Cleaned up corrupted storage key: ${key}`);
        return;
      }

      // Try to validate if it's supposed to be JSON
      if (key !== 'gym_token' && key !== 'customLogo') {
        try {
          JSON.parse(value);
        } catch {
          // If JSON parse fails, remove it
          localStorage.removeItem(key);
          console.warn(`✅ Removed invalid JSON from storage key: ${key}`);
        }
      }
    } catch (err) {
      console.warn(`⚠️ Error checking storage key ${key}:`, err);
    }
  });
}
