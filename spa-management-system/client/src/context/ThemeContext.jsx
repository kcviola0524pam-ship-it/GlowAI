import { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';

const ThemeContext = createContext(null);

const defaultColors = {
  gradientStart: '#2563eb', // blue-600
  gradientMiddle: '#60a5fa', // blue-400
  gradientEnd: '#ffffff', // white
  textColor: '#fef9c3', // yellow-100
  darkGradientStart: '#1e3a8a', // blue-900
  darkGradientMiddle: '#1d4ed8', // blue-700
  darkGradientEnd: '#1f2937', // gray-800
  darkTextColor: '#fef08a', // yellow-200
};

const defaultPortalColors = {
  admin: defaultColors,
  customer: defaultColors,
  staff: defaultColors,
};

export const ThemeProvider = ({ children }) => {
  const [darkMode, setDarkMode] = useState(() => {
    const stored = localStorage.getItem('darkMode');
    return stored ? JSON.parse(stored) : false;
  });

  const [portalColors, setPortalColors] = useState(() => {
    const stored = localStorage.getItem('portalColors');
    if (stored) {
      const parsed = JSON.parse(stored);
      // Migrate old format to new format if needed
      if (parsed.gradientStart && !parsed.admin) {
        return {
          admin: parsed,
          customer: parsed,
          staff: parsed,
        };
      }
      return parsed;
    }
    return defaultPortalColors;
  });

  const [logo, setLogo] = useState(() => {
    return localStorage.getItem('customLogo') || null;
  });

  useEffect(() => {
    localStorage.setItem('darkMode', JSON.stringify(darkMode));
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [darkMode]);

  useEffect(() => {
    localStorage.setItem('portalColors', JSON.stringify(portalColors));
  }, [portalColors]);

  useEffect(() => {
    if (logo) {
      localStorage.setItem('customLogo', logo);
    } else {
      localStorage.removeItem('customLogo');
    }
  }, [logo]);

  const toggleDarkMode = () => {
    setDarkMode(!darkMode);
  };

  const updateColors = (portal, newColors) => {
    setPortalColors({ 
      ...portalColors, 
      [portal]: { ...portalColors[portal], ...newColors }
    });
  };

  const resetColors = (portal) => {
    if (portal) {
      setPortalColors({ 
        ...portalColors, 
        [portal]: defaultColors 
      });
    } else {
      setPortalColors(defaultPortalColors);
    }
  };

  const getPortalColors = useCallback((portal) => {
    return portalColors[portal] || defaultColors;
  }, [portalColors]);
  
  // Memoize admin colors for consistency
  const adminColors = useMemo(() => portalColors.admin || defaultColors, [portalColors]);

  const updateLogo = (logoUrl) => {
    setLogo(logoUrl);
  };

  const removeLogo = () => {
    setLogo(null);
    localStorage.removeItem('customLogo');
  };

  return (
    <ThemeContext.Provider value={{ 
      darkMode, 
      toggleDarkMode, 
      portalColors,
      customColors: adminColors, // Keep for backward compatibility
      updateColors, 
      resetColors,
      getPortalColors,
      adminColors, // Expose memoized admin colors
      logo,
      updateLogo,
      removeLogo
    }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => useContext(ThemeContext);

