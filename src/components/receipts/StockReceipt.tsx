import { forwardRef } from 'react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface ReceiptItem {
  nome: string;
  quantidade: number;
  unidade?: string;
  semEstoque?: boolean;
}

interface StockReceiptProps {
  items: ReceiptItem[];
  numero?: number;
  data?: Date;
  operador?: string;
}

const StockReceipt = forwardRef<HTMLDivElement, StockReceiptProps>(
  ({ items, numero, data = new Date(), operador }, ref) => {
    const dataFormatada = format(data, "dd/MM/yyyy", { locale: ptBR });
    const horaFormatada = format(data, "HH:mm", { locale: ptBR });
    
    const itensFardo = items.filter(item => !item.semEstoque && item.unidade?.toLowerCase() === 'fd');
    const itensUnidade = items.filter(item => !item.semEstoque && item.unidade?.toLowerCase() !== 'fd');
    const itemsSemEstoque = items.filter(item => item.semEstoque);
    
    const totalFardos = itensFardo.reduce((sum, item) => sum + item.quantidade, 0);
    const totalUnidades = itensUnidade.reduce((sum, item) => sum + item.quantidade, 0);

    return (
      <div
        ref={ref}
        style={{
          fontFamily: "'Inter', 'Segoe UI', sans-serif",
          width: '420px',
          margin: '0 auto',
          background: 'linear-gradient(180deg, #0F172A 0%, #1E293B 100%)',
          borderRadius: '24px',
          overflow: 'hidden',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
        }}
      >
        {/* Header com Logo */}
        <div
          style={{
            background: 'linear-gradient(135deg, #DC2626 0%, #991B1B 100%)',
            padding: '24px',
            position: 'relative',
            overflow: 'hidden',
          }}
        >
          {/* Decorative circles */}
          <div style={{
            position: 'absolute',
            top: '-30px',
            right: '-30px',
            width: '100px',
            height: '100px',
            background: 'rgba(255,255,255,0.1)',
            borderRadius: '50%',
          }} />
          <div style={{
            position: 'absolute',
            bottom: '-20px',
            left: '-20px',
            width: '60px',
            height: '60px',
            background: 'rgba(255,255,255,0.08)',
            borderRadius: '50%',
          }} />
          
          <div style={{ position: 'relative', zIndex: 1 }}>
            <div style={{ 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'space-between',
              marginBottom: '16px',
            }}>
              <div>
                <div style={{ 
                  fontSize: '10px', 
                  fontWeight: 600, 
                  color: 'rgba(255,255,255,0.8)', 
                  letterSpacing: '2px',
                  marginBottom: '4px',
                }}>
                  COMERCIAL COSTA
                </div>
                <div style={{ 
                  fontSize: '22px', 
                  fontWeight: 800, 
                  color: '#fff',
                  lineHeight: 1.1,
                }}>
                  Controle de<br/>Estoque
                </div>
              </div>
              <div style={{
                width: '56px',
                height: '56px',
                background: 'rgba(255,255,255,0.15)',
                borderRadius: '16px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '28px',
              }}>
                📦
              </div>
            </div>
            
            <div style={{
              display: 'flex',
              gap: '8px',
              flexWrap: 'wrap',
            }}>
              {numero && (
                <span style={{
                  padding: '6px 12px',
                  background: 'rgba(0,0,0,0.3)',
                  borderRadius: '8px',
                  fontSize: '11px',
                  fontWeight: 600,
                  color: '#fff',
                }}>
                  #{String(numero).padStart(6, '0')}
                </span>
              )}
              <span style={{
                padding: '6px 12px',
                background: 'rgba(0,0,0,0.3)',
                borderRadius: '8px',
                fontSize: '11px',
                fontWeight: 600,
                color: '#fff',
              }}>
                📅 {dataFormatada}
              </span>
              <span style={{
                padding: '6px 12px',
                background: 'rgba(0,0,0,0.3)',
                borderRadius: '8px',
                fontSize: '11px',
                fontWeight: 600,
                color: '#fff',
              }}>
                🕐 {horaFormatada}
              </span>
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(3, 1fr)', 
          gap: '12px',
          padding: '20px',
          background: 'linear-gradient(180deg, rgba(30,41,59,0.5) 0%, transparent 100%)',
        }}>
          <div style={{
            background: 'linear-gradient(135deg, #F59E0B 0%, #D97706 100%)',
            borderRadius: '16px',
            padding: '16px',
            textAlign: 'center',
          }}>
            <div style={{ fontSize: '28px', fontWeight: 800, color: '#fff' }}>
              {totalFardos}
            </div>
            <div style={{ fontSize: '10px', fontWeight: 600, color: 'rgba(255,255,255,0.9)', letterSpacing: '0.5px' }}>
              FARDOS
            </div>
          </div>
          <div style={{
            background: 'linear-gradient(135deg, #3B82F6 0%, #2563EB 100%)',
            borderRadius: '16px',
            padding: '16px',
            textAlign: 'center',
          }}>
            <div style={{ fontSize: '28px', fontWeight: 800, color: '#fff' }}>
              {totalUnidades}
            </div>
            <div style={{ fontSize: '10px', fontWeight: 600, color: 'rgba(255,255,255,0.9)', letterSpacing: '0.5px' }}>
              UNIDADES
            </div>
          </div>
          <div style={{
            background: itemsSemEstoque.length > 0 
              ? 'linear-gradient(135deg, #EF4444 0%, #DC2626 100%)'
              : 'linear-gradient(135deg, #22C55E 0%, #16A34A 100%)',
            borderRadius: '16px',
            padding: '16px',
            textAlign: 'center',
          }}>
            <div style={{ fontSize: '28px', fontWeight: 800, color: '#fff' }}>
              {itemsSemEstoque.length}
            </div>
            <div style={{ fontSize: '10px', fontWeight: 600, color: 'rgba(255,255,255,0.9)', letterSpacing: '0.5px' }}>
              REPOR
            </div>
          </div>
        </div>

        {/* Content */}
        <div style={{ padding: '0 20px 20px' }}>
          {/* Fardos */}
          {itensFardo.length > 0 && (
            <div style={{ marginBottom: '16px' }}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                marginBottom: '10px',
              }}>
                <span style={{ fontSize: '16px' }}>📦</span>
                <span style={{ 
                  fontSize: '12px', 
                  fontWeight: 700, 
                  color: '#F59E0B',
                  letterSpacing: '1px',
                }}>
                  FARDOS
                </span>
                <div style={{ 
                  flex: 1, 
                  height: '1px', 
                  background: 'linear-gradient(90deg, #F59E0B 0%, transparent 100%)',
                }} />
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                {itensFardo.map((item, index) => (
                  <div
                    key={index}
                    style={{
                      background: 'rgba(245, 158, 11, 0.15)',
                      border: '1px solid rgba(245, 158, 11, 0.3)',
                      borderRadius: '10px',
                      padding: '10px 14px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '10px',
                    }}
                  >
                    <span style={{ 
                      fontSize: '12px', 
                      fontWeight: 600, 
                      color: '#fff',
                    }}>
                      {item.nome}
                    </span>
                    <span style={{
                      background: '#F59E0B',
                      color: '#000',
                      padding: '4px 10px',
                      borderRadius: '6px',
                      fontSize: '11px',
                      fontWeight: 800,
                    }}>
                      {item.quantidade}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Unidades */}
          {itensUnidade.length > 0 && (
            <div style={{ marginBottom: '16px' }}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                marginBottom: '10px',
              }}>
                <span style={{ fontSize: '16px' }}>🥤</span>
                <span style={{ 
                  fontSize: '12px', 
                  fontWeight: 700, 
                  color: '#3B82F6',
                  letterSpacing: '1px',
                }}>
                  UNIDADES
                </span>
                <div style={{ 
                  flex: 1, 
                  height: '1px', 
                  background: 'linear-gradient(90deg, #3B82F6 0%, transparent 100%)',
                }} />
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                {itensUnidade.map((item, index) => (
                  <div
                    key={index}
                    style={{
                      background: 'rgba(59, 130, 246, 0.15)',
                      border: '1px solid rgba(59, 130, 246, 0.3)',
                      borderRadius: '10px',
                      padding: '10px 14px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '10px',
                    }}
                  >
                    <span style={{ 
                      fontSize: '12px', 
                      fontWeight: 600, 
                      color: '#fff',
                    }}>
                      {item.nome}
                    </span>
                    <span style={{
                      background: '#3B82F6',
                      color: '#fff',
                      padding: '4px 10px',
                      borderRadius: '6px',
                      fontSize: '11px',
                      fontWeight: 800,
                    }}>
                      {item.quantidade}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Sem Estoque */}
          {itemsSemEstoque.length > 0 && (
            <div>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                marginBottom: '10px',
              }}>
                <span style={{ fontSize: '16px' }}>⚠️</span>
                <span style={{ 
                  fontSize: '12px', 
                  fontWeight: 700, 
                  color: '#EF4444',
                  letterSpacing: '1px',
                }}>
                  SEM ESTOQUE
                </span>
                <div style={{ 
                  flex: 1, 
                  height: '1px', 
                  background: 'linear-gradient(90deg, #EF4444 0%, transparent 100%)',
                }} />
              </div>
              <div style={{ 
                background: 'rgba(239, 68, 68, 0.1)',
                border: '1px solid rgba(239, 68, 68, 0.3)',
                borderRadius: '12px',
                padding: '12px',
              }}>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                  {itemsSemEstoque.map((item, index) => (
                    <span
                      key={index}
                      style={{
                        background: 'linear-gradient(135deg, #EF4444 0%, #DC2626 100%)',
                        color: '#fff',
                        padding: '8px 14px',
                        borderRadius: '8px',
                        fontSize: '11px',
                        fontWeight: 700,
                      }}
                    >
                      {item.nome}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div
          style={{
            padding: '16px 20px',
            background: 'linear-gradient(180deg, transparent 0%, rgba(0,0,0,0.3) 100%)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            borderTop: '1px solid rgba(255,255,255,0.1)',
          }}
        >
          <div style={{ 
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
          }}>
            <span style={{ fontSize: '12px' }}>🔒</span>
            <span style={{ 
              fontSize: '10px', 
              color: 'rgba(255,255,255,0.5)', 
              fontWeight: 600,
              letterSpacing: '1px',
            }}>
              USO INTERNO
            </span>
          </div>
          {operador && (
            <div style={{ 
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}>
              <span style={{ fontSize: '12px' }}>👤</span>
              <span style={{ 
                fontSize: '10px', 
                color: 'rgba(255,255,255,0.5)', 
                fontWeight: 600,
              }}>
                {operador.toUpperCase()}
              </span>
            </div>
          )}
        </div>
      </div>
    );
  }
);

StockReceipt.displayName = 'StockReceipt';

export default StockReceipt;