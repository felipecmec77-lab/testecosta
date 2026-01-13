import { Button } from "@/components/ui/button";
import { LayoutTemplate, Apple, Carrot, Citrus, Cherry, Grape, Leaf, Sparkles, Tag, Percent, Star } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";

interface TemplateGalleryProps {
  onSelectTemplate: (template: any) => void;
  isLandscape: boolean;
}

// Template generators for price tags
const createPromotionTemplate = (isLandscape: boolean) => {
  const width = isLandscape ? 842 : 595;
  const height = isLandscape ? 595 : 842;
  
  return {
    version: "6.0.0",
    objects: [
      {
        type: "rect",
        left: 0,
        top: 0,
        width: width,
        height: height,
        fill: "#ffffff",
        selectable: false,
      },
      {
        type: "rect",
        left: 20,
        top: 20,
        width: width - 40,
        height: isLandscape ? 80 : 100,
        fill: "#14b8a6",
        rx: 15,
        ry: 15,
      },
      {
        type: "i-text",
        left: width / 2,
        top: isLandscape ? 40 : 45,
        text: "PROMOÇÃO DO DIA 🔥",
        fontSize: isLandscape ? 40 : 48,
        fontFamily: "Impact",
        fill: "#ffffff",
        fontWeight: "bold",
        originX: "center",
        originY: "center",
      },
      {
        type: "i-text",
        left: width / 2,
        top: height * 0.35,
        text: "BATATA INGLESA",
        fontSize: isLandscape ? 60 : 72,
        fontFamily: "Arial",
        fill: "#000000",
        fontWeight: "bold",
        originX: "center",
        originY: "center",
      },
      {
        type: "i-text",
        left: width * 0.25,
        top: height * 0.55,
        text: "R$",
        fontSize: isLandscape ? 60 : 80,
        fontFamily: "Arial",
        fill: "#dc2626",
        fontWeight: "bold",
        originX: "center",
        originY: "center",
      },
      {
        type: "i-text",
        left: width * 0.55,
        top: height * 0.55,
        text: "6,49",
        fontSize: isLandscape ? 150 : 200,
        fontFamily: "Impact",
        fill: "#dc2626",
        fontWeight: "bold",
        originX: "center",
        originY: "center",
      },
      {
        type: "i-text",
        left: width * 0.8,
        top: height * 0.55,
        text: "KG",
        fontSize: isLandscape ? 40 : 50,
        fontFamily: "Arial",
        fill: "#000000",
        fontWeight: "bold",
        originX: "center",
        originY: "center",
      },
      {
        type: "i-text",
        left: width / 2,
        top: height * 0.85,
        text: "Oferta válida enquanto durarem os estoques",
        fontSize: isLandscape ? 20 : 24,
        fontFamily: "Arial",
        fill: "#666666",
        originX: "center",
        originY: "center",
      },
    ],
    background: "#ffffff",
  };
};

const createOfferTemplate = (isLandscape: boolean) => {
  const width = isLandscape ? 842 : 595;
  const height = isLandscape ? 595 : 842;
  
  return {
    version: "6.0.0",
    objects: [
      {
        type: "rect",
        left: 0,
        top: 0,
        width: width,
        height: height,
        fill: "#fef3c7",
        selectable: false,
      },
      {
        type: "rect",
        left: 0,
        top: 0,
        width: width,
        height: isLandscape ? 100 : 120,
        fill: "#f59e0b",
      },
      {
        type: "i-text",
        left: width / 2,
        top: isLandscape ? 50 : 60,
        text: "⭐ OFERTA ESPECIAL ⭐",
        fontSize: isLandscape ? 44 : 52,
        fontFamily: "Impact",
        fill: "#ffffff",
        fontWeight: "bold",
        originX: "center",
        originY: "center",
      },
      {
        type: "i-text",
        left: width / 2,
        top: height * 0.32,
        text: "TOMATE ITALIANO",
        fontSize: isLandscape ? 56 : 68,
        fontFamily: "Arial",
        fill: "#000000",
        fontWeight: "bold",
        originX: "center",
        originY: "center",
      },
      {
        type: "circle",
        left: width / 2,
        top: height * 0.58,
        radius: isLandscape ? 120 : 150,
        fill: "#dc2626",
        originX: "center",
        originY: "center",
      },
      {
        type: "i-text",
        left: width / 2,
        top: height * 0.55,
        text: "R$ 8,99",
        fontSize: isLandscape ? 50 : 64,
        fontFamily: "Impact",
        fill: "#ffffff",
        fontWeight: "bold",
        originX: "center",
        originY: "center",
      },
      {
        type: "i-text",
        left: width / 2,
        top: height * 0.65,
        text: "KG",
        fontSize: isLandscape ? 30 : 36,
        fontFamily: "Arial",
        fill: "#ffffff",
        fontWeight: "bold",
        originX: "center",
        originY: "center",
      },
    ],
    background: "#fef3c7",
  };
};

