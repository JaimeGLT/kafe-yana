import React from 'react';
import { ShoppingBag, FlaskConical, Layers } from 'lucide-react';
import { clsx } from 'clsx';
import type { ProductTipo } from '../../types';

const isImageUrl = (s?: string): boolean =>
  !!s && (s.startsWith('http') || s.startsWith('data:') || s.startsWith('blob:') || s.startsWith('/'));

const SIZE_MAP = {
  xs: { box: 'w-8 h-8', icon: 'h-3.5 w-3.5' },
  sm: { box: 'w-9 h-9', icon: 'h-4 w-4' },
  md: { box: 'w-11 h-11', icon: 'h-5 w-5' },
  lg: { box: 'w-14 h-14', icon: 'h-6 w-6' },
  xl: { box: 'w-20 h-20', icon: 'h-8 w-8' },
} as const;

const TYPE_COLOR: Record<ProductTipo, string> = {
  comprado: 'bg-blue-50 text-blue-400',
  elaborado: 'bg-amber-50 text-amber-400',
  combo: 'bg-purple-50 text-purple-400',
};

const TypeIcon = ({ tipo, cls }: { tipo: ProductTipo; cls: string }) => {
  if (tipo === 'elaborado') return <FlaskConical className={cls} />;
  if (tipo === 'combo') return <Layers className={cls} />;
  return <ShoppingBag className={cls} />;
};

interface ProductImageProps {
  src?: string;
  tipo?: ProductTipo;
  size?: keyof typeof SIZE_MAP;
  rounded?: string;
  className?: string;
}

export const ProductImage: React.FC<ProductImageProps> = ({
  src,
  tipo = 'comprado',
  size = 'md',
  rounded = 'rounded-xl',
  className,
}) => {
  const { box, icon } = SIZE_MAP[size];

  if (isImageUrl(src)) {
    return (
      <div className={clsx(box, rounded, 'overflow-hidden flex-shrink-0', className)}>
        <img src={src} alt="" draggable={false} className="w-full h-full object-cover" />
      </div>
    );
  }

  return (
    <div className={clsx(box, rounded, 'flex-shrink-0 flex items-center justify-center', TYPE_COLOR[tipo], className)}>
      <TypeIcon tipo={tipo} cls={icon} />
    </div>
  );
};

interface ProductImageFillProps {
  src?: string;
  tipo?: ProductTipo;
  className?: string;
  iconSize?: string;
}

export const ProductImageFill: React.FC<ProductImageFillProps> = ({
  src,
  tipo = 'comprado',
  className,
  iconSize = 'h-10 w-10',
}) => {
  if (isImageUrl(src)) {
    return <img src={src} alt="" draggable={false} className={clsx('w-full h-full object-cover', className)} />;
  }
  return (
    <div className={clsx('w-full h-full flex items-center justify-center', TYPE_COLOR[tipo], className)}>
      <TypeIcon tipo={tipo} cls={iconSize} />
    </div>
  );
};
