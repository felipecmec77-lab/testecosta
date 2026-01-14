-- Remover foreign keys antigas que apontam para tabelas erradas
ALTER TABLE conferencias_coca DROP CONSTRAINT IF EXISTS conferencias_coca_produto_coca_id_fkey;
ALTER TABLE conferencias_polpas DROP CONSTRAINT IF EXISTS conferencias_polpas_polpa_id_fkey;

-- Adicionar novas foreign keys apontando para estoque
ALTER TABLE conferencias_coca 
ADD CONSTRAINT conferencias_coca_produto_coca_id_fkey 
FOREIGN KEY (produto_coca_id) REFERENCES estoque(id) ON DELETE CASCADE;

ALTER TABLE conferencias_polpas 
ADD CONSTRAINT conferencias_polpas_polpa_id_fkey 
FOREIGN KEY (polpa_id) REFERENCES estoque(id) ON DELETE CASCADE;

-- Garantir políticas RLS para operadores nas conferencias
DROP POLICY IF EXISTS "Users can view conferencias_coca" ON conferencias_coca;
CREATE POLICY "Users can view conferencias_coca" 
ON conferencias_coca FOR SELECT 
USING (true);

DROP POLICY IF EXISTS "Operators can insert conferencias_coca" ON conferencias_coca;
CREATE POLICY "Operators can insert conferencias_coca" 
ON conferencias_coca FOR INSERT 
WITH CHECK (has_role(auth.uid(), 'administrador'::app_role) OR has_role(auth.uid(), 'operador'::app_role));

DROP POLICY IF EXISTS "Users can view conferencias_polpas" ON conferencias_polpas;
CREATE POLICY "Users can view conferencias_polpas" 
ON conferencias_polpas FOR SELECT 
USING (true);

DROP POLICY IF EXISTS "Operators can insert conferencias_polpas" ON conferencias_polpas;
CREATE POLICY "Operators can insert conferencias_polpas" 
ON conferencias_polpas FOR INSERT 
WITH CHECK (has_role(auth.uid(), 'administrador'::app_role) OR has_role(auth.uid(), 'operador'::app_role));

-- Garantir políticas RLS para sessoes_conferencia_coca
DROP POLICY IF EXISTS "Users can view sessoes_conferencia_coca" ON sessoes_conferencia_coca;
CREATE POLICY "Users can view sessoes_conferencia_coca" 
ON sessoes_conferencia_coca FOR SELECT 
USING (true);

DROP POLICY IF EXISTS "Operators can insert sessoes_conferencia_coca" ON sessoes_conferencia_coca;
CREATE POLICY "Operators can insert sessoes_conferencia_coca" 
ON sessoes_conferencia_coca FOR INSERT 
WITH CHECK (has_role(auth.uid(), 'administrador'::app_role) OR has_role(auth.uid(), 'operador'::app_role));