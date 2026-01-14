-- Corrigir política de conferencias_polpas para operadores verem todas
DROP POLICY IF EXISTS "Users can view conferencias_polpas" ON conferencias_polpas;
CREATE POLICY "Users can view conferencias_polpas" 
ON conferencias_polpas FOR SELECT 
USING (true);

-- Adicionar política para operadores inserirem itens_perdas_polpas
CREATE POLICY "Operators can insert itens_perdas_polpas" 
ON itens_perdas_polpas FOR INSERT 
WITH CHECK (has_role(auth.uid(), 'administrador'::app_role) OR has_role(auth.uid(), 'operador'::app_role));

-- Garantir que operadores podem atualizar polpas (estoque)
CREATE POLICY "Operators can update polpas" 
ON polpas FOR UPDATE 
USING (has_role(auth.uid(), 'administrador'::app_role) OR has_role(auth.uid(), 'operador'::app_role));

-- Garantir que operadores podem atualizar produtos (estoque hortifruti)
CREATE POLICY "Operators can update produtos" 
ON produtos FOR UPDATE 
USING (has_role(auth.uid(), 'administrador'::app_role) OR has_role(auth.uid(), 'operador'::app_role));