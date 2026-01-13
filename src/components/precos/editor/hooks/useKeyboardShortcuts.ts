import { useEffect, useCallback, useRef } from 'react';
import { EditorElement } from '../types';

interface UseKeyboardShortcutsProps {
  selectedId: string | null;
  selectedElement: EditorElement | null;
  onDuplicate: (id: string) => void;
  onDelete: (id: string) => void;
  onUndo: () => void;
  onRedo: () => void;
  onCopy: () => void;
  onPaste: () => void;
  canUndo: boolean;
  canRedo: boolean;
}

export function useKeyboardShortcuts({
  selectedId,
  selectedElement,
  onDuplicate,
  onDelete,
  onUndo,
  onRedo,
  onCopy,
  onPaste,
  canUndo,
  canRedo,
}: UseKeyboardShortcutsProps) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger shortcuts when typing in inputs
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) {
        return;
      }

      const isCtrlOrCmd = e.ctrlKey || e.metaKey;

      // Delete/Backspace - Delete selected element
      if ((e.key === 'Delete' || e.key === 'Backspace') && selectedId && !selectedElement?.locked) {
        e.preventDefault();
        onDelete(selectedId);
        return;
      }

      // Ctrl+Z - Undo
      if (isCtrlOrCmd && e.key === 'z' && !e.shiftKey && canUndo) {
        e.preventDefault();
        onUndo();
        return;
      }

      // Ctrl+Shift+Z or Ctrl+Y - Redo
      if (isCtrlOrCmd && ((e.key === 'z' && e.shiftKey) || e.key === 'y') && canRedo) {
        e.preventDefault();
        onRedo();
        return;
      }

      // Ctrl+C - Copy
      if (isCtrlOrCmd && e.key === 'c' && selectedId) {
        e.preventDefault();
        onCopy();
        return;
      }

      // Ctrl+V - Paste
      if (isCtrlOrCmd && e.key === 'v') {
        e.preventDefault();
        onPaste();
        return;
      }

      // Ctrl+D - Duplicate
      if (isCtrlOrCmd && e.key === 'd' && selectedId) {
        e.preventDefault();
        onDuplicate(selectedId);
        return;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedId, selectedElement, onDuplicate, onDelete, onUndo, onRedo, onCopy, onPaste, canUndo, canRedo]);
}
