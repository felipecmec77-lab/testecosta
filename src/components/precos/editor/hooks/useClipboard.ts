import { useState, useCallback } from 'react';
import { EditorElement } from '../types';

// Generate unique ID
const generateId = () => `${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 9)}`;

export function useClipboard(
  addElement: (element: Omit<EditorElement, 'id'>) => string,
  elements: EditorElement[]
) {
  const [clipboard, setClipboard] = useState<EditorElement | null>(null);

  const copy = useCallback((id: string) => {
    const element = elements.find(el => el.id === id);
    if (element) {
      setClipboard({ ...element });
    }
  }, [elements]);

  const paste = useCallback(() => {
    if (!clipboard) return null;
    
    const newElement: Omit<EditorElement, 'id'> = {
      ...clipboard,
      x: clipboard.x + 20,
      y: clipboard.y + 20,
    };
    
    // Remove the id so addElement generates a new one
    const { id, ...elementWithoutId } = newElement as EditorElement;
    return addElement(elementWithoutId);
  }, [clipboard, addElement]);

  const hasClipboard = clipboard !== null;

  return {
    clipboard,
    copy,
    paste,
    hasClipboard,
  };
}
