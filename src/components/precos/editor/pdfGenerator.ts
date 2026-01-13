import jsPDF from "jspdf";
import { EditorElement, CanvasDimensions } from "./types";

// A4 dimensions in points (pt) - standard PDF unit
const A4_WIDTH_PT = 595.28;
const A4_HEIGHT_PT = 841.89;

// Convert hex color to RGB
function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const namedColors: Record<string, string> = {
    white: "#ffffff",
    black: "#000000",
    red: "#ff0000",
    green: "#00ff00",
    blue: "#0000ff",
    yellow: "#ffff00",
    transparent: "#ffffff",
  };

  if (namedColors[hex?.toLowerCase()]) {
    hex = namedColors[hex.toLowerCase()];
  }

  if (!hex) return null;
  hex = hex.replace(/^#/, "");

  if (hex.length === 3) {
    hex = hex.split("").map(char => char + char).join("");
  }

  const result = /^([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16),
  } : null;
}

// Get font style for jsPDF
function getFontStyle(fontStyle?: string): string {
  if (!fontStyle) return 'normal';
  const isBold = fontStyle.includes('bold');
  const isItalic = fontStyle.includes('italic');
  if (isBold && isItalic) return 'bolditalic';
  if (isBold) return 'bold';
  if (isItalic) return 'italic';
  return 'normal';
}

export async function generatePdfFromElements(
  elements: EditorElement[],
  dimensions: CanvasDimensions,
  isLandscape: boolean
): Promise<void> {
  // Get the actual PDF dimensions
  const pdfWidth = isLandscape ? A4_HEIGHT_PT : A4_WIDTH_PT;
  const pdfHeight = isLandscape ? A4_WIDTH_PT : A4_HEIGHT_PT;

  // Calculate scale factor from canvas dimensions to PDF dimensions
  const scaleX = pdfWidth / dimensions.width;
  const scaleY = pdfHeight / dimensions.height;

  const pdf = new jsPDF({
    orientation: isLandscape ? "landscape" : "portrait",
    unit: "pt",
    format: "a4",
  });

  // Process elements in order (back to front)
  for (const element of elements) {
    if (element.visible === false) continue;

    try {
      switch (element.type) {
        case 'rect':
          renderRect(pdf, element, scaleX, scaleY);
          break;
        case 'circle':
          renderCircle(pdf, element, scaleX, scaleY);
          break;
        case 'triangle':
          renderTriangle(pdf, element, scaleX, scaleY);
          break;
        case 'star':
          renderStar(pdf, element, scaleX, scaleY);
          break;
        case 'line':
          renderLine(pdf, element, scaleX, scaleY);
          break;
        case 'text':
          renderText(pdf, element, scaleX, scaleY);
          break;
        case 'image':
          await renderImage(pdf, element, scaleX, scaleY);
          break;
      }
    } catch (error) {
      console.warn(`Error rendering element ${element.id}:`, error);
    }
  }

  pdf.save("encarte.pdf");
}

function renderRect(pdf: jsPDF, el: EditorElement, scaleX: number, scaleY: number) {
  const x = el.x * scaleX;
  const y = el.y * scaleY;
  const width = (el.width || 100) * scaleX;
  const height = (el.height || 100) * scaleY;
  const cornerRadius = (el.cornerRadius || 0) * Math.min(scaleX, scaleY);

  if (el.fill && el.fill !== 'transparent') {
    const color = hexToRgb(el.fill);
    if (color) pdf.setFillColor(color.r, color.g, color.b);
  }

  if (el.stroke && el.strokeWidth) {
    const strokeColor = hexToRgb(el.stroke);
    if (strokeColor) {
      pdf.setDrawColor(strokeColor.r, strokeColor.g, strokeColor.b);
      pdf.setLineWidth(el.strokeWidth * Math.min(scaleX, scaleY));
    }
  }

  const style = el.fill ? (el.stroke && el.strokeWidth ? "FD" : "F") : "S";

  if (cornerRadius > 0) {
    pdf.roundedRect(x, y, width, height, cornerRadius, cornerRadius, style);
  } else {
    pdf.rect(x, y, width, height, style);
  }
}