const createSimpleTemplate = (isLandscape: boolean) => {
  const width = isLandscape ? 842 : 595;
  const height = isLandscape ? 595 : 842;
  
  return {
    version: "6.0.0",
    objects: [
      {
        type: "rect",
        left: 10,
        top: 10,
        width: width - 20,
        height: height - 20,
        fill: "#ffffff",
        stroke: "#000000",
        strokeWidth: 4,
        rx: 10,
        ry: 10,
      },
      {
        type: "i-text",
        left: width / 2,
        top: height * 0.25,
        text: "PRODUTO",
        fontSize: isLandscape ? 70 : 90,
        fontFamily: "Arial",
        fill: "#000000",
        fontWeight: "bold",
        originX: "center",
        originY: "center",
      },
      {
        type: "i-text",
        left: width / 2,
        top: height * 0.55,
        text: "R$ 0,00",
        fontSize: isLandscape ? 100 : 140,
        fontFamily: "Impact",
        fill: "#dc2626",
        fontWeight: "bold",
        originX: "center",
        originY: "center",
      },
      {
        type: "i-text",
        left: width / 2,
        top: height * 0.75,
        text: "UN",
        fontSize: isLandscape ? 40 : 50,
        fontFamily: "Arial",
        fill: "#666666",
        fontWeight: "bold",
        originX: "center",
        originY: "center",
      },
    ],
    background: "#ffffff",
  };
};

const createHortifrutiTemplate = (isLandscape: boolean) => {
  const width = isLandscape ? 842 : 595;
  const height = isLandscape ? 595 : 842;
  
  return {
    version: "6.0.0",
    objects: [
      {
        type: "rect",
        left: 0,
        top: 0,
        width: width,
        height: height,
        fill: "#ecfdf5",
        selectable: false,
      },
      {
        type: "rect",
        left: 0,
        top: 0,
        width: width,
        height: 15,
        fill: "#22c55e",
      },
      {
        type: "rect",
        left: 0,
        top: height - 15,
        width: width,
        height: 15,
        fill: "#22c55e",
      },
      {
        type: "rect",
        left: width / 2 - 60,
        top: 30,
        width: 120,
        height: 60,
        fill: "#22c55e",
        rx: 8,
        ry: 8,
      },
      {
        type: "i-text",
        left: width / 2,
        top: 60,
        text: "HORTIFRUTI",
        fontSize: 18,
        fontFamily: "Arial",
        fill: "#ffffff",
        fontWeight: "bold",
        originX: "center",
        originY: "center",
      },
      {
        type: "i-text",
        left: width / 2,
        top: height * 0.3,
        text: "MAÇÃ FUJI",
        fontSize: isLandscape ? 65 : 80,
        fontFamily: "Arial",
        fill: "#166534",
        fontWeight: "bold",
        originX: "center",
        originY: "center",
      },
      {
        type: "i-text",
        left: width * 0.2,
        top: height * 0.55,
        text: "R$",
        fontSize: isLandscape ? 50 : 70,
        fontFamily: "Arial",
        fill: "#dc2626",
        fontWeight: "bold",
        originX: "center",
        originY: "center",
      },
      {
        type: "i-text",
        left: width * 0.55,
        top: height * 0.55,
        text: "12,90",
        fontSize: isLandscape ? 130 : 170,
        fontFamily: "Impact",
        fill: "#dc2626",
        fontWeight: "bold",
        originX: "center",
        originY: "center",
      },
      {
        type: "i-text",
        left: width * 0.85,
        top: height * 0.55,
        text: "KG",
        fontSize: isLandscape ? 40 : 50,
        fontFamily: "Arial",
        fill: "#166534",
        fontWeight: "bold",
        originX: "center",
        originY: "center",
      },
      {
        type: "i-text",
        left: width / 2,
        top: height * 0.82,
        text: "Produtos frescos todos os dias!",
        fontSize: isLandscape ? 22 : 28,
        fontFamily: "Arial",
        fill: "#22c55e",
        fontStyle: "italic",
        originX: "center",
        originY: "center",
      },
    ],
    background: "#ecfdf5",
  };
};

