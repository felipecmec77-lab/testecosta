import { useState, useCallback } from 'react';
import { ALL_FONTS } from '../types';

// Cache of loaded fonts
const loadedFontsCache = new Set<string>(['Arial', 'Helvetica', 'Times New Roman']);

export function useFontLoader() {
  const [loadedFonts, setLoadedFonts] = useState<Set<string>>(loadedFontsCache);
  const [loading, setLoading] = useState(false);

  const loadFont = useCallback(async (fontName: string): Promise<boolean> => {
    if (loadedFontsCache.has(fontName)) {
      return true;
    }

    setLoading(true);
    
    try {
      const formattedName = fontName.replace(/ /g, '+');
      const linkId = `google-font-${formattedName}`;
      
      // Check if already loaded
      if (document.getElementById(linkId)) {
        loadedFontsCache.add(fontName);
        setLoadedFonts(new Set(loadedFontsCache));
        setLoading(false);
        return true;
      }
      
      // Create and append link
      const link = document.createElement('link');
      link.id = linkId;
      link.rel = 'stylesheet';
      link.href = `https://fonts.googleapis.com/css2?family=${formattedName}:wght@300;400;500;600;700;800&display=swap`;
      
      await new Promise<void>((resolve, reject) => {
        link.onload = () => resolve();
        link.onerror = () => reject(new Error(`Failed to load font: ${fontName}`));
        document.head.appendChild(link);
      });
      
      // Wait a bit for font to be ready
      await document.fonts.ready;
      
      loadedFontsCache.add(fontName);
      setLoadedFonts(new Set(loadedFontsCache));
      setLoading(false);
      return true;
    } catch (error) {
      console.error(`Error loading font ${fontName}:`, error);
      setLoading(false);
      return false;
    }
  }, []);

  const preloadFonts = useCallback(async (fonts: string[]) => {
    await Promise.all(fonts.map(font => loadFont(font)));
  }, [loadFont]);

  return {
    loadedFonts,
    loading,
    loadFont,
    preloadFonts,
  };
}