function renderCircle(pdf: jsPDF, el: EditorElement, scaleX: number, scaleY: number) {
  const x = el.x * scaleX;
  const y = el.y * scaleY;
  const radius = (el.radius || 50) * Math.min(scaleX, scaleY);

  if (el.fill && el.fill !== 'transparent') {
    const color = hexToRgb(el.fill);
    if (color) pdf.setFillColor(color.r, color.g, color.b);
  }

  if (el.stroke && el.strokeWidth) {
    const strokeColor = hexToRgb(el.stroke);
    if (strokeColor) {
      pdf.setDrawColor(strokeColor.r, strokeColor.g, strokeColor.b);
      pdf.setLineWidth(el.strokeWidth * Math.min(scaleX, scaleY));
    }
  }

  const style = el.fill ? (el.stroke && el.strokeWidth ? "FD" : "F") : "S";
  pdf.circle(x, y, radius, style);
}

function renderTriangle(pdf: jsPDF, el: EditorElement, scaleX: number, scaleY: number) {
  const x = el.x * scaleX;
  const y = el.y * scaleY;
  const radius = (el.radius || 50) * Math.min(scaleX, scaleY);

  if (el.fill && el.fill !== 'transparent') {
    const color = hexToRgb(el.fill);
    if (color) pdf.setFillColor(color.r, color.g, color.b);
  }

  if (el.stroke && el.strokeWidth) {
    const strokeColor = hexToRgb(el.stroke);
    if (strokeColor) {
      pdf.setDrawColor(strokeColor.r, strokeColor.g, strokeColor.b);
      pdf.setLineWidth(el.strokeWidth * Math.min(scaleX, scaleY));
    }
  }

  const points = [
    { x: x, y: y - radius },
    { x: x - radius, y: y + radius / 2 },
    { x: x + radius, y: y + radius / 2 },
  ];

  const style = el.fill ? (el.stroke && el.strokeWidth ? "FD" : "F") : "S";
  pdf.triangle(
    points[0].x, points[0].y,
    points[1].x, points[1].y,
    points[2].x, points[2].y,
    style
  );
}

function renderStar(pdf: jsPDF, el: EditorElement, scaleX: number, scaleY: number) {
  const x = el.x * scaleX;
  const y = el.y * scaleY;
  const scale = Math.min(scaleX, scaleY);
  const outerRadius = (el.outerRadius || 50) * scale;
  const innerRadius = (el.innerRadius || 25) * scale;
  const numPoints = el.numPoints || 5;

  if (el.fill && el.fill !== 'transparent') {
    const color = hexToRgb(el.fill);
    if (color) pdf.setFillColor(color.r, color.g, color.b);
  }

  if (el.stroke && el.strokeWidth) {
    const strokeColor = hexToRgb(el.stroke);
    if (strokeColor) {
      pdf.setDrawColor(strokeColor.r, strokeColor.g, strokeColor.b);
      pdf.setLineWidth(el.strokeWidth * scale);
    }
  }

  const points: { x: number; y: number }[] = [];
  for (let i = 0; i < numPoints * 2; i++) {
    const radius = i % 2 === 0 ? outerRadius : innerRadius;
    const angle = (Math.PI * i) / numPoints - Math.PI / 2;
    points.push({
      x: x + Math.cos(angle) * radius,
      y: y + Math.sin(angle) * radius,
    });
  }

  pdf.moveTo(points[0].x, points[0].y);
  for (let i = 1; i < points.length; i++) {
    pdf.lineTo(points[i].x, points[i].y);
  }
  pdf.lineTo(points[0].x, points[0].y);
  
  if (el.fill) {
    pdf.fill();
  }
  if (el.stroke && el.strokeWidth) {
    pdf.stroke();
  }
}

