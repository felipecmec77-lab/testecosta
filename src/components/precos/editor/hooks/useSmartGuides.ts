import { useState, useCallback, useRef } from 'react';
import { EditorElement, Guide, CanvasDimensions, SNAP_THRESHOLD, GRID_SIZE } from '../types';
import Konva from 'konva';

export function useSmartGuides(
  elements: EditorElement[],
  dimensions: CanvasDimensions,
  snapToGrid: boolean
) {
  const [guides, setGuides] = useState<Guide[]>([]);
  const [movingPosition, setMovingPosition] = useState<{ x: number; y: number } | null>(null);

  const calculateGuides = useCallback((
    movingElement: EditorElement,
    node: Konva.Node
  ) => {
    const newGuides: Guide[] = [];
    
    let x = node.x();
    let y = node.y();
    const width = (node.width?.() || 0) * (node.scaleX?.() || 1);
    const height = (node.height?.() || 0) * (node.scaleY?.() || 1);
    
    // Snap to grid if enabled
    if (snapToGrid) {
      x = Math.round(x / GRID_SIZE) * GRID_SIZE;
      y = Math.round(y / GRID_SIZE) * GRID_SIZE;
      node.position({ x, y });
    }
    
    const centerX = x + width / 2;
    const centerY = y + height / 2;
    const right = x + width;
    const bottom = y + height;
    
    // Canvas center guides
    const canvasCenterX = dimensions.width / 2;
    const canvasCenterY = dimensions.height / 2;
    
    // Check canvas center horizontal
    if (Math.abs(centerX - canvasCenterX) < SNAP_THRESHOLD) {
      newGuides.push({ type: 'vertical', position: canvasCenterX });
      node.x(canvasCenterX - width / 2);
    }
    
    // Check canvas center vertical
    if (Math.abs(centerY - canvasCenterY) < SNAP_THRESHOLD) {
      newGuides.push({ type: 'horizontal', position: canvasCenterY });
      node.y(canvasCenterY - height / 2);
    }
    
    // Canvas edges
    if (Math.abs(x) < SNAP_THRESHOLD) {
      newGuides.push({ type: 'vertical', position: 0 });
      node.x(0);
    }
    if (Math.abs(y) < SNAP_THRESHOLD) {
      newGuides.push({ type: 'horizontal', position: 0 });
      node.y(0);
    }
    if (Math.abs(right - dimensions.width) < SNAP_THRESHOLD) {
      newGuides.push({ type: 'vertical', position: dimensions.width });
      node.x(dimensions.width - width);
    }
    if (Math.abs(bottom - dimensions.height) < SNAP_THRESHOLD) {
      newGuides.push({ type: 'horizontal', position: dimensions.height });
      node.y(dimensions.height - height);
    }
    
    // Check alignment with other elements
    elements.forEach(other => {
      if (other.id === movingElement.id) return;
      
      const otherWidth = other.width || (other.radius ? other.radius * 2 : 0);
      const otherHeight = other.height || (other.radius ? other.radius * 2 : 0);
      const otherCenterX = other.x + otherWidth / 2;
      const otherCenterY = other.y + otherHeight / 2;
      const otherRight = other.x + otherWidth;
      const otherBottom = other.y + otherHeight;
      
      // Left edge alignment
      if (Math.abs(x - other.x) < SNAP_THRESHOLD) {
        newGuides.push({ type: 'vertical', position: other.x });
        node.x(other.x);
      }
      // Right edge alignment
      if (Math.abs(right - otherRight) < SNAP_THRESHOLD) {
        newGuides.push({ type: 'vertical', position: otherRight });
        node.x(otherRight - width);
      }
      // Center X alignment
      if (Math.abs(centerX - otherCenterX) < SNAP_THRESHOLD) {
        newGuides.push({ type: 'vertical', position: otherCenterX });
        node.x(otherCenterX - width / 2);
      }
      // Top edge alignment
      if (Math.abs(y - other.y) < SNAP_THRESHOLD) {
        newGuides.push({ type: 'horizontal', position: other.y });
        node.y(other.y);
      }
      // Bottom edge alignment
      if (Math.abs(bottom - otherBottom) < SNAP_THRESHOLD) {
        newGuides.push({ type: 'horizontal', position: otherBottom });
        node.y(otherBottom - height);
      }
      // Center Y alignment
      if (Math.abs(centerY - otherCenterY) < SNAP_THRESHOLD) {
        newGuides.push({ type: 'horizontal', position: otherCenterY });
        node.y(otherCenterY - height / 2);
      }
    });
    
    setGuides(newGuides);
    setMovingPosition({ x: node.x(), y: node.y() });
  }, [elements, dimensions, snapToGrid]);

  const clearGuides = useCallback(() => {
    setGuides([]);
    setMovingPosition(null);
  }, []);

  return {
    guides,
    movingPosition,
    calculateGuides,
    clearGuides,
  };
}
