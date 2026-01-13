import { forwardRef } from 'react';
import { formatInTimeZone } from 'date-fns-tz';
import { ptBR } from 'date-fns/locale';

interface LossItem {
  codigo_barras?: string;
  nome: string;
  quantidade: number;
  preco_unitario: number;
  valor_total: number;
  motivo: string;
  data_vencimento?: string;
}

interface ThermalLossReceiptProps {
  items: LossItem[];
  numero: number;
  data: Date;
  operador: string;
  observacao?: string;
}

const TIMEZONE = 'America/Sao_Paulo';

const ThermalLossReceipt = forwardRef<HTMLDivElement, ThermalLossReceiptProps>(
  ({ items, numero, data, operador, observacao }, ref) => {
    const dataFormatada = formatInTimeZone(data, TIMEZONE, "dd/MM/yyyy 'às' HH:mm", { locale: ptBR });
    const totalGeral = items.reduce((sum, item) => sum + item.valor_total, 0);
    const totalItens = items.reduce((sum, item) => sum + item.quantidade, 0);

    // Função para truncar nomes longos
    const truncateName = (name: string, maxLength: number = 28) => {
      if (name.length <= maxLength) return name;
      return name.substring(0, maxLength - 3) + '...';
    };

    return (
      <div
        ref={ref}
        style={{
          fontFamily: "'Courier New', Courier, monospace",
          lineHeight: '1.5',
          color: '#000000',
          backgroundColor: '#FFFFFF',
          width: '320px',
          padding: '24px',
          margin: '0 auto',
          WebkitPrintColorAdjust: 'exact',
          printColorAdjust: 'exact',
        }}
      >
        {/* Header */}
        <div style={{ textAlign: 'center', borderBottom: '3px dashed #000000', paddingBottom: '16px', marginBottom: '16px' }}>
          <div style={{ fontSize: '24px', fontWeight: 900, letterSpacing: '2px', color: '#000000' }}>COMERCIAL COSTA</div>
          <div style={{ fontSize: '14px', fontWeight: 900, marginTop: '8px', color: '#000000' }}>================================</div>
          <div style={{ fontSize: '20px', fontWeight: 900, marginTop: '12px', color: '#000000' }}>COMPROVANTE DE PERDAS</div>
          <div style={{ fontSize: '18px', fontWeight: 900, marginTop: '8px', color: '#000000' }}>Nº {String(numero).padStart(6, '0')}</div>
        </div>

        {/* Info */}
        <div style={{ borderBottom: '3px dashed #000000', paddingBottom: '16px', marginBottom: '16px', fontSize: '14px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 900, color: '#000000' }}>
            <span>Data:</span>
            <span>{dataFormatada}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 900, marginTop: '8px', color: '#000000' }}>
            <span>Operador:</span>
            <span style={{ maxWidth: '160px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{operador}</span>
          </div>
        </div>

        {/* Items Header */}
        <div style={{ borderBottom: '2px solid #000000', paddingBottom: '8px', marginBottom: '12px' }}>
          <div style={{ fontWeight: 900, fontSize: '16px', color: '#000000', textAlign: 'center' }}>
            ITENS PERDIDOS
          </div>
        </div>

        {/* Items */}
        <div style={{ borderBottom: '3px dashed #000000', paddingBottom: '16px', marginBottom: '16px' }}>
          {items.map((item, index) => (
            <div key={index} style={{ marginBottom: '14px', borderBottom: index < items.length - 1 ? '1px dotted #666' : 'none', paddingBottom: '12px' }}>
              <div style={{ fontSize: '14px', fontWeight: 900, color: '#000000', marginBottom: '4px', wordBreak: 'break-word', lineHeight: '1.3' }}>
                {truncateName(item.nome.toUpperCase())}
              </div>
              {item.codigo_barras && (
                <div style={{ fontSize: '12px', color: '#000000', marginBottom: '4px', fontWeight: 700 }}>
                  COD: {item.codigo_barras}
                </div>
              )}
              <div style={{ fontSize: '13px', display: 'flex', justifyContent: 'space-between', color: '#000000', fontWeight: 700 }}>
                <span>Motivo: {item.motivo}</span>
              </div>
              {item.data_vencimento && (
                <div style={{ fontSize: '13px', color: '#CC0000', fontWeight: 900, marginTop: '4px' }}>
                  VENC: {item.data_vencimento}
                </div>
              )}
              <div style={{ fontSize: '14px', display: 'flex', justifyContent: 'space-between', fontWeight: 900, marginTop: '6px', color: '#000000' }}>
                <span>{item.quantidade}x R$ {item.preco_unitario.toFixed(2)}</span>
                <span>R$ {item.valor_total.toFixed(2)}</span>
              </div>
            </div>
          ))}
        </div>

        {/* Totals */}
        <div style={{ borderBottom: '3px dashed #000000', paddingBottom: '16px', marginBottom: '16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 900, fontSize: '14px', color: '#000000' }}>
            <span>TOTAL DE ITENS:</span>
            <span>{totalItens}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 900, fontSize: '20px', color: '#000000', marginTop: '12px' }}>
            <span>VALOR TOTAL:</span>
            <span>R$ {totalGeral.toFixed(2)}</span>
          </div>
        </div>

        {/* Observação */}
        {observacao && (
          <div style={{ borderBottom: '3px dashed #000000', paddingBottom: '16px', marginBottom: '16px' }}>
            <div style={{ fontSize: '13px', fontWeight: 900, color: '#000000' }}>OBS:</div>
            <div style={{ fontSize: '13px', color: '#000000', marginTop: '6px', fontWeight: 700, wordBreak: 'break-word' }}>{observacao}</div>
          </div>
        )}

        {/* Footer */}
        <div style={{ textAlign: 'center', paddingTop: '12px' }}>
          <div style={{ fontSize: '14px', fontWeight: 900, color: '#000000' }}>================================</div>
          <div style={{ fontSize: '13px', fontWeight: 900, marginTop: '12px', color: '#000000' }}>
            Documento para controle interno
          </div>
          <div style={{ fontSize: '13px', fontWeight: 900, marginTop: '6px', color: '#000000' }}>
            e envio aos fornecedores
          </div>
          <div style={{ fontSize: '14px', fontWeight: 900, marginTop: '16px', color: '#000000' }}>********************************</div>
          <div style={{ fontSize: '20px', fontWeight: 900, letterSpacing: '2px', marginTop: '12px', color: '#000000' }}>COMERCIAL COSTA</div>
        </div>
      </div>
    );
  }
);

ThermalLossReceipt.displayName = 'ThermalLossReceipt';

export default ThermalLossReceipt;
