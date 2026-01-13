import { forwardRef } from 'react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface ReceiptItem {
  nome: string;
  quantidade: number;
  unidade?: string;
  unidadesPorFardo?: number;
  semEstoque?: boolean;
}

interface SupplierReceiptProps {
  items: ReceiptItem[];
  numero?: number;
  data?: Date;
  operador?: string;
}

const SupplierReceipt = forwardRef<HTMLDivElement, SupplierReceiptProps>(
  ({ items, numero, data = new Date(), operador }, ref) => {
    const dataFormatada = format(data, "dd/MM/yyyy", { locale: ptBR });
    const horaFormatada = format(data, "HH:mm", { locale: ptBR });
    
    const itensComPedido = items.filter(item => item.quantidade > 0);
    
    const totalFardos = itensComPedido
      .filter(item => item.unidade?.toLowerCase() === 'fd')
      .reduce((sum, item) => sum + item.quantidade, 0);
    
    const totalUnidadesExpandidas = itensComPedido
      .filter(item => item.unidade?.toLowerCase() === 'fd')
      .reduce((sum, item) => sum + (item.quantidade * (item.unidadesPorFardo || 6)), 0);

    return (
      <div
        ref={ref}
        style={{
          fontFamily: "'Inter', 'Segoe UI', sans-serif",
          width: '480px',
          margin: '0 auto',
          background: '#ffffff',
          borderRadius: '24px',
          overflow: 'hidden',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
        }}
      >
        {/* Header Premium */}
        <div
          style={{
            background: 'linear-gradient(135deg, #DC2626 0%, #7F1D1D 100%)',
            padding: '28px 24px',
            position: 'relative',
            overflow: 'hidden',
          }}
        >
          {/* Pattern overlay */}
          <div style={{
            position: 'absolute',
            inset: 0,
            background: 'url("data:image/svg+xml,%3Csvg width="20" height="20" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg"%3E%3Cg fill="%23ffffff" fill-opacity="0.05"%3E%3Ccircle cx="1" cy="1" r="1"/%3E%3C/g%3E%3C/svg%3E")',
          }} />
          
          <div style={{ position: 'relative', zIndex: 1 }}>
            <div style={{ 
              display: 'flex', 
              alignItems: 'flex-start', 
              justifyContent: 'space-between',
            }}>
              <div>
                <div style={{ 
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '4px 10px',
                  background: 'rgba(255,255,255,0.2)',
                  borderRadius: '6px',
                  marginBottom: '12px',
                }}>
                  <span style={{ fontSize: '10px' }}>🏪</span>
                  <span style={{ 
                    fontSize: '10px', 
                    fontWeight: 700, 
                    color: '#fff', 
                    letterSpacing: '1.5px',
                  }}>
                    COMERCIAL COSTA
                  </span>
                </div>
                <div style={{ 
                  fontSize: '26px', 
                  fontWeight: 800, 
                  color: '#fff',
                  lineHeight: 1.2,
                  marginBottom: '4px',
                }}>
                  Pedido
                </div>
                <div style={{ 
                  fontSize: '14px', 
                  fontWeight: 500, 
                  color: 'rgba(255,255,255,0.8)',
                }}>
                  Coca-Cola
                </div>
              </div>
              
              <div style={{
                background: 'rgba(255,255,255,0.15)',
                backdropFilter: 'blur(10px)',
                borderRadius: '16px',
                padding: '14px',
                textAlign: 'center',
                minWidth: '90px',
              }}>
                <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.7)', marginBottom: '4px' }}>
                  PEDIDO Nº
                </div>
                <div style={{ fontSize: '20px', fontWeight: 800, color: '#fff' }}>
                  {numero ? String(numero).padStart(6, '0') : '------'}
                </div>
              </div>
            </div>
            
            <div style={{
              display: 'flex',
              gap: '16px',
              marginTop: '20px',
              paddingTop: '16px',
              borderTop: '1px solid rgba(255,255,255,0.2)',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ fontSize: '14px' }}>📅</span>
                <span style={{ fontSize: '13px', color: '#fff', fontWeight: 500 }}>
                  {dataFormatada}
                </span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ fontSize: '14px' }}>🕐</span>
                <span style={{ fontSize: '13px', color: '#fff', fontWeight: 500 }}>
                  {horaFormatada}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Quick Stats */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          background: '#F8FAFC',
          borderBottom: '1px solid #E2E8F0',
        }}>
          <div style={{
            padding: '16px',
            textAlign: 'center',
            borderRight: '1px solid #E2E8F0',
          }}>
            <div style={{ fontSize: '24px', fontWeight: 800, color: '#F59E0B' }}>
              {totalFardos}
            </div>
            <div style={{ fontSize: '10px', fontWeight: 600, color: '#64748B', letterSpacing: '0.5px' }}>
              FARDOS
            </div>
          </div>
          <div style={{
            padding: '16px',
            textAlign: 'center',
            borderRight: '1px solid #E2E8F0',
          }}>
            <div style={{ fontSize: '24px', fontWeight: 800, color: '#3B82F6' }}>
              {totalUnidadesExpandidas}
            </div>
            <div style={{ fontSize: '10px', fontWeight: 600, color: '#64748B', letterSpacing: '0.5px' }}>
              UNIDADES
            </div>
          </div>
          <div style={{
            padding: '16px',
            textAlign: 'center',
          }}>
            <div style={{ fontSize: '24px', fontWeight: 800, color: '#10B981' }}>
              {itensComPedido.length}
            </div>
            <div style={{ fontSize: '10px', fontWeight: 600, color: '#64748B', letterSpacing: '0.5px' }}>
              ITENS
            </div>
          </div>
        </div>

        {/* Items List */}
        <div style={{ padding: '20px' }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            marginBottom: '16px',
          }}>
            <span style={{ fontSize: '16px' }}>📋</span>
            <span style={{ 
              fontSize: '12px', 
              fontWeight: 700, 
              color: '#334155',
              letterSpacing: '1px',
            }}>
              PRODUTOS DO PEDIDO
            </span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {itensComPedido.map((item, index) => {
              const isFardo = item.unidade?.toLowerCase() === 'fd';
              const unidadesPorFardo = item.unidadesPorFardo || 6;
              const unidadesTotal = isFardo ? item.quantidade * unidadesPorFardo : item.quantidade;

              return (
                <div
                  key={index}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '14px 16px',
                    background: index % 2 === 0 ? '#F8FAFC' : '#fff',
                    borderRadius: '12px',
                    border: '1px solid #E2E8F0',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{
                      width: '36px',
                      height: '36px',
                      background: isFardo 
                        ? 'linear-gradient(135deg, #FEF3C7 0%, #FDE68A 100%)'
                        : 'linear-gradient(135deg, #DBEAFE 0%, #BFDBFE 100%)',
                      borderRadius: '10px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '16px',
                    }}>
                      {isFardo ? '📦' : '🥤'}
                    </div>
                    <div>
                      <div style={{ 
                        fontSize: '13px', 
                        fontWeight: 700, 
                        color: '#1E293B',
                        marginBottom: '2px',
                      }}>
                        {item.nome}
                      </div>
                      <div style={{ 
                        fontSize: '11px', 
                        color: '#64748B',
                      }}>
                        {isFardo ? `${unidadesPorFardo} un/fardo` : 'Avulso'}
                      </div>
                    </div>
                  </div>
                  
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    {isFardo && (
                      <div style={{
                        padding: '6px 12px',
                        background: 'linear-gradient(135deg, #F59E0B 0%, #D97706 100%)',
                        borderRadius: '8px',
                        textAlign: 'center',
                      }}>
                        <div style={{ fontSize: '14px', fontWeight: 800, color: '#fff' }}>
                          {item.quantidade}
                        </div>
                        <div style={{ fontSize: '8px', fontWeight: 600, color: 'rgba(255,255,255,0.8)' }}>
                          FD
                        </div>
                      </div>
                    )}
                    <div style={{
                      padding: '6px 12px',
                      background: 'linear-gradient(135deg, #3B82F6 0%, #2563EB 100%)',
                      borderRadius: '8px',
                      textAlign: 'center',
                    }}>
                      <div style={{ fontSize: '14px', fontWeight: 800, color: '#fff' }}>
                        {unidadesTotal}
                      </div>
                      <div style={{ fontSize: '8px', fontWeight: 600, color: 'rgba(255,255,255,0.8)' }}>
                        UN
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Footer */}
        <div
          style={{
            padding: '16px 20px',
            background: 'linear-gradient(180deg, #F1F5F9 0%, #E2E8F0 100%)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <div style={{ 
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}>
            <div style={{
              width: '8px',
              height: '8px',
              background: '#10B981',
              borderRadius: '50%',
            }} />
            <span style={{ 
              fontSize: '11px', 
              color: '#64748B', 
              fontWeight: 600,
            }}>
              PEDIDO PARA FORNECEDOR
            </span>
          </div>
          {operador && (
            <div style={{ 
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '6px 12px',
              background: '#fff',
              borderRadius: '8px',
              border: '1px solid #E2E8F0',
            }}>
              <span style={{ fontSize: '12px' }}>👤</span>
              <span style={{ 
                fontSize: '11px', 
                color: '#334155', 
                fontWeight: 600,
              }}>
                {operador}
              </span>
            </div>
          )}
        </div>
      </div>
    );
  }
);

SupplierReceipt.displayName = 'SupplierReceipt';

export default SupplierReceipt;