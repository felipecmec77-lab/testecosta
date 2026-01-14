import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import MainLayout from "@/components/layout/MainLayout";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Package,
  Search,
  Plus,
  Upload,
  Download,
  Pencil,
  Trash2,
  AlertTriangle,
  DollarSign,
  PackageX,
  Loader2,
  FileSpreadsheet,
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
  Settings2,
  Check,
  X,
  Tag,
  QrCode,
  ScanLine,
  ShoppingCart,
  Layers,
  Settings,
  BarChart3,
  MoreVertical,
  TrendingDown,
} from "lucide-react";
import * as XLSX from "xlsx";
import ThermalLabelGenerator from "@/components/estoque/ThermalLabelGenerator";
import CategoriesManager from "@/components/estoque/CategoriesManager";
import PedidosTab from "@/components/estoque/PedidosTab";
import PerdasTab from "@/components/estoque/PerdasTab";
import CadastroConfigManager from "@/components/estoque/CadastroConfigManager";
import EstoqueRelatorios from "@/components/estoque/EstoqueRelatorios";
import ScannerDialog from "@/components/estoque/ScannerDialog";
import { searchAcrossFields } from "@/lib/searchUtils";

interface EstoqueItem {
  id: string;
  codigo: string;
  codigo_barras: string | null;
  nome: string;
  grupo: string | null;
  subgrupo: string | null;
  referencia: string | null;
  marca: string | null;
  preco_custo: number;
  preco_venda: number;
  preco_promocao: number | null;
  estoque_atual: number;
  estoque_minimo: number;
  estoque_maximo: number | null;
  ncm: string | null;
  unidade: string | null;
  peso_bruto: number | null;
  peso_liquido: number | null;
  localizacao: string | null;
  saldo: number | null;
  ativo: boolean;
  criado_em: string;
  atualizado_em: string;
}

interface ImportPreview {
  data: Partial<EstoqueItem>[];
  headers: string[];
  mapping: Record<string, string>;
}

interface ImportFile {
  name: string;
  rows: any[][];
  mapping: Record<number, string>;
  totalRows: number;
  validItems: number;
  invalidItems: number;
  validationErrors: ValidationError[];
}

interface ValidationError {
  row: number;
  field: string;
  message: string;
  value: any;
}

const ITEMS_PER_PAGE = 20;

// Column configuration
interface ColumnConfig {
  key: string;
  label: string;
  defaultVisible: boolean;
}

const AVAILABLE_COLUMNS: ColumnConfig[] = [
  { key: "codigo", label: "Código", defaultVisible: true },
  { key: "nome", label: "Produto", defaultVisible: true },
  { key: "referencia", label: "Referência", defaultVisible: true },
  { key: "codigo_barras", label: "Cód. Barras", defaultVisible: true },
  { key: "unidade", label: "Unidade", defaultVisible: true },
  { key: "preco_custo", label: "Preço Custo", defaultVisible: true },
  { key: "preco_venda", label: "Preço Venda", defaultVisible: true },
  { key: "preco_promocao", label: "Preço Promoção", defaultVisible: true },
  { key: "estoque_atual", label: "Estoque", defaultVisible: true },
  { key: "ativo", label: "Ativo", defaultVisible: true },
  { key: "grupo", label: "Grupo", defaultVisible: false },
  { key: "subgrupo", label: "Subgrupo", defaultVisible: false },
  { key: "marca", label: "Marca", defaultVisible: false },
  { key: "estoque_minimo", label: "Est. Mínimo", defaultVisible: false },
  { key: "estoque_maximo", label: "Est. Máximo", defaultVisible: false },
  { key: "ncm", label: "NCM", defaultVisible: false },
  { key: "peso_bruto", label: "Peso Bruto", defaultVisible: false },
  { key: "peso_liquido", label: "Peso Líquido", defaultVisible: false },
  { key: "localizacao", label: "Localização", defaultVisible: false },
  { key: "saldo", label: "Saldo", defaultVisible: false },
];

const getDefaultVisibleColumns = (): string[] => {
  return AVAILABLE_COLUMNS.filter(c => c.defaultVisible).map(c => c.key);
};

const loadVisibleColumns = (): string[] => {
  try {
    const saved = localStorage.getItem("estoque_visible_columns");
    if (saved) {
      return JSON.parse(saved);
    }
  } catch (e) {
    console.error("Error loading column config:", e);
  }
  return getDefaultVisibleColumns();
};

