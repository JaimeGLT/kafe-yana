import React, { useState, useMemo } from 'react';
import { Search, X } from 'lucide-react';
import { clsx } from 'clsx';
import type { ProductTipo } from '../../types';

interface EmojiEntry {
  emoji: string;
  keywords: string;
}

const EMOJI_LIST: EmojiEntry[] = [
  // Café y bebidas calientes
  { emoji: '☕', keywords: 'café americano espresso cappuccino cortado' },
  { emoji: '🍵', keywords: 'té infusión manzanilla hierba' },
  { emoji: '🧋', keywords: 'frappé frappe bubble tea licuado frío batido' },
  { emoji: '🫖', keywords: 'tetera té hervido infusión' },
  { emoji: '🍶', keywords: 'sake bebida caliente vasito' },
  // Bebidas frías y gaseosas
  { emoji: '🥤', keywords: 'gaseosa refresco coca cola fanta bebida vaso' },
  { emoji: '🧃', keywords: 'jugo zumo néctar upes caja' },
  { emoji: '🍹', keywords: 'cóctel tropical bebida frutal' },
  { emoji: '🍸', keywords: 'cocktail copa martini' },
  { emoji: '🥂', keywords: 'copa champagne brindis vino' },
  { emoji: '🍺', keywords: 'cerveza beer' },
  { emoji: '🍻', keywords: 'cervezas brindis' },
  { emoji: '🥛', keywords: 'leche lácteo vaso' },
  { emoji: '💧', keywords: 'agua mineral pura' },
  { emoji: '🧊', keywords: 'hielo frío' },
  // Postres y dulces
  { emoji: '🍰', keywords: 'torta pastel tarta postre rebanada' },
  { emoji: '🎂', keywords: 'torta cumpleaños pastel' },
  { emoji: '🧁', keywords: 'cupcake muffin postre' },
  { emoji: '🍩', keywords: 'dona rosquilla postre' },
  { emoji: '🍪', keywords: 'galleta cookie postre' },
  { emoji: '🍫', keywords: 'chocolate barra postre dulce' },
  { emoji: '🍬', keywords: 'caramelo dulce candy' },
  { emoji: '🍭', keywords: 'chupete lollipop piruleta dulce' },
  { emoji: '🍮', keywords: 'flan pudín postre' },
  { emoji: '🍨', keywords: 'helado postre taza' },
  { emoji: '🍦', keywords: 'helado cono postre suave' },
  { emoji: '🍧', keywords: 'raspadilla granizado helado sorbete' },
  // Panadería
  { emoji: '🥐', keywords: 'croissant medialuna cuñape pan pastelería' },
  { emoji: '🥖', keywords: 'baguette pan francés' },
  { emoji: '🍞', keywords: 'pan sandwich molde' },
  { emoji: '🧇', keywords: 'waffle gofre' },
  { emoji: '🥞', keywords: 'pancake hotcake crepe' },
  { emoji: '🫓', keywords: 'pan plano flatbread tostada' },
  { emoji: '🥨', keywords: 'pretzel sal torcido' },
  // Comida salada
  { emoji: '🥙', keywords: 'empanada salteña wrap pita relleno' },
  { emoji: '🥪', keywords: 'sandwich sándwich' },
  { emoji: '🌮', keywords: 'taco tortilla' },
  { emoji: '🌯', keywords: 'burrito wrap enrollado' },
  { emoji: '🥗', keywords: 'ensalada salad vegetal' },
  { emoji: '🍕', keywords: 'pizza' },
  { emoji: '🍔', keywords: 'hamburguesa burger' },
  { emoji: '🌭', keywords: 'hot dog salchicha perro caliente' },
  { emoji: '🥩', keywords: 'carne bistec steak parrilla' },
  { emoji: '🍗', keywords: 'pollo chicken alita' },
  { emoji: '🍖', keywords: 'carne hueso pierna' },
  { emoji: '🥚', keywords: 'huevo egg' },
  { emoji: '🍳', keywords: 'huevo frito sartén' },
  { emoji: '🧆', keywords: 'falafel bolita' },
  { emoji: '🥓', keywords: 'tocino bacon' },
  // Frutas
  { emoji: '🍎', keywords: 'manzana fruta roja' },
  { emoji: '🍊', keywords: 'naranja mandarina fruta cítrico' },
  { emoji: '🍋', keywords: 'limón limonada fruta' },
  { emoji: '🍇', keywords: 'uva fruta racimo' },
  { emoji: '🍓', keywords: 'frutilla fresa fruta' },
  { emoji: '🫐', keywords: 'arándano fruta azul' },
  { emoji: '🍒', keywords: 'cereza fruta' },
  { emoji: '🍑', keywords: 'durazno melocotón fruta' },
  { emoji: '🥭', keywords: 'mango fruta tropical' },
  { emoji: '🍍', keywords: 'piña ananá fruta tropical' },
  { emoji: '🥝', keywords: 'kiwi fruta verde' },
  { emoji: '🍌', keywords: 'banana plátano fruta' },
  { emoji: '🍉', keywords: 'sandía melón fruta' },
  // Otros / Especiales
  { emoji: '⭐', keywords: 'estrella especial favorito destacado' },
  { emoji: '❤️', keywords: 'corazón amor favorito especial' },
  { emoji: '🔥', keywords: 'fuego picante caliente popular trending' },
  { emoji: '🎁', keywords: 'regalo combo pack' },
  { emoji: '🏆', keywords: 'trofeo mejor premium' },
  { emoji: '👑', keywords: 'corona premium especial vip' },
  { emoji: '🌿', keywords: 'planta hierba vegetal natural orgánico' },
  { emoji: '🫘', keywords: 'granos café frijol legumbre' },
  { emoji: '🌰', keywords: 'castaña nuez' },
  { emoji: '🥜', keywords: 'maní cacahuate nuez' },
  { emoji: '🧂', keywords: 'sal condimento' },
  { emoji: '📦', keywords: 'caja paquete producto insumo' },
  { emoji: '🛒', keywords: 'carrito compra insumo' },
  { emoji: '💎', keywords: 'diamante premium lujo exclusivo' },
  { emoji: '🎯', keywords: 'objetivo especial oferta' },
];

