-- Drop the existing trigger
DROP TRIGGER IF EXISTS on_loss_created ON public.perdas;

-- Create updated function that handles both produtos and estoque tables
CREATE OR REPLACE FUNCTION public.update_stock_on_loss()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  loss_amount NUMERIC;
  rows_affected INTEGER;
BEGIN
  loss_amount := COALESCE(NEW.peso_perdido, 0) + COALESCE(NEW.quantidade_perdida, 0);
  
  -- Try to update estoque table first
  UPDATE public.estoque 
  SET estoque_atual = estoque_atual - loss_amount
  WHERE id = NEW.produto_id;
  
  GET DIAGNOSTICS rows_affected = ROW_COUNT;
  
  -- If no rows were updated in estoque, try produtos table
  IF rows_affected = 0 THEN
    UPDATE public.produtos 
    SET quantidade_estoque = quantidade_estoque - loss_amount
    WHERE id = NEW.produto_id;
  END IF;
  
  RETURN NEW;
END;
$function$;

-- Recreate the trigger
CREATE TRIGGER on_loss_created
AFTER INSERT ON public.perdas
FOR EACH ROW
EXECUTE FUNCTION public.update_stock_on_loss();