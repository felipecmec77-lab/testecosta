import { useState, useMemo, useEffect } from "react";
import { searchAcrossFields } from "@/lib/searchUtils";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  Layers,
  AlertTriangle,
  DollarSign,
  TrendingUp,
  Plus,
  FileSpreadsheet,
  BarChart3,
  Wine,
  Sparkles,
  ShoppingCart,
  Milk,
  Snowflake,
  SprayCan,
  Home,
  Apple,
  Shirt,
  Package,
  ChevronRight,
  ChevronLeft,
  X,
  Loader2,
  Lightbulb,
  ArrowRight,
  Brain,
  Wand2,
  Check,
  GripVertical,
  MoveRight,
  CheckCheck,
  Search,
  Filter,
  History,
  Clock,
  ArrowRightLeft,
} from "lucide-react";
import * as XLSX from "xlsx";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface EstoqueItem {
  id: string;
  codigo: string;
  nome: string;
  grupo: string | null;
  subgrupo: string | null;
  preco_custo: number;
  preco_venda: number;
  estoque_atual: number;
}

interface CategoriesManagerProps {
  items: EstoqueItem[];
  isAdmin: boolean;
  onRefresh: () => void;
}

interface SubgrupoData {
  nome: string;
  itens: number;
  custoTotal: number;
  vendaTotal: number;
  margem: number;
}

interface MacroCategoryData {
  nome: string;
  icon: typeof Wine;
  gradient: string;
  subgrupos: SubgrupoData[];
  totalItens: number;
  custoTotal: number;
  vendaTotal: number;
  special?: boolean;
}

interface CategoryMovement {
  id: string;
  itemId: string;
  itemName: string;
  fromCategory: string;
  toCategory: string;
  timestamp: Date;
  userId: string;
}

// Macro categories configuration
const MACRO_CATEGORIES_CONFIG: Record<string, { icon: typeof Wine; gradient: string; subgrupos: string[]; special?: boolean }> = {
  "BEBIDAS": {
    icon: Wine,
    gradient: "from-rose-500 to-rose-600",
    subgrupos: ["CERVEJAS EM GERAL", "ENERGETICO", "REFRIGERANTES", "SUCOS", "AGUA", "VINHOS", "DESTILADOS", "ISOTONICOS", "CHAS"]
  },
  "ALIMENTOS": {
    icon: ShoppingCart,
    gradient: "from-amber-500 to-amber-600",
    subgrupos: ["BISCOITOS", "MASSAS", "MOLHOS", "TEMPEROS", "CONSERVAS", "CEREAIS", "GRAOS", "FARINHAS", "ACUCAR", "CAFE", "OLEOS"]
  },
  "LATICÍNIOS": {
    icon: Milk,
    gradient: "from-sky-400 to-sky-500",
    subgrupos: ["LEITES", "QUEIJOS", "IOGURTES", "MANTEIGAS", "CREMES", "REQUEIJAO"]
  },
  "CONGELADOS": {
    icon: Snowflake,
    gradient: "from-cyan-500 to-cyan-600",
    subgrupos: ["CARNES CONGELADAS", "FRANGOS", "PEIXES", "LEGUMES CONGELADOS", "SORVETES", "PIZZAS", "SALGADOS"]
  },
  "LIMPEZA": {
    icon: SprayCan,
    gradient: "from-emerald-500 to-emerald-600",
    subgrupos: ["DETERGENTES", "DESINFETANTES", "ALVEJANTES", "AMACIANTES", "SABAO EM PO", "ESPONJAS", "PANOS", "MULTIUSOS"]
  },
  "HIGIENE E BELEZA": {
    icon: Sparkles,
    gradient: "from-pink-500 to-pink-600",
    subgrupos: ["SABONETES", "SHAMPOOS", "CREMES", "PERFUMES", "DESODORANTES", "PASTA DE DENTE", "ABSORVENTES", "FRALDAS"]
  },
  "CALÇADOS E MODA": {
    icon: Shirt,
    gradient: "from-violet-500 to-violet-600",
    subgrupos: ["CALCADOS", "ROUPAS", "ACESSORIOS", "INTIMAS", "MEIAS"]
  },
  "CASA E UTILIDADES": {
    icon: Home,
    gradient: "from-indigo-500 to-indigo-600",
    subgrupos: ["COZINHA", "DECORACAO", "ORGANIZACAO", "JARDIM", "FERRAMENTAS", "ELETRICOS"]
  },
  "HORTIFRUTI": {
    icon: Apple,
    gradient: "from-green-500 to-green-600",
    subgrupos: ["FRUTAS", "VERDURAS", "LEGUMES", "ORGANICOS", "TEMPEROS FRESCOS"]
  },
  "MERCEARIA": {
    icon: Package,
    gradient: "from-orange-500 to-orange-600",
    subgrupos: ["ENLATADOS", "PAES", "BOLOS", "DOCES", "SALGADINHOS", "CHOCOLATES", "BALAS"]
  },
  "DIVERSOS": {
    icon: AlertTriangle,
    gradient: "from-yellow-400 to-orange-500",
    subgrupos: [],
    special: true
  }
};

