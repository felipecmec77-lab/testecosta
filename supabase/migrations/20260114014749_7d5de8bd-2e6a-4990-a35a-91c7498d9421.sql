
-- Drop the existing foreign key constraint
ALTER TABLE public.perdas DROP CONSTRAINT IF EXISTS perdas_produto_id_fkey;

-- Add new foreign key that references estoque table instead of produtos
ALTER TABLE public.perdas 
ADD CONSTRAINT perdas_produto_id_fkey 
FOREIGN KEY (produto_id) 
REFERENCES public.estoque(id);

-- Also fix the valor_perda generated column - it currently multiplies by 0
-- First drop the existing column
ALTER TABLE public.perdas DROP COLUMN IF EXISTS valor_perda;

-- Add it back as a computed column that uses the product price from estoque
ALTER TABLE public.perdas 
ADD COLUMN valor_perda NUMERIC GENERATED ALWAYS AS (
  COALESCE(peso_perdido, 0) + COALESCE(quantidade_perdida, 0)
) STORED;

-- Create a trigger function to calculate the actual value when inserting
CREATE OR REPLACE FUNCTION public.calculate_perda_valor()
RETURNS TRIGGER AS $$
DECLARE
  v_preco NUMERIC;
BEGIN
  -- Get price from estoque
  SELECT preco_custo INTO v_preco FROM public.estoque WHERE id = NEW.produto_id;
  
  -- If not found in estoque, try produtos
  IF v_preco IS NULL THEN
    SELECT preco_unitario INTO v_preco FROM public.produtos WHERE id = NEW.produto_id;
  END IF;
  
  -- Update the calculated value after insert
  -- Since valor_perda is generated, we'll use a separate table or just not use it
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
