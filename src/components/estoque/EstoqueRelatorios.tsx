import { useMemo, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import {
  Package,
  DollarSign,
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  BarChart3,
  PieChartIcon,
  FileSpreadsheet,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Percent,
  Boxes,
} from "lucide-react";

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
}

interface EstoqueRelatoriosProps {
  items: EstoqueItem[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  embedded?: boolean;
}

const COLORS = {
  zerado: "#f97316", // orange-500
  abaixoMinimo: "#eab308", // yellow-500
  negativo: "#ef4444", // red-500
  normal: "#22c55e", // green-500
  primary: "#3b82f6", // blue-500
  secondary: "#8b5cf6", // violet-500
  teal: "#14b8a6", // teal-500
  cyan: "#06b6d4", // cyan-500
};

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
};

const formatPercent = (value: number) => {
  return `${value.toFixed(1)}%`;
};

export default function EstoqueRelatorios({ items, open, onOpenChange, embedded = false }: EstoqueRelatoriosProps) {
  const [activeTab, setActiveTab] = useState("visao-geral");

  // If embedded, render content directly without Dialog wrapper

  // Main KPIs
  const kpis = useMemo(() => {
    const totalSKUs = items.length;
    const totalAtivos = items.filter(i => i.ativo).length;
    const totalInativos = totalSKUs - totalAtivos;
    
    // Ignorar estoques negativos para cálculo de valores
    const totalCusto = items.reduce((acc, i) => acc + i.preco_custo * Math.max(0, i.estoque_atual), 0);
    const totalVenda = items.reduce((acc, i) => acc + i.preco_venda * Math.max(0, i.estoque_atual), 0);
    const margemMedia = totalCusto > 0 ? ((totalVenda - totalCusto) / totalCusto) * 100 : 0;
    const lucroEstimado = totalVenda - totalCusto;
    
    const estoquesZerados = items.filter(i => i.estoque_atual === 0).length;
    const abaixoMinimo = items.filter(i => i.estoque_atual < i.estoque_minimo && i.estoque_atual > 0).length;
    const estoquesNegativos = items.filter(i => i.estoque_atual < 0).length;
    const normais = items.filter(i => i.estoque_atual >= i.estoque_minimo).length;
    const totalCriticos = estoquesZerados + abaixoMinimo + estoquesNegativos;
    
    return {
      totalSKUs,
      totalAtivos,
      totalInativos,
      totalCusto,
      totalVenda,
      margemMedia,
      lucroEstimado,
      estoquesZerados,
      abaixoMinimo,
      estoquesNegativos,
      normais,
      totalCriticos,
    };
  }, [items]);

  // Critical Stock Pie Chart Data
  const criticalPieData = useMemo(() => [
    { name: "Zerados", value: kpis.estoquesZerados, color: COLORS.zerado },
    { name: "Abaixo Mínimo", value: kpis.abaixoMinimo, color: COLORS.abaixoMinimo },
    { name: "Negativos", value: kpis.estoquesNegativos, color: COLORS.negativo },
  ].filter(d => d.value > 0), [kpis]);

  // Stock Distribution Pie Chart
  const stockDistributionData = useMemo(() => [
    { name: "Normal", value: kpis.normais, color: COLORS.normal },
    { name: "Zerados", value: kpis.estoquesZerados, color: COLORS.zerado },
    { name: "Abaixo Mínimo", value: kpis.abaixoMinimo, color: COLORS.abaixoMinimo },
    { name: "Negativos", value: kpis.estoquesNegativos, color: COLORS.negativo },
  ].filter(d => d.value > 0), [kpis]);

  // Top 10 Groups by Stock Value
  const topGroupsByValue = useMemo(() => {
    const groupMap = new Map<string, number>();
    items.forEach(item => {
      const grupo = item.grupo || "Sem Grupo";
      const valor = item.preco_custo * Math.max(0, item.estoque_atual);
      groupMap.set(grupo, (groupMap.get(grupo) || 0) + valor);
    });
    return Array.from(groupMap.entries())
      .map(([name, value]) => ({ name: name.substring(0, 15), fullName: name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 10);
  }, [items]);

  // Top 10 Brands by Quantity
  const topBrandsByQty = useMemo(() => {
    const brandMap = new Map<string, number>();
    items.forEach(item => {
      const marca = item.marca || "Sem Marca";
      brandMap.set(marca, (brandMap.get(marca) || 0) + 1);
    });
    return Array.from(brandMap.entries())
      .map(([name, value]) => ({ name: name.substring(0, 15), fullName: name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 10);
  }, [items]);

  // Top 20 Products by Capital (highest stock value)
  const topProductsByCapital = useMemo(() => {
    return items
      .map(item => ({
        ...item,
        valorEstoque: item.preco_custo * Math.max(0, item.estoque_atual),
        margem: item.preco_custo > 0 ? ((item.preco_venda - item.preco_custo) / item.preco_custo) * 100 : 0,
      }))
      .sort((a, b) => b.valorEstoque - a.valorEstoque)
      .slice(0, 20);
  }, [items]);

  // Products with Best and Worst Margins
  const marginAnalysis = useMemo(() => {
    const withMargin = items
      .filter(i => i.preco_custo > 0 && i.preco_venda > 0)
      .map(item => ({
        ...item,
        margem: ((item.preco_venda - item.preco_custo) / item.preco_custo) * 100,
      }));
    
    const bestMargins = [...withMargin].sort((a, b) => b.margem - a.margem).slice(0, 10);
    const worstMargins = [...withMargin].sort((a, b) => a.margem - b.margem).slice(0, 10);
    
    return { bestMargins, worstMargins };
  }, [items]);

  // Data Quality Indicators
  const dataQuality = useMemo(() => {
    const total = items.length;
    if (total === 0) return { ncm: 0, barcode: 0, marca: 0, grupo: 0, localizacao: 0 };
    
    const withNCM = items.filter(i => i.ncm && i.ncm.trim() !== "").length;
    const withBarcode = items.filter(i => i.codigo_barras && i.codigo_barras.trim() !== "").length;
    const withMarca = items.filter(i => i.marca && i.marca.trim() !== "").length;
    const withGrupo = items.filter(i => i.grupo && i.grupo.trim() !== "").length;
    const withLocalizacao = items.filter(i => i.localizacao && i.localizacao.trim() !== "").length;
    
    return {
      ncm: (withNCM / total) * 100,
      barcode: (withBarcode / total) * 100,
      marca: (withMarca / total) * 100,
      grupo: (withGrupo / total) * 100,
      localizacao: (withLocalizacao / total) * 100,
      semNCM: total - withNCM,
      semBarcode: total - withBarcode,
      semMarca: total - withMarca,
      semGrupo: total - withGrupo,
      semLocalizacao: total - withLocalizacao,
    };
  }, [items]);

  // Products without important data
  const problemProducts = useMemo(() => {
    return {
      semNCM: items.filter(i => !i.ncm || i.ncm.trim() === "").slice(0, 20),
      semBarcode: items.filter(i => !i.codigo_barras || i.codigo_barras.trim() === "").slice(0, 20),
      semMarca: items.filter(i => !i.marca || i.marca.trim() === "").slice(0, 20),
      semGrupo: items.filter(i => !i.grupo || i.grupo.trim() === "").slice(0, 20),
    };
  }, [items]);

  const content = (
    <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 overflow-hidden flex flex-col">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold flex items-center gap-2">
          <BarChart3 className="h-6 w-6 text-primary" />
          Dashboard de Relatórios - Estoque
        </h2>
        <TabsList className="grid grid-cols-5">
          <TabsTrigger value="visao-geral">Visão Geral</TabsTrigger>
          <TabsTrigger value="criticos">Estoque Crítico</TabsTrigger>
          <TabsTrigger value="capital">Capital Parado</TabsTrigger>
          <TabsTrigger value="margens">Análise de Margens</TabsTrigger>
          <TabsTrigger value="qualidade">Qualidade de Dados</TabsTrigger>
        </TabsList>
      </div>

      <ScrollArea className="flex-1">
            {/* VISÃO GERAL */}
            <TabsContent value="visao-geral" className="space-y-6 pr-4">
              {/* Main KPIs */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Card className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-950/50 dark:to-blue-900/30 border-blue-200 dark:border-blue-800">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-blue-500 rounded-lg">
                        <Package className="h-5 w-5 text-white" />
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Total de SKUs</p>
                        <p className="text-2xl font-bold">{kpis.totalSKUs.toLocaleString("pt-BR")}</p>
                        <p className="text-xs text-green-600">{kpis.totalAtivos} ativos</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-950/50 dark:to-green-900/30 border-green-200 dark:border-green-800">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-green-500 rounded-lg">
                        <DollarSign className="h-5 w-5 text-white" />
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Valor em Custo</p>
                        <p className="text-2xl font-bold text-green-600">{formatCurrency(kpis.totalCusto)}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-gradient-to-br from-teal-50 to-teal-100 dark:from-teal-950/50 dark:to-teal-900/30 border-teal-200 dark:border-teal-800">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-teal-500 rounded-lg">
                        <TrendingUp className="h-5 w-5 text-white" />
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Valor em Venda</p>
                        <p className="text-2xl font-bold text-teal-600">{formatCurrency(kpis.totalVenda)}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-gradient-to-br from-violet-50 to-violet-100 dark:from-violet-950/50 dark:to-violet-900/30 border-violet-200 dark:border-violet-800">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-violet-500 rounded-lg">
                        <Percent className="h-5 w-5 text-white" />
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Margem Média</p>
                        <p className="text-2xl font-bold text-violet-600">{formatPercent(kpis.margemMedia)}</p>
                        <p className="text-xs text-green-600">Lucro: {formatCurrency(kpis.lucroEstimado)}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Charts Row */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Stock Distribution Pie */}
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base flex items-center gap-2">
                      <PieChartIcon className="h-4 w-4" />
                      Distribuição do Estoque
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="h-[280px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={stockDistributionData}
                            cx="50%"
                            cy="50%"
                            innerRadius={60}
                            outerRadius={100}
                            paddingAngle={2}
                            dataKey="value"
                            label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                          >
                            {stockDistributionData.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={entry.color} />
                            ))}
                          </Pie>
                          <Tooltip formatter={(value: number) => [value, "Itens"]} />
                          <Legend />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>

                {/* Top Groups Bar Chart */}
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base flex items-center gap-2">
                      <BarChart3 className="h-4 w-4" />
                      Top 10 Grupos por Valor em Estoque
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="h-[280px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={topGroupsByValue} layout="vertical" margin={{ left: 10, right: 30 }}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis type="number" tickFormatter={(v) => formatCurrency(v)} />
                          <YAxis type="category" dataKey="name" width={100} tick={{ fontSize: 11 }} />
                          <Tooltip 
                            formatter={(value: number) => [formatCurrency(value), "Valor"]}
                            labelFormatter={(label, payload) => payload?.[0]?.payload?.fullName || label}
                          />
                          <Bar dataKey="value" fill={COLORS.primary} radius={[0, 4, 4, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Second Charts Row */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Top Brands */}
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base flex items-center gap-2">
                      <Boxes className="h-4 w-4" />
                      Top 10 Marcas por Quantidade de Itens
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="h-[280px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={topBrandsByQty} layout="vertical" margin={{ left: 10, right: 30 }}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis type="number" />
                          <YAxis type="category" dataKey="name" width={100} tick={{ fontSize: 11 }} />
                          <Tooltip 
                            formatter={(value: number) => [value, "Itens"]}
                            labelFormatter={(label, payload) => payload?.[0]?.payload?.fullName || label}
                          />
                          <Bar dataKey="value" fill={COLORS.secondary} radius={[0, 4, 4, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>

                {/* Data Quality Summary */}
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4" />
                      Qualidade dos Dados
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="text-sm">NCM Preenchido</span>
                        <span className="text-sm font-medium">{formatPercent(dataQuality.ncm)}</span>
                      </div>
                      <div className="w-full bg-muted rounded-full h-2">
                        <div className="bg-green-500 h-2 rounded-full" style={{ width: `${dataQuality.ncm}%` }} />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="text-sm">Código de Barras</span>
                        <span className="text-sm font-medium">{formatPercent(dataQuality.barcode)}</span>
                      </div>
                      <div className="w-full bg-muted rounded-full h-2">
                        <div className="bg-blue-500 h-2 rounded-full" style={{ width: `${dataQuality.barcode}%` }} />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="text-sm">Marca</span>
                        <span className="text-sm font-medium">{formatPercent(dataQuality.marca)}</span>
                      </div>
                      <div className="w-full bg-muted rounded-full h-2">
                        <div className="bg-violet-500 h-2 rounded-full" style={{ width: `${dataQuality.marca}%` }} />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="text-sm">Grupo</span>
                        <span className="text-sm font-medium">{formatPercent(dataQuality.grupo)}</span>
                      </div>
                      <div className="w-full bg-muted rounded-full h-2">
                        <div className="bg-teal-500 h-2 rounded-full" style={{ width: `${dataQuality.grupo}%` }} />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="text-sm">Localização</span>
                        <span className="text-sm font-medium">{formatPercent(dataQuality.localizacao)}</span>
                      </div>
                      <div className="w-full bg-muted rounded-full h-2">
                        <div className="bg-cyan-500 h-2 rounded-full" style={{ width: `${dataQuality.localizacao}%` }} />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            {/* ESTOQUE CRÍTICO */}
            <TabsContent value="criticos" className="space-y-6 pr-4">
              {/* Critical KPIs */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Card className="border-red-200 dark:border-red-800 bg-red-50/50 dark:bg-red-950/30">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-red-500 rounded-lg">
                        <AlertTriangle className="h-5 w-5 text-white" />
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Total Críticos</p>
                        <p className="text-2xl font-bold text-red-600">{kpis.totalCriticos}</p>
                        <p className="text-xs text-muted-foreground">{formatPercent((kpis.totalCriticos / kpis.totalSKUs) * 100)} do total</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="border-orange-200 dark:border-orange-800">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-orange-500 rounded-lg">
                        <XCircle className="h-5 w-5 text-white" />
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Zerados</p>
                        <p className="text-2xl font-bold text-orange-600">{kpis.estoquesZerados}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="border-yellow-200 dark:border-yellow-800">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-yellow-500 rounded-lg">
                        <AlertCircle className="h-5 w-5 text-white" />
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Abaixo Mínimo</p>
                        <p className="text-2xl font-bold text-yellow-600">{kpis.abaixoMinimo}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="border-red-200 dark:border-red-800">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-red-600 rounded-lg">
                        <TrendingDown className="h-5 w-5 text-white" />
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Negativos</p>
                        <p className="text-2xl font-bold text-red-700">{kpis.estoquesNegativos}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Critical Pie Chart */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base flex items-center gap-2">
                      <PieChartIcon className="h-4 w-4" />
                      Distribuição do Estoque Crítico
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="h-[300px]">
                      {criticalPieData.length > 0 ? (
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                            <Pie
                              data={criticalPieData}
                              cx="50%"
                              cy="50%"
                              innerRadius={60}
                              outerRadius={110}
                              paddingAngle={3}
                              dataKey="value"
                              label={({ name, value, percent }) => `${name}: ${value} (${(percent * 100).toFixed(0)}%)`}
                            >
                              {criticalPieData.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={entry.color} />
                              ))}
                            </Pie>
                            <Tooltip formatter={(value: number) => [value, "Itens"]} />
                            <Legend />
                          </PieChart>
                        </ResponsiveContainer>
                      ) : (
                        <div className="flex items-center justify-center h-full text-muted-foreground">
                          <div className="text-center">
                            <CheckCircle2 className="h-12 w-12 mx-auto mb-2 text-green-500" />
                            <p>Nenhum item em estoque crítico!</p>
                          </div>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>

                {/* Critical Items Table */}
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base flex items-center gap-2">
                      <FileSpreadsheet className="h-4 w-4" />
                      Itens Críticos (Top 15)
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ScrollArea className="h-[300px]">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Produto</TableHead>
                            <TableHead className="text-right">Atual</TableHead>
                            <TableHead className="text-right">Mínimo</TableHead>
                            <TableHead>Status</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {items
                            .filter(i => i.estoque_atual <= 0 || i.estoque_atual < i.estoque_minimo)
                            .slice(0, 15)
                            .map((item) => (
                              <TableRow key={item.id}>
                                <TableCell className="max-w-[150px] truncate font-medium">{item.nome}</TableCell>
                                <TableCell className="text-right font-mono">{item.estoque_atual}</TableCell>
                                <TableCell className="text-right font-mono text-muted-foreground">{item.estoque_minimo}</TableCell>
                                <TableCell>
                                  {item.estoque_atual < 0 ? (
                                    <Badge variant="destructive" className="text-xs">Negativo</Badge>
                                  ) : item.estoque_atual === 0 ? (
                                    <Badge className="bg-orange-500 text-xs">Zerado</Badge>
                                  ) : (
                                    <Badge className="bg-yellow-500 text-xs">Abaixo Mín.</Badge>
                                  )}
                                </TableCell>
                              </TableRow>
                            ))}
                        </TableBody>
                      </Table>
                    </ScrollArea>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            {/* CAPITAL PARADO */}
            <TabsContent value="capital" className="space-y-6 pr-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base flex items-center gap-2">
                    <DollarSign className="h-4 w-4" />
                    Top 20 Produtos com Maior Capital Parado
                  </CardTitle>
                  <p className="text-sm text-muted-foreground">
                    Produtos com maior valor em estoque (Preço Custo × Estoque Atual)
                  </p>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="h-[500px]">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-[50px]">#</TableHead>
                          <TableHead>Código</TableHead>
                          <TableHead>Produto</TableHead>
                          <TableHead>Grupo</TableHead>
                          <TableHead className="text-right">Custo Unit.</TableHead>
                          <TableHead className="text-right">Estoque</TableHead>
                          <TableHead className="text-right">Valor Total</TableHead>
                          <TableHead className="text-right">Margem</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {topProductsByCapital.map((item, index) => (
                          <TableRow key={item.id}>
                            <TableCell className="font-mono text-muted-foreground">{index + 1}</TableCell>
                            <TableCell className="font-mono text-sm">{item.codigo}</TableCell>
                            <TableCell className="max-w-[200px] truncate font-medium">{item.nome}</TableCell>
                            <TableCell>
                              {item.grupo ? (
                                <Badge variant="secondary" className="text-xs">{item.grupo}</Badge>
                              ) : "-"}
                            </TableCell>
                            <TableCell className="text-right">{formatCurrency(item.preco_custo)}</TableCell>
                            <TableCell className="text-right font-mono">{item.estoque_atual}</TableCell>
                            <TableCell className="text-right font-bold text-green-600">{formatCurrency(item.valorEstoque)}</TableCell>
                            <TableCell className="text-right">
                              <span className={item.margem < 0 ? "text-red-500" : item.margem < 20 ? "text-yellow-600" : "text-green-600"}>
                                {formatPercent(item.margem)}
                              </span>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </ScrollArea>
                </CardContent>
              </Card>
            </TabsContent>

            {/* ANÁLISE DE MARGENS */}
            <TabsContent value="margens" className="space-y-6 pr-4">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Best Margins */}
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base flex items-center gap-2">
                      <TrendingUp className="h-4 w-4 text-green-500" />
                      Melhores Margens (Top 10)
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ScrollArea className="h-[400px]">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Produto</TableHead>
                            <TableHead className="text-right">Custo</TableHead>
                            <TableHead className="text-right">Venda</TableHead>
                            <TableHead className="text-right">Margem</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {marginAnalysis.bestMargins.map((item) => (
                            <TableRow key={item.id}>
                              <TableCell className="max-w-[150px] truncate font-medium">{item.nome}</TableCell>
                              <TableCell className="text-right">{formatCurrency(item.preco_custo)}</TableCell>
                              <TableCell className="text-right">{formatCurrency(item.preco_venda)}</TableCell>
                              <TableCell className="text-right font-bold text-green-600">{formatPercent(item.margem)}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </ScrollArea>
                  </CardContent>
                </Card>

                {/* Worst Margins */}
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base flex items-center gap-2">
                      <TrendingDown className="h-4 w-4 text-red-500" />
                      Piores Margens (Bottom 10)
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ScrollArea className="h-[400px]">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Produto</TableHead>
                            <TableHead className="text-right">Custo</TableHead>
                            <TableHead className="text-right">Venda</TableHead>
                            <TableHead className="text-right">Margem</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {marginAnalysis.worstMargins.map((item) => (
                            <TableRow key={item.id}>
                              <TableCell className="max-w-[150px] truncate font-medium">{item.nome}</TableCell>
                              <TableCell className="text-right">{formatCurrency(item.preco_custo)}</TableCell>
                              <TableCell className="text-right">{formatCurrency(item.preco_venda)}</TableCell>
                              <TableCell className={`text-right font-bold ${item.margem < 0 ? "text-red-600" : "text-yellow-600"}`}>
                                {formatPercent(item.margem)}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </ScrollArea>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            {/* QUALIDADE DE DADOS */}
            <TabsContent value="qualidade" className="space-y-6 pr-4">
              {/* Quality Cards */}
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                <Card>
                  <CardContent className="p-4 text-center">
                    <p className="text-3xl font-bold text-red-500">{dataQuality.semNCM}</p>
                    <p className="text-sm text-muted-foreground">Sem NCM</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4 text-center">
                    <p className="text-3xl font-bold text-orange-500">{dataQuality.semBarcode}</p>
                    <p className="text-sm text-muted-foreground">Sem Cód. Barras</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4 text-center">
                    <p className="text-3xl font-bold text-yellow-500">{dataQuality.semMarca}</p>
                    <p className="text-sm text-muted-foreground">Sem Marca</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4 text-center">
                    <p className="text-3xl font-bold text-blue-500">{dataQuality.semGrupo}</p>
                    <p className="text-sm text-muted-foreground">Sem Grupo</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4 text-center">
                    <p className="text-3xl font-bold text-violet-500">{dataQuality.semLocalizacao}</p>
                    <p className="text-sm text-muted-foreground">Sem Local</p>
                  </CardContent>
                </Card>
              </div>

              {/* Problem Products Tables */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base flex items-center gap-2">
                      <XCircle className="h-4 w-4 text-red-500" />
                      Produtos sem NCM (Top 20)
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ScrollArea className="h-[250px]">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Código</TableHead>
                            <TableHead>Produto</TableHead>
                            <TableHead>Grupo</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {problemProducts.semNCM.map((item) => (
                            <TableRow key={item.id}>
                              <TableCell className="font-mono text-sm">{item.codigo}</TableCell>
                              <TableCell className="max-w-[150px] truncate">{item.nome}</TableCell>
                              <TableCell className="text-muted-foreground">{item.grupo || "-"}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </ScrollArea>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base flex items-center gap-2">
                      <XCircle className="h-4 w-4 text-orange-500" />
                      Produtos sem Código de Barras (Top 20)
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ScrollArea className="h-[250px]">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Código</TableHead>
                            <TableHead>Produto</TableHead>
                            <TableHead>Grupo</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {problemProducts.semBarcode.map((item) => (
                            <TableRow key={item.id}>
                              <TableCell className="font-mono text-sm">{item.codigo}</TableCell>
                              <TableCell className="max-w-[150px] truncate">{item.nome}</TableCell>
                              <TableCell className="text-muted-foreground">{item.grupo || "-"}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </ScrollArea>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base flex items-center gap-2">
                      <XCircle className="h-4 w-4 text-yellow-500" />
                      Produtos sem Marca (Top 20)
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ScrollArea className="h-[250px]">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Código</TableHead>
                            <TableHead>Produto</TableHead>
                            <TableHead>Grupo</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {problemProducts.semMarca.map((item) => (
                            <TableRow key={item.id}>
                              <TableCell className="font-mono text-sm">{item.codigo}</TableCell>
                              <TableCell className="max-w-[150px] truncate">{item.nome}</TableCell>
                              <TableCell className="text-muted-foreground">{item.grupo || "-"}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </ScrollArea>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base flex items-center gap-2">
                      <XCircle className="h-4 w-4 text-blue-500" />
                      Produtos sem Grupo (Top 20)
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ScrollArea className="h-[250px]">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Código</TableHead>
                            <TableHead>Produto</TableHead>
                            <TableHead>Marca</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {problemProducts.semGrupo.map((item) => (
                            <TableRow key={item.id}>
                              <TableCell className="font-mono text-sm">{item.codigo}</TableCell>
                              <TableCell className="max-w-[150px] truncate">{item.nome}</TableCell>
                              <TableCell className="text-muted-foreground">{item.marca || "-"}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </ScrollArea>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
          </ScrollArea>
        </Tabs>
  );

  // If embedded, render content directly
  if (embedded) {
    return <div className="space-y-4">{content}</div>;
  }

  // Otherwise, wrap in Dialog
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[95vw] w-[1400px] max-h-[90vh] overflow-hidden flex flex-col">
        {content}
      </DialogContent>
    </Dialog>
  );
}