// NEW: Frutas Template
const createFrutasTemplate = (isLandscape: boolean) => {
  const width = isLandscape ? 842 : 595;
  const height = isLandscape ? 595 : 842;
  
  return {
    version: "6.0.0",
    objects: [
      {
        type: "rect",
        left: 0,
        top: 0,
        width: width,
        height: height,
        fill: "#fef9c3",
        selectable: false,
      },
      // Sun decoration
      {
        type: "circle",
        left: width - 80,
        top: 80,
        radius: 60,
        fill: "#fbbf24",
        opacity: 0.5,
        originX: "center",
        originY: "center",
      },
      {
        type: "i-text",
        left: width / 2,
        top: isLandscape ? 60 : 80,
        text: "🍊 FRUTAS FRESCAS 🍎",
        fontSize: isLandscape ? 44 : 52,
        fontFamily: "Arial",
        fill: "#ea580c",
        fontWeight: "bold",
        originX: "center",
        originY: "center",
      },
      {
        type: "i-text",
        left: width / 2,
        top: height * 0.32,
        text: "LARANJA PERA",
        fontSize: isLandscape ? 60 : 75,
        fontFamily: "Arial",
        fill: "#c2410c",
        fontWeight: "bold",
        originX: "center",
        originY: "center",
      },
      {
        type: "rect",
        left: width * 0.15,
        top: height * 0.45,
        width: width * 0.7,
        height: isLandscape ? 140 : 180,
        fill: "#f97316",
        rx: 20,
        ry: 20,
      },
      {
        type: "i-text",
        left: width / 2,
        top: height * 0.56,
        text: "R$ 4,99 KG",
        fontSize: isLandscape ? 60 : 80,
        fontFamily: "Impact",
        fill: "#ffffff",
        fontWeight: "bold",
        originX: "center",
        originY: "center",
      },
      {
        type: "i-text",
        left: width / 2,
        top: height * 0.85,
        text: "Direto do produtor para você!",
        fontSize: isLandscape ? 20 : 24,
        fontFamily: "Arial",
        fill: "#9a3412",
        fontStyle: "italic",
        originX: "center",
        originY: "center",
      },
    ],
    background: "#fef9c3",
  };
};

// NEW: Verduras Template
const createVerdurasTemplate = (isLandscape: boolean) => {
  const width = isLandscape ? 842 : 595;
  const height = isLandscape ? 595 : 842;
  
  return {
    version: "6.0.0",
    objects: [
      {
        type: "rect",
        left: 0,
        top: 0,
        width: width,
        height: height,
        fill: "#d1fae5",
        selectable: false,
      },
      // Decorative leaf shapes
      {
        type: "circle",
        left: 40,
        top: 40,
        radius: 30,
        fill: "#10b981",
        opacity: 0.3,
        originX: "center",
        originY: "center",
      },
      {
        type: "circle",
        left: width - 40,
        top: height - 40,
        radius: 40,
        fill: "#10b981",
        opacity: 0.3,
        originX: "center",
        originY: "center",
      },
      {
        type: "i-text",
        left: width / 2,
        top: isLandscape ? 50 : 70,
        text: "🥬 VERDURAS 🥦",
        fontSize: isLandscape ? 40 : 48,
        fontFamily: "Arial",
        fill: "#047857",
        fontWeight: "bold",
        originX: "center",
        originY: "center",
      },
      {
        type: "i-text",
        left: width / 2,
        top: height * 0.28,
        text: "ALFACE CRESPA",
        fontSize: isLandscape ? 55 : 70,
        fontFamily: "Arial",
        fill: "#065f46",
        fontWeight: "bold",
        originX: "center",
        originY: "center",
      },
      {
        type: "i-text",
        left: width / 2,
        top: height * 0.42,
        text: "MAÇO",
        fontSize: isLandscape ? 28 : 34,
        fontFamily: "Arial",
        fill: "#059669",
        fontWeight: "normal",
        originX: "center",
        originY: "center",
      },
      {
        type: "circle",
        left: width / 2,
        top: height * 0.62,
        radius: isLandscape ? 100 : 130,
        fill: "#059669",
        originX: "center",
        originY: "center",
      },
      {
        type: "i-text",
        left: width / 2,
        top: height * 0.58,
        text: "R$",
        fontSize: isLandscape ? 30 : 40,
        fontFamily: "Arial",
        fill: "#ffffff",
        fontWeight: "bold",
        originX: "center",
        originY: "center",
      },
      {
        type: "i-text",
        left: width / 2,
        top: height * 0.68,
        text: "2,49",
        fontSize: isLandscape ? 60 : 80,
        fontFamily: "Impact",
        fill: "#ffffff",
        fontWeight: "bold",
        originX: "center",
        originY: "center",
      },
      {
        type: "i-text",
        left: width / 2,
        top: height * 0.88,
        text: "Colhido hoje, na sua mesa amanhã!",
        fontSize: isLandscape ? 18 : 22,
        fontFamily: "Arial",
        fill: "#047857",
        fontStyle: "italic",
        originX: "center",
        originY: "center",
      },
    ],
    background: "#d1fae5",
  };
};

