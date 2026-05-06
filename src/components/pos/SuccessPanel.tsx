import React from 'react';
import { CheckCircle, Star, Printer } from 'lucide-react';

interface SuccessPanelProps {
  saleCode: string;
  mesaName: string;
  newBalance: number;
  onPrint: () => void;
  onClose: () => void;
  nextMilestone: { icon: string; reward: string } | null;
  pointsResult: { totalPoints: number; bonusReasons: string[] } | null;
}

export const SuccessPanel: React.FC<SuccessPanelProps> = ({
  saleCode,
  mesaName,
  newBalance,
  onPrint,
  onClose,
  nextMilestone,
  pointsResult,
}) => (
  <div className="bg-white w-full sm:max-w-sm rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden">
    <div className="bg-emerald-500 px-6 pt-8 pb-6 flex flex-col items-center text-white text-center">
      <div className="h-16 w-16 bg-white/20 rounded-full flex items-center justify-center mb-3">
        <CheckCircle className="h-9 w-9 text-white" />
      </div>
      <h3 className="font-display font-bold text-2xl">¡Cobro exitoso!</h3>
      <p className="text-emerald-100 text-sm mt-1 font-mono">{saleCode}</p>
      <p className="text-emerald-200 text-xs mt-1">{mesaName} liberada</p>
    </div>

    <div className="p-5 space-y-3">
      {nextMilestone && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl px-4 py-3 text-center">
          <p className="text-2xl mb-1">{nextMilestone.icon}</p>
          <p className="text-sm font-bold text-amber-800">¡Hito alcanzado!</p>
          <p className="text-xs text-amber-600 mt-0.5">{nextMilestone.reward}</p>
        </div>
      )}

      {pointsResult && pointsResult.totalPoints > 0 && (
        <div className="bg-coffee-50 rounded-2xl px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Star className="h-5 w-5 fill-amber-400 text-amber-400" />
            <div>
              <p className="text-sm font-bold text-coffee-900">+{pointsResult.totalPoints} puntos</p>
              {pointsResult.bonusReasons.length > 0 && (
                <p className="text-xs text-coffee-500">{pointsResult.bonusReasons.join(' · ')}</p>
              )}
            </div>
          </div>
          <div className="text-right">
            <p className="text-xs text-coffee-400">Saldo total</p>
            <p className="text-sm font-bold text-coffee-800">{newBalance} pts</p>
          </div>
        </div>
      )}

      <div className="flex gap-3 pt-1">
        <button
          onClick={onPrint}
          className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl border-2 border-coffee-200 text-coffee-700 font-semibold text-sm hover:bg-coffee-50 transition-colors"
        >
          <Printer className="h-4 w-4" /> Recibo
        </button>
        <button
          onClick={onClose}
          className="flex-1 py-3 rounded-xl bg-coffee-800 text-cream font-bold text-sm hover:bg-coffee-700 active:scale-95 transition-all"
        >
          Listo
        </button>
      </div>
    </div>
  </div>
);