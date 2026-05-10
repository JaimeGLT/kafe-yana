import React, { useState, useMemo } from 'react';
import { Search, X } from 'lucide-react';
import { clsx } from 'clsx';
import type { ProductTipo } from '../../types';

interface EmojiEntry {
  emoji: string;
  keywords: string;
}

const EMOJI_LIST: EmojiEntry[] = [
  // Masas y panadería
  { emoji: '🥐', keywords: 'croissant medialuna cuñape pan pastelería' },
  { emoji: '🥖', keywords: 'pan baguette francés marraqueta' },
  { emoji: '🍞', keywords: 'pan molde sandwich tostada' },
  { emoji: '🥨', keywords: 'pretzel sal torcido snack' },
  { emoji: '🧆', keywords: 'falafel bolita fritura masa' },
  { emoji: '🥯', keywords: 'bagel rosca pan redondo' },
  { emoji: '🫓', keywords: 'pan plano flatbread arepa tortilla' },
  { emoji: '🧇', keywords: 'waffle gofre desayuno' },
  { emoji: '🥞', keywords: 'pancake hotcake crepe desayuno' },
  { emoji: '🍩', keywords: 'dona rosquilla buñuelo postre' },
  { emoji: '🍪', keywords: 'galleta cookie postre dulce' },
  { emoji: '🎂', keywords: 'torta cumpleaños pastel celebración' },
  { emoji: '🍰', keywords: 'torta pastel tarta rebanada postre' },
  { emoji: '🧁', keywords: 'cupcake muffin postre' },
  { emoji: '🍮', keywords: 'flan pudín postre crema' },
  { emoji: '🍫', keywords: 'chocolate barra cacao dulce' },
  { emoji: '🥧', keywords: 'pie tarta relleno postre' },
  { emoji: '🧋', keywords: 'bubble tea frappé batido frappe frío licuado' },
  { emoji: '🫔', keywords: 'tamal tamale masa relleno' },
  { emoji: '🍡', keywords: 'palito dulce postre bolita' },
  { emoji: '🧈', keywords: 'mantequilla manteca butter' },
  { emoji: '🍦', keywords: 'helado cono suave postre' },
  { emoji: '🍧', keywords: 'raspadilla granizado sorbete helado' },
  // Cafés y bebidas calientes
  { emoji: '☕', keywords: 'café espresso americano cortado cappuccino latte macchiato' },
  { emoji: '🍵', keywords: 'té infusión manzanilla hierba verde' },
  { emoji: '🧉', keywords: 'mate yerba hierbas' },
  { emoji: '🫖', keywords: 'tetera té hervido infusión jarra' },
  { emoji: '🍶', keywords: 'vasito sake bebida caliente' },
  { emoji: '🥛', keywords: 'leche lácteo vaso blanco' },
  { emoji: '🫗', keywords: 'jarra sirve vierte bebida' },
  { emoji: '🫙', keywords: 'frasco sirope almíbar conserva' },
  { emoji: '🌡️', keywords: 'temperatura caliente tibio' },
  { emoji: '💨', keywords: 'vapor humo caliente café' },
  { emoji: '🍂', keywords: 'otoño especial temporada' },
  // Bebidas frías y refrescos
  { emoji: '🥤', keywords: 'gaseosa refresco coca cola vaso sorbete' },
  { emoji: '🧃', keywords: 'jugo zumo néctar upes caja brick' },
  { emoji: '🍹', keywords: 'cóctel tropical frutal mojito' },
  { emoji: '🍊', keywords: 'naranja jugo cítrico mandarina' },
  { emoji: '🍋', keywords: 'limón limonada cítrico' },
  { emoji: '🧊', keywords: 'hielo frío cubos' },
  { emoji: '💧', keywords: 'agua mineral pura hidratación' },
  { emoji: '🍺', keywords: 'cerveza beer chopp' },
  { emoji: '🫧', keywords: 'burbujas gaseosa espuma' },
  { emoji: '🍈', keywords: 'melón jugo fruta suave' },
  { emoji: '🍉', keywords: 'sandía jugo fruta fresca' },
  { emoji: '🥂', keywords: 'copa champagne brindis festivo' },
  // Comida elaborada
  { emoji: '🌮', keywords: 'taco tortilla relleno' },
  { emoji: '🥙', keywords: 'empanada salteña wrap pita relleno' },
  { emoji: '🥪', keywords: 'sandwich sándwich tostado' },
  { emoji: '🍔', keywords: 'hamburguesa burger' },
  { emoji: '🌭', keywords: 'hot dog salchicha perro caliente' },
  { emoji: '🍕', keywords: 'pizza' },
  { emoji: '🥗', keywords: 'ensalada salad vegetal fresco' },
  { emoji: '🍲', keywords: 'olla guiso sopa estofado caliente' },
  { emoji: '🍜', keywords: 'fideos sopa noodle caldo' },
  { emoji: '🍳', keywords: 'huevo frito sartén desayuno' },
  { emoji: '🥚', keywords: 'huevo egg duro tibio' },
  { emoji: '🍗', keywords: 'pollo chicken alita pechuga' },
  { emoji: '🥩', keywords: 'carne bistec steak parrilla' },
  { emoji: '🐟', keywords: 'pescado fish filete' },
  { emoji: '🦐', keywords: 'camarón gambas mariscos' },
  { emoji: '🧀', keywords: 'queso cheese' },
  { emoji: '🥓', keywords: 'tocino bacon panceta' },
  { emoji: '🌯', keywords: 'burrito wrap enrollado' },
  { emoji: '🥘', keywords: 'cazuela paella arroz plato' },
  { emoji: '🌶️', keywords: 'picante ají chile jalapeño' },
  { emoji: '🥫', keywords: 'lata conserva enlatado' },
  { emoji: '🍱', keywords: 'bento caja plato combo' },
  // Snacks y productos comprados
  { emoji: '🍬', keywords: 'caramelo candy dulce' },
  { emoji: '🍭', keywords: 'chupete piruleta lollipop dulce' },
  { emoji: '🍿', keywords: 'palomitas popcorn pop cine' },
  { emoji: '🥜', keywords: 'maní cacahuate nuez semilla' },
  { emoji: '🍎', keywords: 'manzana fruta roja' },
  { emoji: '🍌', keywords: 'banana plátano fruta' },
  { emoji: '🍇', keywords: 'uva fruta racimo' },
  { emoji: '🍓', keywords: 'frutilla fresa fruta roja' },
  { emoji: '🫐', keywords: 'arándano fruta azul blueberry' },
  { emoji: '🥝', keywords: 'kiwi fruta verde' },
  { emoji: '🫚', keywords: 'aceite condimento salsa' },
  { emoji: '🍥', keywords: 'snack procesado producto' },
  // Combos y sistema
  { emoji: '🛒', keywords: 'carrito compra insumo tienda' },
  { emoji: '🎁', keywords: 'regalo combo pack sorpresa' },
  { emoji: '⭐', keywords: 'estrella especial favorito destacado' },
  { emoji: '🏷️', keywords: 'etiqueta precio tag oferta' },
  { emoji: '🧾', keywords: 'recibo factura ticket' },
  { emoji: '⏱️', keywords: 'tiempo pedido rápido espera' },
  { emoji: '🌿', keywords: 'natural orgánico hierba planta' },
  { emoji: '⚠️', keywords: 'alerta advertencia cuidado' },
  { emoji: '🔥', keywords: 'popular fuego picante trending' },
  { emoji: '❄️', keywords: 'frío helado congelado' },
  { emoji: '✨', keywords: 'especial nuevo brillante premium' },
  { emoji: '💝', keywords: 'regalo corazón especial amor' },
  { emoji: '🎯', keywords: 'objetivo oferta promo deal' },
  { emoji: '🎪', keywords: 'festival especial evento' },
  { emoji: '🌟', keywords: 'estrella premium especial destacado' },
];

