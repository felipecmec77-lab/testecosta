import jsPDF from "jspdf";
import type { CanvasDimensions } from "../editor/types";

// Target DPI for print quality (300 for print, 200 for faster export)
const EXPORT_DPI = 200;
// PDF uses 72 DPI as logical base
const PDF_BASE_DPI = 72;
// Small margin to prevent antialiasing edge clipping (in pt)
const SAFE_MARGIN = 1;

/**
 * Generates PDF from an offscreen Konva stage (1:1 scale).
 * The stage must be rendered at real dimensions (no preview scaling).
 */
export async function generateEncartePdfFromStage(
  exportStage: any,
  dimensions: CanvasDimensions,
  isLandscape: boolean
): Promise<void> {
  if (!exportStage) {
    throw new Error("Canvas não está pronto para exportar");
  }

  // Wait for any pending draws
  await new Promise<void>(resolve => requestAnimationFrame(() => resolve()));

  const pdf = new jsPDF({
    orientation: isLandscape ? "landscape" : "portrait",
    unit: "pt",
    format: "a4",
  });

  const pdfWidth = pdf.internal.pageSize.getWidth();
  const pdfHeight = pdf.internal.pageSize.getHeight();

  // Calculate pixelRatio based on target DPI
  // The stage is already at 1:1 (real size), so we just multiply by DPI ratio
  const pixelRatio = EXPORT_DPI / PDF_BASE_DPI;

  // Export the stage to a data URL
  const dataUrl: string = exportStage.toDataURL({
    pixelRatio,
    mimeType: "image/png",
    quality: 1,
  });

  // Load the image to get its actual dimensions
  const img = await loadImage(dataUrl);
  const imgWidth = img.naturalWidth;
  const imgHeight = img.naturalHeight;

  // Calculate aspect ratios
  const imgAspect = imgWidth / imgHeight;
  const pdfAspect = pdfWidth / pdfHeight;

  // Fit the image inside the PDF page while preserving aspect ratio
  let renderWidth: number;
  let renderHeight: number;

  // Apply safe margin
  const availableWidth = pdfWidth - SAFE_MARGIN * 2;
  const availableHeight = pdfHeight - SAFE_MARGIN * 2;

  if (imgAspect > availableWidth / availableHeight) {
    // Image is wider relative to its height
    renderWidth = availableWidth;
    renderHeight = availableWidth / imgAspect;
  } else {
    // Image is taller relative to its width
    renderHeight = availableHeight;
    renderWidth = availableHeight * imgAspect;
  }

  // Center the image on the page
  const x = (pdfWidth - renderWidth) / 2;
  const y = (pdfHeight - renderHeight) / 2;

  // Add image to PDF
  pdf.addImage(dataUrl, "PNG", x, y, renderWidth, renderHeight);
  pdf.save("encarte.pdf");
}

/**
 * Helper to load an image and get its dimensions
 */
function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new window.Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Failed to load exported image"));
    img.src = src;
  });
}