// NEW: Legumes Template
const createLegumesTemplate = (isLandscape: boolean) => {
  const width = isLandscape ? 842 : 595;
  const height = isLandscape ? 595 : 842;
  
  return {
    version: "6.0.0",
    objects: [
      {
        type: "rect",
        left: 0,
        top: 0,
        width: width,
        height: height,
        fill: "#fef2f2",
        selectable: false,
      },
      // Top stripe
      {
        type: "rect",
        left: 0,
        top: 0,
        width: width,
        height: isLandscape ? 90 : 110,
        fill: "#dc2626",
      },
      {
        type: "i-text",
        left: width / 2,
        top: isLandscape ? 45 : 55,
        text: "🥕 LEGUMES FRESCOS 🥔",
        fontSize: isLandscape ? 38 : 46,
        fontFamily: "Arial",
        fill: "#ffffff",
        fontWeight: "bold",
        originX: "center",
        originY: "center",
      },
      {
        type: "i-text",
        left: width / 2,
        top: height * 0.32,
        text: "CENOURA",
        fontSize: isLandscape ? 70 : 90,
        fontFamily: "Arial",
        fill: "#b91c1c",
        fontWeight: "bold",
        originX: "center",
        originY: "center",
      },
      {
        type: "rect",
        left: width * 0.1,
        top: height * 0.45,
        width: width * 0.8,
        height: isLandscape ? 150 : 200,
        fill: "#ffffff",
        stroke: "#dc2626",
        strokeWidth: 4,
        rx: 15,
        ry: 15,
      },
      {
        type: "i-text",
        left: width * 0.25,
        top: height * 0.55,
        text: "R$",
        fontSize: isLandscape ? 50 : 65,
        fontFamily: "Arial",
        fill: "#dc2626",
        fontWeight: "bold",
        originX: "center",
        originY: "center",
      },
      {
        type: "i-text",
        left: width * 0.55,
        top: height * 0.55,
        text: "5,99",
        fontSize: isLandscape ? 110 : 140,
        fontFamily: "Impact",
        fill: "#dc2626",
        fontWeight: "bold",
        originX: "center",
        originY: "center",
      },
      {
        type: "i-text",
        left: width * 0.85,
        top: height * 0.55,
        text: "KG",
        fontSize: isLandscape ? 35 : 45,
        fontFamily: "Arial",
        fill: "#991b1b",
        fontWeight: "bold",
        originX: "center",
        originY: "center",
      },
      {
        type: "i-text",
        left: width / 2,
        top: height * 0.85,
        text: "Qualidade garantida!",
        fontSize: isLandscape ? 22 : 28,
        fontFamily: "Arial",
        fill: "#b91c1c",
        fontWeight: "bold",
        originX: "center",
        originY: "center",
      },
    ],
    background: "#fef2f2",
  };
};

