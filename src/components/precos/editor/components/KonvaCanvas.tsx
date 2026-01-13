import { useRef, useCallback, useEffect, useState, memo } from 'react';
import { Stage, Layer, Rect, Circle, Text, Image, Line, RegularPolygon, Transformer, Star } from 'react-konva';
import Konva from 'konva';
import useImage from 'use-image';
import { EditorElement, Guide, CanvasDimensions, GRID_SIZE } from '../types';

interface KonvaCanvasProps {
  elements: EditorElement[];
  selectedId: string | null;
  onSelectElement: (id: string | null) => void;
  onUpdateElement: (id: string, updates: Partial<EditorElement>) => void;
  onUpdateElementWithHistory: (id: string, updates: Partial<EditorElement>) => void;
  dimensions: CanvasDimensions;
  zoom: number;
  showGrid: boolean;
  guides: Guide[];
  onDragMove: (element: EditorElement, node: Konva.Node) => void;
  onDragEnd: () => void;
  onElementPosition?: (element: EditorElement, rect: DOMRect) => void;
}

// Memoized Image element component
const ImageElement = memo(function ImageElement({ 
  element,
  commonProps,
}: { 
  element: EditorElement;
  commonProps: any;
}) {
  const [image] = useImage(element.src || '', 'anonymous');
  
  return (
    <Image
      {...commonProps}
      image={image}
      width={element.width}
      height={element.height}
    />
  );
});

