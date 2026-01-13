import jsPDF from "jspdf";
import { Canvas as FabricCanvas } from "fabric";

// Convert Fabric.js canvas to native PDF (vector-based, not screenshot)
export async function generateNativePdf(
  canvas: FabricCanvas,
  tamanho: "full" | "half"
): Promise<void> {
  const isLandscape = tamanho === "full";
  
  const pdf = new jsPDF({
    orientation: isLandscape ? "landscape" : "portrait",
    unit: "pt", // Points (72 per inch, matches Fabric.js canvas)
    format: "a4",
  });

  const pageWidth = isLandscape ? 842 : 595;
  const pageHeight = isLandscape ? 595 : 842;

  // Get all objects from canvas
  const objects = canvas.getObjects();

  // Process each object
  for (const obj of objects) {
    await renderObjectToPdf(pdf, obj, pageWidth, pageHeight);
  }

  pdf.save("etiqueta-preco.pdf");
}

async function renderObjectToPdf(
  pdf: jsPDF,
  obj: any,
  pageWidth: number,
  pageHeight: number
): Promise<void> {
  const left = obj.left || 0;
  const top = obj.top || 0;
  const scaleX = obj.scaleX || 1;
  const scaleY = obj.scaleY || 1;
  const angle = obj.angle || 0;

  switch (obj.type) {
    case "rect":
      renderRect(pdf, obj, left, top, scaleX, scaleY);
      break;
    case "circle":
      renderCircle(pdf, obj, left, top, scaleX, scaleY);
      break;
    case "i-text":
    case "text":
      renderText(pdf, obj, left, top, scaleX, scaleY);
      break;
    case "image":
      await renderImage(pdf, obj, left, top, scaleX, scaleY);
      break;
  }
}

function renderRect(
  pdf: jsPDF,
  obj: any,
  left: number,
  top: number,
  scaleX: number,
  scaleY: number
): void {
  const width = (obj.width || 0) * scaleX;
  const height = (obj.height || 0) * scaleY;
  const rx = obj.rx || 0;
  const ry = obj.ry || 0;

  // Set fill color
  if (obj.fill && obj.fill !== "transparent") {
    const color = hexToRgb(obj.fill);
    if (color) {
      pdf.setFillColor(color.r, color.g, color.b);
    }
  }

  // Set stroke
  if (obj.stroke && obj.strokeWidth) {
    const strokeColor = hexToRgb(obj.stroke);
    if (strokeColor) {
      pdf.setDrawColor(strokeColor.r, strokeColor.g, strokeColor.b);
      pdf.setLineWidth(obj.strokeWidth);
    }
  }

  // Draw rectangle (with or without rounded corners)
  if (rx > 0 || ry > 0) {
    pdf.roundedRect(left, top, width, height, rx, ry, obj.fill ? "F" : "S");
  } else {
    pdf.rect(left, top, width, height, obj.fill ? "F" : "S");
  }
}

function renderCircle(
  pdf: jsPDF,
  obj: any,
  left: number,
  top: number,
  scaleX: number,
  scaleY: number
): void {
  const radius = (obj.radius || 0) * scaleX;
  
  // Adjust for origin
  let centerX = left;
  let centerY = top;
  
  if (obj.originX === "center") {
    // Already centered
  } else {
    centerX = left + radius;
    centerY = top + radius;
  }

  // Set fill color
  if (obj.fill && obj.fill !== "transparent") {
    const color = hexToRgb(obj.fill);
    if (color) {
      pdf.setFillColor(color.r, color.g, color.b);
    }
  }

  // Set stroke
  if (obj.stroke && obj.strokeWidth) {
    const strokeColor = hexToRgb(obj.stroke);
    if (strokeColor) {
      pdf.setDrawColor(strokeColor.r, strokeColor.g, strokeColor.b);
      pdf.setLineWidth(obj.strokeWidth);
    }
  }

  pdf.circle(centerX, centerY, radius, obj.fill ? "F" : "S");
}

function renderText(
  pdf: jsPDF,
  obj: any,
  left: number,
  top: number,
  scaleX: number,
  scaleY: number
): void {
  const text = obj.text || "";
  const fontSize = (obj.fontSize || 40) * scaleY;
  const fontFamily = obj.fontFamily || "helvetica";
  const fontWeight = obj.fontWeight || "normal";
  const fontStyle = obj.fontStyle || "normal";

  // Map font family to jsPDF supported fonts
  let pdfFont = "helvetica";
  if (fontFamily.toLowerCase().includes("times")) {
    pdfFont = "times";
  } else if (fontFamily.toLowerCase().includes("courier")) {
    pdfFont = "courier";
  }

  // Set font style
  let style = "normal";
  if (fontWeight === "bold" && fontStyle === "italic") {
    style = "bolditalic";
  } else if (fontWeight === "bold") {
    style = "bold";
  } else if (fontStyle === "italic") {
    style = "italic";
  }

  pdf.setFont(pdfFont, style);
  pdf.setFontSize(fontSize);

  // Set text color
  if (obj.fill && obj.fill !== "transparent") {
    const color = hexToRgb(obj.fill);
    if (color) {
      pdf.setTextColor(color.r, color.g, color.b);
    }
  }

  // Handle text alignment and origin
  let textX = left;
  let textY = top;

  // Adjust for vertical origin
  if (obj.originY === "center") {
    textY = top + fontSize / 3; // Approximate center
  } else if (obj.originY === "bottom") {
    textY = top;
  } else {
    textY = top + fontSize;
  }

  // Handle horizontal alignment
  let align: "left" | "center" | "right" = "left";
  if (obj.originX === "center" || obj.textAlign === "center") {
    align = "center";
  } else if (obj.originX === "right" || obj.textAlign === "right") {
    align = "right";
  }

  // Split text by newlines
  const lines = text.split("\n");
  
  lines.forEach((line: string, index: number) => {
    const lineY = textY + index * fontSize * 1.2;
    pdf.text(line, textX, lineY, { align });
  });
}

async function renderImage(
  pdf: jsPDF,
  obj: any,
  left: number,
  top: number,
  scaleX: number,
  scaleY: number
): Promise<void> {
  try {
    // Get the image source
    const imgSrc = obj.getSrc ? obj.getSrc() : obj._element?.src;
    if (!imgSrc) return;

    const width = (obj.width || 0) * scaleX;
    const height = (obj.height || 0) * scaleY;

    // Add image to PDF
    pdf.addImage(imgSrc, "PNG", left, top, width, height);
  } catch (error) {
    console.error("Error adding image to PDF:", error);
  }
}

// Utility function to convert hex color to RGB
function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  // Handle named colors
  const namedColors: Record<string, string> = {
    white: "#ffffff",
    black: "#000000",
    red: "#ff0000",
    green: "#00ff00",
    blue: "#0000ff",
    yellow: "#ffff00",
    transparent: "#ffffff",
  };

  if (namedColors[hex.toLowerCase()]) {
    hex = namedColors[hex.toLowerCase()];
  }

  // Remove # if present
  hex = hex.replace(/^#/, "");

  // Handle shorthand hex
  if (hex.length === 3) {
    hex = hex
      .split("")
      .map((char) => char + char)
      .join("");
  }

  const result = /^([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16),
      }
    : null;
}
