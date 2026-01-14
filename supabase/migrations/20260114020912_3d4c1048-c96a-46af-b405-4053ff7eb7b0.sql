-- Add foreign key constraint from perdas.produto_id to estoque.id
ALTER TABLE public.perdas
ADD CONSTRAINT perdas_produto_id_estoque_fkey 
FOREIGN KEY (produto_id) 
REFERENCES public.estoque(id) 
ON DELETE CASCADE;