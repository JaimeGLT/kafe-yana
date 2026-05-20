import React from 'react';
import { Plus, Minus, Gift } from 'lucide-react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { ProductImage } from '../ui/ProductImage';
import type { Product, Reward } from '../../types';

interface RedeemQtyModalProps {
  isOpen: boolean;
  onClose: () => void;
  product: Product;
  reward: Reward;
  availablePoints: number;
  onConfirm: (qty: number) => void;
}

export const RedeemQtyModal: React.FC<RedeemQtyModalProps> = ({
  isOpen, onClose, product, reward, availablePoints, onConfirm,
}) => {
  const [qty, setQty] = React.useState(1);
  const maxQty = Math.max(1, Math.floor(availablePoints / reward.pointsCost));

  React.useEffect(() => { if (isOpen) setQty(1); }, [isOpen]);

  const totalPts  = qty * reward.pointsCost;
  const remaining = availablePoints - totalPts;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Canjear recompensa" size="sm" closeOnOverlay={false}>
      <div className="space-y-4">
        <div className="flex items-center gap-3 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
          <ProductImage src={product.image} tipo={product.tipo} size="sm" />
          <div>
            <p className="font-semibold text-coffee-900">{product.name}</p>
            <p className="text-xs text-amber-700">{reward.pointsCost} pts por unidad · gratis</p>
          </div>
        </div>

        <div className="flex items-center justify-between bg-coffee-50 rounded-xl px-4 py-3">
          <span className="text-sm font-medium text-coffee-700">Cantidad</span>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setQty(q => Math.max(1, q - 1))}
              disabled={qty <= 1}
              className="w-8 h-8 rounded-full bg-white border border-coffee-200 flex items-center justify-center disabled:opacity-40 hover:bg-coffee-50 transition-colors"
            >
              <Minus className="h-3 w-3" />
            </button>
            <span className="text-lg font-bold text-coffee-900 w-6 text-center">{qty}</span>
            <button
              onClick={() => setQty(q => Math.min(maxQty, q + 1))}
              disabled={qty >= maxQty}
              className="w-8 h-8 rounded-full bg-white border border-coffee-200 flex items-center justify-center disabled:opacity-40 hover:bg-coffee-50 transition-colors"
            >
              <Plus className="h-3 w-3" />
            </button>
          </div>
        </div>

        <div className="space-y-1.5 border-t border-coffee-100 pt-3">
          <div className="flex justify-between text-sm">
            <span className="text-coffee-600">Puntos a usar</span>
            <span className="font-semibold text-amber-700">−{totalPts} pts</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-coffee-600">Saldo restante</span>
            <span className="font-semibold text-coffee-900">{remaining} pts</span>
          </div>
        </div>

        <div className="flex gap-2">
          <Button variant="ghost" size="sm" className="flex-1" onClick={onClose}>Cancelar</Button>
          <Button
            size="sm"
            className="flex-1 bg-amber-500 hover:bg-amber-600 text-white"
            leftIcon={<Gift className="h-3.5 w-3.5" />}
            onClick={() => { onConfirm(qty); onClose(); }}
          >
            Canjear{qty > 1 ? ` ${qty}×` : ''} · Gratis
          </Button>
        </div>
      </div>
    </Modal>
  );
};
