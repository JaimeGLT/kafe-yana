import type { Product } from '../types';

export const getProductEmoji = (product: Product): string => {
  const n = product.name.toLowerCase();
  if (n.includes('café') || n.includes('cafe') || n.includes('espresso') || n.includes('latte') || n.includes('capuchino') || n.includes('americano')) return '☕';
  if (n.includes('té') || n.includes('infusión')) return '🍵';
  if (n.includes('jugo') || n.includes('smoothie')) return '🥤';
  if (n.includes('ice') || n.includes('frío')) return '🧋';
  if (n.includes('agua')) return '💧';
  if (n.includes('torta') || n.includes('pastel') || n.includes('brownie')) return '🎂';
  if (n.includes('postre') || n.includes('pie')) return '🍰';
  if (n.includes('galleta') || n.includes('masita') || n.includes('alfajor')) return '🍪';
  if (n.includes('pan') || n.includes('panini') || n.includes('sandwich')) return '🥪';
  if (n.includes('empanada') || n.includes('cuñap')) return '🥐';
  if (n.includes('combo')) return '🎁';
  if (n.includes('desayuno')) return '🍳';
  if (product.tipo === 'elaborado') return '☕';
  return '☕';
};
