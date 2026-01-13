import { useState, useCallback } from 'react';
import { EditorElement, CANVAS_SIZES } from '../types';

// Generate simple unique ID
const generateId = () => `${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 9)}`;

export function useEditorState(initialSize: 'full' | 'half' = 'half') {
  const [elements, setElements] = useState<EditorElement[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [zoom, setZoom] = useState(0.7);
  const [history, setHistory] = useState<EditorElement[][]>([[]]);
  const [historyIndex, setHistoryIndex] = useState(0);
  const [showGrid, setShowGrid] = useState(false);
  const [snapToGrid, setSnapToGrid] = useState(false);
  const [canvasSize, setCanvasSize] = useState<'full' | 'half'>(initialSize);

  const dimensions = CANVAS_SIZES[canvasSize];

  // Save state to history
  const saveHistory = useCallback((newElements: EditorElement[]) => {
    setHistory(prev => {
      const newHistory = prev.slice(0, historyIndex + 1);
      newHistory.push(JSON.parse(JSON.stringify(newElements)));
      return newHistory.slice(-50); // Keep last 50 states
    });
    setHistoryIndex(prev => Math.min(prev + 1, 49));
  }, [historyIndex]);

  // Add element
  const addElement = useCallback((element: Omit<EditorElement, 'id'>) => {
    const newElement: EditorElement = {
      ...element,
      id: generateId(),
      draggable: true,
      visible: true,
      locked: false,
    };
    setElements(prev => {
      const newElements = [...prev, newElement];
      saveHistory(newElements);
      return newElements;
    });
    setSelectedId(newElement.id);
    return newElement.id;
  }, [saveHistory]);

  // Update element
  const updateElement = useCallback((id: string, updates: Partial<EditorElement>) => {
    setElements(prev => {
      const newElements = prev.map(el => 
        el.id === id ? { ...el, ...updates } : el
      );
      return newElements;
    });
  }, []);

  // Update element and save history
  const updateElementWithHistory = useCallback((id: string, updates: Partial<EditorElement>) => {
    setElements(prev => {
      const newElements = prev.map(el => 
        el.id === id ? { ...el, ...updates } : el
      );
      saveHistory(newElements);
      return newElements;
    });
  }, [saveHistory]);

  // Delete element
  const deleteElement = useCallback((id: string) => {
    setElements(prev => {
      const newElements = prev.filter(el => el.id !== id);
      saveHistory(newElements);
      return newElements;
    });
    if (selectedId === id) {
      setSelectedId(null);
    }
  }, [selectedId, saveHistory]);

  // Duplicate element
  const duplicateElement = useCallback((id: string) => {
    const element = elements.find(el => el.id === id);
    if (!element) return;
    
    const newElement: EditorElement = {
      ...element,
      id: generateId(),
      x: element.x + 20,
      y: element.y + 20,
    };
    setElements(prev => {
      const newElements = [...prev, newElement];
      saveHistory(newElements);
      return newElements;
    });
    setSelectedId(newElement.id);
  }, [elements, saveHistory]);

  // Move element in layer order
  const moveElement = useCallback((id: string, direction: 'up' | 'down' | 'top' | 'bottom') => {
    setElements(prev => {
      const index = prev.findIndex(el => el.id === id);
      if (index === -1) return prev;
      
      const newElements = [...prev];
      const [element] = newElements.splice(index, 1);
      
      switch (direction) {
        case 'up':
          newElements.splice(Math.min(index + 1, newElements.length), 0, element);
          break;
        case 'down':
          newElements.splice(Math.max(index - 1, 0), 0, element);
          break;
        case 'top':
          newElements.push(element);
          break;
        case 'bottom':
          newElements.unshift(element);
          break;
      }
      
      saveHistory(newElements);
      return newElements;
    });
  }, [saveHistory]);

  // Undo
  const undo = useCallback(() => {
    if (historyIndex <= 0) return;
    const newIndex = historyIndex - 1;
    setHistoryIndex(newIndex);
    setElements(JSON.parse(JSON.stringify(history[newIndex])));
  }, [history, historyIndex]);

  // Redo
  const redo = useCallback(() => {
    if (historyIndex >= history.length - 1) return;
    const newIndex = historyIndex + 1;
    setHistoryIndex(newIndex);
    setElements(JSON.parse(JSON.stringify(history[newIndex])));
  }, [history, historyIndex]);

  // Get selected element
  const selectedElement = elements.find(el => el.id === selectedId) || null;

  // Clear selection
  const clearSelection = useCallback(() => {
    setSelectedId(null);
  }, []);

  // Toggle element visibility
  const toggleVisibility = useCallback((id: string) => {
    updateElementWithHistory(id, { 
      visible: !elements.find(el => el.id === id)?.visible 
    });
  }, [elements, updateElementWithHistory]);

  // Toggle element lock
  const toggleLock = useCallback((id: string) => {
    const element = elements.find(el => el.id === id);
    if (!element) return;
    updateElementWithHistory(id, { 
      locked: !element.locked,
      draggable: element.locked, // Toggle draggable inversely
    });
  }, [elements, updateElementWithHistory]);

  return {
    // State
    elements,
    selectedId,
    selectedElement,
    zoom,
    history,
    historyIndex,
    showGrid,
    snapToGrid,
    canvasSize,
    dimensions,
    
    // Setters
    setElements,
    setSelectedId,
    setZoom,
    setShowGrid,
    setSnapToGrid,
    setCanvasSize,
    
    // Actions
    addElement,
    updateElement,
    updateElementWithHistory,
    deleteElement,
    duplicateElement,
    moveElement,
    undo,
    redo,
    clearSelection,
    toggleVisibility,
    toggleLock,
    saveHistory,
    
    // Computed
    canUndo: historyIndex > 0,
    canRedo: historyIndex < history.length - 1,
  };
}