// NEW: Super Oferta Template
const createSuperOfertaTemplate = (isLandscape: boolean) => {
  const width = isLandscape ? 842 : 595;
  const height = isLandscape ? 595 : 842;
  
  return {
    version: "6.0.0",
    objects: [
      {
        type: "rect",
        left: 0,
        top: 0,
        width: width,
        height: height,
        fill: "#1e3a8a",
        selectable: false,
      },
      // Starburst effect
      {
        type: "circle",
        left: width / 2,
        top: height * 0.15,
        radius: isLandscape ? 70 : 90,
        fill: "#fbbf24",
        originX: "center",
        originY: "center",
      },
      {
        type: "i-text",
        left: width / 2,
        top: height * 0.15,
        text: "SUPER\nOFERTA",
        fontSize: isLandscape ? 22 : 28,
        fontFamily: "Impact",
        fill: "#1e3a8a",
        fontWeight: "bold",
        textAlign: "center",
        originX: "center",
        originY: "center",
      },
      {
        type: "i-text",
        left: width / 2,
        top: height * 0.38,
        text: "BANANA PRATA",
        fontSize: isLandscape ? 55 : 70,
        fontFamily: "Arial",
        fill: "#fbbf24",
        fontWeight: "bold",
        originX: "center",
        originY: "center",
      },
      {
        type: "i-text",
        left: width / 2,
        top: height * 0.52,
        text: "DE: R$ 6,99",
        fontSize: isLandscape ? 28 : 36,
        fontFamily: "Arial",
        fill: "#94a3b8",
        fontWeight: "normal",
        originX: "center",
        originY: "center",
      },
      {
        type: "i-text",
        left: width / 2,
        top: height * 0.68,
        text: "R$ 3,99",
        fontSize: isLandscape ? 100 : 130,
        fontFamily: "Impact",
        fill: "#ffffff",
        fontWeight: "bold",
        originX: "center",
        originY: "center",
      },
      {
        type: "i-text",
        left: width / 2,
        top: height * 0.82,
        text: "KG",
        fontSize: isLandscape ? 40 : 50,
        fontFamily: "Arial",
        fill: "#fbbf24",
        fontWeight: "bold",
        originX: "center",
        originY: "center",
      },
      {
        type: "i-text",
        left: width / 2,
        top: height * 0.93,
        text: "Válido enquanto durarem os estoques",
        fontSize: isLandscape ? 16 : 20,
        fontFamily: "Arial",
        fill: "#94a3b8",
        originX: "center",
        originY: "center",
      },
    ],
    background: "#1e3a8a",
  };
};

// NEW: Combo Template
const createComboTemplate = (isLandscape: boolean) => {
  const width = isLandscape ? 842 : 595;
  const height = isLandscape ? 595 : 842;
  
  return {
    version: "6.0.0",
    objects: [
      {
        type: "rect",
        left: 0,
        top: 0,
        width: width,
        height: height,
        fill: "#7c3aed",
        selectable: false,
      },
      {
        type: "i-text",
        left: width / 2,
        top: isLandscape ? 60 : 80,
        text: "🎉 COMBO ESPECIAL 🎉",
        fontSize: isLandscape ? 40 : 50,
        fontFamily: "Impact",
        fill: "#ffffff",
        fontWeight: "bold",
        originX: "center",
        originY: "center",
      },
      {
        type: "rect",
        left: width * 0.1,
        top: height * 0.18,
        width: width * 0.8,
        height: isLandscape ? 180 : 240,
        fill: "#ffffff",
        rx: 15,
        ry: 15,
      },
      {
        type: "i-text",
        left: width / 2,
        top: height * 0.28,
        text: "3 FRUTAS + 2 VERDURAS",
        fontSize: isLandscape ? 28 : 36,
        fontFamily: "Arial",
        fill: "#7c3aed",
        fontWeight: "bold",
        textAlign: "center",
        originX: "center",
        originY: "center",
      },
      {
        type: "i-text",
        left: width / 2,
        top: height * 0.38,
        text: "Maçã, Banana, Laranja\nAlface, Couve",
        fontSize: isLandscape ? 20 : 24,
        fontFamily: "Arial",
        fill: "#6b7280",
        textAlign: "center",
        originX: "center",
        originY: "center",
      },
      {
        type: "i-text",
        left: width / 2,
        top: height * 0.58,
        text: "TUDO POR APENAS",
        fontSize: isLandscape ? 28 : 36,
        fontFamily: "Arial",
        fill: "#fbbf24",
        fontWeight: "bold",
        originX: "center",
        originY: "center",
      },
      {
        type: "i-text",
        left: width / 2,
        top: height * 0.74,
        text: "R$ 24,90",
        fontSize: isLandscape ? 90 : 120,
        fontFamily: "Impact",
        fill: "#ffffff",
        fontWeight: "bold",
        originX: "center",
        originY: "center",
      },
      {
        type: "i-text",
        left: width / 2,
        top: height * 0.9,
        text: "Economia de mais de 30%!",
        fontSize: isLandscape ? 20 : 26,
        fontFamily: "Arial",
        fill: "#a5f3fc",
        fontStyle: "italic",
        originX: "center",
        originY: "center",
      },
    ],
    background: "#7c3aed",
  };
};