const Estoque = () => {
  const navigate = useNavigate();
  const { user, userRole, loading: authLoading } = useAuth();
  const { toast } = useToast();

  const [items, setItems] = useState<EstoqueItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [grupoFilter, setGrupoFilter] = useState<string>("all");
  const [marcaFilter, setMarcaFilter] = useState<string>("all");
  const [sortField, setSortField] = useState<keyof EstoqueItem>("nome");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");
  const [currentPage, setCurrentPage] = useState(1);
  const [visibleColumns, setVisibleColumns] = useState<string[]>(loadVisibleColumns);
  const [criticalFilter, setCriticalFilter] = useState<"all" | "critical" | "zerado" | "abaixo" | "negativo">("all");

  // Dialog states
  const [showProductDialog, setShowProductDialog] = useState(false);
  const [showImportDialog, setShowImportDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [editingItem, setEditingItem] = useState<EstoqueItem | null>(null);
  const [deletingItem, setDeletingItem] = useState<EstoqueItem | null>(null);
  const [saving, setSaving] = useState(false);
  const [importing, setImporting] = useState(false);
  const [importProgress, setImportProgress] = useState({ current: 0, total: 0, inserted: 0, updated: 0, errors: 0, currentFile: "" });

  // Form states
  const [formData, setFormData] = useState({
    codigo: "",
    codigo_barras: "",
    nome: "",
    grupo: "",
    subgrupo: "",
    referencia: "",
    marca: "",
    preco_custo: 0,
    preco_venda: 0,
    preco_promocao: 0,
    estoque_atual: 0,
    estoque_minimo: 0,
    estoque_maximo: 0,
    ncm: "",
    unidade: "UN",
    peso_bruto: 0,
    peso_liquido: 0,
    localizacao: "",
    saldo: 0,
  });

  // Import states - now supports multiple files
  const [importFiles, setImportFiles] = useState<ImportFile[]>([]);
  const [showValidationDetails, setShowValidationDetails] = useState(false);

  // Config dialog state
  const [showConfigDialog, setShowConfigDialog] = useState(false);
  const [showRelatoriosDialog, setShowRelatoriosDialog] = useState(false);
  const [showScannerDialog, setShowScannerDialog] = useState(false);

  // F1 and F4 keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "F1") {
        e.preventDefault();
        setShowConfigDialog(true);
      }
      if (e.key === "F4") {
        e.preventDefault();
        handleOpenProductDialog();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Save visible columns to localStorage
  const toggleColumn = (columnKey: string) => {
    setVisibleColumns(prev => {
      const newColumns = prev.includes(columnKey) 
        ? prev.filter(c => c !== columnKey)
        : [...prev, columnKey];
      localStorage.setItem("estoque_visible_columns", JSON.stringify(newColumns));
      return newColumns;
    });
  };

  const isColumnVisible = (columnKey: string) => visibleColumns.includes(columnKey);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/auth");
    }
  }, [user, authLoading, navigate]);

  useEffect(() => {
    fetchItems();
  }, []);

  const fetchItems = async () => {
    try {
      setLoading(true);
      
      // Buscar todos os itens em lotes para evitar limite de 1000 do Supabase
      const allItems: EstoqueItem[] = [];
      const FETCH_LIMIT = 1000;
      let offset = 0;
      let hasMore = true;

      while (hasMore) {
        const { data, error } = await supabase
          .from("estoque")
          .select("*")
          .order("nome")
          .range(offset, offset + FETCH_LIMIT - 1);

        if (error) throw error;
        
        if (data && data.length > 0) {
          allItems.push(...(data as EstoqueItem[]));
          offset += FETCH_LIMIT;
          hasMore = data.length === FETCH_LIMIT;
        } else {
          hasMore = false;
        }
      }

      setItems(allItems);
    } catch (error: any) {
      toast({
        title: "Erro ao carregar estoque",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // Get unique grupos and marcas for filters
  const grupos = useMemo(() => {
    const unique = [...new Set(items.map((i) => i.grupo).filter(Boolean))];
    return unique.sort();
  }, [items]);

  const marcas = useMemo(() => {
    const unique = [...new Set(items.map((i) => i.marca).filter(Boolean))];
    return unique.sort();
  }, [items]);

  // Filter and sort items
  const filteredItems = useMemo(() => {
    let result = items.filter((item) => {
      // Busca por múltiplas palavras - todas devem estar presentes
      const matchesSearch = searchAcrossFields(
        [item.codigo, item.codigo_barras, item.nome, item.marca, item.referencia, item.grupo, item.subgrupo],
        searchQuery
      );

      const matchesGrupo = grupoFilter === "all" || item.grupo === grupoFilter;
      const matchesMarca = marcaFilter === "all" || item.marca === marcaFilter;
      
      // Critical stock filter
      let matchesCritical = true;
      if (criticalFilter === "critical") {
        matchesCritical = item.estoque_atual <= 0 || item.estoque_atual < item.estoque_minimo;
      } else if (criticalFilter === "zerado") {
        matchesCritical = item.estoque_atual === 0;
      } else if (criticalFilter === "abaixo") {
        matchesCritical = item.estoque_atual < item.estoque_minimo && item.estoque_atual > 0;
      } else if (criticalFilter === "negativo") {
        matchesCritical = item.estoque_atual < 0;
      }

      return matchesSearch && matchesGrupo && matchesMarca && matchesCritical;
    });

    result.sort((a, b) => {
      const aVal = a[sortField] ?? "";
      const bVal = b[sortField] ?? "";
      const comparison = String(aVal).localeCompare(String(bVal), "pt-BR", { numeric: true });
      return sortDirection === "asc" ? comparison : -comparison;
    });

    return result;
  }, [items, searchQuery, grupoFilter, marcaFilter, sortField, sortDirection, criticalFilter]);

  // Pagination
  const totalPages = Math.ceil(filteredItems.length / ITEMS_PER_PAGE);
  const paginatedItems = filteredItems.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  // Summary stats
  const stats = useMemo(() => {
    const totalItems = items.length;
    // Ignorar estoques negativos no cálculo de valores totais
    const totalCusto = items.reduce((acc, i) => acc + i.preco_custo * Math.max(0, i.estoque_atual), 0);
    const totalVenda = items.reduce((acc, i) => acc + i.preco_venda * Math.max(0, i.estoque_atual), 0);
    const abaixoMinimo = items.filter((i) => i.estoque_atual < i.estoque_minimo && i.estoque_atual > 0).length;
    const estoquesNegativos = items.filter((i) => i.estoque_atual < 0).length;
    const estoquesZerados = items.filter((i) => i.estoque_atual === 0).length;
    const totalCriticos = abaixoMinimo + estoquesNegativos + estoquesZerados;
    return { totalItems, totalCusto, totalVenda, abaixoMinimo, estoquesNegativos, estoquesZerados, totalCriticos };
  }, [items]);

  const handleSort = (field: keyof EstoqueItem) => {
    if (sortField === field) {
      setSortDirection((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortDirection("asc");
    }
  };

  const resetForm = () => {
    setFormData({
      codigo: "",
      codigo_barras: "",
      nome: "",
      grupo: "",
      subgrupo: "",
      referencia: "",
      marca: "",
      preco_custo: 0,
      preco_venda: 0,
      preco_promocao: 0,
      estoque_atual: 0,
      estoque_minimo: 0,
      estoque_maximo: 0,
      ncm: "",
      unidade: "UN",
      peso_bruto: 0,
      peso_liquido: 0,
      localizacao: "",
      saldo: 0,
    });
    setEditingItem(null);
  };

  const handleOpenProductDialog = (item?: EstoqueItem) => {
    if (item) {
      setEditingItem(item);
      setFormData({
        codigo: item.codigo,
        codigo_barras: item.codigo_barras || "",
        nome: item.nome,
        grupo: item.grupo || "",
        subgrupo: item.subgrupo || "",
        referencia: item.referencia || "",
        marca: item.marca || "",
        preco_custo: item.preco_custo,
        preco_venda: item.preco_venda,
        preco_promocao: item.preco_promocao || 0,
        estoque_atual: item.estoque_atual,
        estoque_minimo: item.estoque_minimo,
        estoque_maximo: item.estoque_maximo || 0,
        ncm: item.ncm || "",
        unidade: item.unidade || "UN",
        peso_bruto: item.peso_bruto || 0,
        peso_liquido: item.peso_liquido || 0,
        localizacao: item.localizacao || "",
        saldo: item.saldo || 0,
      });
    } else {
      resetForm();
    }
    setShowProductDialog(true);
  };

  const handleSaveProduct = async () => {
    if (!formData.codigo || !formData.nome) {
      toast({
        title: "Erro",
        description: "Código e nome são obrigatórios",
        variant: "destructive",
      });
      return;
    }

    setSaving(true);
    try {
      if (editingItem) {
        const { error } = await supabase
          .from("estoque")
          .update({
            codigo: formData.codigo,
            codigo_barras: formData.codigo_barras || null,
            nome: formData.nome,
            grupo: formData.grupo || null,
            subgrupo: formData.subgrupo || null,
            referencia: formData.referencia || null,
            marca: formData.marca || null,
            preco_custo: formData.preco_custo,
            preco_venda: formData.preco_venda,
            preco_promocao: formData.preco_promocao || null,
            estoque_atual: formData.estoque_atual,
            estoque_minimo: formData.estoque_minimo,
            estoque_maximo: formData.estoque_maximo || null,
            ncm: formData.ncm || null,
            unidade: formData.unidade || null,
            peso_bruto: formData.peso_bruto || null,
            peso_liquido: formData.peso_liquido || null,
            localizacao: formData.localizacao || null,
            saldo: formData.saldo || null,
          })
          .eq("id", editingItem.id);

        if (error) throw error;
        toast({ title: "Produto atualizado com sucesso!" });
      } else {
        const { error } = await supabase.from("estoque").insert({
          codigo: formData.codigo,
          codigo_barras: formData.codigo_barras || null,
          nome: formData.nome,
          grupo: formData.grupo || null,
          subgrupo: formData.subgrupo || null,
          referencia: formData.referencia || null,
          marca: formData.marca || null,
          preco_custo: formData.preco_custo,
          preco_venda: formData.preco_venda,
          preco_promocao: formData.preco_promocao || null,
          estoque_atual: formData.estoque_atual,
          estoque_minimo: formData.estoque_minimo,
          estoque_maximo: formData.estoque_maximo || null,
          ncm: formData.ncm || null,
          unidade: formData.unidade || null,
          peso_bruto: formData.peso_bruto || null,
          peso_liquido: formData.peso_liquido || null,
          localizacao: formData.localizacao || null,
          saldo: formData.saldo || null,
        });

        if (error) throw error;
        toast({ title: "Produto adicionado com sucesso!" });
      }

      setShowProductDialog(false);
      resetForm();
      fetchItems();
    } catch (error: any) {
      toast({
        title: "Erro ao salvar produto",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteProduct = async () => {
    if (!deletingItem) return;

    try {
      const { error } = await supabase.from("estoque").delete().eq("id", deletingItem.id);

      if (error) throw error;
      toast({ title: "Produto excluído com sucesso!" });
      setShowDeleteDialog(false);
      setDeletingItem(null);
      fetchItems();
    } catch (error: any) {
      toast({
        title: "Erro ao excluir produto",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  // Validation function for each item
  const validateItem = (item: any, rowIndex: number): ValidationError[] => {
    const errors: ValidationError[] = [];
    
    // Required fields validation
    if (!item.codigo || String(item.codigo).trim() === "") {
      errors.push({ row: rowIndex + 2, field: "codigo", message: "Código é obrigatório", value: item.codigo });
    } else if (String(item.codigo).length > 100) {
      errors.push({ row: rowIndex + 2, field: "codigo", message: "Código muito longo (máx 100 caracteres)", value: item.codigo });
    }
    
    if (!item.nome || String(item.nome).trim() === "") {
      errors.push({ row: rowIndex + 2, field: "nome", message: "Nome é obrigatório", value: item.nome });
    } else if (String(item.nome).length > 255) {
      errors.push({ row: rowIndex + 2, field: "nome", message: "Nome muito longo (máx 255 caracteres)", value: item.nome });
    }
    
    // Numeric validation
    if (item.preco_custo !== null && item.preco_custo !== undefined) {
      const val = parseFloat(item.preco_custo);
      if (isNaN(val) || val < 0) {
        errors.push({ row: rowIndex + 2, field: "preco_custo", message: "Preço custo inválido", value: item.preco_custo });
      }
    }
    
    if (item.preco_venda !== null && item.preco_venda !== undefined) {
      const val = parseFloat(item.preco_venda);
      if (isNaN(val) || val < 0) {
        errors.push({ row: rowIndex + 2, field: "preco_venda", message: "Preço venda inválido", value: item.preco_venda });
      }
    }
    
    if (item.estoque_atual !== null && item.estoque_atual !== undefined) {
      const val = parseFloat(item.estoque_atual);
      if (isNaN(val)) {
        errors.push({ row: rowIndex + 2, field: "estoque_atual", message: "Estoque inválido", value: item.estoque_atual });
      }
    }
    
    // Code barras validation (optional but if present should be valid)
    if (item.codigo_barras && String(item.codigo_barras).length > 50) {
      errors.push({ row: rowIndex + 2, field: "codigo_barras", message: "Código de barras muito longo (máx 50)", value: item.codigo_barras });
    }
    
    return errors;
  };

  const processFileData = (file: File): Promise<ImportFile | null> => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = (event) => {
        try {
          const data = event.target?.result;
          const workbook = XLSX.read(data, { type: "binary" });
          const sheetName = workbook.SheetNames[0];
          const sheet = workbook.Sheets[sheetName];
          const jsonData = XLSX.utils.sheet_to_json(sheet, { header: 1 }) as any[][];

          if (jsonData.length < 2) {
            resolve(null);
            return;
          }

          const headers = jsonData[0].map((h: any) => String(h || "").trim());
          const rows = jsonData.slice(1).filter((row) => row.some((cell) => cell !== undefined && cell !== ""));

          // Auto-map columns
          const mapping: Record<number, string> = {};
          const fieldMappings: Record<string, string[]> = {
            codigo: ["codigo", "código", "cod", "code", "cod.", "cód", "cód.", "codprod", "cod_prod", "codproduto", "codpro"],
            codigo_barras: ["ean", "gtin", "codigo de barras", "código de barras", "barcode", "codbarras", "cod_barras", "codigobarras", "código barras", "codigo barras", "ean13", "ean8", "upc", "cod.barras", "cód.barras", "codbar"],
            nome: ["nome", "descrição", "descricao", "produto", "name", "description", "desc", "item", "mercadoria", "descr", "desc."],
            grupo: ["grupo", "categoria", "group", "category", "depto", "departamento", "setor", "secao", "seção", "codgru"],
            subgrupo: ["subgrupo", "subcategoria", "subgroup", "sub-grupo", "sub grupo", "familia", "família"],
            referencia: ["referencia", "referência", "ref", "ref."],
            marca: ["marca", "brand", "fabricante", "fornecedor"],
            preco_custo: ["custo", "preco_custo", "preço custo", "preco custo", "cost", "pr.custo", "pr custo", "valor custo", "vlr custo", "vlrcusto", "p.custo", "pcusto", "precocusto", "preco custo", "pr. custo", "un. custo", "pç custo"],
            preco_venda: ["venda", "preco_venda", "preço venda", "preco venda", "price", "pr.venda", "pr venda", "valor venda", "vlr venda", "vlrvenda", "p.venda", "pvenda", "precovenda", "preco venda", "pr. venda", "un. venda", "pç venda"],
            preco_promocao: ["promocao", "promoção", "preco_promocao", "precopromocao", "preco promocao", "preço promoção", "oferta", "desconto"],
            estoque_atual: ["estoque", "estoque_atual", "quantidade", "qty", "stock", "qtd", "qtde", "atual", "est", "est.", "quant", "quant."],
            estoque_minimo: ["estoquemin", "minimo", "mínimo", "estoque_minimo", "min", "min.", "est.min", "est min", "estmin", "qtd min", "qtd.min"],
            estoque_maximo: ["estoquemax", "maximo", "máximo", "estoque_maximo", "max", "max.", "est.max", "est max", "estmax", "qtd max", "qtd.max"],
            ncm: ["ncm", "ncm/sh", "codigo ncm", "código ncm"],
            unidade: ["unidade", "un", "coduni", "cod_uni", "un.", "unit", "umed", "unid"],
            peso_bruto: ["pesobruto", "peso_bruto", "peso bruto", "p.bruto", "pbruto", "gross weight"],
            peso_liquido: ["pesoliquido", "peso_liquido", "peso liquido", "peso líquido", "p.liquido", "pliquido", "net weight"],
            localizacao: ["localizacao", "localização", "local", "codloc", "cod_loc", "endereco", "endereço", "location"],
            saldo: ["saldo", "balance", "saldo atual"],
          };

          headers.forEach((header, index) => {
            const headerLower = header.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
            const headerClean = headerLower.replace(/[^a-z0-9]/g, "");
            
            for (const [field, keywords] of Object.entries(fieldMappings)) {
              const matched = keywords.some((k) => {
                const keywordClean = k.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]/g, "");
                return headerLower.includes(k.toLowerCase()) || 
                       headerClean.includes(keywordClean) ||
                       headerClean === keywordClean;
              });
              if (matched && !Object.values(mapping).includes(field)) {
                mapping[index] = field;
                break;
              }
            }
          });

          if (Object.keys(mapping).length === 0) {
            resolve(null);
            return;
          }

          // Parse and validate all items
          const allValidationErrors: ValidationError[] = [];
          let validCount = 0;
          let invalidCount = 0;

          rows.forEach((row, rowIndex) => {
            const item: any = {};
          (Object.entries(mapping) as [string, string][]).forEach(([colIndex, field]) => {
            const value = row[parseInt(colIndex)];
            
            // Campos numéricos obrigatórios (NOT NULL no banco) - usar 0 como fallback
            if (field === "preco_custo" || field === "preco_venda") {
              const numStr = String(value || "").replace(/[^\d,.-]/g, "").replace(",", ".");
              item[field] = parseFloat(numStr) || 0;
            }
            // Campos numéricos opcionais - podem ser null  
            else if (field === "preco_promocao" || field === "peso_bruto" || field === "peso_liquido" || field === "saldo") {
              const numStr = String(value || "").replace(/[^\d,.-]/g, "").replace(",", ".");
              const parsed = parseFloat(numStr);
              item[field] = isNaN(parsed) ? null : parsed;
            }
            // Campos de estoque - usar 0 como fallback
            else if (field === "estoque_atual" || field === "estoque_minimo" || field === "estoque_maximo") {
              const numStr = String(value || "").replace(/[^\d.-]/g, "");
              item[field] = parseFloat(numStr) || 0;
            }
            // Outros campos
            else {
              item[field] = value ? String(value).trim() : null;
            }
          });

            const errors = validateItem(item, rowIndex);
            if (errors.length > 0) {
              invalidCount++;
              allValidationErrors.push(...errors.slice(0, 3)); // Limit errors per row
            } else {
              validCount++;
            }
          });

          resolve({
            name: file.name,
            rows,
            mapping,
            totalRows: rows.length,
            validItems: validCount,
            invalidItems: invalidCount,
            validationErrors: allValidationErrors.slice(0, 50), // Limit total errors shown
          });
        } catch (error) {
          console.error("Error processing file:", error);
          resolve(null);
        }
      };
      reader.readAsBinaryString(file);
    });
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const fileArray = Array.from(files);
    const processedFiles: ImportFile[] = [];

    for (const file of fileArray) {
      const result = await processFileData(file);
      if (result) {
        processedFiles.push(result);
      } else {
        toast({
          title: `Erro ao processar: ${file.name}`,
          description: "Arquivo vazio ou colunas não reconhecidas",
          variant: "destructive",
        });
      }
    }

    if (processedFiles.length > 0) {
      setImportFiles(processedFiles);
      toast({
        title: `${processedFiles.length} arquivo(s) carregado(s)`,
        description: `Total de ${processedFiles.reduce((acc, f) => acc + f.totalRows, 0)} itens encontrados`,
      });
    }

    // Reset input
    e.target.value = "";
  };

  const removeImportFile = (index: number) => {
    setImportFiles(prev => prev.filter((_, i) => i !== index));
  };

  // Função para normalizar nome de subgrupo (uppercase, trim, remove acentos)
  const normalizeSubgrupo = (value: string | null): string | null => {
    if (!value) return null;
    return value
      .trim()
      .toUpperCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/\s+/g, " ");
  };

  const handleImport = async () => {
    if (importFiles.length === 0) {
      toast({
        title: "Erro",
        description: "Nenhum arquivo para importar",
        variant: "destructive",
      });
      return;
    }

    setImporting(true);
    setImportProgress({ current: 0, total: 0, inserted: 0, updated: 0, errors: 0, currentFile: "" });
    
    let totalInserted = 0;
    let totalUpdated = 0;
    let totalErrors = 0;

    try {
      // Buscar todos os subgrupos existentes no banco para unificação
      const { data: existingSubgrupos } = await supabase
        .from("estoque")
        .select("subgrupo")
        .not("subgrupo", "is", null);

      // Criar mapa de subgrupos normalizados para o nome original no banco
      const subgrupoMap = new Map<string, string>();
      if (existingSubgrupos) {
        existingSubgrupos.forEach((item: { subgrupo: string | null }) => {
          if (item.subgrupo) {
            const normalized = normalizeSubgrupo(item.subgrupo);
            if (normalized && !subgrupoMap.has(normalized)) {
              subgrupoMap.set(normalized, item.subgrupo);
            }
          }
        });
      }

      // Calculate total items across all files
      const grandTotal = importFiles.reduce((acc, f) => acc + f.totalRows, 0);

      for (let fileIndex = 0; fileIndex < importFiles.length; fileIndex++) {
        const importFile = importFiles[fileIndex];
        setImportProgress(prev => ({ ...prev, currentFile: importFile.name }));

        // Parse all items from this file
        const allItems = importFile.rows.map((row: any[], rowIndex: number) => {
          const item: any = {
            codigo: "",
            codigo_barras: null,
            nome: "",
            grupo: null,
            subgrupo: null,
            referencia: null,
            marca: null,
            preco_custo: 0,
            preco_venda: 0,
            preco_promocao: null,
            estoque_atual: 0,
            estoque_minimo: 0,
            estoque_maximo: null,
            ncm: null,
            unidade: "UN",
            peso_bruto: null,
            peso_liquido: null,
            localizacao: null,
            saldo: null,
          };

          (Object.entries(importFile.mapping) as [string, string][]).forEach(([colIndex, field]) => {
            const value = row[parseInt(colIndex)];
            
            // Campos numéricos obrigatórios (NOT NULL no banco) - usar 0 como fallback
            if (field === "preco_custo" || field === "preco_venda") {
              const numStr = String(value || "").replace(/[^\d,.-]/g, "").replace(",", ".");
              (item as any)[field] = parseFloat(numStr) || 0;
            }
            // Campos numéricos opcionais - podem ser null
            else if (field === "preco_promocao" || field === "peso_bruto" || field === "peso_liquido" || field === "saldo") {
              const numStr = String(value || "").replace(/[^\d,.-]/g, "").replace(",", ".");
              const parsed = parseFloat(numStr);
              (item as any)[field] = isNaN(parsed) ? null : parsed;
            }
            // Campos de estoque - usar 0 como fallback
            else if (field === "estoque_atual" || field === "estoque_minimo" || field === "estoque_maximo") {
              const numStr = String(value || "").replace(/[^\d.-]/g, "");
              (item as any)[field] = parseFloat(numStr) || 0;
            }
            // Campos de texto opcionais (exceto subgrupo que tem tratamento especial)
            else if (field === "grupo" || field === "referencia" || field === "marca" || field === "codigo_barras" || field === "ncm" || field === "unidade" || field === "localizacao") {
              (item as any)[field] = value ? String(value).trim() : null;
            }
            // Subgrupo - normalizar e unificar com existentes
            else if (field === "subgrupo") {
              const rawValue = value ? String(value).trim() : null;
              if (rawValue) {
                const normalized = normalizeSubgrupo(rawValue);
                // Se já existe um subgrupo com o mesmo nome normalizado, usar o existente
                if (normalized && subgrupoMap.has(normalized)) {
                  (item as any)[field] = subgrupoMap.get(normalized);
                } else if (normalized) {
                  // É um novo subgrupo, adicionar ao mapa e usar versão uppercase
                  const newSubgrupo = rawValue.toUpperCase().trim();
                  subgrupoMap.set(normalized, newSubgrupo);
                  (item as any)[field] = newSubgrupo;
                } else {
                  (item as any)[field] = null;
                }
              } else {
                (item as any)[field] = null;
              }
            }
            // Campos de texto obrigatórios
            else {
              (item as any)[field] = value ? String(value).trim() : "";
            }
          });

          // Auto-generate code if missing
          if (!item.codigo && item.nome) {
            item.codigo = `AUTO_${rowIndex + 1}_${Date.now()}`;
          }

          return item;
        }).filter((item: any) => item.codigo && item.nome);

        // Remove duplicates by codigo
        const itemsMap = new Map<string, any>();
        allItems.forEach((item: any) => {
          itemsMap.set(item.codigo, item);
        });
        const itemsToProcess = Array.from(itemsMap.values());

        // Fetch existing codes
        const existingCodes = new Set<string>();
        const FETCH_BATCH_SIZE = 1000;
        
        for (let i = 0; i < itemsToProcess.length; i += FETCH_BATCH_SIZE) {
          const batchCodes = itemsToProcess.slice(i, i + FETCH_BATCH_SIZE).map((item: any) => item.codigo);
          const { data: existingItems } = await supabase
            .from("estoque")
            .select("codigo")
            .in("codigo", batchCodes);
          
          if (existingItems) {
            existingItems.forEach((item: any) => existingCodes.add(item.codigo));
          }
        }

        // Process in batches using upsert
        const BATCH_SIZE = 500;

        for (let i = 0; i < itemsToProcess.length; i += BATCH_SIZE) {
          const batch = itemsToProcess.slice(i, i + BATCH_SIZE);
          const batchUpdates = batch.filter((item: any) => existingCodes.has(item.codigo)).length;
          const batchInserts = batch.length - batchUpdates;

          try {
            const { error } = await supabase
              .from("estoque")
              .upsert(batch, { 
                onConflict: "codigo",
                ignoreDuplicates: false 
              });

            if (error) {
              console.error("Batch upsert error:", error);
              totalErrors += batch.length;
            } else {
              totalInserted += batchInserts;
              totalUpdated += batchUpdates;
            }
          } catch (e) {
            console.error("Batch processing error:", e);
            totalErrors += batch.length;
          }

          // Update progress
          const processedSoFar = importFiles
            .slice(0, fileIndex)
            .reduce((acc, f) => acc + f.totalRows, 0) + Math.min(i + BATCH_SIZE, itemsToProcess.length);

          setImportProgress({ 
            current: processedSoFar, 
            total: grandTotal, 
            inserted: totalInserted, 
            updated: totalUpdated, 
            errors: totalErrors,
            currentFile: importFile.name,
          });

          if (i + BATCH_SIZE < itemsToProcess.length) {
            await new Promise(resolve => setTimeout(resolve, 10));
          }
        }
      }

      toast({
        title: "Importação concluída! 🎉",
        description: `${totalInserted} novos, ${totalUpdated} atualizados${totalErrors > 0 ? `, ${totalErrors} erros` : ""} de ${importFiles.length} arquivo(s)`,
      });

      setShowImportDialog(false);
      setImportFiles([]);
      fetchItems();
    } catch (error: any) {
      console.error("Erro geral na importação:", error);
      toast({
        title: "Erro na importação",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setImporting(false);
      setImportProgress({ current: 0, total: 0, inserted: 0, updated: 0, errors: 0, currentFile: "" });
    }
  };

  const handleExport = () => {
    const exportData = filteredItems.map((item) => ({
      Código: item.codigo,
      "Código de Barras": item.codigo_barras || "",
      Nome: item.nome,
      Grupo: item.grupo || "",
      Subgrupo: item.subgrupo || "",
      Referência: item.referencia || "",
      Marca: item.marca || "",
      NCM: item.ncm || "",
      Unidade: item.unidade || "UN",
      "Preço Custo": item.preco_custo,
      "Preço Venda": item.preco_venda,
      "Preço Promoção": item.preco_promocao || 0,
      "Estoque Atual": item.estoque_atual,
      "Estoque Mínimo": item.estoque_minimo,
      "Estoque Máximo": item.estoque_maximo || 0,
      Saldo: item.saldo || 0,
      "Peso Bruto": item.peso_bruto || 0,
      "Peso Líquido": item.peso_liquido || 0,
      Localização: item.localizacao || "",
      "Total Custo": item.preco_custo * item.estoque_atual,
      "Total Venda": item.preco_venda * item.estoque_atual,
    }));

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Estoque");
    XLSX.writeFile(wb, `estoque_${new Date().toISOString().split("T")[0]}.xlsx`);
    toast({ title: "Exportação concluída!" });
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value);
  };

  const handleToggleAtivo = async (item: EstoqueItem) => {
    try {
      const { error } = await supabase
        .from("estoque")
        .update({ ativo: !item.ativo })
        .eq("id", item.id);

      if (error) throw error;
      
      setItems(prev => prev.map(i => 
        i.id === item.id ? { ...i, ativo: !i.ativo } : i
      ));
      
      toast({ 
        title: item.ativo ? "Produto desativado" : "Produto ativado" 
      });
    } catch (error: any) {
      toast({
        title: "Erro ao alterar status",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const getVisibleColumnCount = () => {
    return visibleColumns.length + (isAdmin ? 1 : 0); // +1 for actions column
  };

  if (authLoading || loading) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </MainLayout>
    );
  }

  const isAdmin = userRole === "administrador";

  return (
    <MainLayout>
      <div className="space-y-4">
        {/* Tabs - Styled like reference */}
        <Tabs defaultValue="produtos" className="space-y-4">
          {/* All buttons in a single row, left to right */}
          <div className="flex flex-wrap items-center gap-2">
            <TabsList className="flex h-auto gap-1 p-1 bg-transparent flex-wrap">
              <TabsTrigger 
                value="produtos" 
                className="flex items-center gap-1.5 px-3 py-2 rounded-md text-xs font-semibold transition-all
                  data-[state=active]:bg-green-500 data-[state=active]:text-white
                  data-[state=inactive]:bg-green-500 data-[state=inactive]:text-white data-[state=inactive]:opacity-70 hover:opacity-100"
              >
                <Package className="h-4 w-4" />
                PRODUTOS
              </TabsTrigger>
              <TabsTrigger 
                value="categorias" 
                className="flex items-center gap-1.5 px-3 py-2 rounded-md text-xs font-semibold transition-all
                  data-[state=active]:bg-cyan-500 data-[state=active]:text-white
                  data-[state=inactive]:bg-cyan-500 data-[state=inactive]:text-white data-[state=inactive]:opacity-70 hover:opacity-100"
              >
                <Layers className="h-4 w-4" />
                CATEGORIAS
              </TabsTrigger>
              <TabsTrigger 
                value="etiquetas" 
                className="flex items-center gap-1.5 px-3 py-2 rounded-md text-xs font-semibold transition-all
                  data-[state=active]:bg-lime-500 data-[state=active]:text-white
                  data-[state=inactive]:bg-lime-500 data-[state=inactive]:text-white data-[state=inactive]:opacity-70 hover:opacity-100"
              >
                <Tag className="h-4 w-4" />
                ETIQUETAS
              </TabsTrigger>
              <TabsTrigger 
                value="pedidos" 
                className="flex items-center gap-1.5 px-3 py-2 rounded-md text-xs font-semibold transition-all
                  data-[state=active]:bg-blue-500 data-[state=active]:text-white
                  data-[state=inactive]:bg-blue-500 data-[state=inactive]:text-white data-[state=inactive]:opacity-70 hover:opacity-100"
              >
                <ShoppingCart className="h-4 w-4" />
                PEDIDOS
              </TabsTrigger>
              <TabsTrigger 
                value="perdas" 
                className="flex items-center gap-1.5 px-3 py-2 rounded-md text-xs font-semibold transition-all
                  data-[state=active]:bg-red-500 data-[state=active]:text-white
                  data-[state=inactive]:bg-red-500 data-[state=inactive]:text-white data-[state=inactive]:opacity-70 hover:opacity-100"
              >
                <AlertTriangle className="h-4 w-4" />
                PERDAS
              </TabsTrigger>
              <TabsTrigger 
                value="relatorios" 
                className="flex items-center gap-1.5 px-3 py-2 rounded-md text-xs font-semibold transition-all
                  data-[state=active]:bg-purple-500 data-[state=active]:text-white
                  data-[state=inactive]:bg-purple-500 data-[state=inactive]:text-white data-[state=inactive]:opacity-70 hover:opacity-100"
              >
                <BarChart3 className="h-4 w-4" />
                RELATÓRIOS
              </TabsTrigger>
            </TabsList>

            {/* Action buttons - continue in same row */}
            <Button
              onClick={() => setShowScannerDialog(true)}
              className="bg-yellow-500 text-white hover:bg-yellow-600 h-9 px-4 text-xs font-semibold"
            >
              <ScanLine className="h-4 w-4 mr-2" />
              SCANNER
            </Button>
              
              {/* Exportar/Importar Dropdown */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button className="bg-teal-500 text-white hover:bg-teal-600 h-9 px-4 text-xs font-semibold">
                    <FileSpreadsheet className="h-4 w-4 mr-2" />
                    DADOS
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56 bg-popover">
                  <DropdownMenuLabel className="uppercase text-xs font-bold text-teal-600">
                    <Download className="h-3 w-3 inline mr-1" />
                    Exportar
                  </DropdownMenuLabel>
                  <DropdownMenuItem onClick={handleExport} className="text-xs cursor-pointer">
                    <Download className="h-4 w-4 mr-2 text-teal-500" />
                    Todos os Itens
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => { setCriticalFilter("critical"); setTimeout(handleExport, 100); }} className="text-xs cursor-pointer">
                    <AlertTriangle className="h-4 w-4 mr-2 text-yellow-500" />
                    Críticos ({stats.totalCriticos})
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => { setCriticalFilter("zerado"); setTimeout(handleExport, 100); }} className="text-xs cursor-pointer">
                    <Package className="h-4 w-4 mr-2 text-gray-500" />
                    Zerados ({stats.estoquesZerados})
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => { setCriticalFilter("negativo"); setTimeout(handleExport, 100); }} className="text-xs cursor-pointer">
                    <TrendingDown className="h-4 w-4 mr-2 text-red-500" />
                    Negativos ({stats.estoquesNegativos})
                  </DropdownMenuItem>
                  {isAdmin && (
                    <>
                      <DropdownMenuSeparator />
                      <DropdownMenuLabel className="uppercase text-xs font-bold text-lime-600">
                        <Upload className="h-3 w-3 inline mr-1" />
                        Importar
                      </DropdownMenuLabel>
                      <DropdownMenuItem onClick={() => setShowImportDialog(true)} className="text-xs cursor-pointer">
                        <Upload className="h-4 w-4 mr-2 text-lime-500" />
                        Planilha XLSX
                      </DropdownMenuItem>
                    </>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
              
              {isAdmin && (
                <Button 
                  onClick={() => handleOpenProductDialog()}
                  className="bg-green-600 text-white hover:bg-green-700 h-9 px-4 text-xs font-semibold"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  CADASTRAR (F4)
                </Button>
              )}
              
            <Button 
              variant="ghost"
              size="icon"
              onClick={() => setShowConfigDialog(true)}
              className="h-9 w-9 text-muted-foreground hover:text-foreground hover:bg-muted"
              title="Configurações (F1)"
            >
              <Settings2 className="h-5 w-5" />
            </Button>
          </div>

          <TabsContent value="produtos" className="space-y-4 mt-0">
            {/* Summary Cards - Interactive */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <Card 
                className={`bg-card border-2 hover:shadow-lg transition-all cursor-pointer ${criticalFilter === "all" ? "border-primary ring-2 ring-primary/20" : "border-border"}`}
                onClick={() => { setCriticalFilter("all"); setCurrentPage(1); }}
              >
                <CardContent className="p-5">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground font-medium">Total de Itens</p>
                      <p className="text-3xl font-bold mt-1">{stats.totalItems.toLocaleString("pt-BR")}</p>
                      <p className="text-xs text-primary mt-1 font-medium">
                        {criticalFilter === "all" ? "✓ Visualizando todos" : "Clique para ver todos"}
                      </p>
                    </div>
                    <Package className="h-5 w-5 text-primary" />
                  </div>
                </CardContent>
              </Card>
              
              <Card 
                className="bg-card border hover:shadow-lg transition-all cursor-pointer"
                onClick={() => handleSort("preco_custo")}
              >
                <CardContent className="p-5">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground font-medium">Valor Total (Custo)</p>
                      <p className="text-3xl font-bold mt-1 text-green-600">{formatCurrency(stats.totalCusto)}</p>
                      <p className="text-xs text-green-600 mt-1">
                        {sortField === "preco_custo" ? `Ordenando ${sortDirection === "asc" ? "↑" : "↓"}` : "Clique para ordenar"}
                      </p>
                    </div>
                    <DollarSign className="h-5 w-5 text-green-500" />
                  </div>
                </CardContent>
              </Card>
              
              <Card 
                className="bg-card border hover:shadow-lg transition-all cursor-pointer"
                onClick={() => handleSort("preco_venda")}
              >
                <CardContent className="p-5">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground font-medium">Valor Total (Venda)</p>
                      <p className="text-3xl font-bold mt-1 text-teal-600">{formatCurrency(stats.totalVenda)}</p>
                      <p className="text-xs text-teal-600 mt-1">
                        {sortField === "preco_venda" ? `Ordenando ${sortDirection === "asc" ? "↑" : "↓"}` : "Clique para ordenar"}
                      </p>
                    </div>
                    <DollarSign className="h-5 w-5 text-teal-500" />
                  </div>
                </CardContent>
              </Card>
              
              <Card 
                className={`border-2 hover:shadow-lg transition-all cursor-pointer ${
                  criticalFilter === "critical" 
                    ? "border-red-500 bg-red-50 dark:bg-red-950/50 ring-2 ring-red-500/20" 
                    : stats.totalCriticos > 0 
                      ? "border-red-300 bg-red-50/50 dark:bg-red-950/30" 
                      : "border-border"
                }`}
                onClick={() => { 
                  setCriticalFilter(criticalFilter === "critical" ? "all" : "critical"); 
                  setCurrentPage(1); 
                }}
              >
                <CardContent className="p-5">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground font-medium">Estoque Crítico</p>
                      <p className={`text-3xl font-bold mt-1 ${stats.totalCriticos > 0 ? "text-red-600" : ""}`}>
                        {stats.totalCriticos.toLocaleString("pt-BR")}
                      </p>
                      <div className="text-xs mt-1 space-y-0.5">
                        <p className="text-orange-600">{stats.estoquesZerados} zerados</p>
                        <p className="text-amber-600">{stats.abaixoMinimo} abaixo mín.</p>
                        <p className="text-red-600">{stats.estoquesNegativos} negativos</p>
                      </div>
                    </div>
                    <AlertTriangle className={`h-5 w-5 ${stats.totalCriticos > 0 ? "text-red-500" : "text-muted-foreground"}`} />
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Critical Filter Chips */}
            {criticalFilter !== "all" && (
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-sm text-muted-foreground">Filtro ativo:</span>
                <Badge 
                  variant={criticalFilter === "critical" ? "destructive" : "secondary"}
                  className="cursor-pointer"
                  onClick={() => setCriticalFilter("all")}
                >
                  {criticalFilter === "critical" && "Todos críticos"}
                  {criticalFilter === "zerado" && "Zerados"}
                  {criticalFilter === "abaixo" && "Abaixo do mínimo"}
                  {criticalFilter === "negativo" && "Negativos"}
                  <X className="h-3 w-3 ml-1" />
                </Badge>
                <div className="flex gap-1 ml-2">
                  <Badge 
                    variant={criticalFilter === "zerado" ? "default" : "outline"}
                    className="cursor-pointer"
                    onClick={() => { setCriticalFilter("zerado"); setCurrentPage(1); }}
                  >
                    Zerados ({stats.estoquesZerados})
                  </Badge>
                  <Badge 
                    variant={criticalFilter === "abaixo" ? "default" : "outline"}
                    className="cursor-pointer"
                    onClick={() => { setCriticalFilter("abaixo"); setCurrentPage(1); }}
                  >
                    Abaixo mín. ({stats.abaixoMinimo})
                  </Badge>
                  <Badge 
                    variant={criticalFilter === "negativo" ? "default" : "outline"}
                    className="cursor-pointer"
                    onClick={() => { setCriticalFilter("negativo"); setCurrentPage(1); }}
                  >
                    Negativos ({stats.estoquesNegativos})
                  </Badge>
                </div>
              </div>
            )}

        {/* Filters - Clean horizontal row */}
        <Card className="p-4">
          <div className="flex flex-col gap-4 md:flex-row md:items-center">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por código, EAN, nome, marca..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setCurrentPage(1);
                }}
                className="pl-9"
              />
            </div>
            <Select value={grupoFilter} onValueChange={(v) => { setGrupoFilter(v); setCurrentPage(1); }}>
              <SelectTrigger className="w-full md:w-[160px]">
                <SelectValue placeholder="Subgrupos" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os grupos</SelectItem>
                {grupos.map((g) => (
                  <SelectItem key={g} value={g!}>{g}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={marcaFilter} onValueChange={(v) => { setMarcaFilter(v); setCurrentPage(1); }}>
              <SelectTrigger className="w-full md:w-[140px]">
                <SelectValue placeholder="Marcas" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas as marcas</SelectItem>
                {marcas.map((m) => (
                  <SelectItem key={m} value={m!}>{m}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select defaultValue="all">
              <SelectTrigger className="w-full md:w-[160px]">
                <SelectValue placeholder="Todos os estoques" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os estoques</SelectItem>
                <SelectItem value="baixo">Estoque baixo</SelectItem>
                <SelectItem value="normal">Estoque normal</SelectItem>
                <SelectItem value="alto">Estoque alto</SelectItem>
              </SelectContent>
            </Select>

            {/* Column Configuration */}
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" size="icon" title="Filtros avançados">
                  <Settings2 className="h-4 w-4" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-64 bg-background border shadow-lg z-50" align="end">
                <div className="space-y-3">
                  <div className="font-medium text-sm border-b pb-2">Colunas Visíveis</div>
                  <div className="space-y-2 max-h-[300px] overflow-y-auto">
                    {AVAILABLE_COLUMNS.map((col) => (
                      <label
                        key={col.key}
                        className="flex items-center gap-2 text-sm cursor-pointer hover:bg-muted/50 p-1 rounded"
                      >
                        <Checkbox
                          checked={isColumnVisible(col.key)}
                          onCheckedChange={() => toggleColumn(col.key)}
                        />
                        {col.label}
                      </label>
                    ))}
                  </div>
                </div>
              </PopoverContent>
            </Popover>
            
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" size="icon" title="Configurar colunas">
                  <Pencil className="h-4 w-4" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-64 bg-background border shadow-lg z-50" align="end">
                <div className="space-y-3">
                  <div className="font-medium text-sm border-b pb-2">Colunas Visíveis</div>
                  <div className="space-y-2 max-h-[300px] overflow-y-auto">
                    {AVAILABLE_COLUMNS.map((col) => (
                      <label
                        key={col.key}
                        className="flex items-center gap-2 text-sm cursor-pointer hover:bg-muted/50 p-1 rounded"
                      >
                        <Checkbox
                          checked={isColumnVisible(col.key)}
                          onCheckedChange={() => toggleColumn(col.key)}
                        />
                        {col.label}
                      </label>
                    ))}
                  </div>
                </div>
              </PopoverContent>
            </Popover>
          </div>
        </Card>

        {/* Table */}
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    {isColumnVisible("codigo") && (
                      <TableHead className="cursor-pointer" onClick={() => handleSort("codigo")}>
                        <div className="flex items-center gap-1">
                          Código
                          <ArrowUpDown className="h-3 w-3" />
                        </div>
                      </TableHead>
                    )}
                    {isColumnVisible("nome") && (
                      <TableHead className="cursor-pointer" onClick={() => handleSort("nome")}>
                        <div className="flex items-center gap-1">
                          Produto
                          <ArrowUpDown className="h-3 w-3" />
                        </div>
                      </TableHead>
                    )}
                    {isColumnVisible("referencia") && (
                      <TableHead>Referência</TableHead>
                    )}
                    {isColumnVisible("codigo_barras") && (
                      <TableHead className="cursor-pointer" onClick={() => handleSort("codigo_barras")}>
                        <div className="flex items-center gap-1">
                          Cód. Barras
                          <ArrowUpDown className="h-3 w-3" />
                        </div>
                      </TableHead>
                    )}
                    {isColumnVisible("unidade") && (
                      <TableHead className="text-center">Un</TableHead>
                    )}
                    {isColumnVisible("preco_custo") && (
                      <TableHead className="text-right cursor-pointer" onClick={() => handleSort("preco_custo")}>
                        <div className="flex items-center justify-end gap-1">
                          Custo
                          <ArrowUpDown className="h-3 w-3" />
                        </div>
                      </TableHead>
                    )}
                    {isColumnVisible("preco_venda") && (
                      <TableHead className="text-right cursor-pointer" onClick={() => handleSort("preco_venda")}>
                        <div className="flex items-center justify-end gap-1">
                          Venda
                          <ArrowUpDown className="h-3 w-3" />
                        </div>
                      </TableHead>
                    )}
                    {isColumnVisible("preco_promocao") && (
                      <TableHead className="text-right">Promoção</TableHead>
                    )}
                    {isColumnVisible("estoque_atual") && (
                      <TableHead className="text-right cursor-pointer" onClick={() => handleSort("estoque_atual")}>
                        <div className="flex items-center justify-end gap-1">
                          Estoque
                          <ArrowUpDown className="h-3 w-3" />
                        </div>
                      </TableHead>
                    )}
                    {isColumnVisible("grupo") && <TableHead>Grupo</TableHead>}
                    {isColumnVisible("subgrupo") && <TableHead>Subgrupo</TableHead>}
                    {isColumnVisible("marca") && <TableHead>Marca</TableHead>}
                    {isColumnVisible("estoque_minimo") && <TableHead className="text-right">Mínimo</TableHead>}
                    {isColumnVisible("estoque_maximo") && <TableHead className="text-right">Máximo</TableHead>}
                    {isColumnVisible("ncm") && <TableHead>NCM</TableHead>}
                    {isColumnVisible("peso_bruto") && <TableHead className="text-right">P. Bruto</TableHead>}
                    {isColumnVisible("peso_liquido") && <TableHead className="text-right">P. Líquido</TableHead>}
                    {isColumnVisible("localizacao") && <TableHead>Local</TableHead>}
                    {isColumnVisible("saldo") && <TableHead className="text-right">Saldo</TableHead>}
                    {isColumnVisible("ativo") && <TableHead className="text-center">Ativo</TableHead>}
                    {isAdmin && <TableHead className="w-[80px]">Ações</TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedItems.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={getVisibleColumnCount()} className="text-center py-8 text-muted-foreground">
                        <PackageX className="h-8 w-8 mx-auto mb-2 opacity-50" />
                        Nenhum item encontrado
                      </TableCell>
                    </TableRow>
                  ) : (
                    paginatedItems.map((item) => {
                      // Determine row background color based on stock status
                      const getRowBgClass = () => {
                        if (item.estoque_atual < 0 || item.estoque_atual === 0) {
                          return "bg-red-100 dark:bg-red-950/30";
                        }
                        if (item.estoque_atual < item.estoque_minimo) {
                          return "bg-amber-100 dark:bg-amber-950/30";
                        }
                        return "";
                      };
                      
                      return (
                      <TableRow
                        key={item.id}
                        className={`${getRowBgClass()} ${!item.ativo ? "opacity-50" : ""}`}
                      >
                        {isColumnVisible("codigo") && (
                          <TableCell className="font-mono text-sm">{item.codigo}</TableCell>
                        )}
                        {isColumnVisible("nome") && (
                          <TableCell className="font-medium max-w-[250px] truncate">
                            {item.nome}
                          </TableCell>
                        )}
                        {isColumnVisible("referencia") && (
                          <TableCell className="font-mono text-xs text-muted-foreground">
                            {item.referencia || "-"}
                          </TableCell>
                        )}
                        {isColumnVisible("codigo_barras") && (
                          <TableCell className="font-mono text-xs text-muted-foreground">
                            {item.codigo_barras || "SEM GTIN"}
                          </TableCell>
                        )}
                        {isColumnVisible("unidade") && (
                          <TableCell className="text-center">
                            <Badge variant="outline" className="text-xs">
                              {item.unidade || "UN"}
                            </Badge>
                          </TableCell>
                        )}
                        {isColumnVisible("preco_custo") && (
                          <TableCell className="text-right">{formatCurrency(item.preco_custo)}</TableCell>
                        )}
                        {isColumnVisible("preco_venda") && (
                          <TableCell className="text-right font-medium">{formatCurrency(item.preco_venda)}</TableCell>
                        )}
                        {isColumnVisible("preco_promocao") && (
                          <TableCell className="text-right">
                            {item.preco_promocao ? (
                              <span className="text-green-600 font-medium">{formatCurrency(item.preco_promocao)}</span>
                            ) : (
                              <span className="text-muted-foreground">-</span>
                            )}
                          </TableCell>
                        )}
                        {isColumnVisible("estoque_atual") && (
                          <TableCell className="text-right">
                            <span className={item.estoque_atual < item.estoque_minimo ? "text-destructive font-bold" : ""}>
                              {item.estoque_atual}
                            </span>
                          </TableCell>
                        )}
                        {isColumnVisible("grupo") && (
                          <TableCell>
                            {item.grupo ? (
                              <Badge variant="secondary" className="text-xs">{item.grupo}</Badge>
                            ) : "-"}
                          </TableCell>
                        )}
                        {isColumnVisible("subgrupo") && (
                          <TableCell className="text-sm text-muted-foreground">{item.subgrupo || "-"}</TableCell>
                        )}
                        {isColumnVisible("marca") && (
                          <TableCell className="text-sm text-muted-foreground">{item.marca || "-"}</TableCell>
                        )}
                        {isColumnVisible("estoque_minimo") && (
                          <TableCell className="text-right text-muted-foreground">{item.estoque_minimo}</TableCell>
                        )}
                        {isColumnVisible("estoque_maximo") && (
                          <TableCell className="text-right text-muted-foreground">{item.estoque_maximo || "-"}</TableCell>
                        )}
                        {isColumnVisible("ncm") && (
                          <TableCell className="font-mono text-xs">{item.ncm || "-"}</TableCell>
                        )}
                        {isColumnVisible("peso_bruto") && (
                          <TableCell className="text-right">{item.peso_bruto || "-"}</TableCell>
                        )}
                        {isColumnVisible("peso_liquido") && (
                          <TableCell className="text-right">{item.peso_liquido || "-"}</TableCell>
                        )}
                        {isColumnVisible("localizacao") && (
                          <TableCell className="text-sm">{item.localizacao || "-"}</TableCell>
                        )}
                        {isColumnVisible("saldo") && (
                          <TableCell className="text-right">{item.saldo || "-"}</TableCell>
                        )}
                        {isColumnVisible("ativo") && (
                          <TableCell className="text-center">
                            {isAdmin ? (
                              <Switch
                                checked={item.ativo !== false}
                                onCheckedChange={() => handleToggleAtivo(item)}
                              />
                            ) : (
                              item.ativo !== false ? (
                                <Check className="h-4 w-4 text-green-600 mx-auto" />
                              ) : (
                                <X className="h-4 w-4 text-destructive mx-auto" />
                              )
                            )}
                          </TableCell>
                        )}
                        {isAdmin && (
                          <TableCell>
                            <div className="flex items-center gap-1">
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleOpenProductDialog(item)}
                                title="Editar"
                              >
                                <Pencil className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => {
                                  setDeletingItem(item);
                                  setShowDeleteDialog(true);
                                }}
                                title="Excluir"
                              >
                                <Trash2 className="h-4 w-4 text-destructive" />
                              </Button>
                            </div>
                          </TableCell>
                        )}
                      </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              Mostrando {((currentPage - 1) * ITEMS_PER_PAGE) + 1} - {Math.min(currentPage * ITEMS_PER_PAGE, filteredItems.length)} de {filteredItems.length} itens
            </p>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="icon"
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="text-sm">
                Página {currentPage} de {totalPages}
              </span>
              <Button
                variant="outline"
                size="icon"
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
          </TabsContent>

          <TabsContent value="etiquetas">
            <ThermalLabelGenerator items={items} />
          </TabsContent>


          <TabsContent value="pedidos">
            <PedidosTab isAdmin={isAdmin} />
          </TabsContent>

          <TabsContent value="perdas">
            <PerdasTab items={items} />
          </TabsContent>

          <TabsContent value="categorias">
            <CategoriesManager items={items} isAdmin={isAdmin} onRefresh={fetchItems} />
          </TabsContent>

          <TabsContent value="relatorios">
            <EstoqueRelatorios items={items} open={true} onOpenChange={() => {}} embedded />
          </TabsContent>
        </Tabs>
      </div>

      {/* Product Dialog */}
      <Dialog open={showProductDialog} onOpenChange={setShowProductDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingItem ? "Editar Produto" : "Adicionar Produto"}</DialogTitle>
            <DialogDescription>
              {editingItem ? "Atualize as informações do produto" : "Preencha os dados do novo produto"}
            </DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="codigo">Código *</Label>
              <Input
                id="codigo"
                value={formData.codigo}
                onChange={(e) => setFormData({ ...formData, codigo: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="codigo_barras">Código de Barras (EAN/GTIN)</Label>
              <Input
                id="codigo_barras"
                value={formData.codigo_barras}
                onChange={(e) => setFormData({ ...formData, codigo_barras: e.target.value })}
                placeholder="Ex: 7891234567890"
              />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="nome">Nome *</Label>
              <Input
                id="nome"
                value={formData.nome}
                onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="grupo">Grupo</Label>
              <Input
                id="grupo"
                value={formData.grupo}
                onChange={(e) => setFormData({ ...formData, grupo: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="subgrupo">Subgrupo</Label>
              <Input
                id="subgrupo"
                value={formData.subgrupo}
                onChange={(e) => setFormData({ ...formData, subgrupo: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="referencia">Referência</Label>
              <Input
                id="referencia"
                value={formData.referencia}
                onChange={(e) => setFormData({ ...formData, referencia: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="marca">Marca</Label>
              <Input
                id="marca"
                value={formData.marca}
                onChange={(e) => setFormData({ ...formData, marca: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="preco_custo">Preço de Custo</Label>
              <Input
                id="preco_custo"
                type="number"
                step="0.01"
                value={formData.preco_custo}
                onChange={(e) => setFormData({ ...formData, preco_custo: parseFloat(e.target.value) || 0 })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="preco_venda">Preço de Venda</Label>
              <Input
                id="preco_venda"
                type="number"
                step="0.01"
                value={formData.preco_venda}
                onChange={(e) => setFormData({ ...formData, preco_venda: parseFloat(e.target.value) || 0 })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="estoque_atual">Estoque Atual</Label>
              <Input
                id="estoque_atual"
                type="number"
                value={formData.estoque_atual}
                onChange={(e) => setFormData({ ...formData, estoque_atual: parseInt(e.target.value) || 0 })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="estoque_minimo">Estoque Mínimo</Label>
              <Input
                id="estoque_minimo"
                type="number"
                value={formData.estoque_minimo}
                onChange={(e) => setFormData({ ...formData, estoque_minimo: parseInt(e.target.value) || 0 })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowProductDialog(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSaveProduct} disabled={saving}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              {editingItem ? "Salvar" : "Adicionar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Import Dialog */}
      <Dialog open={showImportDialog} onOpenChange={(open) => {
        setShowImportDialog(open);
        if (!open && !importing) {
          setImportFiles([]);
          setShowValidationDetails(false);
        }
      }}>
        <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileSpreadsheet className="h-5 w-5" />
              Importar Estoque
            </DialogTitle>
            <DialogDescription>
              Faça upload de um ou mais arquivos CSV ou Excel (.xlsx) com os dados do estoque
            </DialogDescription>
          </DialogHeader>

          {/* File Upload Area */}
          <div className="border-2 border-dashed rounded-lg p-6 text-center">
            <Upload className="h-10 w-10 mx-auto mb-3 text-muted-foreground" />
            <p className="text-muted-foreground mb-3">
              Arraste arquivos ou clique para selecionar (múltiplos permitidos)
            </p>
            <Input
              type="file"
              accept=".csv,.xlsx,.xls"
              multiple
              onChange={handleFileUpload}
              className="max-w-xs mx-auto"
              disabled={importing}
            />
            <p className="text-xs text-muted-foreground mt-3">
              Suporta até 25.000 itens por arquivo • Detecta duplicatas automaticamente
            </p>
          </div>

          {/* Files Summary */}
          {importFiles.length > 0 && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="font-medium">Arquivos carregados ({importFiles.length})</h4>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => setShowValidationDetails(!showValidationDetails)}
                >
                  {showValidationDetails ? "Ocultar detalhes" : "Ver detalhes de validação"}
                </Button>
              </div>

              <div className="space-y-2">
                {importFiles.map((file, index) => {
                  const hasErrors = file.invalidItems > 0;
                  return (
                    <div key={index} className="flex items-center justify-between p-3 border rounded-lg bg-card">
                      <div className="flex items-center gap-3">
                        <FileSpreadsheet className="h-5 w-5 text-muted-foreground" />
                        <div>
                          <p className="font-medium text-sm">{file.name}</p>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <span>{file.totalRows.toLocaleString()} linhas</span>
                            <span>•</span>
                            <span className="text-green-600">{file.validItems} válidos</span>
                            {hasErrors && (
                              <>
                                <span>•</span>
                                <span className="text-amber-600">{file.invalidItems} com erros</span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {hasErrors && (
                          <Badge variant="outline" className="text-amber-600 border-amber-600">
                            <AlertTriangle className="h-3 w-3 mr-1" />
                            Atenção
                          </Badge>
                        )}
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => removeImportFile(index)}
                          disabled={importing}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Validation Details */}
              {showValidationDetails && (
                <div className="space-y-3">
                  {importFiles.map((file, fileIndex) => (
                    file.validationErrors.length > 0 && (
                      <div key={fileIndex} className="p-3 bg-amber-50 dark:bg-amber-950/20 rounded-lg border border-amber-200 dark:border-amber-900">
                        <p className="text-sm font-medium text-amber-800 dark:text-amber-200 mb-2">
                          Erros em: {file.name}
                        </p>
                        <div className="max-h-40 overflow-y-auto space-y-1">
                          {file.validationErrors.map((error, i) => (
                            <div key={i} className="text-xs text-amber-700 dark:text-amber-300 flex gap-2">
                              <span className="font-mono">Linha {error.row}:</span>
                              <span>{error.field} - {error.message}</span>
                              {error.value && <span className="text-amber-600">({String(error.value).slice(0, 30)})</span>}
                            </div>
                          ))}
                        </div>
                        <p className="text-xs text-amber-600 dark:text-amber-400 mt-2">
                          Itens com erros serão ignorados. Itens válidos serão importados normalmente.
                        </p>
                      </div>
                    )
                  ))}
                </div>
              )}

              {/* Summary Stats */}
              <div className="grid grid-cols-3 gap-4 p-4 bg-muted/50 rounded-lg">
                <div className="text-center">
                  <p className="text-2xl font-bold text-foreground">
                    {importFiles.reduce((acc, f) => acc + f.totalRows, 0).toLocaleString()}
                  </p>
                  <p className="text-xs text-muted-foreground">Total de linhas</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-green-600">
                    {importFiles.reduce((acc, f) => acc + f.validItems, 0).toLocaleString()}
                  </p>
                  <p className="text-xs text-muted-foreground">Itens válidos</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-amber-600">
                    {importFiles.reduce((acc, f) => acc + f.invalidItems, 0).toLocaleString()}
                  </p>
                  <p className="text-xs text-muted-foreground">Com erros</p>
                </div>
              </div>
            </div>
          )}

          {/* Progress Bar */}
          {importing && importProgress.total > 0 && (
            <div className="space-y-3 p-4 bg-muted/50 rounded-lg">
              <div className="flex items-center justify-between text-sm">
                <div>
                  <span className="font-medium">Processando: </span>
                  <span className="text-muted-foreground">{importProgress.currentFile}</span>
                </div>
                <span className="text-muted-foreground">
                  {importProgress.current.toLocaleString()} / {importProgress.total.toLocaleString()} itens
                </span>
              </div>
              <Progress 
                value={(importProgress.current / importProgress.total) * 100} 
                className="h-3"
              />
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <div className="flex gap-4">
                  <span className="text-green-600">✓ {importProgress.inserted.toLocaleString()} novos</span>
                  <span className="text-blue-600">↻ {importProgress.updated.toLocaleString()} atualizados</span>
                  {importProgress.errors > 0 && (
                    <span className="text-red-600">✗ {importProgress.errors.toLocaleString()} erros</span>
                  )}
                </div>
                <span className="font-medium">
                  {Math.round((importProgress.current / importProgress.total) * 100)}%
                </span>
              </div>
            </div>
          )}

          <DialogFooter className="gap-2">
            <Button 
              variant="outline" 
              onClick={() => {
                setShowImportDialog(false);
                setImportFiles([]);
              }} 
              disabled={importing}
            >
              Cancelar
            </Button>
            {importFiles.length > 0 && (
              <Button onClick={handleImport} disabled={importing}>
                {importing ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <Upload className="h-4 w-4 mr-2" />
                )}
                {importing 
                  ? "Importando..." 
                  : `Importar ${importFiles.reduce((acc, f) => acc + f.validItems, 0).toLocaleString()} itens`
                }
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir produto?</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir "{deletingItem?.nome}"? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteProduct} className="bg-destructive text-destructive-foreground">
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Config Manager Dialog - F1 */}
      <CadastroConfigManager
        items={items}
        isAdmin={isAdmin}
        onRefresh={fetchItems}
        open={showConfigDialog}
        onOpenChange={setShowConfigDialog}
      />

      {/* Relatórios Dashboard */}
      <EstoqueRelatorios
        items={items}
        open={showRelatoriosDialog}
        onOpenChange={setShowRelatoriosDialog}
      />

      <ScannerDialog
        open={showScannerDialog}
        onOpenChange={setShowScannerDialog}
        items={items}
        onEditProduct={(product) => {
          setShowScannerDialog(false);
          handleOpenProductDialog(product);
        }}
      />
    </MainLayout>
  );
};

export default Estoque;