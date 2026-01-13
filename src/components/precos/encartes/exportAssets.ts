import type { EditorElement } from "../editor/types";

// Cache of loaded fonts
const loadedFontsCache = new Set<string>(['Arial', 'Helvetica', 'Times New Roman']);

/**
 * Preload all fonts used in the elements
 */
export async function preloadFontsUsed(elements: EditorElement[]): Promise<void> {
  const fontsToLoad = new Set<string>();

  elements.forEach(el => {
    if (el.type === 'text' && el.fontFamily) {
      if (!loadedFontsCache.has(el.fontFamily)) {
        fontsToLoad.add(el.fontFamily);
      }
    }
  });

  if (fontsToLoad.size === 0) return;

  const loadPromises = Array.from(fontsToLoad).map(async (fontName) => {
    try {
      const formattedName = fontName.replace(/ /g, '+');
      const linkId = `google-font-${formattedName}`;

      // Check if already in DOM
      if (document.getElementById(linkId)) {
        loadedFontsCache.add(fontName);
        return;
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

      loadedFontsCache.add(fontName);
    } catch (error) {
      console.warn(`Could not load font: ${fontName}`, error);
    }
  });

  await Promise.all(loadPromises);
  await document.fonts.ready;
}

/**
 * Preload all images used in the elements
 */
export async function preloadImagesUsed(elements: EditorElement[]): Promise<void> {
  const imageElements = elements.filter(el => el.type === 'image' && el.src);

  if (imageElements.length === 0) return;

  const loadPromises = imageElements.map(el => {
    return new Promise<void>((resolve) => {
      const img = new window.Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => resolve();
      img.onerror = () => {
        console.warn(`Could not preload image: ${el.src}`);
        resolve(); // Don't fail the whole process
      };
      img.src = el.src!;
    });
  });

  await Promise.all(loadPromises);
}

/**
 * Wait for Konva to redraw after fonts are loaded
 */
export function waitForRedraw(): Promise<void> {
  return new Promise(resolve => {
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        resolve();
      });
    });
  });
}

/**
 * Preload all assets (fonts + images) and wait for redraw
 */
export async function preloadAllAssets(elements: EditorElement[]): Promise<void> {
  await Promise.all([
    preloadFontsUsed(elements),
    preloadImagesUsed(elements),
  ]);
  await waitForRedraw();
}
