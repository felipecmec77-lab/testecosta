import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Checkbox } from '@/components/ui/checkbox';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { 
  ArrowLeft, 
  Play, 
  History,
  Scale,
  Check
} from 'lucide-react';
import { IniciarFracionamento } from './IniciarFracionamento';
import { FracionamentoTab } from './FracionamentoTab';

interface FracionamentoManualProps {
  onVoltar: () => void;
}

export function FracionamentoManual({ onVoltar }: FracionamentoManualProps) {
  const [activeTab, setActiveTab] = useState('iniciar');

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={onVoltar}>
          <ArrowLeft className="h-4 w-4 mr-1" />
          Voltar
        </Button>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full max-w-md grid-cols-2">
          <TabsTrigger value="iniciar" className="flex items-center gap-2">
            <Play className="h-4 w-4" />
            Iniciar Fracionamento
          </TabsTrigger>
          <TabsTrigger value="historico" className="flex items-center gap-2">
            <History className="h-4 w-4" />
            Histórico
          </TabsTrigger>
        </TabsList>

        <TabsContent value="iniciar" className="mt-4">
          <IniciarFracionamento onVoltar={() => setActiveTab('historico')} />
        </TabsContent>

        <TabsContent value="historico" className="mt-4">
          <FracionamentoTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}