const EMOJI_GROUPS = [
  { label: 'Café y bebidas calientes', emojis: ['☕', '🍵', '🧋', '🫖', '🍶'] },
  { label: 'Bebidas frías y gaseosas', emojis: ['🥤', '🧃', '🍹', '🍸', '🥂', '🍺', '🍻', '🥛', '💧', '🧊'] },
  { label: 'Postres y dulces', emojis: ['🍰', '🎂', '🧁', '🍩', '🍪', '🍫', '🍬', '🍭', '🍮', '🍨', '🍦', '🍧'] },
  { label: 'Panadería', emojis: ['🥐', '🥖', '🍞', '🧇', '🥞', '🫓', '🥨'] },
  { label: 'Comida salada', emojis: ['🥙', '🥪', '🌮', '🌯', '🥗', '🍕', '🍔', '🌭', '🥩', '🍗', '🍖', '🥚', '🍳', '🧆', '🥓'] },
  { label: 'Frutas', emojis: ['🍎', '🍊', '🍋', '🍇', '🍓', '🫐', '🍒', '🍑', '🥭', '🍍', '🥝', '🍌', '🍉'] },
  { label: 'Otros', emojis: ['⭐', '❤️', '🔥', '🎁', '🏆', '👑', '🌿', '🫘', '🌰', '🥜', '🧂', '📦', '🛒', '💎', '🎯'] },
];

const KEYWORDS_MAP: Record<string, string> = Object.fromEntries(
  EMOJI_LIST.map((e) => [e.emoji, e.keywords]),
);

interface IconPickerProps {
  value?: string;
  onChange: (emoji: string | undefined) => void;
  tipo: ProductTipo;
}

export const IconPicker: React.FC<IconPickerProps> = ({ value, onChange }) => {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');

  const allEmojis = useMemo(() => EMOJI_LIST.map((e) => e.emoji), []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return null;
    return allEmojis.filter(
      (e) => e === q || (KEYWORDS_MAP[e] ?? '').includes(q),
    );
  }, [search, allEmojis]);

  const handleSelect = (emoji: string) => {
    onChange(emoji);
    setOpen(false);
    setSearch('');
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange(undefined);
  };

  const EmojiButton = ({ emoji }: { emoji: string }) => (
    <button
      type="button"
      onClick={() => handleSelect(emoji)}
      title={KEYWORDS_MAP[emoji]}
      className={clsx(
        'w-10 h-10 flex items-center justify-center rounded-lg text-2xl transition-colors',
        value === emoji
          ? 'bg-coffee-700 ring-2 ring-coffee-500'
          : 'hover:bg-coffee-100',
      )}
    >
      {emoji}
    </button>
  );

  return (
    <div>
      {/* Toggle button */}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={clsx(
          'w-full flex items-center gap-3 px-3 py-2.5 rounded-lg border transition-colors text-left',
          open
            ? 'border-coffee-500 ring-2 ring-coffee-200 bg-white'
            : 'border-coffee-200 bg-white hover:border-coffee-400',
        )}
      >
        <div className="w-9 h-9 rounded-lg bg-coffee-50 flex items-center justify-center flex-shrink-0 text-2xl">
          {value || ''}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-coffee-800">
            {value ? value : 'Sin ícono'}
          </p>
          <p className="text-xs text-coffee-400">
            {open ? 'Cerrar selector' : 'Haz clic para seleccionar'}
          </p>
        </div>
        {value && (
          <button
            type="button"
            onClick={handleClear}
            className="flex-shrink-0 p-1 rounded text-coffee-400 hover:text-red-500 transition-colors"
            title="Quitar ícono"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </button>

      {/* Picker panel */}
      {open && (
        <div className="mt-1.5 rounded-xl border border-coffee-200 bg-white shadow-md overflow-hidden">
          <div className="p-2.5 border-b border-coffee-100">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-coffee-400 pointer-events-none" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar: café, torta, gaseosa, empanada…"
                className="w-full pl-8 pr-3 py-1.5 text-sm rounded-lg bg-coffee-50 border border-coffee-100 focus:outline-none focus:ring-1 focus:ring-coffee-400 text-coffee-800 placeholder:text-coffee-400"
                autoFocus
              />
            </div>
          </div>

          <div className="p-3 max-h-80 overflow-y-auto space-y-3">
            {filtered !== null ? (
              filtered.length === 0 ? (
                <p className="py-4 text-center text-sm text-coffee-400">Sin resultados</p>
              ) : (
                <div className="flex flex-wrap gap-1">
                  {filtered.map((e) => <EmojiButton key={e} emoji={e} />)}
                </div>
              )
            ) : (
              EMOJI_GROUPS.map((group) => (
                <div key={group.label}>
                  <p className="text-xs font-semibold text-coffee-400 uppercase tracking-wide mb-1.5">
                    {group.label}
                  </p>
                  <div className="flex flex-wrap gap-1">
                    {group.emojis.map((e) => <EmojiButton key={e} emoji={e} />)}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};
