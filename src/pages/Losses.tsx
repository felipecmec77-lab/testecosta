import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import MainLayout from '@/components/layout/MainLayout';
import LossCart from '@/components/losses/LossCart';
import LaunchList, { Launch } from '@/components/losses/LaunchList';
import { Loader2 } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

interface Product {
  id: string;
  nome_produto: string;
  quantidade_estoque: number;
  unidade_medida: string;
  preco_unitario: number;
}

const Losses = () => {
  const { userRole } = useAuth();
  const isOperador = userRole === 'operador';
  const [products, setProducts] = useState<Product[]>([]);
  const [launches, setLaunches] = useState<Launch[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      // Fetch products
      const { data: productsData } = await supabase
        .from('produtos')
        .select('*')
        .order('nome_produto');

      if (productsData) setProducts(productsData);

      // Fetch launches with item counts and total values
      const { data: launchesData } = await supabase
        .from('lancamentos')
        .select('*')
        .order('numero', { ascending: false })
        .limit(50);

      if (launchesData) {
        // Fetch profile names
        const userIds = [...new Set(launchesData.map(l => l.usuario_id))];
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, nome')
          .in('id', userIds);

        const profileMap = new Map(profiles?.map(p => [p.id, p.nome]) || []);

        // Fetch item counts and values for each launch
        const launchIds = launchesData.map(l => l.id);
        const { data: items } = await supabase
          .from('perdas')
          .select('lancamento_id, peso_perdido, quantidade_perdida, produtos(preco_unitario)')
          .in('lancamento_id', launchIds);

        // Calculate totals per launch
        const launchStats = new Map<string, { count: number; value: number }>();
        items?.forEach(item => {
          if (!item.lancamento_id) return;
          const current = launchStats.get(item.lancamento_id) || { count: 0, value: 0 };
          const qty = (item.peso_perdido || 0) + (item.quantidade_perdida || 0);
          const price = (item.produtos as any)?.preco_unitario || 0;
          launchStats.set(item.lancamento_id, {
            count: current.count + 1,
            value: current.value + qty * price
          });
        });

        const launchesWithData = launchesData.map(launch => ({
          ...launch,
          profiles: { nome: profileMap.get(launch.usuario_id) || 'Desconhecido' },
          items_count: launchStats.get(launch.id)?.count || 0,
          total_value: launchStats.get(launch.id)?.value || 0
        })) as Launch[];

        setLaunches(launchesWithData);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="space-y-6">
        {/* Header - hidden for operators */}
        {!isOperador && (
          <div>
            <h1 className="text-2xl lg:text-3xl font-bold text-foreground">Lançar Perdas</h1>
            <p className="text-muted-foreground mt-1">Registre múltiplas perdas de uma vez como um PDV</p>
          </div>
        )}

        {/* PDV Cart Interface */}
        <LossCart products={products} onSuccess={fetchData} />

        {/* Launch List - hidden for operators */}
        {!isOperador && <LaunchList launches={launches} onRefresh={fetchData} />}
      </div>
    </MainLayout>
  );
};

export default Losses;