// NEW: Feira Template
const createFeiraTemplate = (isLandscape: boolean) => {
  const width = isLandscape ? 842 : 595;
  const height = isLandscape ? 595 : 842;
  
  return {
    version: "6.0.0",
    objects: [
      {
        type: "rect",
        left: 0,
        top: 0,
        width: width,
        height: height,
        fill: "#faf5ff",
        selectable: false,
      },
      // Top border
      {
        type: "rect",
        left: 0,
        top: 0,
        width: width,
        height: 20,
        fill: "#a855f7",
      },
      // Bottom border
      {
        type: "rect",
        left: 0,
        top: height - 20,
        width: width,
        height: 20,
        fill: "#a855f7",
      },
      {
        type: "i-text",
        left: width / 2,
        top: isLandscape ? 70 : 90,
        text: "DIA DE FEIRA",
        fontSize: isLandscape ? 50 : 65,
        fontFamily: "Impact",
        fill: "#7e22ce",
        fontWeight: "bold",
        originX: "center",
        originY: "center",
      },
      {
        type: "i-text",
        left: width / 2,
        top: height * 0.28,
        text: "MORANGO",
        fontSize: isLandscape ? 65 : 85,
        fontFamily: "Arial",
        fill: "#dc2626",
        fontWeight: "bold",
        originX: "center",
        originY: "center",
      },
      {
        type: "i-text",
        left: width / 2,
        top: height * 0.4,
        text: "BANDEJA 300G",
        fontSize: isLandscape ? 24 : 30,
        fontFamily: "Arial",
        fill: "#6b7280",
        originX: "center",
        originY: "center",
      },
      {
        type: "i-text",
        left: width / 2,
        top: height * 0.6,
        text: "R$ 9,99",
        fontSize: isLandscape ? 100 : 130,
        fontFamily: "Impact",
        fill: "#7e22ce",
        fontWeight: "bold",
        originX: "center",
        originY: "center",
      },
      {
        type: "circle",
        left: width * 0.85,
        top: height * 0.6,
        radius: isLandscape ? 40 : 50,
        fill: "#fbbf24",
        originX: "center",
        originY: "center",
      },
      {
        type: "i-text",
        left: width * 0.85,
        top: height * 0.6,
        text: "NOVO",
        fontSize: isLandscape ? 14 : 18,
        fontFamily: "Arial",
        fill: "#000000",
        fontWeight: "bold",
        originX: "center",
        originY: "center",
      },
      {
        type: "i-text",
        left: width / 2,
        top: height * 0.85,
        text: "Toda Quarta e Sábado!",
        fontSize: isLandscape ? 24 : 30,
        fontFamily: "Arial",
        fill: "#a855f7",
        fontWeight: "bold",
        originX: "center",
        originY: "center",
      },
    ],
    background: "#faf5ff",
  };
};