const EMOJI_GROUPS = [
  {
    label: 'Masas y panadería',
    emojis: ['🥐', '🥖', '🍞', '🥨', '🧆', '🥯', '🫓', '🧇', '🥞', '🍩', '🍪', '🎂', '🍰', '🧁', '🍮', '🍫', '🥧', '🧋', '🫔', '🍡', '🧈', '🍦', '🍧'],
  },
  {
    label: 'Cafés y bebidas calientes',
    emojis: ['☕', '🍵', '🧉', '🫖', '🍶', '🥛', '🫗', '🍫', '🧋', '🫙', '🌡️', '💨', '🍂'],
  },
  {
    label: 'Bebidas frías y refrescos',
    emojis: ['🥤', '🧃', '🍹', '🍊', '🍋', '🫙', '🧊', '💧', '🍶', '🥛', '🍺', '🫧', '🍈', '🍉', '🥂'],
  },
  {
    label: 'Comida elaborada',
    emojis: ['🌮', '🥙', '🥪', '🍔', '🌭', '🍕', '🥗', '🍲', '🍜', '🍳', '🥚', '🍗', '🥩', '🐟', '🦐', '🧀', '🥓', '🌯', '🥘', '🌶️', '🥫', '🍱'],
  },
  {
    label: 'Snacks y productos comprados',
    emojis: ['🍫', '🍬', '🍭', '🍿', '🥜', '🍎', '🍌', '🍇', '🍓', '🫐', '🍊', '🥝', '🧀', '🥛', '🫙', '🍦', '🧆', '🥐', '🫚', '🍥'],
  },
  {
    label: 'Combos y sistema',
    emojis: ['🍱', '🛒', '🎁', '⭐', '🏷️', '🧾', '⏱️', '🌿', '⚠️', '🔥', '❄️', '✨', '💝', '🎯', '🎪', '🌟'],
  },
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

      {open && (
        <div className="mt-1.5 rounded-xl border border-coffee-200 bg-white shadow-md overflow-hidden">
          <div className="p-2.5 border-b border-coffee-100">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-coffee-400 pointer-events-none" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar: café, torta, empanada, combo…"
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
