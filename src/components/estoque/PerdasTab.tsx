import { useState, useEffect, useRef, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import {
  AlertTriangle,
  TrendingDown,
  Package,
  DollarSign,
  Loader2,
  Search,
  Trash2,
  FileText,
  History,
  Coffee,
  Save,
  Camera,
  Edit,
  Printer,
  TrendingUp,
  ShoppingCart,
  BarChart3,
} from "lucide-react";
import { format } from "date-fns";
import { formatInTimeZone } from "date-fns-tz";
import { ptBR } from "date-fns/locale";
import { searchAcrossFields } from "@/lib/searchUtils";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import html2canvas from "html2canvas";
import ThermalLossReceipt from "@/components/losses/ThermalLossReceipt";
import BarcodeScanner from "@/components/BarcodeScanner";

const TIMEZONE = "America/Sao_Paulo";

// Formatar preço para exibição com vírgula (formato brasileiro)
const formatarPreco = (valor: number) => {
  return valor.toFixed(2).replace(".", ",");
};

// Formatar input de preço com vírgula automática
const formatarInputPreco = (valor: string) => {
  let numeros = valor.replace(/\D/g, "");
  if (numeros.length >= 3) {
    const inteiros = numeros.slice(0, -2);
    const decimais = numeros.slice(-2);
    return `${inteiros},${decimais}`;
  }
  return numeros;
};

interface EstoqueItem {
  id: string;
  codigo: string;
  codigo_barras: string | null;
  nome: string;
  preco_custo: number;
  preco_venda: number;
  estoque_atual: number;
  estoque_minimo: number;
  grupo: string | null;
  marca: string | null;
}

interface CartItem {
  item_id: string;
  codigo_barras: string;
  nome_item: string;
  marca: string;
  quantidade: number;
  preco_unitario: number;
  motivo_perda: string;
  tipo_resolucao: string;
  data_vencimento?: string;
  unidade_medida: "kg" | "unidade";
  tipo_lancamento: "perda" | "consumo";
}

interface Lancamento {
  id: string;
  numero: number;
  data_lancamento: string;
  usuario_id: string;
  status: string;
  observacao: string | null;
  criado_em: string | null;
  total_valor?: number;
  total_itens?: number;
  usuario?: { nome: string };
  resolucoes?: string[];
}

interface PerdaGeral {
  id: string;
  lancamento_id: string | null;
  item_id: string;
  quantidade_perdida: number;
  preco_unitario: number;
  valor_perda: number;
  motivo_perda: string;
  tipo_resolucao: string;
  data_perda: string;
  data_vencimento: string | null;
  observacao: string | null;
  item?: { nome_item: string; codigo_barras: string | null };
}

interface PerdasTabProps {
  items: EstoqueItem[];
}

const COLORS = [
  "hsl(var(--primary))",
  "hsl(var(--destructive))",
  "hsl(220, 70%, 50%)",
  "hsl(var(--secondary))",
  "hsl(var(--accent))",
];

const MOTIVOS_PERDA = [
  { value: "vencido", label: "Vencido" },
  { value: "danificado", label: "Danificado" },
  { value: "quebrado", label: "Quebrado" },
  { value: "avaria", label: "Avaria" },
  { value: "outros", label: "Outros" },
];

const MOTIVOS_CONSUMO = [
  { value: "limpeza", label: "Limpeza" },
  { value: "manutencao", label: "Manutenção" },
  { value: "escritorio", label: "Escritório" },
  { value: "alimentacao", label: "Alimentação" },
  { value: "outros", label: "Outros" },
];

const TIPOS_RESOLUCAO = [
  { value: "sem_resolucao", label: "Sem Resolução" },
  { value: "troca", label: "Troca" },
  { value: "bonificacao", label: "Bonificação" },
  { value: "desconto", label: "Desconto" },
];

const PerdasTab = ({ items }: PerdasTabProps) => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState("lancamento");
  const [tipoLancamento, setTipoLancamento] = useState<"perda" | "consumo">("perda");
  const receiptRef = useRef<HTMLDivElement>(null);

  // State
  const [lancamentos, setLancamentos] = useState<Lancamento[]>([]);
  const [loading, setLoading] = useState(true);

  // New loss state
  const [cart, setCart] = useState<CartItem[]>([]);
  const [searchInput, setSearchInput] = useState("");
  const [searchingProduct, setSearchingProduct] = useState(false);
  const [lancamentoObservacao, setLancamentoObservacao] = useState("");
  const [showScanner, setShowScanner] = useState(false);
  const [showSearchSuggestions, setShowSearchSuggestions] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Manual product dialog
  const [showProductDialog, setShowProductDialog] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<EstoqueItem | null>(null);
  const [productFormData, setProductFormData] = useState({
    quantidade: "" as string | number,
    motivo_perda: "danificado",
    tipo_resolucao: "sem_resolucao",
    data_vencimento: "",
    unidade_medida: "unidade" as "kg" | "unidade",
  });

  // Edit item dialog
  const [showEditItemDialog, setShowEditItemDialog] = useState(false);
  const [editingItem, setEditingItem] = useState<PerdaGeral | null>(null);
  const [editItemData, setEditItemData] = useState({
    quantidade_perdida: "" as string | number,
    preco_unitario: "" as string | number,
    motivo_perda: "",
    tipo_resolucao: "",
    data_vencimento: "",
  });

  // Selected lancamento for viewing
  const [selectedLancamento, setSelectedLancamento] = useState<Lancamento | null>(null);
  const [lancamentoItems, setLancamentoItems] = useState<PerdaGeral[]>([]);
  const [showLancamentoDetail, setShowLancamentoDetail] = useState(false);
  const [showThermalReceipt, setShowThermalReceipt] = useState(false);

  // Filtro de resolução no histórico
  const [filtroResolucao, setFiltroResolucao] = useState<string>("todos");

  // Dashboard data
  const [dashboardData, setDashboardData] = useState({
    totalPerdas: 0,
    totalValor: 0,
    totalConsumo: 0,
    valorConsumo: 0,
    perdasPorMotivo: [] as { name: string; value: number }[],
    perdasPorResolucao: [] as { name: string; value: number }[],
    itensMaisPerdidos: [] as { name: string; quantidade: number }[],
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      // Fetch launches with user profiles
      const { data: lancamentosData, error: lancamentosError } = await supabase
        .from("lancamentos_perdas_geral")
        .select("*")
        .order("criado_em", { ascending: false });

      if (lancamentosError) throw lancamentosError;

      // Fetch losses for each launch
      const lancamentosWithDetails = await Promise.all(
        (lancamentosData || []).map(async (lancamento) => {
          const { data: perdas } = await supabase
            .from("perdas_geral")
            .select("*, item:itens_perdas_geral(*)")
            .eq("lancamento_id", lancamento.id);

          const { data: profile } = await supabase
            .from("profiles")
            .select("nome")
            .eq("id", lancamento.usuario_id)
            .single();

          const totalValor = (perdas || []).reduce((sum, p) => sum + (p.valor_perda || 0), 0);
          const totalItens = (perdas || []).reduce((sum, p) => sum + p.quantidade_perdida, 0);
          const resolucoes = [...new Set((perdas || []).map((p) => p.tipo_resolucao))];

          return {
            ...lancamento,
            total_valor: totalValor,
            total_itens: totalItens,
            usuario: profile,
            resolucoes,
          };
        })
      );

      setLancamentos(lancamentosWithDetails);

      // Calculate dashboard data
      const { data: allPerdas } = await supabase
        .from("perdas_geral")
        .select("*, item:itens_perdas_geral(*)");

      if (allPerdas) {
        const consumoMotivos = ["limpeza", "manutencao", "escritorio", "alimentacao"];
        const perdasReais = allPerdas.filter((p) => !consumoMotivos.includes(p.motivo_perda));
        const consumoItens = allPerdas.filter((p) => consumoMotivos.includes(p.motivo_perda));

        const totalPerdas = perdasReais.length;
        const totalValor = perdasReais.reduce((sum, p) => sum + (p.valor_perda || 0), 0);
        const totalConsumo = consumoItens.length;
        const valorConsumo = consumoItens.reduce((sum, p) => sum + (p.valor_perda || 0), 0);

        const perdasPorMotivo = MOTIVOS_PERDA.map((m) => ({
          name: m.label,
          value: perdasReais.filter((p) => p.motivo_perda === m.value).length,
        })).filter((d) => d.value > 0);

        const perdasPorResolucao = TIPOS_RESOLUCAO.map((t) => ({
          name: t.label,
          value: allPerdas.filter((p) => p.tipo_resolucao === t.value).length,
        })).filter((d) => d.value > 0);

        const itemCounts: Record<string, { name: string; quantidade: number }> = {};
        allPerdas.forEach((p) => {
          const itemName = (p.item?.nome_item || "DESCONHECIDO").toUpperCase();
          if (!itemCounts[itemName]) {
            itemCounts[itemName] = { name: itemName, quantidade: 0 };
          }
          itemCounts[itemName].quantidade += p.quantidade_perdida;
        });
        const itensMaisPerdidos = Object.values(itemCounts)
          .sort((a, b) => b.quantidade - a.quantidade)
          .slice(0, 5);

        setDashboardData({
          totalPerdas,
          totalValor,
          totalConsumo,
          valorConsumo,
          perdasPorMotivo,
          perdasPorResolucao,
          itensMaisPerdidos,
        });
      }
    } catch (error) {
      console.error("Erro ao carregar dados:", error);
      toast.error("Erro ao carregar dados");
    } finally {
      setLoading(false);
    }
  };

  // Real-time search suggestions based on input - busca no estoque
  const searchSuggestions = useMemo(() => {
    if (searchInput.trim().length < 2) return [];
    return items
      .filter((item) =>
        searchAcrossFields(
          [item.nome, item.codigo_barras, item.codigo, item.marca],
          searchInput
        )
      )
      .slice(0, 8);
  }, [searchInput, items]);

  const searchProduct = (searchValue?: string) => {
    const query = searchValue || searchInput;
    if (!query || query.length < 2) {
      toast.error("Digite pelo menos 2 caracteres para buscar");
      return;
    }

    setSearchingProduct(true);
    setShowSearchSuggestions(false);

    // Buscar no estoque
    const normalizedQuery = query.toLowerCase().replace(/\s+/g, " ").trim();
    const found = items.find((item) => {
      const barcode = (item.codigo_barras || "").replace(/\D/g, "");
      const queryClean = normalizedQuery.replace(/\D/g, "");
      if (barcode && queryClean && barcode === queryClean) return true;
      if (item.codigo.toLowerCase() === normalizedQuery) return true;
      return false;
    });

    if (found) {
      selectProduct(found);
    } else {
      // Tentar busca parcial
      const partialMatch = items.find((item) =>
        searchAcrossFields(
          [item.nome, item.codigo_barras, item.codigo, item.marca],
          query
        )
      );
      if (partialMatch) {
        selectProduct(partialMatch);
      } else {
        toast.error("Produto não encontrado no estoque");
      }
    }

    setSearchInput("");
    setSearchingProduct(false);
  };

  const selectProduct = (product: EstoqueItem) => {
    setSelectedProduct(product);
    setProductFormData({
      quantidade: "",
      motivo_perda: tipoLancamento === "consumo" ? "limpeza" : "danificado",
      tipo_resolucao: "sem_resolucao",
      data_vencimento: "",
      unidade_medida: "unidade",
    });
    setShowProductDialog(true);
    setShowSearchSuggestions(false);
    toast.success(`Produto: ${product.nome}`);
  };

  const addToCart = async () => {
    if (!selectedProduct) return;

    if (productFormData.motivo_perda === "vencido" && !productFormData.data_vencimento) {
      toast.error("Data de vencimento é obrigatória para itens vencidos");
      return;
    }

    const quantidadeNum =
      typeof productFormData.quantidade === "string"
        ? parseFloat(productFormData.quantidade.replace(",", ".")) || 0
        : productFormData.quantidade || 0;

    if (quantidadeNum <= 0) {
      toast.error("Quantidade deve ser maior que zero");
      return;
    }

    // Verificar/criar item no catálogo de perdas (itens_perdas_geral)
    let itemId: string;

    const { data: existingItem } = await supabase
      .from("itens_perdas_geral")
      .select("id")
      .eq("codigo_barras", selectedProduct.codigo_barras || selectedProduct.codigo)
      .maybeSingle();

    if (existingItem) {
      itemId = existingItem.id;
    } else {
      // Criar item no catálogo de perdas
      const { data: newItem, error: insertError } = await supabase
        .from("itens_perdas_geral")
        .insert({
          nome_item: selectedProduct.nome.toUpperCase(),
          codigo_barras: selectedProduct.codigo_barras || selectedProduct.codigo,
          marca: selectedProduct.marca?.toUpperCase() || null,
          categoria: selectedProduct.grupo?.toUpperCase() || null,
          preco_custo: selectedProduct.preco_custo,
          preco_venda: selectedProduct.preco_venda,
        })
        .select()
        .single();

      if (insertError) {
        toast.error("Erro ao registrar produto para perdas");
        return;
      }
      itemId = newItem.id;
    }

    setCart((prev) => {
      const existing = prev.find(
        (p) => p.codigo_barras === (selectedProduct.codigo_barras || selectedProduct.codigo)
      );
      if (existing) {
        return prev.map((p) =>
          p.codigo_barras === (selectedProduct.codigo_barras || selectedProduct.codigo)
            ? { ...p, quantidade: p.quantidade + quantidadeNum }
            : p
        );
      }
      return [
        ...prev,
        {
          item_id: itemId,
          codigo_barras: selectedProduct.codigo_barras || selectedProduct.codigo,
          nome_item: selectedProduct.nome,
          marca: selectedProduct.marca || "",
          quantidade: quantidadeNum,
          preco_unitario: selectedProduct.preco_custo,
          motivo_perda: productFormData.motivo_perda,
          tipo_resolucao: productFormData.tipo_resolucao,
          data_vencimento: productFormData.data_vencimento || undefined,
          unidade_medida: productFormData.unidade_medida,
          tipo_lancamento: tipoLancamento,
        },
      ];
    });

    toast.success("Item adicionado ao lançamento!");
    setShowProductDialog(false);
    setSelectedProduct(null);
  };

  const removeFromCart = (codigo_barras: string) => {
    setCart((prev) => prev.filter((p) => p.codigo_barras !== codigo_barras));
  };

  const updateCartItem = (codigo_barras: string, field: string, value: number | string) => {
    setCart((prev) =>
      prev.map((p) => (p.codigo_barras === codigo_barras ? { ...p, [field]: value } : p))
    );
  };

  const saveLancamento = async () => {
    if (cart.length === 0) {
      toast.error("Adicione pelo menos um item ao lançamento");
      return;
    }

    if (!user) {
      toast.error("Usuário não autenticado");
      return;
    }

    const invalidItems = cart.filter(
      (item) => item.motivo_perda === "vencido" && !item.data_vencimento
    );
    if (invalidItems.length > 0) {
      toast.error(`${invalidItems.length} item(s) vencido(s) sem data de vencimento`);
      return;
    }

    try {
      const { data: lancamento, error: lancamentoError } = await supabase
        .from("lancamentos_perdas_geral")
        .insert({
          observacao: lancamentoObservacao || null,
          usuario_id: user.id,
        })
        .select()
        .single();

      if (lancamentoError) throw lancamentoError;

      const perdasData = cart.map((item) => ({
        lancamento_id: lancamento.id,
        item_id: item.item_id,
        usuario_id: user.id,
        quantidade_perdida: item.quantidade,
        preco_unitario: item.preco_unitario,
        valor_perda: item.quantidade * item.preco_unitario,
        motivo_perda: item.motivo_perda as "vencido" | "danificado" | "quebrado" | "avaria" | "outros" | "limpeza" | "manutencao" | "escritorio" | "alimentacao",
        tipo_resolucao: item.tipo_resolucao as "sem_resolucao" | "troca" | "bonificacao" | "desconto",
        data_vencimento: item.data_vencimento || null,
      }));

      const { error: perdasError } = await supabase.from("perdas_geral").insert(perdasData);

      if (perdasError) throw perdasError;

      toast.success("Lançamento salvo com sucesso!");
      setCart([]);
      setLancamentoObservacao("");
      fetchData();
      setActiveTab("historico");
    } catch (error) {
      console.error("Erro ao salvar lançamento:", error);
      toast.error("Erro ao salvar lançamento");
    }
  };

  const viewLancamentoDetail = async (lancamento: Lancamento) => {
    setSelectedLancamento(lancamento);
    try {
      const { data, error } = await supabase
        .from("perdas_geral")
        .select("*, item:itens_perdas_geral(*)")
        .eq("lancamento_id", lancamento.id);

      if (error) throw error;
      setLancamentoItems(data || []);
      setShowLancamentoDetail(true);
    } catch (error) {
      console.error("Erro ao carregar itens:", error);
      toast.error("Erro ao carregar itens do lançamento");
    }
  };

  const editItem = (item: PerdaGeral) => {
    setEditingItem(item);
    setEditItemData({
      quantidade_perdida: item.quantidade_perdida,
      preco_unitario: item.preco_unitario,
      motivo_perda: item.motivo_perda,
      tipo_resolucao: item.tipo_resolucao,
      data_vencimento: item.data_vencimento || "",
    });
    setShowEditItemDialog(true);
  };

  const saveEditedItem = async () => {
    if (!editingItem) return;

    if (editItemData.motivo_perda === "vencido" && !editItemData.data_vencimento) {
      toast.error("Data de vencimento é obrigatória para itens vencidos");
      return;
    }

    try {
      const quantidadeNum =
        typeof editItemData.quantidade_perdida === "string"
          ? parseFloat(editItemData.quantidade_perdida.replace(",", ".")) || 0
          : editItemData.quantidade_perdida || 0;
      const precoNum =
        typeof editItemData.preco_unitario === "string"
          ? parseFloat(editItemData.preco_unitario.replace(",", ".")) || 0
          : editItemData.preco_unitario || 0;

      const { error } = await supabase
        .from("perdas_geral")
        .update({
          quantidade_perdida: quantidadeNum,
          preco_unitario: precoNum,
          valor_perda: quantidadeNum * precoNum,
          motivo_perda: editItemData.motivo_perda as "vencido" | "danificado" | "quebrado" | "avaria" | "outros",
          tipo_resolucao: editItemData.tipo_resolucao as "sem_resolucao" | "troca" | "bonificacao" | "desconto",
          data_vencimento: editItemData.data_vencimento || null,
        })
        .eq("id", editingItem.id);

      if (error) throw error;

      toast.success("Item atualizado!");
      setShowEditItemDialog(false);

      if (selectedLancamento) {
        viewLancamentoDetail(selectedLancamento);
      }
      fetchData();
    } catch (error) {
      console.error("Erro ao atualizar item:", error);
      toast.error("Erro ao atualizar item");
    }
  };

  const deleteItem = async (itemId: string) => {
    if (!confirm("Tem certeza que deseja excluir este item?")) return;

    try {
      const { error } = await supabase.from("perdas_geral").delete().eq("id", itemId);

      if (error) throw error;

      toast.success("Item excluído!");

      const { data: remainingItems } = await supabase
        .from("perdas_geral")
        .select("id")
        .eq("lancamento_id", selectedLancamento?.id);

      if (!remainingItems || remainingItems.length === 0) {
        await supabase
          .from("lancamentos_perdas_geral")
          .delete()
          .eq("id", selectedLancamento?.id);

        setShowLancamentoDetail(false);
        toast.info("Lançamento removido pois não possui mais itens");
      } else {
        if (selectedLancamento) {
          viewLancamentoDetail(selectedLancamento);
        }
      }
      fetchData();
    } catch (error) {
      console.error("Erro ao excluir item:", error);
      toast.error("Erro ao excluir item");
    }
  };

  const generateThermalReceipt = async () => {
    setShowThermalReceipt(true);
    await new Promise((resolve) => setTimeout(resolve, 100));

    const element = receiptRef.current;
    if (element) {
      const canvas = await html2canvas(element, {
        backgroundColor: "#ffffff",
        scale: 3,
        useCORS: true,
        logging: false,
      });
      const link = document.createElement("a");
      link.download = `cupom-perdas-${selectedLancamento?.numero}.jpg`;
      link.href = canvas.toDataURL("image/jpeg", 0.98);
      link.click();
      toast.success("Cupom gerado com sucesso!");
    }

    setShowThermalReceipt(false);
  };

  const generateReport = async (lancamento: Lancamento, reportItems: PerdaGeral[], reportFormat: "pdf" | "jpeg") => {
    if (reportFormat === "pdf") {
      const doc = new jsPDF();

      doc.setFontSize(20);
      doc.setFont("helvetica", "bold");
      doc.text("RELATÓRIO DE PERDAS", 105, 18, { align: "center" });
      doc.setFontSize(14);
      doc.text("COMERCIAL COSTA", 105, 28, { align: "center" });

      doc.setLineWidth(0.5);
      doc.line(14, 33, 196, 33);

      doc.setFont("helvetica", "normal");
      doc.setFontSize(11);
      doc.text(`LANÇAMENTO Nº: ${lancamento.numero}`, 14, 42);
      doc.text(`DATA: ${format(new Date(lancamento.data_lancamento), "dd/MM/yyyy", { locale: ptBR }).toUpperCase()}`, 14, 49);
      doc.text(`RESPONSÁVEL: ${(lancamento.usuario?.nome || "N/A").toUpperCase()}`, 14, 56);

      const tableData = reportItems.map((item) => [
        (item.item?.codigo_barras || "-").toUpperCase(),
        (item.item?.nome_item || "N/A").toUpperCase(),
        item.quantidade_perdida.toString(),
        `R$ ${formatarPreco(item.preco_unitario)}`,
        (MOTIVOS_PERDA.find((m) => m.value === item.motivo_perda)?.label || item.motivo_perda).toUpperCase(),
        (TIPOS_RESOLUCAO.find((t) => t.value === item.tipo_resolucao)?.label || item.tipo_resolucao).toUpperCase(),
        item.data_vencimento ? format(new Date(item.data_vencimento), "dd/MM/yyyy") : "-",
        `R$ ${formatarPreco(item.valor_perda || 0)}`,
      ]);

      autoTable(doc, {
        head: [["CÓDIGO", "PRODUTO", "QTD", "PREÇO UNIT.", "MOTIVO", "RESOLUÇÃO", "VENCIMENTO", "VALOR TOTAL"]],
        body: tableData,
        startY: 63,
        theme: "grid",
        headStyles: { fillColor: [220, 38, 38], fontStyle: "bold", fontSize: 9 },
        bodyStyles: { fontSize: 8 },
        columnStyles: {
          0: { cellWidth: 25 },
          1: { cellWidth: 40 },
          2: { cellWidth: 15 },
          3: { cellWidth: 22 },
          4: { cellWidth: 22 },
          5: { cellWidth: 25 },
          6: { cellWidth: 22 },
          7: { cellWidth: 22 },
        },
      });

      const finalY = (doc as jsPDF & { lastAutoTable: { finalY: number } }).lastAutoTable.finalY;
      doc.setFontSize(12);
      doc.setFont("helvetica", "bold");
      doc.text(`TOTAL: R$ ${formatarPreco(lancamento.total_valor || 0)}`, 14, finalY + 12);

      doc.save(`PERDAS-${lancamento.numero}.pdf`);
      toast.success("PDF gerado com sucesso!");
    } else {
      await generateThermalReceipt();
    }
  };

  const getMotivoLabel = (value: string) => {
    const perdaMotivo = MOTIVOS_PERDA.find((m) => m.value === value);
    if (perdaMotivo) return perdaMotivo.label;
    const consumoMotivo = MOTIVOS_CONSUMO.find((m) => m.value === value);
    return consumoMotivo?.label || value;
  };

  const getResolucaoLabel = (value: string) =>
    TIPOS_RESOLUCAO.find((t) => t.value === value)?.label || value;

  const currentMotivos = tipoLancamento === "consumo" ? MOTIVOS_CONSUMO : MOTIVOS_PERDA;

  const receiptItems = lancamentoItems.map((item) => ({
    codigo_barras: item.item?.codigo_barras || undefined,
    nome: item.item?.nome_item || "N/A",
    quantidade: item.quantidade_perdida,
    preco_unitario: item.preco_unitario,
    valor_total: item.valor_perda || 0,
    motivo: getMotivoLabel(item.motivo_perda),
    data_vencimento: item.data_vencimento
      ? formatInTimeZone(new Date(item.data_vencimento), TIMEZONE, "dd/MM/yyyy", { locale: ptBR })
      : undefined,
  }));

  // Calculate items below minimum stock
  const abaixoMinimo = useMemo(() => {
    return items.filter((i) => i.estoque_atual < i.estoque_minimo);
  }, [items]);

  const stats = {
    totalPerdas: dashboardData.totalPerdas,
    valorTotal: dashboardData.totalValor,
    abaixoMinimo: abaixoMinimo.length,
    potencialPerda: abaixoMinimo.reduce(
      (acc, i) => acc + i.preco_custo * Math.max(0, i.estoque_minimo - i.estoque_atual),
      0
    ),
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value || 0);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-destructive" />
            Controle de Perdas
          </h2>
          <p className="text-sm text-muted-foreground">
            Registre e monitore perdas e consumo interno
          </p>
        </div>
        <Button
          onClick={() => setActiveTab("lancamento")}
          className="gap-2"
          variant={activeTab === "lancamento" ? "default" : "outline"}
        >
          <Package className="w-4 h-4" />
          Nova Perda
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="lancamento" className="gap-2">
            <Package className="w-4 h-4" />
            <span className="hidden sm:inline">Lançar</span>
          </TabsTrigger>
          <TabsTrigger value="dashboard" className="gap-2">
            <BarChart3 className="w-4 h-4" />
            <span className="hidden sm:inline">Dashboard</span>
          </TabsTrigger>
          <TabsTrigger value="historico" className="gap-2">
            <History className="w-4 h-4" />
            <span className="hidden sm:inline">Histórico</span>
          </TabsTrigger>
        </TabsList>

        {/* Dashboard Tab */}
        <TabsContent value="dashboard" className="space-y-6">
          {/* Stats Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card className="bg-gradient-to-br from-red-500 to-red-600 text-white border-0">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-2">
                  <div className="p-2 bg-white/20 rounded-lg">
                    <TrendingDown className="w-5 h-5" />
                  </div>
                  <span className="text-sm font-medium text-white/90">PERDAS</span>
                </div>
                <p className="text-2xl font-bold">{stats.totalPerdas}</p>
                <p className="text-sm text-white/80">{formatCurrency(stats.valorTotal)}</p>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-blue-500 to-blue-600 text-white border-0">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-2">
                  <div className="p-2 bg-white/20 rounded-lg">
                    <Coffee className="w-5 h-5" />
                  </div>
                  <span className="text-sm font-medium text-white/90">CONSUMO</span>
                </div>
                <p className="text-2xl font-bold">{dashboardData.totalConsumo}</p>
                <p className="text-sm text-white/80">{formatCurrency(dashboardData.valorConsumo)}</p>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-amber-500 to-amber-600 text-white border-0">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-2">
                  <div className="p-2 bg-white/20 rounded-lg">
                    <AlertTriangle className="w-5 h-5" />
                  </div>
                  <span className="text-sm font-medium text-white/90">BAIXO ESTOQUE</span>
                </div>
                <p className="text-2xl font-bold">{stats.abaixoMinimo}</p>
                <p className="text-sm text-white/80">itens</p>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-emerald-500 to-emerald-600 text-white border-0">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-2">
                  <div className="p-2 bg-white/20 rounded-lg">
                    <DollarSign className="w-5 h-5" />
                  </div>
                  <span className="text-sm font-medium text-white/90">REPOSIÇÃO</span>
                </div>
                <p className="text-xl font-bold">{formatCurrency(stats.potencialPerda)}</p>
                <p className="text-sm text-white/80">necessária</p>
              </CardContent>
            </Card>
          </div>

          {/* Charts */}
          <div className="grid md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Perdas por Motivo</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-64">
                  {dashboardData.perdasPorMotivo.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={dashboardData.perdasPorMotivo}
                          cx="50%"
                          cy="50%"
                          outerRadius={80}
                          dataKey="value"
                          label={({ name, value }) => `${name}: ${value}`}
                        >
                          {dashboardData.perdasPorMotivo.map((_, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="flex items-center justify-center h-full text-muted-foreground">
                      Nenhum dado disponível
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Itens Mais Perdidos</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-64">
                  {dashboardData.itensMaisPerdidos.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={dashboardData.itensMaisPerdidos} layout="vertical">
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis type="number" />
                        <YAxis dataKey="name" type="category" width={100} tick={{ fontSize: 10 }} />
                        <Tooltip />
                        <Bar dataKey="quantidade" fill="hsl(var(--destructive))" />
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="flex items-center justify-center h-full text-muted-foreground">
                      Nenhum dado disponível
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Items below minimum */}
          {abaixoMinimo.length > 0 && (
            <Card className="border-destructive/30">
              <CardContent className="p-4">
                <h3 className="font-bold mb-4 flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-destructive" />
                  Produtos Abaixo do Estoque Mínimo ({abaixoMinimo.length})
                </h3>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Código</TableHead>
                        <TableHead>Produto</TableHead>
                        <TableHead className="text-right">Atual</TableHead>
                        <TableHead className="text-right">Mínimo</TableHead>
                        <TableHead className="text-right">Falta</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {abaixoMinimo.slice(0, 10).map((item) => (
                        <TableRow key={item.id}>
                          <TableCell className="font-mono text-sm">{item.codigo}</TableCell>
                          <TableCell className="max-w-[200px] truncate">{item.nome}</TableCell>
                          <TableCell className="text-right text-destructive font-bold">
                            {item.estoque_atual}
                          </TableCell>
                          <TableCell className="text-right">{item.estoque_minimo}</TableCell>
                          <TableCell className="text-right">
                            <Badge variant="destructive">
                              -{item.estoque_minimo - item.estoque_atual}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
                {abaixoMinimo.length > 10 && (
                  <p className="text-sm text-muted-foreground mt-4 text-center">
                    E mais {abaixoMinimo.length - 10} produtos...
                  </p>
                )}
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Lancamento Tab */}
        <TabsContent value="lancamento" className="space-y-4">
          {/* Tipo de lançamento */}
          <div className="flex gap-2">
            <Button
              variant={tipoLancamento === "perda" ? "destructive" : "outline"}
              onClick={() => setTipoLancamento("perda")}
              className="flex-1 gap-2"
            >
              <AlertTriangle className="w-4 h-4" />
              PERDA
            </Button>
            <Button
              variant={tipoLancamento === "consumo" ? "default" : "outline"}
              onClick={() => setTipoLancamento("consumo")}
              className="flex-1 gap-2"
            >
              <Coffee className="w-4 h-4" />
              CONSUMO
            </Button>
          </div>

          {/* Busca Unificada */}
          <Card
            className={`border-2 border-dashed ${tipoLancamento === "consumo" ? "border-primary/30" : "border-destructive/30"}`}
          >
            <CardContent className="p-4 space-y-4">
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <Search className="h-5 w-5 text-muted-foreground" />
                </div>
                <Input
                  ref={searchInputRef}
                  placeholder="Código de barras, código ou nome do produto..."
                  value={searchInput}
                  onChange={(e) => {
                    setSearchInput(e.target.value.toUpperCase());
                    setShowSearchSuggestions(true);
                  }}
                  onFocus={() => setShowSearchSuggestions(true)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      setShowSearchSuggestions(false);
                      searchProduct();
                    }
                    if (e.key === "Escape") {
                      setShowSearchSuggestions(false);
                    }
                  }}
                  className="pl-12 h-12 text-base font-medium uppercase"
                />
                {searchingProduct && (
                  <div className="absolute inset-y-0 right-4 flex items-center">
                    <Loader2 className="h-5 w-5 animate-spin text-primary" />
                  </div>
                )}

                {/* Dropdown de Sugestões */}
                {showSearchSuggestions && searchSuggestions.length > 0 && (
                  <div className="absolute top-full left-0 right-0 z-50 mt-1 bg-background border-2 border-primary/30 rounded-lg shadow-lg max-h-64 overflow-y-auto">
                    <div className="p-2 text-xs text-muted-foreground border-b bg-muted/50">
                      <Search className="w-3 h-3 inline mr-1" />
                      {searchSuggestions.length} resultado(s)
                    </div>
                    {searchSuggestions.map((item) => (
                      <button
                        key={item.id}
                        onClick={() => {
                          selectProduct(item);
                          setSearchInput("");
                        }}
                        className="w-full flex items-center gap-3 p-3 hover:bg-primary/10 transition-colors text-left border-b last:border-b-0"
                      >
                        <div className="p-2 bg-primary/10 rounded">
                          <Package className="w-4 h-4 text-primary" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-sm uppercase truncate">{item.nome}</p>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <span className="font-mono">{item.codigo_barras || item.codigo}</span>
                            {item.marca && <span>• {item.marca}</span>}
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-semibold text-primary">
                            {formatCurrency(item.preco_custo)}
                          </p>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex flex-col gap-2">
                <Button
                  variant="outline"
                  onClick={() => setShowScanner(true)}
                  className="w-full h-12 gap-2 font-semibold bg-blue-500 hover:bg-blue-600 text-white border-blue-500 hover:border-blue-600"
                >
                  <Camera className="w-5 h-5" />
                  ESCANEAR CÓDIGO
                </Button>
                <Button
                  onClick={() => searchProduct()}
                  disabled={searchingProduct || searchInput.length < 2}
                  className="w-full h-12 gap-2 font-semibold bg-emerald-500 hover:bg-emerald-600 text-white"
                >
                  <Search className="w-5 h-5" />
                  BUSCAR PRODUTO
                </Button>
              </div>
            </CardContent>
          </Card>

          <BarcodeScanner
            open={showScanner}
            onOpenChange={setShowScanner}
            onScan={(barcode) => {
              searchProduct(barcode);
            }}
          />

          {/* Cart Summary */}
          {cart.length > 0 && (
            <>
              <Card
                className={`${tipoLancamento === "consumo" ? "border-primary bg-primary/5" : "border-destructive bg-destructive/5"}`}
              >
                <CardContent className="p-4">
                  <div className="grid grid-cols-3 gap-4 text-center">
                    <div className="p-3 bg-background rounded-lg">
                      <p className="text-xs text-muted-foreground">ITENS</p>
                      <p className="text-2xl font-bold">{cart.length}</p>
                    </div>
                    <div className="p-3 bg-background rounded-lg">
                      <p className="text-xs text-muted-foreground">QUANTIDADE</p>
                      <p className="text-2xl font-bold">
                        {cart.reduce((sum, item) => sum + item.quantidade, 0)}
                      </p>
                    </div>
                    <div className="p-3 bg-background rounded-lg">
                      <p className="text-xs text-muted-foreground">VALOR TOTAL</p>
                      <p
                        className={`text-xl font-bold ${tipoLancamento === "consumo" ? "text-primary" : "text-destructive"}`}
                      >
                        {formatCurrency(
                          cart.reduce((sum, item) => sum + item.quantidade * item.preco_unitario, 0)
                        )}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Cart Items */}
              <Card>
                <CardContent className="p-4">
                  <div className="space-y-2">
                    {cart.map((item) => (
                      <div
                        key={item.codigo_barras}
                        className="flex items-center justify-between p-3 bg-muted/50 rounded-lg"
                      >
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-sm truncate">{item.nome_item}</p>
                          <p className="text-xs text-muted-foreground">
                            {item.quantidade} x {formatCurrency(item.preco_unitario)} ={" "}
                            <span className="font-bold">
                              {formatCurrency(item.quantidade * item.preco_unitario)}
                            </span>
                          </p>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => removeFromCart(item.codigo_barras)}
                          className="text-destructive"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Observação e Salvar */}
              <Card>
                <CardContent className="p-4 space-y-4">
                  <div>
                    <Label>Observação (opcional)</Label>
                    <Textarea
                      placeholder="Adicione uma observação..."
                      value={lancamentoObservacao}
                      onChange={(e) => setLancamentoObservacao(e.target.value.toUpperCase())}
                      className="mt-2 uppercase"
                    />
                  </div>
                  <Button
                    onClick={saveLancamento}
                    className="w-full h-12 text-lg font-bold gap-3"
                    variant={tipoLancamento === "consumo" ? "default" : "destructive"}
                  >
                    <Save className="w-5 h-5" />
                    {tipoLancamento === "consumo" ? "REGISTRAR CONSUMO" : "SALVAR LANÇAMENTO"}
                  </Button>
                </CardContent>
              </Card>
            </>
          )}

          {cart.length === 0 && (
            <Card className="border-dashed">
              <CardContent className="p-12 text-center">
                <Package className="w-16 h-16 mx-auto mb-4 text-muted-foreground/50" />
                <p className="text-lg text-muted-foreground">
                  Busque um produto para adicionar ao lançamento
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Histórico Tab */}
        <TabsContent value="historico" className="space-y-4">
          {/* Filtro de resolução */}
          <div className="flex gap-2 flex-wrap">
            <Button
              variant={filtroResolucao === "todos" ? "default" : "outline"}
              size="sm"
              onClick={() => setFiltroResolucao("todos")}
            >
              Todos
            </Button>
            {TIPOS_RESOLUCAO.map((t) => (
              <Button
                key={t.value}
                variant={filtroResolucao === t.value ? "default" : "outline"}
                size="sm"
                onClick={() => setFiltroResolucao(t.value)}
              >
                {t.label}
              </Button>
            ))}
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <History className="w-5 h-5" />
                Lançamentos Registrados
              </CardTitle>
            </CardHeader>
            <CardContent>
              {lancamentos.filter(
                (l) =>
                  filtroResolucao === "todos" ||
                  (l.resolucoes && l.resolucoes.includes(filtroResolucao))
              ).length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <History className="w-16 h-16 mx-auto mb-4 opacity-50" />
                  <p className="font-medium">Nenhum lançamento encontrado</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {lancamentos
                    .filter(
                      (l) =>
                        filtroResolucao === "todos" ||
                        (l.resolucoes && l.resolucoes.includes(filtroResolucao))
                    )
                    .map((lancamento) => (
                      <div
                        key={lancamento.id}
                        onClick={() => viewLancamentoDetail(lancamento)}
                        className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 cursor-pointer transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-lg bg-destructive/10 flex items-center justify-center text-destructive font-bold">
                            #{lancamento.numero}
                          </div>
                          <div>
                            <p className="font-semibold">
                              {format(new Date(lancamento.data_lancamento), "dd/MM/yyyy", {
                                locale: ptBR,
                              })}
                            </p>
                            <p className="text-sm text-muted-foreground">
                              {lancamento.usuario?.nome || "Usuário"}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="font-bold text-destructive">
                            {formatCurrency(lancamento.total_valor || 0)}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {lancamento.total_itens} itens
                          </p>
                        </div>
                      </div>
                    ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Thermal Receipt Hidden Component */}
      {showThermalReceipt && selectedLancamento && (
        <div className="fixed left-[-9999px]">
          <div ref={receiptRef}>
            <ThermalLossReceipt
              numero={selectedLancamento.numero}
              data={new Date(selectedLancamento.data_lancamento)}
              operador={selectedLancamento.usuario?.nome || "N/A"}
              items={receiptItems}
              observacao={selectedLancamento.observacao || undefined}
            />
          </div>
        </div>
      )}

      {/* Product Dialog */}
      <Dialog open={showProductDialog} onOpenChange={setShowProductDialog}>
        <DialogContent className="max-w-[360px]">
          <DialogHeader>
            <DialogTitle className="text-sm">
              {tipoLancamento === "consumo" ? "☕ CONSUMO" : "📦 LANÇAR PERDA"}
            </DialogTitle>
          </DialogHeader>

          {selectedProduct && (
            <div className="space-y-3">
              <div className="p-2 bg-muted/50 rounded-lg">
                <p className="font-bold text-sm uppercase truncate">{selectedProduct.nome}</p>
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span className="font-mono">
                    {selectedProduct.codigo_barras || selectedProduct.codigo}
                  </span>
                  <span className="font-bold text-primary">
                    {formatCurrency(selectedProduct.preco_custo)}
                  </span>
                </div>
              </div>

              <div className="flex gap-2">
                <Select
                  value={productFormData.unidade_medida}
                  onValueChange={(v: "kg" | "unidade") =>
                    setProductFormData((prev) => ({ ...prev, unidade_medida: v, quantidade: "" }))
                  }
                >
                  <SelectTrigger className="w-20 h-10">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="unidade">UN</SelectItem>
                    <SelectItem value="kg">KG</SelectItem>
                  </SelectContent>
                </Select>
                <Input
                  type="text"
                  inputMode={productFormData.unidade_medida === "kg" ? "decimal" : "numeric"}
                  placeholder="Quantidade"
                  value={productFormData.quantidade}
                  onChange={(e) => {
                    let val = e.target.value;
                    if (productFormData.unidade_medida === "unidade") {
                      val = val.replace(/[^0-9]/g, "");
                    } else {
                      val = val.replace(/[^0-9,]/g, "");
                    }
                    setProductFormData((prev) => ({ ...prev, quantidade: val }));
                  }}
                  autoFocus
                  className="flex-1 h-10 text-center font-bold"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label className="text-xs">
                    {tipoLancamento === "consumo" ? "USO" : "MOTIVO"}
                  </Label>
                  <Select
                    value={productFormData.motivo_perda}
                    onValueChange={(v) =>
                      setProductFormData((prev) => ({ ...prev, motivo_perda: v }))
                    }
                  >
                    <SelectTrigger className="h-9 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {currentMotivos.map((m) => (
                        <SelectItem key={m.value} value={m.value}>
                          {m.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {tipoLancamento === "perda" && (
                  <div>
                    <Label className="text-xs">RESOLUÇÃO</Label>
                    <Select
                      value={productFormData.tipo_resolucao}
                      onValueChange={(v) =>
                        setProductFormData((prev) => ({ ...prev, tipo_resolucao: v }))
                      }
                    >
                      <SelectTrigger className="h-9 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {TIPOS_RESOLUCAO.map((t) => (
                          <SelectItem key={t.value} value={t.value}>
                            {t.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>

              {productFormData.motivo_perda === "vencido" && (
                <div>
                  <Label className="text-xs">VENCIMENTO</Label>
                  <Input
                    type="date"
                    value={productFormData.data_vencimento}
                    onChange={(e) =>
                      setProductFormData((prev) => ({ ...prev, data_vencimento: e.target.value }))
                    }
                    required
                    className="h-9"
                  />
                </div>
              )}

              <Button
                onClick={addToCart}
                className="w-full h-10 font-bold"
                variant={tipoLancamento === "consumo" ? "default" : "destructive"}
              >
                ✓ ADICIONAR
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Edit Item Dialog */}
      <Dialog open={showEditItemDialog} onOpenChange={setShowEditItemDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Editar Item</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Quantidade</Label>
                <Input
                  type="text"
                  inputMode="decimal"
                  value={editItemData.quantidade_perdida}
                  onChange={(e) => {
                    const val = e.target.value.replace(/[^0-9,]/g, "");
                    setEditItemData((prev) => ({ ...prev, quantidade_perdida: val }));
                  }}
                />
              </div>
              <div>
                <Label>Preço Unitário</Label>
                <Input
                  type="text"
                  inputMode="decimal"
                  value={
                    typeof editItemData.preco_unitario === "number"
                      ? formatarPreco(editItemData.preco_unitario)
                      : editItemData.preco_unitario
                  }
                  onChange={(e) => {
                    const val = formatarInputPreco(e.target.value);
                    setEditItemData((prev) => ({ ...prev, preco_unitario: val }));
                  }}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Motivo</Label>
                <Select
                  value={editItemData.motivo_perda}
                  onValueChange={(v) => setEditItemData((prev) => ({ ...prev, motivo_perda: v }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {MOTIVOS_PERDA.map((m) => (
                      <SelectItem key={m.value} value={m.value}>
                        {m.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Resolução</Label>
                <Select
                  value={editItemData.tipo_resolucao}
                  onValueChange={(v) =>
                    setEditItemData((prev) => ({ ...prev, tipo_resolucao: v }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {TIPOS_RESOLUCAO.map((t) => (
                      <SelectItem key={t.value} value={t.value}>
                        {t.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            {editItemData.motivo_perda === "vencido" && (
              <div>
                <Label>Data de Vencimento *</Label>
                <Input
                  type="date"
                  value={editItemData.data_vencimento}
                  onChange={(e) =>
                    setEditItemData((prev) => ({ ...prev, data_vencimento: e.target.value }))
                  }
                  required
                />
              </div>
            )}
            <Button onClick={saveEditedItem} className="w-full">
              Salvar Alterações
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Lancamento Detail Dialog */}
      <Dialog open={showLancamentoDetail} onOpenChange={setShowLancamentoDetail}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Lançamento #{selectedLancamento?.numero}</DialogTitle>
          </DialogHeader>

          {selectedLancamento && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground">Data:</span>
                  <span className="ml-2">
                    {format(new Date(selectedLancamento.data_lancamento), "dd/MM/yyyy", {
                      locale: ptBR,
                    })}
                  </span>
                </div>
                <div>
                  <span className="text-muted-foreground">Responsável:</span>
                  <span className="ml-2">{selectedLancamento.usuario?.nome || "N/A"}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Itens:</span>
                  <span className="ml-2">
                    {lancamentoItems.reduce((sum, i) => sum + i.quantidade_perdida, 0)}
                  </span>
                </div>
                <div>
                  <span className="text-muted-foreground">Total:</span>
                  <span className="ml-2 font-bold text-destructive">
                    {formatCurrency(
                      lancamentoItems.reduce((sum, i) => sum + (i.valor_perda || 0), 0)
                    )}
                  </span>
                </div>
              </div>

              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Produto</TableHead>
                      <TableHead className="text-center">Qtd</TableHead>
                      <TableHead>Motivo</TableHead>
                      <TableHead>Resolução</TableHead>
                      <TableHead className="text-right">Valor</TableHead>
                      <TableHead className="w-20">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {lancamentoItems.map((item) => (
                      <TableRow key={item.id}>
                        <TableCell className="text-sm">{item.item?.nome_item || "N/A"}</TableCell>
                        <TableCell className="text-center">{item.quantidade_perdida}</TableCell>
                        <TableCell>
                          <Badge variant="outline">{getMotivoLabel(item.motivo_perda)}</Badge>
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={
                              item.tipo_resolucao === "sem_resolucao" ? "secondary" : "default"
                            }
                          >
                            {getResolucaoLabel(item.tipo_resolucao)}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right font-semibold text-destructive">
                          {formatCurrency(item.valor_perda || 0)}
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              onClick={() => editItem(item)}
                            >
                              <Edit className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              onClick={() => deleteItem(item.id)}
                            >
                              <Trash2 className="w-4 h-4 text-destructive" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => generateReport(selectedLancamento, lancamentoItems, "pdf")}
                >
                  <FileText className="w-4 h-4 mr-2" />
                  PDF
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => generateReport(selectedLancamento, lancamentoItems, "jpeg")}
                >
                  <Printer className="w-4 h-4 mr-2" />
                  Cupom
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default PerdasTab;
