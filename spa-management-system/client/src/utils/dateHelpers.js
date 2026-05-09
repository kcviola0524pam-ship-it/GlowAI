// File: src/utils/dateHelpers.js (or add to your component file)

/**
 * Format date for display - prevents timezone issues
 */
export const formatAppointmentDate = (dateString) => {
  if (!dateString) return "N/A";

  // If it's already YYYY-MM-DD, format without Date() (no timezone involved)
  const plain = String(dateString).match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (plain) {
    const [, y, m, d] = plain;
    return `${m}/${d}/${y}`; // en-US display
  }

  // If it's ISO like 2026-02-03T16:00:00.000Z, parse as Date and display in LOCAL timezone
  const parsed = new Date(dateString);
  if (Number.isNaN(parsed.getTime())) return "Invalid Date";

  return parsed.toLocaleDateString("en-US", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
};
;
  
  /**
   * Format time for display
   */
  export const formatAppointmentTime = (timeString) => {
    if (!timeString) return 'N/A';
    
    try {
      if (/^\d{2}:\d{2}$/.test(timeString)) {
        return timeString;
      }
      
      return new Date(`2000-01-01T${timeString}`).toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch (error) {
      console.error('Time formatting error:', error);
      return timeString;
    }
  };
  
  /**
   * Format date for sending to API - prevents timezone issues
   */
  export const formatDateForAPI = (dateInput) => {
    if (!dateInput) return null;
  
    // 1) If string contains YYYY-MM-DD anywhere (including "YYYY-MM-DDT...")
    if (typeof dateInput === "string") {
      const match = dateInput.match(/^(\d{4})-(\d{2})-(\d{2})/);
      if (match) return `${match[1]}-${match[2]}-${match[3]}`;
    }
  
    // 2) If it's a Date object, use LOCAL getters (no UTC conversion)
    if (dateInput instanceof Date) {
      const y = dateInput.getFullYear();
      const m = String(dateInput.getMonth() + 1).padStart(2, "0");
      const d = String(dateInput.getDate()).padStart(2, "0");
      return `${y}-${m}-${d}`;
    }
  
    // 3) Last resort: parse, but guard against invalid date
    const parsed = new Date(dateInput);
    if (Number.isNaN(parsed.getTime())) return null;
  
    const y = parsed.getFullYear();
    const m = String(parsed.getMonth() + 1).padStart(2, "0");
    const d = String(parsed.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  };
  