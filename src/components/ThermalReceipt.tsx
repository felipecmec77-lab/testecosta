import { forwardRef } from 'react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface ReceiptItem {
  nome: string;
  quantidade: number;
  unidade?: string;
  semEstoque?: boolean;
}

interface ThermalReceiptProps {
  items: ReceiptItem[];
  numero?: number;
  data?: Date;
  tipo?: string;
  operador?: string;
}

const ThermalReceipt = forwardRef<HTMLDivElement, ThermalReceiptProps>(
  ({ items, numero, data = new Date(), tipo = 'PEDIDO DE POLPAS', operador }, ref) => {
    const dataFormatada = format(data, "dd/MM/yyyy 'às' HH:mm", { locale: ptBR });

    return (
      <div
        ref={ref}
        style={{
          fontFamily: "'Courier New', Courier, monospace",
          lineHeight: '1.6',
          color: '#000000',
          backgroundColor: '#FFFFFF',
          width: '300px',
          padding: '20px',
          margin: '0 auto',
          WebkitPrintColorAdjust: 'exact',
          printColorAdjust: 'exact',
        }}
      >
        {/* Header */}
        <div style={{ textAlign: 'center', borderBottom: '3px solid #000000', paddingBottom: '16px', marginBottom: '16px' }}>
          <div style={{ fontSize: '22px', fontWeight: 900, letterSpacing: '1px', color: '#000000' }}>COMERCIAL COSTA</div>
          <div style={{ fontSize: '14px', fontWeight: 900, marginTop: '4px', color: '#000000' }}>================================</div>
          <div style={{ fontSize: '18px', fontWeight: 900, marginTop: '12px', color: '#000000' }}>{tipo}</div>
          {numero && <div style={{ fontSize: '14px', fontWeight: 700, marginTop: '4px', color: '#000000' }}>Nº {String(numero).padStart(6, '0')}</div>}
        </div>

        {/* Info */}
        <div style={{ borderBottom: '3px solid #000000', paddingBottom: '16px', marginBottom: '16px', fontSize: '14px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 700, color: '#000000' }}>
            <span>Data:</span>
            <span>{dataFormatada}</span>
          </div>
          {operador && (
            <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 700, marginTop: '4px', color: '#000000' }}>
              <span>Operador:</span>
              <span style={{ maxWidth: '150px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{operador}</span>
            </div>
          )}
        </div>

        {/* Items Header */}
        <div style={{ borderBottom: '3px solid #000000', paddingBottom: '8px', marginBottom: '12px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 900, fontSize: '14px', color: '#000000' }}>
            <span style={{ flex: 1 }}>ITEM</span>
            <span style={{ width: '100px', textAlign: 'right' }}>QTD</span>
          </div>
        </div>

        {/* Items */}
        <div style={{ borderBottom: '3px solid #000000', paddingBottom: '16px', marginBottom: '16px' }}>
          {items.map((item, index) => (
            <div key={index}>
              <div style={{ fontSize: '12px', color: '#666666', textAlign: 'center', letterSpacing: '1px', paddingTop: '8px' }}>
                ..............................
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px', paddingTop: '4px', paddingBottom: '4px', color: '#000000' }}>
                <span style={{ flex: 1, fontWeight: 700, paddingRight: '8px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.nome.toUpperCase()}</span>
                <span 
                  style={{ 
                    width: '100px', 
                    textAlign: 'right', 
                    fontWeight: 900,
                    color: item.semEstoque ? '#CC0000' : '#000000'
                  }}
                >
                  {item.semEstoque ? 'SEM ESTOQUE' : `${item.quantidade}${item.unidade ? ` ${item.unidade}` : ''}`}
                </span>
              </div>
            </div>
          ))}
        </div>

        {/* Total */}
        <div style={{ borderBottom: '3px solid #000000', paddingBottom: '16px', marginBottom: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 900, fontSize: '16px', color: '#000000' }}>
            <span>TOTAL DE ITENS:</span>
            <span>{items.length}</span>
          </div>
        </div>

        {/* Footer */}
        <div style={{ textAlign: 'center', paddingTop: '12px' }}>
          <div style={{ fontSize: '14px', fontWeight: 900, color: '#000000' }}>================================</div>
          <div style={{ fontSize: '20px', fontWeight: 900, letterSpacing: '2px', marginTop: '12px', color: '#000000' }}>COMERCIAL COSTA</div>
          <div style={{ fontSize: '14px', fontWeight: 700, fontStyle: 'italic', marginTop: '8px', color: '#000000' }}>
            PREÇO BAIXO DO JEITO QUE VOCÊ GOSTA!
          </div>
          <div style={{ fontSize: '14px', fontWeight: 900, marginTop: '16px', color: '#000000' }}>********************************</div>
          <div style={{ fontSize: '14px', fontWeight: 700, marginTop: '12px', color: '#000000' }}>
            Obrigado pela preferência!
          </div>
        </div>
      </div>
    );
  }
);

ThermalReceipt.displayName = 'ThermalReceipt';

export default ThermalReceipt;