// NEW: Atacado Template
const createAtacadoTemplate = (isLandscape: boolean) => {
  const width = isLandscape ? 842 : 595;
  const height = isLandscape ? 595 : 842;
  
  return {
    version: "6.0.0",
    objects: [
      {
        type: "rect",
        left: 0,
        top: 0,
        width: width,
        height: height,
        fill: "#0f172a",
        selectable: false,
      },
      {
        type: "rect",
        left: 0,
        top: 0,
        width: width,
        height: isLandscape ? 100 : 120,
        fill: "#f97316",
      },
      {
        type: "i-text",
        left: width / 2,
        top: isLandscape ? 50 : 60,
        text: "PREÇO DE ATACADO",
        fontSize: isLandscape ? 44 : 54,
        fontFamily: "Impact",
        fill: "#ffffff",
        fontWeight: "bold",
        originX: "center",
        originY: "center",
      },
      {
        type: "i-text",
        left: width / 2,
        top: height * 0.32,
        text: "CEBOLA ROXA",
        fontSize: isLandscape ? 58 : 72,
        fontFamily: "Arial",
        fill: "#f97316",
        fontWeight: "bold",
        originX: "center",
        originY: "center",
      },
      {
        type: "i-text",
        left: width / 2,
        top: height * 0.44,
        text: "CAIXA 20KG",
        fontSize: isLandscape ? 26 : 32,
        fontFamily: "Arial",
        fill: "#94a3b8",
        originX: "center",
        originY: "center",
      },
      {
        type: "i-text",
        left: width / 2,
        top: height * 0.62,
        text: "R$ 89,90",
        fontSize: isLandscape ? 100 : 130,
        fontFamily: "Impact",
        fill: "#ffffff",
        fontWeight: "bold",
        originX: "center",
        originY: "center",
      },
      {
        type: "i-text",
        left: width / 2,
        top: height * 0.78,
        text: "R$ 4,49/KG",
        fontSize: isLandscape ? 36 : 46,
        fontFamily: "Arial",
        fill: "#22c55e",
        fontWeight: "bold",
        originX: "center",
        originY: "center",
      },
      {
        type: "i-text",
        left: width / 2,
        top: height * 0.92,
        text: "Compra mínima: 1 caixa",
        fontSize: isLandscape ? 18 : 22,
        fontFamily: "Arial",
        fill: "#64748b",
        originX: "center",
        originY: "center",
      },
    ],
    background: "#0f172a",
  };
};

// Template categories
const templateCategories = [
  {
    name: "Hortifruti",
    icon: Leaf,
    templates: [
      { id: "hortifruti", name: "Hortifruti", generator: createHortifrutiTemplate, color: "#22c55e" },
      { id: "frutas", name: "Frutas", generator: createFrutasTemplate, color: "#f97316" },
      { id: "verduras", name: "Verduras", generator: createVerdurasTemplate, color: "#10b981" },
      { id: "legumes", name: "Legumes", generator: createLegumesTemplate, color: "#dc2626" },
    ]
  },
  {
    name: "Promoções",
    icon: Percent,
    templates: [
      { id: "promo", name: "Promoção", generator: createPromotionTemplate, color: "#14b8a6" },
      { id: "oferta", name: "Oferta", generator: createOfferTemplate, color: "#f59e0b" },
      { id: "super-oferta", name: "Super Oferta", generator: createSuperOfertaTemplate, color: "#1e3a8a" },
    ]
  },
  {
    name: "Especiais",
    icon: Star,
    templates: [
      { id: "simple", name: "Simples", generator: createSimpleTemplate, color: "#6b7280" },
      { id: "combo", name: "Combo", generator: createComboTemplate, color: "#7c3aed" },
      { id: "feira", name: "Dia de Feira", generator: createFeiraTemplate, color: "#a855f7" },
      { id: "atacado", name: "Atacado", generator: createAtacadoTemplate, color: "#f97316" },
    ]
  },
];

export function TemplateGallery({ onSelectTemplate, isLandscape }: TemplateGalleryProps) {
  return (
    <div className="space-y-6">
      {templateCategories.map((category) => (
        <div key={category.name}>
          <h4 className="text-sm font-medium mb-3 flex items-center gap-2 text-white/80">
            <category.icon className="h-4 w-4" /> {category.name}
          </h4>
          <div className="grid grid-cols-2 gap-2">
            {category.templates.map((template) => (
              <Button
                key={template.id}
                variant="outline"
                className="h-20 flex flex-col gap-1 p-2 bg-[#3d3d3d] border-[#4d4d4d] hover:bg-[#4d4d4d] text-white"
                onClick={() => onSelectTemplate(template.generator(isLandscape))}
              >
                <div 
                  className="w-8 h-8 rounded"
                  style={{ backgroundColor: template.color }}
                />
                <span className="text-xs text-white/80">{template.name}</span>
              </Button>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