export function KonvaCanvas({
  elements,
  selectedId,
  onSelectElement,
  onUpdateElement,
  onUpdateElementWithHistory,
  dimensions,
  zoom,
  showGrid,
  guides,
  onDragMove,
  onDragEnd,
  onElementPosition,
}: KonvaCanvasProps) {
  const stageRef = useRef<Konva.Stage>(null);
  const transformerRef = useRef<Konva.Transformer>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Update transformer when selection changes
  useEffect(() => {
    const transformer = transformerRef.current;
    const stage = stageRef.current;
    
    if (!transformer || !stage) return;

    if (selectedId) {
      const node = stage.findOne(`#${selectedId}`);
      if (node) {
        transformer.nodes([node]);
        transformer.getLayer()?.batchDraw();
        
        // Report position for context toolbar
        if (onElementPosition) {
          const selectedElement = elements.find(el => el.id === selectedId);
          if (selectedElement && containerRef.current) {
            const containerRect = containerRef.current.getBoundingClientRect();
            const nodeRect = node.getClientRect();
            const rect = new DOMRect(
              containerRect.left + nodeRect.x * zoom,
              containerRect.top + nodeRect.y * zoom,
              nodeRect.width * zoom,
              nodeRect.height * zoom
            );
            onElementPosition(selectedElement, rect);
          }
        }
      }
    } else {
      transformer.nodes([]);
      transformer.getLayer()?.batchDraw();
    }
  }, [selectedId, zoom, onElementPosition]);

  // Handle stage click to deselect
  const handleStageClick = useCallback((e: Konva.KonvaEventObject<MouseEvent>) => {
    if (e.target === e.target.getStage()) {
      onSelectElement(null);
    }
  }, [onSelectElement]);

  // Handle element selection
  const handleSelect = useCallback((id: string) => {
    onSelectElement(id);
  }, [onSelectElement]);

  // Handle drag move
  const handleDragMove = useCallback((element: EditorElement, e: Konva.KonvaEventObject<DragEvent>) => {
    onDragMove(element, e.target);
    onUpdateElement(element.id, {
      x: e.target.x(),
      y: e.target.y(),
    });
    
    // Update toolbar position
    if (onElementPosition && containerRef.current) {
      const containerRect = containerRef.current.getBoundingClientRect();
      const nodeRect = e.target.getClientRect();
      const rect = new DOMRect(
        containerRect.left + nodeRect.x * zoom,
        containerRect.top + nodeRect.y * zoom,
        nodeRect.width * zoom,
        nodeRect.height * zoom
      );
      onElementPosition(element, rect);
    }
  }, [onDragMove, onUpdateElement, onElementPosition, zoom]);

  // Handle drag end
  const handleDragEnd = useCallback((element: EditorElement, e: Konva.KonvaEventObject<DragEvent>) => {
    onDragEnd();
    onUpdateElementWithHistory(element.id, {
      x: e.target.x(),
      y: e.target.y(),
    });
  }, [onDragEnd, onUpdateElementWithHistory]);

  // Handle transform end
  const handleTransformEnd = useCallback((element: EditorElement, e: Konva.KonvaEventObject<Event>) => {
    const node = e.target;
    const scaleX = node.scaleX();
    const scaleY = node.scaleY();
    
    // Reset scale and apply to dimensions
    node.scaleX(1);
    node.scaleY(1);
    
    const updates: Partial<EditorElement> = {
      x: node.x(),
      y: node.y(),
      rotation: node.rotation(),
    };

    // Handle different element types
    if (element.type === 'circle' || element.type === 'triangle' || element.type === 'star') {
      updates.radius = (element.radius || 50) * Math.max(scaleX, scaleY);
    } else {
      updates.width = Math.max(5, (element.width || 100) * scaleX);
      updates.height = Math.max(5, (element.height || 100) * scaleY);
    }
    
    onUpdateElementWithHistory(element.id, updates);
  }, [onUpdateElementWithHistory]);

  // Handle text double click to edit
  const handleTextDblClick = useCallback((element: EditorElement, e: Konva.KonvaEventObject<MouseEvent>) => {
    const textNode = e.target as Konva.Text;
    const stage = stageRef.current;
    const container = containerRef.current;
    if (!stage || !container) return;

    // Hide text node and transformer
    textNode.hide();
    transformerRef.current?.hide();

    // Get position relative to container
    const textPosition = textNode.absolutePosition();
    const containerRect = container.getBoundingClientRect();

    // Create textarea
    const textarea = document.createElement('textarea');
    container.appendChild(textarea);

    textarea.value = element.text || '';
    textarea.style.position = 'absolute';
    textarea.style.top = `${textPosition.y * zoom}px`;
    textarea.style.left = `${textPosition.x * zoom}px`;
    textarea.style.width = `${Math.max((element.width || 200) * zoom, 100)}px`;
    textarea.style.minHeight = `${Math.max((element.fontSize || 40) * zoom * 1.5, 40)}px`;
    textarea.style.fontSize = `${(element.fontSize || 40) * zoom}px`;
    textarea.style.fontFamily = element.fontFamily || 'Arial';
    textarea.style.fontWeight = element.fontStyle?.includes('bold') ? 'bold' : 'normal';
    textarea.style.fontStyle = element.fontStyle?.includes('italic') ? 'italic' : 'normal';
    textarea.style.border = '2px solid #a855f7';
    textarea.style.padding = '4px';
    textarea.style.margin = '0px';
    textarea.style.overflow = 'hidden';
    textarea.style.background = 'rgba(255,255,255,0.95)';
    textarea.style.outline = 'none';
    textarea.style.resize = 'none';
    textarea.style.lineHeight = '1.2';
    textarea.style.color = element.fill || '#000000';
    textarea.style.zIndex = '1000';
    textarea.style.borderRadius = '4px';

    textarea.focus();
    textarea.select();

    const finishEditing = () => {
      const newText = textarea.value;
      onUpdateElementWithHistory(element.id, { text: newText });
      textarea.remove();
      textNode.show();
      transformerRef.current?.show();
    };

    textarea.addEventListener('blur', finishEditing);
    textarea.addEventListener('keydown', (ev) => {
      if (ev.key === 'Escape') {
        textarea.value = element.text || '';
        textarea.blur();
      } else if (ev.key === 'Enter' && !ev.shiftKey) {
        ev.preventDefault();
        textarea.blur();
      }
    });
  }, [zoom, onUpdateElementWithHistory]);

  // Render element based on type
  const renderElement = useCallback((element: EditorElement) => {
    if (element.visible === false) return null;
    
    const isLocked = element.locked === true;
    const commonProps = {
      id: element.id,
      x: element.x,
      y: element.y,
      rotation: element.rotation || 0,
      opacity: element.opacity ?? 1,
      draggable: !isLocked,
      onClick: () => handleSelect(element.id),
      onTap: () => handleSelect(element.id),
      onDragMove: (e: Konva.KonvaEventObject<DragEvent>) => handleDragMove(element, e),
      onDragEnd: (e: Konva.KonvaEventObject<DragEvent>) => handleDragEnd(element, e),
      onTransformEnd: (e: Konva.KonvaEventObject<Event>) => handleTransformEnd(element, e),
    };

    switch (element.type) {
      case 'rect':
        return (
          <Rect
            key={element.id}
            {...commonProps}
            width={element.width || 100}
            height={element.height || 100}
            fill={element.fill || '#22c55e'}
            stroke={element.stroke}
            strokeWidth={element.strokeWidth}
            cornerRadius={element.cornerRadius || 0}
          />
        );
      
      case 'circle':
        return (
          <Circle
            key={element.id}
            {...commonProps}
            radius={element.radius || 50}
            fill={element.fill || '#3b82f6'}
            stroke={element.stroke}
            strokeWidth={element.strokeWidth}
          />
        );
      
      case 'text':
        return (
          <Text
            key={element.id}
            {...commonProps}
            text={element.text || 'Clique para editar'}
            fontSize={element.fontSize || 40}
            fontFamily={element.fontFamily || 'Arial'}
            fontStyle={element.fontStyle || 'normal'}
            textDecoration={element.textDecoration}
            fill={element.fill || '#000000'}
            align={element.align || 'left'}
            width={element.width}
            onDblClick={(e) => handleTextDblClick(element, e)}
            onDblTap={(e) => handleTextDblClick(element, e as any)}
          />
        );
      
      case 'image':
        return (
          <ImageElement
            key={element.id}
            element={element}
            commonProps={commonProps}
          />
        );
      
      case 'line':
        return (
          <Line
            key={element.id}
            {...commonProps}
            points={element.points || [0, 0, 100, 0]}
            stroke={element.stroke || '#000000'}
            strokeWidth={element.strokeWidth || 2}
            lineCap="round"
          />
        );
      
      case 'triangle':
        return (
          <RegularPolygon
            key={element.id}
            {...commonProps}
            sides={3}
            radius={element.radius || 50}
            fill={element.fill || '#f59e0b'}
            stroke={element.stroke}
            strokeWidth={element.strokeWidth}
          />
        );
      
      case 'star':
        return (
          <Star
            key={element.id}
            {...commonProps}
            numPoints={element.numPoints || 5}
            innerRadius={element.innerRadius || 25}
            outerRadius={element.outerRadius || 50}
            fill={element.fill || '#fbbf24'}
            stroke={element.stroke}
            strokeWidth={element.strokeWidth}
          />
        );
      
      default:
        return null;
    }
  }, [handleSelect, handleDragMove, handleDragEnd, handleTransformEnd, handleTextDblClick]);

  return (
    <div 
      ref={containerRef}
      className="relative shadow-2xl rounded-lg overflow-hidden"
      style={{ 
        width: dimensions.width * zoom,
        height: dimensions.height * zoom,
      }}
    >
      <Stage
        ref={stageRef}
        width={dimensions.width * zoom}
        height={dimensions.height * zoom}
        scaleX={zoom}
        scaleY={zoom}
        onClick={handleStageClick}
        onTap={handleStageClick}
        style={{ background: '#ffffff', cursor: 'default' }}
      >
        <Layer>
          {/* Background */}
          <Rect
            x={0}
            y={0}
            width={dimensions.width}
            height={dimensions.height}
            fill="#ffffff"
            listening={false}
          />
          
          {/* Grid */}
          {showGrid && (
            <>
              {Array.from({ length: Math.ceil(dimensions.width / GRID_SIZE) + 1 }).map((_, i) => (
                <Line
                  key={`v-${i}`}
                  points={[i * GRID_SIZE, 0, i * GRID_SIZE, dimensions.height]}
                  stroke="rgba(168, 85, 247, 0.15)"
                  strokeWidth={0.5}
                  listening={false}
                />
              ))}
              {Array.from({ length: Math.ceil(dimensions.height / GRID_SIZE) + 1 }).map((_, i) => (
                <Line
                  key={`h-${i}`}
                  points={[0, i * GRID_SIZE, dimensions.width, i * GRID_SIZE]}
                  stroke="rgba(168, 85, 247, 0.15)"
                  strokeWidth={0.5}
                  listening={false}
                />
              ))}
              {/* Center lines */}
              <Line
                points={[dimensions.width / 2, 0, dimensions.width / 2, dimensions.height]}
                stroke="rgba(168, 85, 247, 0.3)"
                strokeWidth={1}
                dash={[4, 4]}
                listening={false}
              />
              <Line
                points={[0, dimensions.height / 2, dimensions.width, dimensions.height / 2]}
                stroke="rgba(168, 85, 247, 0.3)"
                strokeWidth={1}
                dash={[4, 4]}
                listening={false}
              />
            </>
          )}
          
          {/* Elements */}
          {elements.map(renderElement)}
          
          {/* Smart Guides */}
          {guides.map((guide, i) => (
            <Line
              key={`guide-${i}`}
              points={guide.type === 'vertical' 
                ? [guide.position, 0, guide.position, dimensions.height]
                : [0, guide.position, dimensions.width, guide.position]
              }
              stroke="#a855f7"
              strokeWidth={1}
              dash={[4, 4]}
              listening={false}
            />
          ))}
          
          {/* Transformer */}
          <Transformer
            ref={transformerRef}
            boundBoxFunc={(oldBox, newBox) => {
              if (newBox.width < 5 || newBox.height < 5) {
                return oldBox;
              }
              return newBox;
            }}
            anchorFill="#a855f7"
            anchorStroke="#ffffff"
            anchorSize={10}
            anchorCornerRadius={2}
            borderStroke="#a855f7"
            borderStrokeWidth={1.5}
            rotateAnchorOffset={25}
            enabledAnchors={['top-left', 'top-right', 'bottom-left', 'bottom-right', 'middle-left', 'middle-right', 'top-center', 'bottom-center']}
          />
        </Layer>
      </Stage>
    </div>
  );
}