function renderLine(pdf: jsPDF, el: EditorElement, scaleX: number, scaleY: number) {
  const x = el.x * scaleX;
  const y = el.y * scaleY;
  const points = el.points || [0, 0, 100, 0];
  const strokeWidth = (el.strokeWidth || 2) * Math.min(scaleX, scaleY);

  if (el.stroke) {
    const strokeColor = hexToRgb(el.stroke);
    if (strokeColor) {
      pdf.setDrawColor(strokeColor.r, strokeColor.g, strokeColor.b);
    }
  }
  pdf.setLineWidth(strokeWidth);

  if (points.length >= 4) {
    pdf.line(
      x + points[0] * scaleX, 
      y + points[1] * scaleY, 
      x + points[2] * scaleX, 
      y + points[3] * scaleY
    );
  }
}

function renderText(pdf: jsPDF, el: EditorElement, scaleX: number, scaleY: number) {
  const { text = "", fontStyle, fill, align = "left" } = el;

  if (!text) return;

  const x = el.x * scaleX;
  const y = el.y * scaleY;
  const fontSize = (el.fontSize || 40) * Math.min(scaleX, scaleY);
  const boxWidth = el.width ? el.width * scaleX : undefined;

  // Use only built-in fonts - helvetica is the closest to Open Sans
  const pdfStyle = getFontStyle(fontStyle);

  try {
    pdf.setFont("helvetica", pdfStyle);
  } catch {
    pdf.setFont("helvetica", "normal");
  }

  pdf.setFontSize(fontSize);

  if (fill && fill !== "transparent") {
    const color = hexToRgb(fill);
    if (color) pdf.setTextColor(color.r, color.g, color.b);
  }

  // Konva Text alignment works inside a fixed width box.
  // jsPDF's `align` uses x as the anchor (left/center/right), so we convert.
  const effectiveAlign = (boxWidth ? align : "left") as "left" | "center" | "right";

  let textX = x;
  if (boxWidth) {
    if (effectiveAlign === "center") textX = x + boxWidth / 2;
    if (effectiveAlign === "right") textX = x + boxWidth;
  }

  // Konva wraps text automatically when a width is set (wrap="word").
  // Our PDF needs to replicate that.
  const paragraphs = text.split("\n");
  const lines: string[] = [];
  for (const p of paragraphs) {
    if (boxWidth) {
      const wrapped = pdf.splitTextToSize(p, boxWidth) as string[];
      lines.push(...(wrapped.length ? wrapped : [""]));
    } else {
      lines.push(p);
    }
  }

  const lineHeight = fontSize * 1.2;

  lines.forEach((line, index) => {
    const lineY = y + index * lineHeight;
    try {
      pdf.text(
        line,
        textX,
        lineY,
        ({ align: effectiveAlign, baseline: "top" } as any)
      );
    } catch {
      // Fallback for older/limited option support
      pdf.text(line, textX, lineY);
    }
  });
}


async function renderImage(pdf: jsPDF, el: EditorElement, scaleX: number, scaleY: number) {
  const x = el.x * scaleX;
  const y = el.y * scaleY;
  const width = (el.width || 100) * scaleX;
  const height = (el.height || 100) * scaleY;
  const src = el.src;

  if (!src) return;

  try {
    if (src.startsWith('data:image')) {
      const format = src.includes('png') ? 'PNG' : 'JPEG';
      pdf.addImage(src, format, x, y, width, height);
    } else {
      const response = await fetch(src);
      const blob = await response.blob();
      const base64 = await new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.readAsDataURL(blob);
      });
      const format = base64.includes('png') ? 'PNG' : 'JPEG';
      pdf.addImage(base64, format, x, y, width, height);
    }
  } catch (error) {
    console.error('Error adding image to PDF:', error);
  }
}
