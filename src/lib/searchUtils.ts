/**
 * Função de busca por múltiplas palavras
 * Divide a query em palavras e verifica se TODAS estão presentes no texto,
 * independente da ordem.
 * 
 * @param text - O texto onde buscar
 * @param query - A query de busca (pode conter múltiplas palavras)
 * @returns true se todas as palavras da query estão presentes no texto
 */
export function searchMultiWord(text: string | null | undefined, query: string): boolean {
  if (!text || !query) return !query; // se não há query, retorna true
  
  const normalizedText = text.toLowerCase().trim();
  const searchWords = query.toLowerCase().trim().split(/\s+/).filter(word => word.length > 0);
  
  // Se não há palavras na busca, retorna true
  if (searchWords.length === 0) return true;
  
  // Verifica se TODAS as palavras estão presentes no texto
  return searchWords.every(word => normalizedText.includes(word));
}

/**
 * Busca em múltiplos campos de um objeto
 * Retorna true se a query bate em qualquer um dos campos
 * 
 * @param fields - Array de valores dos campos para buscar
 * @param query - A query de busca
 * @returns true se a query bate em pelo menos um campo
 */
export function searchInFields(fields: (string | null | undefined)[], query: string): boolean {
  if (!query || query.trim().length === 0) return true;
  
  // Para cada campo, verifica se todas as palavras da query estão presentes
  // Retorna true se pelo menos um campo contém todas as palavras
  return fields.some(field => searchMultiWord(field, query));
}

/**
 * Busca combinada em múltiplos campos de um objeto
 * Todas as palavras da query devem estar presentes em pelo menos um campo
 * 
 * @param fields - Array de valores dos campos para buscar
 * @param query - A query de busca
 * @returns true se todas as palavras estão presentes (podem estar em campos diferentes)
 */
export function searchAcrossFields(fields: (string | null | undefined)[], query: string): boolean {
  if (!query || query.trim().length === 0) return true;
  
  const searchWords = query.toLowerCase().trim().split(/\s+/).filter(word => word.length > 0);
  
  if (searchWords.length === 0) return true;
  
  // Combina todos os campos em um único texto para busca
  const combinedText = fields
    .filter(Boolean)
    .map(f => f!.toLowerCase())
    .join(' ');
  
  // Verifica se TODAS as palavras estão presentes no texto combinado
  return searchWords.every(word => combinedText.includes(word));
}
