import { forwardRef } from 'react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface ReceiptItem {
  nome: string;
  quantidade: number;
  unidade?: string;
  semEstoque?: boolean;
}

interface VisualReceiptProps {
  items: ReceiptItem[];
  numero?: number;
  data?: Date;
  tipo?: string;
  operador?: string;
}

const VisualReceipt = forwardRef<HTMLDivElement, VisualReceiptProps>(
  ({ items, numero, data = new Date(), tipo = 'PEDIDO', operador }, ref) => {
    const dataFormatada = format(data, "dd/MM/yyyy", { locale: ptBR });
    const horaFormatada = format(data, "HH:mm", { locale: ptBR });
    
    // Separar itens por categoria (case insensitive para FD/fd)
    const itensFardo = items.filter(item => !item.semEstoque && item.unidade?.toLowerCase() === 'fd');
    const itensUnidade = items.filter(item => !item.semEstoque && item.unidade?.toLowerCase() !== 'fd');
    const itemsSemEstoque = items.filter(item => item.semEstoque);
    
    const totalFardos = itensFardo.reduce((sum, item) => sum + item.quantidade, 0);
    const totalUnidades = itensUnidade.reduce((sum, item) => sum + item.quantidade, 0);

    // Colors
    const colors = {
      fardo: { bg: '#FEF3C7', border: '#F59E0B', text: '#92400E', badge: '#F59E0B' }, // Yellow/Amber
      unidade: { bg: '#FFEDD5', border: '#EA580C', text: '#9A3412', badge: '#EA580C' }, // Orange
      semEstoque: { bg: '#FEE2E2', border: '#DC2626', text: '#991B1B', badge: '#DC2626' }, // Red
    };

    const renderTableSection = (
      title: string,
      emoji: string,
      itemsList: ReceiptItem[],
      colorScheme: typeof colors.fardo,
      showQty: boolean = true,
      suffix: string = ''
    ) => (
      <div style={{ marginBottom: '16px' }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '10px 16px',
            backgroundColor: colorScheme.border,
            borderRadius: '8px 8px 0 0',
          }}
        >
          <span style={{ fontSize: '13px', fontWeight: 700, color: '#fff', letterSpacing: '0.5px' }}>
            {emoji} {title}
          </span>
          <span style={{ fontSize: '12px', fontWeight: 600, color: '#fff' }}>
            {itemsList.length} {itemsList.length === 1 ? 'ITEM' : 'ITENS'}
          </span>
        </div>
        
        {itemsList.length > 0 ? (
          <table
            style={{
              width: '100%',
              borderCollapse: 'collapse',
              backgroundColor: colorScheme.bg,
              borderRadius: '0 0 8px 8px',
              overflow: 'hidden',
            }}
          >
            <thead>
              <tr style={{ backgroundColor: 'rgba(0,0,0,0.05)' }}>
                <th style={{ padding: '8px 16px', textAlign: 'left', fontSize: '10px', fontWeight: 600, color: colorScheme.text, letterSpacing: '0.5px' }}>
                  PRODUTO
                </th>
                {showQty && (
                  <th style={{ padding: '8px 16px', textAlign: 'center', fontSize: '10px', fontWeight: 600, color: colorScheme.text, letterSpacing: '0.5px', width: '100px' }}>
                    QTD
                  </th>
                )}
              </tr>
            </thead>
            <tbody>
              {itemsList.map((item, index) => (
                <tr
                  key={index}
                  style={{
                    borderTop: index > 0 ? '1px solid rgba(0,0,0,0.08)' : 'none',
                  }}
                >
                  <td style={{ padding: '10px 16px', fontSize: '12px', fontWeight: 600, color: colorScheme.text }}>
                    {item.nome.toUpperCase()}
                  </td>
                  {showQty && (
                    <td style={{ padding: '10px 16px', textAlign: 'center' }}>
                      <span
                        style={{
                          display: 'inline-block',
                          padding: '4px 12px',
                          backgroundColor: colorScheme.badge,
                          color: '#fff',
                          borderRadius: '20px',
                          fontSize: '12px',
                          fontWeight: 700,
                          minWidth: '50px',
                        }}
                      >
                        {item.quantidade} {suffix}
                      </span>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <div
            style={{
              padding: '20px',
              backgroundColor: colorScheme.bg,
              borderRadius: '0 0 8px 8px',
              textAlign: 'center',
              fontSize: '12px',
              color: colorScheme.text,
              opacity: 0.7,
            }}
          >
            NENHUM ITEM
          </div>
        )}
      </div>
    );

    return (
      <div
        ref={ref}
        style={{
          fontFamily: "'Segoe UI', 'Roboto', sans-serif",
          backgroundColor: '#1a1a2e',
          width: '600px',
          padding: '0',
          margin: '0 auto',
          borderRadius: '16px',
          overflow: 'hidden',
          boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
        }}
      >
        {/* Header */}
        <div
          style={{
            background: 'linear-gradient(135deg, #E40613 0%, #B30510 100%)',
            padding: '20px 24px',
            textAlign: 'center',
          }}
        >
          <div style={{ fontSize: '11px', fontWeight: 600, color: 'rgba(255,255,255,0.9)', letterSpacing: '2px', marginBottom: '4px' }}>
            COMERCIAL COSTA
          </div>
          <div style={{ fontSize: '22px', fontWeight: 800, color: '#fff', letterSpacing: '1px' }}>
            {tipo.toUpperCase()}
          </div>
          <div
            style={{
              display: 'inline-flex',
              gap: '16px',
              marginTop: '12px',
              padding: '8px 20px',
              backgroundColor: 'rgba(0,0,0,0.2)',
              borderRadius: '24px',
              fontSize: '12px',
              color: '#fff',
              fontWeight: 500,
            }}
          >
            {numero && <span>Nº {String(numero).padStart(6, '0')}</span>}
            <span>{dataFormatada}</span>
            <span>{horaFormatada}</span>
          </div>
        </div>

        {/* Content */}
        <div style={{ padding: '20px 24px' }}>
          {/* Fardos - Yellow */}
          {renderTableSection('FARDOS', '📦', itensFardo, colors.fardo, true, 'FD')}
          
          {/* Unidades - Orange */}
          {renderTableSection('UNIDADES', '🥤', itensUnidade, colors.unidade, true, 'UN')}
          
          {/* Sem Estoque - Red */}
          {itemsSemEstoque.length > 0 && (
            <div style={{ marginBottom: '16px' }}>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '10px 16px',
                  backgroundColor: colors.semEstoque.border,
                  borderRadius: '8px 8px 0 0',
                }}
              >
                <span style={{ fontSize: '13px', fontWeight: 700, color: '#fff', letterSpacing: '0.5px' }}>
                  ⚠️ SEM ESTOQUE - REPOR
                </span>
                <span style={{ fontSize: '12px', fontWeight: 600, color: '#fff' }}>
                  {itemsSemEstoque.length} {itemsSemEstoque.length === 1 ? 'ITEM' : 'ITENS'}
                </span>
              </div>
              <div
                style={{
                  backgroundColor: colors.semEstoque.bg,
                  borderRadius: '0 0 8px 8px',
                  padding: '12px 16px',
                }}
              >
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                  {itemsSemEstoque.map((item, index) => (
                    <span
                      key={index}
                      style={{
                        padding: '6px 12px',
                        backgroundColor: colors.semEstoque.border,
                        color: '#fff',
                        borderRadius: '6px',
                        fontSize: '11px',
                        fontWeight: 600,
                      }}
                    >
                      {item.nome.toUpperCase()}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Summary */}
        <div
          style={{
            padding: '16px 24px',
            backgroundColor: '#16213E',
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: '12px',
          }}
        >
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '24px', fontWeight: 800, color: colors.fardo.badge }}>
              {totalFardos}
            </div>
            <div style={{ fontSize: '10px', fontWeight: 600, color: 'rgba(255,255,255,0.7)', letterSpacing: '0.5px' }}>
              FARDOS
            </div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '24px', fontWeight: 800, color: colors.unidade.badge }}>
              {totalUnidades}
            </div>
            <div style={{ fontSize: '10px', fontWeight: 600, color: 'rgba(255,255,255,0.7)', letterSpacing: '0.5px' }}>
              UNIDADES
            </div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '24px', fontWeight: 800, color: colors.semEstoque.badge }}>
              {itemsSemEstoque.length}
            </div>
            <div style={{ fontSize: '10px', fontWeight: 600, color: 'rgba(255,255,255,0.7)', letterSpacing: '0.5px' }}>
              REPOR
            </div>
          </div>
        </div>

        {/* Footer */}
        <div
          style={{
            padding: '12px 24px',
            backgroundColor: '#0F0F23',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.6)', fontWeight: 500 }}>
            TOTAL: {items.length} PRODUTOS VERIFICADOS
          </div>
          {operador && (
            <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.6)', fontWeight: 500 }}>
              POR: {operador.toUpperCase()}
            </div>
          )}
        </div>
      </div>
    );
  }
);

VisualReceipt.displayName = 'VisualReceipt';

export default VisualReceipt;