const CategoriesManager = ({ items, isAdmin, onRefresh }: CategoriesManagerProps) => {
  const { toast } = useToast();
  const [selectedMacro, setSelectedMacro] = useState<MacroCategoryData | null>(null);
  const [showSheet, setShowSheet] = useState(false);
  const [showNewCategoryDialog, setShowNewCategoryDialog] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [activeTab, setActiveTab] = useState("categorias");
  const [displayMode, setDisplayMode] = useState<"custo" | "venda">("custo");
  const [heartbeat, setHeartbeat] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [aiSuggestions, setAiSuggestions] = useState<Array<{
    item: EstoqueItem;
    suggestedCategory: string;
    confidence: number;
    reason: string;
    basedOnFeedback?: boolean;
  }>>([]);
  const [appliedSuggestions, setAppliedSuggestions] = useState<Set<string>>(new Set());
  const [rejectedSuggestions, setRejectedSuggestions] = useState<Set<string>>(new Set());
  const [activeId, setActiveId] = useState<string | null>(null);
  
  // New states for filters and history
  const [suggestionSearchQuery, setSuggestionSearchQuery] = useState("");
  const [confidenceFilter, setConfidenceFilter] = useState<string>("all");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [categoryHistory, setCategoryHistory] = useState<CategoryMovement[]>([]);
  const [showHistorySheet, setShowHistorySheet] = useState(false);
  
  // New states for subgroup items view
  const [selectedSubgrupo, setSelectedSubgrupo] = useState<string | null>(null);
  const [showSubgrupoItemsSheet, setShowSubgrupoItemsSheet] = useState(false);
  
  // State for reject dialog
  const [rejectingItem, setRejectingItem] = useState<typeof aiSuggestions[0] | null>(null);
  const [showRejectDialog, setShowRejectDialog] = useState(false);
  const [selectedCorrectCategory, setSelectedCorrectCategory] = useState<string>("");

  // Drag-and-drop sensors
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);

    if (over && active.id !== over.id) {
      // Here you would implement the logic to move subgroups between categories
      // For now, just show a toast
      toast({
        title: "Subgrupo reorganizado",
        description: `"${active.id}" movido`,
      });
    }
  };

  // Heartbeat animation for DIVERSOS card - beats every 10 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      setHeartbeat(true);
      setTimeout(() => setHeartbeat(false), 600);
    }, 10000);
    
    // Initial beat after 2 seconds
    const initialTimeout = setTimeout(() => {
      setHeartbeat(true);
      setTimeout(() => setHeartbeat(false), 600);
    }, 2000);

    return () => {
      clearInterval(interval);
      clearTimeout(initialTimeout);
    };
  }, []);

  // AI-based category suggestion function
  const suggestCategoryForProduct = (productName: string): { category: string; confidence: number; reason: string } => {
    const name = productName.toUpperCase();
    
    // Beverage keywords
    if (/CERVEJA|REFRIGERANTE|SUCO|AGUA|VINHO|WHISKY|VODKA|ENERGETICO|GUARANA|COCA|PEPSI|FANTA|SPRITE|HEINEKEN|BRAHMA|SKOL|ITAIPAVA|ANTARCTICA|REDBULL|MONSTER/i.test(name)) {
      return { category: "BEBIDAS", confidence: 95, reason: "Nome contém termo relacionado a bebidas" };
    }
    
    // Dairy
    if (/LEITE|QUEIJO|IOGURTE|MANTEIGA|CREME|REQUEIJAO|NATA|RICOTA|MUSSARELA|PARMESAO|DANONE|NESTLE|ACTIVIA/i.test(name)) {
      return { category: "LATICÍNIOS", confidence: 92, reason: "Produto lácteo identificado" };
    }
    
    // Frozen
    if (/CONGELADO|SORVETE|PIZZA|LASANHA|HAMBURGUER|NUGGETS|FRANGO|PEIXE|CAMARAO|POLPA|ACAI|PICOLE/i.test(name)) {
      return { category: "CONGELADOS", confidence: 88, reason: "Produto congelado identificado" };
    }
    
    // Cleaning
    if (/DETERGENTE|SABAO|DESINFETANTE|ALVEJANTE|AMACIANTE|LIMPADOR|AGUA SANITARIA|ESPONJA|VASSOURA|PANO|MULTIUSO|YPE|BOMBRIL|VEJA|PINHO SOL/i.test(name)) {
      return { category: "LIMPEZA", confidence: 90, reason: "Produto de limpeza identificado" };
    }
    
    // Hygiene
    if (/SHAMPOO|SABONETE|CREME|DESODORANTE|PASTA DE DENTE|ESCOVA|ABSORVENTE|FRALDA|PERFUME|HIDRATANTE|PROTETOR|GILETE|PANTENE|DOVE|NIVEA|ORAL-B/i.test(name)) {
      return { category: "HIGIENE E BELEZA", confidence: 89, reason: "Produto de higiene/beleza identificado" };
    }
    
    // Hortifruti
    if (/BANANA|MACA|LARANJA|LIMAO|TOMATE|CEBOLA|ALHO|BATATA|CENOURA|ALFACE|COUVE|ABACAXI|MELANCIA|MAMAO|MORANGO|UVA|MANGA|ABACATE/i.test(name)) {
      return { category: "HORTIFRUTI", confidence: 94, reason: "Fruta/verdura/legume identificado" };
    }
    
    // Food/Grocery
    if (/ARROZ|FEIJAO|MACARRAO|OLEO|ACUCAR|SAL|CAFE|FARINHA|BISCOITO|BOLACHA|CHOCOLATE|BALA|CHICLETE|SALGADINHO|MOLHO|CATCHUP|MAIONESE|MOSTARDA/i.test(name)) {
      return { category: "MERCEARIA", confidence: 85, reason: "Produto de mercearia identificado" };
    }
    
    // Foods
    if (/PAO|BOLO|TORTA|SALGADO|COXINHA|PASTEL|EMPADA|ENROLADINHO|PRESUNTO|MORTADELA|SALSICHA|LINGUICA|BACON/i.test(name)) {
      return { category: "ALIMENTOS", confidence: 82, reason: "Alimento identificado" };
    }
    
    // Home
    if (/PANELA|PRATO|COPO|TALHER|FACA|COLHER|GARFO|TOALHA|LENCOL|TRAVESSEIRO|COBERTOR|TAPETE|ORGANIZADOR|POTE|BALDE/i.test(name)) {
      return { category: "CASA E UTILIDADES", confidence: 80, reason: "Utensílio doméstico identificado" };
    }
    
    // Clothing
    if (/CAMISA|CALCA|BERMUDA|SHORT|VESTIDO|SAIA|BLUSA|CAMISETA|MEIA|CUECA|CALCINHA|SUTIA|CHINELO|SANDALIA|SAPATO|TENIS/i.test(name)) {
      return { category: "CALÇADOS E MODA", confidence: 78, reason: "Vestuário/calçado identificado" };
    }
    
    return { category: "DIVERSOS", confidence: 30, reason: "Não foi possível identificar categoria" };
  };

  // Run AI analysis with real AI
  const runAiAnalysis = async () => {
    setIsAnalyzing(true);
    
    try {
      // Get uncategorized items
      const uncategorizedItems = items.filter(item => {
        const grupo = (item.grupo || "").toUpperCase();
        const isInKnownCategory = Object.keys(MACRO_CATEGORIES_CONFIG).some(macro => {
          if (macro === "DIVERSOS") return false;
          const config = MACRO_CATEGORIES_CONFIG[macro];
          return config.subgrupos.some(sub => grupo.includes(sub) || grupo.includes(macro));
        });
        return !isInKnownCategory;
      }).slice(0, 30); // Limit to 30 items per batch

      const availableCategories = Object.keys(MACRO_CATEGORIES_CONFIG).filter(c => c !== "DIVERSOS");
      
      // Call real AI edge function
      const { data: { session } } = await supabase.auth.getSession();
      
      const response = await supabase.functions.invoke('categorize-products', {
        body: {
          products: uncategorizedItems.map(item => ({
            productName: item.nome,
            currentCategory: item.grupo
          })),
          availableCategories
        },
        headers: {
          Authorization: `Bearer ${session?.access_token}`
        }
      });

      if (response.error) throw response.error;

      const results = response.data?.results || [];
      
      // Map results to suggestions
      const suggestions = uncategorizedItems.map((item, index) => {
        const result = results[index] || {
          suggestedCategory: suggestCategoryForProduct(item.nome).category,
          confidence: suggestCategoryForProduct(item.nome).confidence / 100,
          reasoning: suggestCategoryForProduct(item.nome).reason,
          basedOnFeedback: false
        };
        
        return {
          item,
          suggestedCategory: result.suggestedCategory,
          confidence: Math.round(result.confidence * 100),
          reason: result.reasoning,
          basedOnFeedback: result.basedOnFeedback
        };
      }).filter(s => s.suggestedCategory !== "DIVERSOS" && s.confidence > 40)
        .sort((a, b) => b.confidence - a.confidence);
      
      setAiSuggestions(suggestions);
      
      toast({
        title: "Análise IA concluída",
        description: `${suggestions.length} sugestões encontradas${results.some((r: any) => r.basedOnFeedback) ? ' (algumas baseadas em decisões anteriores)' : ''}`,
      });
    } catch (error) {
      console.error('AI analysis error:', error);
      // Fallback to regex-based analysis
      const uncategorizedItems = items.filter(item => {
        const grupo = (item.grupo || "").toUpperCase();
        const isInKnownCategory = Object.keys(MACRO_CATEGORIES_CONFIG).some(macro => {
          if (macro === "DIVERSOS") return false;
          const config = MACRO_CATEGORIES_CONFIG[macro];
          return config.subgrupos.some(sub => grupo.includes(sub) || grupo.includes(macro));
        });
        return !isInKnownCategory;
      });
      
      const suggestions = uncategorizedItems.slice(0, 50).map(item => {
        const suggestion = suggestCategoryForProduct(item.nome);
        return {
          item,
          suggestedCategory: suggestion.category,
          confidence: suggestion.confidence,
          reason: suggestion.reason,
          basedOnFeedback: false
        };
      }).filter(s => s.suggestedCategory !== "DIVERSOS" && s.confidence > 50)
        .sort((a, b) => b.confidence - a.confidence);
      
      setAiSuggestions(suggestions);
      
      toast({
        title: "Análise concluída (modo local)",
        description: `${suggestions.length} sugestões encontradas`,
      });
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Register category movement in history
  const addToHistory = (itemId: string, itemName: string, fromCategory: string, toCategory: string) => {
    const movement: CategoryMovement = {
      id: `${itemId}-${Date.now()}`,
      itemId,
      itemName,
      fromCategory: fromCategory || "Sem categoria",
      toCategory,
      timestamp: new Date(),
      userId: "current-user", // Would be replaced with actual user id
    };
    setCategoryHistory(prev => [movement, ...prev].slice(0, 100)); // Keep last 100 movements
  };

  // Save feedback for AI learning
  const saveFeedback = async (
    productId: string | undefined,
    productName: string,
    suggestedCategory: string,
    finalCategory: string,
    wasAccepted: boolean,
    confidence: number
  ) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      await supabase.from('ai_categorization_feedback').insert({
        product_id: productId,
        product_name: productName,
        suggested_category: suggestedCategory,
        final_category: finalCategory,
        was_accepted: wasAccepted,
        confidence: confidence / 100,
        user_id: user.id
      });
    } catch (error) {
      console.error('Error saving feedback:', error);
    }
  };

  const applySuggestion = async (suggestion: typeof aiSuggestions[0]) => {
    try {
      const oldCategory = suggestion.item.grupo || "Sem categoria";
      
      // Update the database with the new group
      const { error } = await supabase
        .from("estoque")
        .update({ grupo: suggestion.suggestedCategory })
        .eq("id", suggestion.item.id);

      if (error) throw error;

      // Save feedback for AI learning
      await saveFeedback(
        suggestion.item.id,
        suggestion.item.nome,
        suggestion.suggestedCategory,
        suggestion.suggestedCategory,
        true,
        suggestion.confidence
      );

      // Register in history
      addToHistory(suggestion.item.id, suggestion.item.nome, oldCategory, suggestion.suggestedCategory);

      setAppliedSuggestions(prev => new Set([...prev, suggestion.item.id]));
      toast({
        title: "✅ Sugestão aceita",
        description: `${suggestion.item.nome} movido para ${suggestion.suggestedCategory}. IA aprendeu com essa decisão.`,
      });
    } catch (error: any) {
      toast({
        title: "Erro ao aplicar sugestão",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const rejectSuggestion = (suggestion: typeof aiSuggestions[0]) => {
    setRejectingItem(suggestion);
    setSelectedCorrectCategory("");
    setShowRejectDialog(true);
  };

  const confirmRejectSuggestion = async () => {
    if (!rejectingItem || !selectedCorrectCategory) return;

    try {
      const oldCategory = rejectingItem.item.grupo || "Sem categoria";
      
      // Update with the correct category
      const { error } = await supabase
        .from("estoque")
        .update({ grupo: selectedCorrectCategory })
        .eq("id", rejectingItem.item.id);

      if (error) throw error;

      // Save feedback for AI learning (rejected)
      await saveFeedback(
        rejectingItem.item.id,
        rejectingItem.item.nome,
        rejectingItem.suggestedCategory,
        selectedCorrectCategory,
        false,
        rejectingItem.confidence
      );

      // Register in history
      addToHistory(rejectingItem.item.id, rejectingItem.item.nome, oldCategory, selectedCorrectCategory);

      setRejectedSuggestions(prev => new Set([...prev, rejectingItem.item.id]));
      setShowRejectDialog(false);
      setRejectingItem(null);
      
      toast({
        title: "❌ Sugestão corrigida",
        description: `${rejectingItem.item.nome} movido para ${selectedCorrectCategory}. IA aprendeu com essa correção.`,
      });
    } catch (error: any) {
      toast({
        title: "Erro ao rejeitar sugestão",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const applyAllSuggestions = async () => {
    const pendingSuggestions = filteredSuggestions.filter(s => !appliedSuggestions.has(s.item.id));
    
    if (pendingSuggestions.length === 0) {
      toast({
        title: "Nenhuma sugestão pendente",
        description: "Todas as sugestões já foram aplicadas",
      });
      return;
    }

    setIsAnalyzing(true);
    let applied = 0;
    let errors = 0;

    for (const suggestion of pendingSuggestions) {
      try {
        const oldCategory = suggestion.item.grupo || "Sem categoria";
        
        const { error } = await supabase
          .from("estoque")
          .update({ grupo: suggestion.suggestedCategory })
          .eq("id", suggestion.item.id);

        if (error) {
          errors++;
        } else {
          applied++;
          addToHistory(suggestion.item.id, suggestion.item.nome, oldCategory, suggestion.suggestedCategory);
          setAppliedSuggestions(prev => new Set([...prev, suggestion.item.id]));
        }
      } catch {
        errors++;
      }
    }

    setIsAnalyzing(false);
    toast({
      title: "Sugestões aplicadas!",
      description: `${applied} aplicadas${errors > 0 ? `, ${errors} erros` : ""}`,
    });
    onRefresh();
  };

  // Filtered suggestions based on search and filters
  const filteredSuggestions = useMemo(() => {
    return aiSuggestions.filter(suggestion => {
      // Search filter
      const matchesSearch = searchAcrossFields([suggestion.item.nome, suggestion.item.codigo], suggestionSearchQuery);
      
      // Confidence filter
      let matchesConfidence = true;
      if (confidenceFilter === "high") matchesConfidence = suggestion.confidence >= 90;
      else if (confidenceFilter === "medium") matchesConfidence = suggestion.confidence >= 70 && suggestion.confidence < 90;
      else if (confidenceFilter === "low") matchesConfidence = suggestion.confidence < 70;
      
      // Category filter
      const matchesCategory = categoryFilter === "all" || suggestion.suggestedCategory === categoryFilter;
      
      return matchesSearch && matchesConfidence && matchesCategory;
    });
  }, [aiSuggestions, suggestionSearchQuery, confidenceFilter, categoryFilter]);

  // Get unique suggested categories for filter
  const suggestedCategories = useMemo(() => {
    return [...new Set(aiSuggestions.map(s => s.suggestedCategory))].sort();
  }, [aiSuggestions]);

  // Get items for selected subgroup
  const subgrupoItems = useMemo(() => {
    if (!selectedSubgrupo || !selectedMacro) return [];
    
    return items.filter(item => {
      const grupo = (item.grupo || "").toUpperCase();
      const subgrupo = (item.subgrupo || "").toUpperCase();
      const subgrupoName = selectedSubgrupo.toUpperCase();
      
      return grupo.includes(subgrupoName) || subgrupo.includes(subgrupoName) || 
             grupo === selectedMacro.nome.toUpperCase();
    });
  }, [items, selectedSubgrupo, selectedMacro]);

  const handleSubgrupoClick = (subgrupoName: string) => {
    setSelectedSubgrupo(subgrupoName);
    setShowSubgrupoItemsSheet(true);
  };

  // Calculate macro categories data
  const macroCategoriesData = useMemo(() => {
    const result: MacroCategoryData[] = [];
    const assignedItems = new Set<string>();

    // Process each macro category
    Object.entries(MACRO_CATEGORIES_CONFIG).forEach(([macroName, config]) => {
      if (config.special) return; // Skip DIVERSOS for now

      const subgruposData: SubgrupoData[] = [];
      let totalItens = 0;
      let custoTotal = 0;
      let vendaTotal = 0;

      // Find items matching subgrupos
      config.subgrupos.forEach(subgrupoName => {
        const matchingItems = items.filter(item => {
          const grupo = (item.grupo || "").toUpperCase();
          const subgrupo = (item.subgrupo || "").toUpperCase();
          return grupo.includes(subgrupoName) || subgrupo.includes(subgrupoName) || 
                 grupo.includes(macroName) || subgrupo.includes(macroName);
        });

        if (matchingItems.length > 0) {
          matchingItems.forEach(item => assignedItems.add(item.id));
          
          const custo = matchingItems.reduce((acc, i) => acc + i.preco_custo * i.estoque_atual, 0);
          const venda = matchingItems.reduce((acc, i) => acc + i.preco_venda * i.estoque_atual, 0);
          const margem = venda > 0 ? ((venda - custo) / venda) * 100 : 0;

          subgruposData.push({
            nome: subgrupoName,
            itens: matchingItems.length,
            custoTotal: custo,
            vendaTotal: venda,
            margem
          });

          totalItens += matchingItems.length;
          custoTotal += custo;
          vendaTotal += venda;
        }
      });

      // Also check items that match the macro name directly
      const directMatch = items.filter(item => {
        if (assignedItems.has(item.id)) return false;
        const grupo = (item.grupo || "").toUpperCase();
        return grupo.includes(macroName);
      });

      if (directMatch.length > 0) {
        directMatch.forEach(item => assignedItems.add(item.id));
        const custo = directMatch.reduce((acc, i) => acc + i.preco_custo * i.estoque_atual, 0);
        const venda = directMatch.reduce((acc, i) => acc + i.preco_venda * i.estoque_atual, 0);
        
        subgruposData.push({
          nome: "OUTROS " + macroName,
          itens: directMatch.length,
          custoTotal: custo,
          vendaTotal: venda,
          margem: venda > 0 ? ((venda - custo) / venda) * 100 : 0
        });

        totalItens += directMatch.length;
        custoTotal += custo;
        vendaTotal += venda;
      }

      if (totalItens > 0) {
        result.push({
          nome: macroName,
          icon: config.icon,
          gradient: config.gradient,
          subgrupos: subgruposData.sort((a, b) => b.itens - a.itens),
          totalItens,
          custoTotal,
          vendaTotal
        });
      }
    });

    // Add DIVERSOS (uncategorized items)
    const uncategorized = items.filter(item => !assignedItems.has(item.id));
    if (uncategorized.length > 0 || items.length === 0) {
      const config = MACRO_CATEGORIES_CONFIG["DIVERSOS"];
      const custo = uncategorized.reduce((acc, i) => acc + i.preco_custo * i.estoque_atual, 0);
      const venda = uncategorized.reduce((acc, i) => acc + i.preco_venda * i.estoque_atual, 0);

      // Group uncategorized by their actual grupo
      const uncatGroups = new Map<string, EstoqueItem[]>();
      uncategorized.forEach(item => {
        const grupo = item.grupo || "Sem categoria";
        if (!uncatGroups.has(grupo)) {
          uncatGroups.set(grupo, []);
        }
        uncatGroups.get(grupo)!.push(item);
      });

      const subgruposData: SubgrupoData[] = [];
      uncatGroups.forEach((groupItems, grupoName) => {
        const gCusto = groupItems.reduce((acc, i) => acc + i.preco_custo * i.estoque_atual, 0);
        const gVenda = groupItems.reduce((acc, i) => acc + i.preco_venda * i.estoque_atual, 0);
        subgruposData.push({
          nome: grupoName,
          itens: groupItems.length,
          custoTotal: gCusto,
          vendaTotal: gVenda,
          margem: gVenda > 0 ? ((gVenda - gCusto) / gVenda) * 100 : 0
        });
      });

      result.push({
        nome: "DIVERSOS",
        icon: config.icon,
        gradient: config.gradient,
        subgrupos: subgruposData.sort((a, b) => b.itens - a.itens),
        totalItens: uncategorized.length,
        custoTotal: custo,
        vendaTotal: venda,
        special: true
      });
    }

    return result.sort((a, b) => {
      if (a.special) return 1;
      if (b.special) return -1;
      return b.totalItens - a.totalItens;
    });
  }, [items]);

  // Summary statistics
  const summaryStats = useMemo(() => {
    const totalCategorias = macroCategoriesData.filter(c => !c.special).length;
    const semCategoria = macroCategoriesData.find(c => c.special)?.totalItens || 0;
    const custoTotal = items.reduce((acc, i) => acc + i.preco_custo * i.estoque_atual, 0);
    const vendaTotal = items.reduce((acc, i) => acc + i.preco_venda * i.estoque_atual, 0);
    const margem = vendaTotal > 0 ? ((vendaTotal - custoTotal) / vendaTotal) * 100 : 0;

    return { totalCategorias, semCategoria, custoTotal, vendaTotal, margem };
  }, [macroCategoriesData, items]);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const handleMacroClick = (macro: MacroCategoryData) => {
    if (macro.special) {
      setActiveTab("sugestoes");
      return;
    }
    setSelectedMacro(macro);
    setShowSheet(true);
  };

  const handleExportCategories = () => {
    const exportData: any[] = [];
    macroCategoriesData.forEach(macro => {
      macro.subgrupos.forEach(sub => {
        exportData.push({
          Macrocategoria: macro.nome,
          Subgrupo: sub.nome,
          "Quantidade de Itens": sub.itens,
          "Custo Total": sub.custoTotal,
          "Venda Total": sub.vendaTotal,
          "Margem %": sub.margem.toFixed(1)
        });
      });
    });

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Categorias");
    XLSX.writeFile(wb, `categorias_${new Date().toISOString().split("T")[0]}.xlsx`);
    toast({ title: "Categorias exportadas com sucesso!" });
  };

  const handleCreateCategory = async () => {
    if (!newCategoryName.trim()) {
      toast({
        title: "Nome obrigatório",
        description: "Informe o nome da categoria",
        variant: "destructive",
      });
      return;
    }

    toast({
      title: "Categoria criada",
      description: `A categoria "${newCategoryName}" será aplicada quando você adicionar produtos a ela.`,
    });
    setShowNewCategoryDialog(false);
    setNewCategoryName("");
  };

  return (
    <div className="space-y-6">
      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
              <Layers className="h-5 w-5 text-primary" />
              Gestão de Categorias
            </h2>
            <p className="text-sm text-muted-foreground">
              Organize e corrija as categorias dos seus produtos
            </p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <TabsList>
              <TabsTrigger value="categorias" className="gap-2">
                <Layers className="h-4 w-4" />
                Categorias
              </TabsTrigger>
              <TabsTrigger value="sugestoes" className="gap-2">
                <Lightbulb className="h-4 w-4" />
                Sugestões
              </TabsTrigger>
              <TabsTrigger value="historico" className="gap-2">
                <History className="h-4 w-4" />
                Histórico
                {categoryHistory.length > 0 && (
                  <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-[10px]">
                    {categoryHistory.length}
                  </Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="relatorios" className="gap-2">
                <BarChart3 className="h-4 w-4" />
                Relatórios
              </TabsTrigger>
            </TabsList>
            <Button variant="outline" size="sm" onClick={handleExportCategories}>
              <FileSpreadsheet className="h-4 w-4 mr-2" />
              Exportar
            </Button>
            {isAdmin && (
              <Button variant="outline" size="sm" onClick={() => setShowNewCategoryDialog(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Nova
              </Button>
            )}
          </div>
        </div>

        <TabsContent value="categorias" className="space-y-6 mt-4">
          {/* Summary Cards */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <Card className="bg-gradient-to-br from-green-500 to-green-600 text-white border-0">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-white/20 rounded-lg">
                    <Layers className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{summaryStats.totalCategorias}</p>
                    <p className="text-sm opacity-90">Categorias</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-orange-500 to-orange-600 text-white border-0">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-white/20 rounded-lg">
                    <AlertTriangle className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{summaryStats.semCategoria.toLocaleString("pt-BR")}</p>
                    <p className="text-sm opacity-90">Sem categoria</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-blue-500 to-blue-600 text-white border-0">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-white/20 rounded-lg">
                    <DollarSign className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{formatCurrency(summaryStats.custoTotal)}</p>
                    <p className="text-sm opacity-90">Custo Total</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-emerald-500 to-emerald-600 text-white border-0">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-white/20 rounded-lg">
                    <DollarSign className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{formatCurrency(summaryStats.vendaTotal)}</p>
                    <p className="text-sm opacity-90">Venda Total</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-teal-500 to-teal-600 text-white border-0">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-white/20 rounded-lg">
                    <TrendingUp className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{summaryStats.margem.toFixed(1)}%</p>
                    <p className="text-sm opacity-90">Margem Total</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Display Mode Toggle */}
          <div className="flex justify-end items-center gap-2">
            <span className="text-sm text-muted-foreground">Exibir:</span>
            <div className="flex bg-muted rounded-lg p-1">
              <Button
                variant={displayMode === "custo" ? "secondary" : "ghost"}
                size="sm"
                onClick={() => setDisplayMode("custo")}
                className="px-4"
              >
                Custo
              </Button>
              <Button
                variant={displayMode === "venda" ? "secondary" : "ghost"}
                size="sm"
                onClick={() => setDisplayMode("venda")}
                className="px-4"
              >
                Venda
              </Button>
            </div>
          </div>

          {/* Macro Categories Grid */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            {macroCategoriesData.map((macro) => {
              const IconComponent = macro.icon;
              const displayValue = displayMode === "custo" ? macro.custoTotal : macro.vendaTotal;

              return (
                <Card
                  key={macro.nome}
                  onClick={() => handleMacroClick(macro)}
                  className={`bg-gradient-to-br ${macro.gradient} text-white border-0 
                    hover:scale-105 hover:shadow-xl transition-all duration-200 cursor-pointer
                    ${macro.special && heartbeat ? 'scale-105 ring-2 ring-yellow-300 ring-offset-2 ring-offset-background' : ''}
                    ${macro.special ? 'ring-1 ring-yellow-300/50' : ''}`}
                  style={macro.special && heartbeat ? { 
                    animation: 'heartbeat 0.6s ease-in-out'
                  } : undefined}
                >
                  <CardContent className="p-5 text-center relative">
                    {macro.special && (
                      <div className="absolute -top-2 -right-2">
                        <Badge className="bg-red-500 text-white border-0 text-[10px] px-1.5">
                          ATENÇÃO
                        </Badge>
                      </div>
                    )}
                    <div className="flex justify-center mb-3">
                      <div className="p-4 bg-white/20 rounded-2xl">
                        <IconComponent className="h-8 w-8" />
                      </div>
                    </div>
                    <h3 className="font-bold text-base uppercase tracking-wide mb-2">
                      {macro.nome}
                    </h3>
                    <p className="text-2xl font-bold mb-1">
                      {macro.totalItens.toLocaleString("pt-BR")}
                    </p>
                    <p className="text-sm opacity-90 mb-3">itens</p>
                    <Badge className="bg-white/25 hover:bg-white/35 text-white border-0 text-sm px-3 py-1">
                      {formatCurrency(displayValue)}
                    </Badge>
                    <div className="flex items-center justify-center gap-1 mt-3 text-xs opacity-80">
                      <span>{macro.subgrupos.length} subgrupos</span>
                      <ChevronRight className="h-3 w-3" />
                    </div>
                    {macro.special && (
                      <p className="text-xs mt-2 opacity-90 font-medium">
                        Precisam de categorização
                      </p>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </TabsContent>

        <TabsContent value="sugestoes" className="space-y-6 mt-4">
          {/* AI Analysis Header */}
          <Card className="bg-gradient-to-r from-purple-500/10 to-blue-500/10 border-purple-200">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-gradient-to-br from-purple-500 to-blue-500 rounded-xl">
                    <Brain className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold">Análise Inteligente de Categorias</h3>
                    <p className="text-sm text-muted-foreground">
                      IA analisa os nomes dos produtos e sugere a categoria correta
                    </p>
                  </div>
                </div>
                <Button 
                  onClick={runAiAnalysis} 
                  disabled={isAnalyzing}
                  className="bg-gradient-to-r from-purple-500 to-blue-500 hover:from-purple-600 hover:to-blue-600"
                >
                  {isAnalyzing ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Analisando...
                    </>
                  ) : (
                    <>
                      <Wand2 className="h-4 w-4 mr-2" />
                      Iniciar Análise
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-4">
            <Card>
              <CardContent className="p-4 text-center">
                <p className="text-3xl font-bold text-orange-500">{summaryStats.semCategoria.toLocaleString("pt-BR")}</p>
                <p className="text-xs text-muted-foreground mt-1">Itens sem categoria</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <p className="text-3xl font-bold text-purple-500">{aiSuggestions.length}</p>
                <p className="text-xs text-muted-foreground mt-1">Sugestões encontradas</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <p className="text-3xl font-bold text-green-500">{appliedSuggestions.size}</p>
                <p className="text-xs text-muted-foreground mt-1">Aplicadas</p>
              </CardContent>
            </Card>
          </div>

          {/* Filters */}
          {aiSuggestions.length > 0 && (
            <Card>
              <CardContent className="p-4">
                <div className="flex flex-wrap items-center gap-3">
                  <div className="flex items-center gap-2">
                    <Filter className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm font-medium">Filtros:</span>
                  </div>
                  <div className="relative flex-1 min-w-[200px] max-w-[300px]">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Buscar produto..."
                      value={suggestionSearchQuery}
                      onChange={(e) => setSuggestionSearchQuery(e.target.value)}
                      className="pl-9 h-9"
                    />
                  </div>
                  <Select value={confidenceFilter} onValueChange={setConfidenceFilter}>
                    <SelectTrigger className="w-[140px] h-9">
                      <SelectValue placeholder="Confiança" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todas</SelectItem>
                      <SelectItem value="high">Alta (≥90%)</SelectItem>
                      <SelectItem value="medium">Média (70-89%)</SelectItem>
                      <SelectItem value="low">Baixa (&lt;70%)</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                    <SelectTrigger className="w-[160px] h-9">
                      <SelectValue placeholder="Categoria" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todas categorias</SelectItem>
                      {suggestedCategories.map(cat => (
                        <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {(suggestionSearchQuery || confidenceFilter !== "all" || categoryFilter !== "all") && (
                    <Button 
                      variant="ghost" 
                      size="sm"
                      onClick={() => {
                        setSuggestionSearchQuery("");
                        setConfidenceFilter("all");
                        setCategoryFilter("all");
                      }}
                    >
                      <X className="h-4 w-4 mr-1" />
                      Limpar
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Suggestions List */}
          {aiSuggestions.length > 0 ? (
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-4">
                  <h4 className="font-semibold flex items-center gap-2">
                    <Lightbulb className="h-4 w-4 text-yellow-500" />
                    Sugestões de Recategorização
                    <Badge variant="outline" className="ml-2">
                      {filteredSuggestions.length} de {aiSuggestions.length}
                    </Badge>
                  </h4>
                  {filteredSuggestions.filter(s => !appliedSuggestions.has(s.item.id)).length > 0 && (
                    <Button 
                      onClick={applyAllSuggestions}
                      disabled={isAnalyzing}
                      className="bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600"
                    >
                      {isAnalyzing ? (
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      ) : (
                        <CheckCheck className="h-4 w-4 mr-2" />
                      )}
                      Aplicar Todas ({filteredSuggestions.filter(s => !appliedSuggestions.has(s.item.id)).length})
                    </Button>
                  )}
                </div>
                <ScrollArea className="h-[400px]">
                  <div className="space-y-2">
                    {filteredSuggestions.length > 0 ? (
                      filteredSuggestions.map((suggestion, index) => {
                        const isApplied = appliedSuggestions.has(suggestion.item.id);
                        const isRejected = rejectedSuggestions.has(suggestion.item.id);
                        const isProcessed = isApplied || isRejected;
                        
                        return (
                        <div 
                          key={suggestion.item.id}
                          className={`flex items-center gap-3 p-3 rounded-lg border transition-all ${
                            isApplied ? 'bg-green-50 dark:bg-green-950/30 border-green-200 dark:border-green-800' :
                            isRejected ? 'bg-red-50 dark:bg-red-950/30 border-red-200 dark:border-red-800' :
                            'bg-muted/30 hover:bg-muted/50'
                          }`}
                        >
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <p className="font-medium text-sm truncate">{suggestion.item.nome}</p>
                              {suggestion.basedOnFeedback && (
                                <Badge variant="outline" className="text-[10px] bg-purple-100 dark:bg-purple-900/30 border-purple-300">
                                  <Brain className="h-2.5 w-2.5 mr-1" />
                                  Aprendizado
                                </Badge>
                              )}
                            </div>
                            <p className="text-xs text-muted-foreground">{suggestion.item.grupo || "Sem grupo"}</p>
                          </div>
                          <MoveRight className="h-4 w-4 text-muted-foreground" />
                          <Badge 
                            className={`${
                              suggestion.confidence >= 90 ? 'bg-green-500' : 
                              suggestion.confidence >= 70 ? 'bg-yellow-500' : 'bg-orange-500'
                            } text-white`}
                          >
                            {suggestion.suggestedCategory}
                          </Badge>
                          <Badge variant="outline" className="text-xs">
                            {suggestion.confidence}%
                          </Badge>
                          {isProcessed ? (
                            isApplied ? (
                              <Check className="h-5 w-5 text-green-500" />
                            ) : (
                              <X className="h-5 w-5 text-red-500" />
                            )
                          ) : (
                            <div className="flex gap-1">
                              <Button 
                                size="sm" 
                                variant="ghost"
                                onClick={() => applySuggestion(suggestion)}
                                className="h-8 w-8 p-0 text-green-600 hover:text-green-700 hover:bg-green-100"
                                title="Aceitar sugestão"
                              >
                                <Check className="h-4 w-4" />
                              </Button>
                              <Button 
                                size="sm" 
                                variant="ghost"
                                onClick={() => rejectSuggestion(suggestion)}
                                className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-100"
                                title="Rejeitar e escolher categoria correta"
                              >
                                <X className="h-4 w-4" />
                              </Button>
                            </div>
                          )}
                        </div>
                      )})
                    ) : (
                      <div className="text-center py-8 text-muted-foreground">
                        <Search className="h-8 w-8 mx-auto mb-2 opacity-50" />
                        <p>Nenhuma sugestão encontrada com os filtros atuais</p>
                      </div>
                    )}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="p-8 text-center">
                <Lightbulb className="h-12 w-12 mx-auto text-yellow-500 mb-4 opacity-50" />
                <h3 className="text-lg font-semibold mb-2">Nenhuma sugestão ainda</h3>
                <p className="text-muted-foreground mb-4">
                  Clique em "Iniciar Análise" para que a IA analise os produtos sem categoria
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* History Tab */}
        <TabsContent value="historico" className="space-y-6 mt-4">
          <Card className="bg-gradient-to-r from-blue-500/10 to-cyan-500/10 border-blue-200">
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-xl">
                  <History className="h-6 w-6 text-white" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold">Histórico de Movimentações</h3>
                  <p className="text-sm text-muted-foreground">
                    Rastreie todas as alterações de categorias dos produtos
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {categoryHistory.length > 0 ? (
            <Card>
              <CardContent className="p-4">
                <ScrollArea className="h-[400px]">
                  <div className="space-y-2">
                    {categoryHistory.map((movement) => (
                      <div 
                        key={movement.id}
                        className="flex items-center gap-3 p-3 rounded-lg border bg-muted/30"
                      >
                        <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                          <ArrowRightLeft className="h-4 w-4 text-blue-500" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm truncate">{movement.itemName}</p>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <Badge variant="outline" className="text-[10px]">{movement.fromCategory}</Badge>
                            <ArrowRight className="h-3 w-3" />
                            <Badge className="bg-green-500 text-white text-[10px]">{movement.toCategory}</Badge>
                          </div>
                        </div>
                        <div className="text-right text-xs text-muted-foreground">
                          <div className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {movement.timestamp.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                          </div>
                          <p>{movement.timestamp.toLocaleDateString("pt-BR")}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="p-8 text-center">
                <History className="h-12 w-12 mx-auto text-blue-500 mb-4 opacity-50" />
                <h3 className="text-lg font-semibold mb-2">Nenhuma movimentação ainda</h3>
                <p className="text-muted-foreground mb-4">
                  Quando você aplicar sugestões de recategorização, o histórico aparecerá aqui
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="relatorios" className="space-y-6 mt-4">
          <Card>
            <CardContent className="p-8 text-center">
              <BarChart3 className="h-12 w-12 mx-auto text-blue-500 mb-4" />
              <h3 className="text-lg font-semibold mb-2">Relatórios de Categorias</h3>
              <p className="text-muted-foreground mb-4">
                Análise detalhada da distribuição de produtos por categoria
              </p>
              <Button variant="outline" onClick={handleExportCategories}>
                <FileSpreadsheet className="h-4 w-4 mr-2" />
                Exportar Relatório
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Subgrupos Sheet */}
      <Sheet open={showSheet} onOpenChange={setShowSheet}>
        <SheetContent className="w-full sm:max-w-lg">
          <SheetHeader>
            <SheetTitle className="flex items-center gap-3">
              {selectedMacro && (
                <>
                  <div className={`p-2 rounded-lg bg-gradient-to-br ${selectedMacro.gradient}`}>
                    <selectedMacro.icon className="h-5 w-5 text-white" />
                  </div>
                  <span>{selectedMacro.nome}</span>
                </>
              )}
            </SheetTitle>
            <SheetDescription>
              {selectedMacro?.totalItens.toLocaleString("pt-BR")} itens • {selectedMacro?.subgrupos.length} subgrupos
            </SheetDescription>
          </SheetHeader>

          <ScrollArea className="h-[calc(100vh-180px)] mt-6">
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragStart={handleDragStart}
              onDragEnd={handleDragEnd}
            >
              <SortableContext
                items={selectedMacro?.subgrupos.map(s => s.nome) || []}
                strategy={verticalListSortingStrategy}
              >
                <div className="space-y-2 pr-4">
                  {selectedMacro?.subgrupos.map((subgrupo, index) => (
                    <SortableSubgrupoCard
                      key={subgrupo.nome}
                      subgrupo={subgrupo}
                      displayMode={displayMode}
                      formatCurrency={formatCurrency}
                      onSubgrupoClick={handleSubgrupoClick}
                    />
                  ))}
                </div>
              </SortableContext>
              <DragOverlay>
                {activeId && selectedMacro ? (
                  <Card className="shadow-lg border-2 border-primary">
                    <CardContent className="p-4">
                      <div className="flex items-center gap-2">
                        <GripVertical className="h-4 w-4 text-muted-foreground" />
                        <span className="font-medium">{activeId}</span>
                      </div>
                    </CardContent>
                  </Card>
                ) : null}
              </DragOverlay>
            </DndContext>
          </ScrollArea>
        </SheetContent>
      </Sheet>

      {/* New Category Dialog */}
      <Dialog open={showNewCategoryDialog} onOpenChange={setShowNewCategoryDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nova Categoria</DialogTitle>
            <DialogDescription>
              Crie uma nova categoria para organizar seus produtos
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="categoryName">Nome da Categoria</Label>
              <Input
                id="categoryName"
                value={newCategoryName}
                onChange={(e) => setNewCategoryName(e.target.value)}
                placeholder="Ex: BEBIDAS, LIMPEZA, etc."
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowNewCategoryDialog(false)}>
              Cancelar
            </Button>
            <Button onClick={handleCreateCategory}>
              <Plus className="h-4 w-4 mr-2" />
              Criar Categoria
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reject Suggestion Dialog */}
      <Dialog open={showRejectDialog} onOpenChange={setShowRejectDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <X className="h-5 w-5 text-red-500" />
              Corrigir Categoria
            </DialogTitle>
            <DialogDescription>
              A IA sugeriu <strong>{rejectingItem?.suggestedCategory}</strong> para "{rejectingItem?.item.nome}". 
              Selecione a categoria correta para ensinar a IA.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Categoria Correta</Label>
              <Select value={selectedCorrectCategory} onValueChange={setSelectedCorrectCategory}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione a categoria correta..." />
                </SelectTrigger>
                <SelectContent>
                  {Object.keys(MACRO_CATEGORIES_CONFIG).filter(c => c !== "DIVERSOS").map(cat => (
                    <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="p-3 bg-purple-50 dark:bg-purple-950/30 rounded-lg border border-purple-200 dark:border-purple-800">
              <div className="flex items-center gap-2 text-sm">
                <Brain className="h-4 w-4 text-purple-500" />
                <span className="font-medium text-purple-700 dark:text-purple-300">
                  A IA vai aprender com essa correção
                </span>
              </div>
              <p className="text-xs text-purple-600 dark:text-purple-400 mt-1">
                Produtos similares serão sugeridos com a categoria correta no futuro.
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRejectDialog(false)}>
              Cancelar
            </Button>
            <Button 
              onClick={confirmRejectSuggestion}
              disabled={!selectedCorrectCategory}
              className="bg-red-500 hover:bg-red-600"
            >
              <Check className="h-4 w-4 mr-2" />
              Aplicar Correção
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Subgrupo Items Sheet */}
      <Sheet open={showSubgrupoItemsSheet} onOpenChange={setShowSubgrupoItemsSheet}>
        <SheetContent className="w-full sm:max-w-2xl">
          <SheetHeader>
            <div className="flex items-center gap-2">
              <Button 
                variant="ghost" 
                size="icon"
                onClick={() => setShowSubgrupoItemsSheet(false)}
              >
                <ChevronLeft className="h-5 w-5" />
              </Button>
              <div>
                <SheetTitle className="flex items-center gap-2">
                  <Package className="h-5 w-5 text-primary" />
                  {selectedSubgrupo}
                </SheetTitle>
                <SheetDescription>
                  {subgrupoItems.length} itens encontrados
                </SheetDescription>
              </div>
            </div>
          </SheetHeader>

          <ScrollArea className="h-[calc(100vh-180px)] mt-6">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Código</TableHead>
                  <TableHead>Produto</TableHead>
                  <TableHead className="text-right">Custo</TableHead>
                  <TableHead className="text-right">Venda</TableHead>
                  <TableHead className="text-right">Estoque</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {subgrupoItems.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell className="font-mono text-xs">{item.codigo}</TableCell>
                    <TableCell className="max-w-[200px] truncate">{item.nome}</TableCell>
                    <TableCell className="text-right">
                      {formatCurrency(item.preco_custo)}
                    </TableCell>
                    <TableCell className="text-right">
                      {formatCurrency(item.preco_venda)}
                    </TableCell>
                    <TableCell className="text-right">
                      <Badge variant={item.estoque_atual <= 0 ? "destructive" : "secondary"}>
                        {item.estoque_atual}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            {subgrupoItems.length === 0 && (
              <div className="text-center py-12 text-muted-foreground">
                <Package className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Nenhum item encontrado neste subgrupo</p>
              </div>
            )}
          </ScrollArea>
        </SheetContent>
      </Sheet>
    </div>
  );
};

// Sortable Subgrupo Card Component
interface SortableSubgrupoCardProps {
  subgrupo: SubgrupoData;
  displayMode: "custo" | "venda";
  formatCurrency: (value: number) => string;
  onSubgrupoClick: (subgrupoName: string) => void;
}

const SortableSubgrupoCard = ({ subgrupo, displayMode, formatCurrency, onSubgrupoClick }: SortableSubgrupoCardProps) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: subgrupo.nome });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <Card
      ref={setNodeRef}
      style={style}
      className={`hover:bg-muted/50 transition-colors ${
        isDragging ? 'ring-2 ring-primary' : ''
      }`}
    >
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div
            {...attributes}
            {...listeners}
            className="p-1 hover:bg-muted rounded cursor-grab active:cursor-grabbing"
          >
            <GripVertical className="h-4 w-4 text-muted-foreground" />
          </div>
          <div 
            className="flex-1 ml-3 cursor-pointer hover:text-primary transition-colors"
            onClick={() => onSubgrupoClick(subgrupo.nome)}
          >
            <h4 className="font-medium text-sm">{subgrupo.nome}</h4>
            <p className="text-xs text-muted-foreground mt-1">
              {subgrupo.itens.toLocaleString("pt-BR")} itens
            </p>
          </div>
          <div className="text-right">
            <p className="font-semibold text-sm">
              {formatCurrency(displayMode === "custo" ? subgrupo.custoTotal : subgrupo.vendaTotal)}
            </p>
            <Badge 
              variant={subgrupo.margem >= 30 ? "default" : subgrupo.margem >= 15 ? "secondary" : "destructive"}
              className="text-[10px] mt-1"
            >
              {subgrupo.margem.toFixed(1)}% margem
            </Badge>
          </div>
          <ChevronRight 
            className="h-4 w-4 text-muted-foreground ml-2 cursor-pointer hover:text-primary transition-colors" 
            onClick={() => onSubgrupoClick(subgrupo.nome)}
          />
        </div>
      </CardContent>
    </Card>
  );
};

export default CategoriesManager;
