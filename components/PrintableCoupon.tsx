
import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Order } from '../types.ts';

interface PrintableCouponProps {
  order: Order | null;
  onAfterPrint?: () => void;
}

export const PrintableCoupon: React.FC<PrintableCouponProps> = ({ order, onAfterPrint }) => {
  useEffect(() => {
    if (order) {
      // Pequeno delay para garantir que o Portal foi renderizado no DOM e estilos aplicados
      const timer = setTimeout(() => {
        window.print();
        if (onAfterPrint) onAfterPrint();
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [order, onAfterPrint]);

  if (!order) return null;

  return createPortal(
    <div className="print-only" style={{ position: 'absolute', top: 0, left: 0, width: '100%', background: 'white', zIndex: 9999 }}>
      <div style={{ padding: '20px', width: '100%', maxWidth: '80mm', margin: '0 auto', fontFamily: 'monospace', color: 'black' }}>
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '15px' }}>
          <h1 style={{ fontSize: '18px', fontWeight: 'bold', margin: 0 }}>NILO LANCHES</h1>
          <p style={{ fontSize: '12px', margin: '5px 0' }}>Av. Lucas Borges, 317</p>
          <div style={{ borderTop: '1px dashed black', borderBottom: '1px dashed black', padding: '10px 0', margin: '10px 0' }}>
            <p style={{ fontSize: '14px', fontWeight: 'bold', margin: 0 }}>PEDIDO #{order.id}</p>
            <p style={{ fontSize: '10px', margin: 0 }}>{new Date(order.createdAt).toLocaleString('pt-BR')}</p>
          </div>
        </div>

        {/* Client Info */}
        <div style={{ fontSize: '12px', marginBottom: '15px' }}>
          <p style={{ margin: '2px 0' }}><strong>CLIENTE:</strong> {order.customerName}</p>
          <p style={{ margin: '2px 0' }}><strong>TEL:</strong> {order.customerPhone}</p>
          <p style={{ margin: '2px 0' }}><strong>END:</strong> {order.customerAddress}</p>
          <p style={{ margin: '2px 0' }}><strong>TIPO:</strong> {order.deliveryType === 'PICKUP' ? 'RETIRADA' : 'ENTREGA'}</p>
        </div>

        {/* Items */}
        <div style={{ borderTop: '1px solid black', paddingTop: '10px' }}>
          <p style={{ fontWeight: 'bold', fontSize: '12px', marginBottom: '5px' }}>ITENS:</p>
          {order.items.map((item, i) => (
            <div key={i} style={{ marginBottom: '10px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px' }}>
                <span style={{ fontWeight: 'bold' }}>{item.quantity}x {item.name}</span>
                <span>R$ {(item.price * item.quantity).toFixed(2)}</span>
              </div>
              {item.selectedComplements && item.selectedComplements.length > 0 && (
                <div style={{ fontSize: '10px', paddingLeft: '10px', color: '#000' }}>
                  {item.selectedComplements.map((c, j) => (
                    <div key={j}>+ {c.name}</div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Totals */}
        <div style={{ borderTop: '1px dashed black', marginTop: '15px', paddingTop: '10px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px' }}>
            <span>Subtotal:</span>
            <span>R$ {(order.total - order.deliveryFee + (order.discountValue || 0)).toFixed(2)}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px' }}>
            <span>Taxa Entrega:</span>
            <span>R$ {order.deliveryFee.toFixed(2)}</span>
          </div>
          {order.discountValue && order.discountValue > 0 && (
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px' }}>
              <span>Desconto:</span>
              <span>- R$ {order.discountValue.toFixed(2)}</span>
            </div>
          )}
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '16px', fontWeight: 'bold', marginTop: '10px' }}>
            <span>TOTAL:</span>
            <span>R$ {order.total.toFixed(2)}</span>
          </div>
        </div>

        {/* Payment */}
        <div style={{ marginTop: '20px', borderTop: '1px solid black', paddingTop: '10px', textAlign: 'center' }}>
          <p style={{ fontSize: '12px', fontWeight: 'bold' }}>PAGAMENTO: {order.paymentMethod.toUpperCase()}</p>
          {order.changeFor && (
            <p style={{ fontSize: '12px' }}>Troco para: R$ {order.changeFor.toFixed(2)}</p>
          )}
          <p style={{ marginTop: '20px', fontSize: '10px' }}>Obrigado pela preferência!</p>
        </div>
      </div>
    </div>,
    document.body
  );
};
