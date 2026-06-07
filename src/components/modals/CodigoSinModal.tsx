import React, { useState, useEffect, useRef } from 'react';
import { Modal } from '../ui/Modal';
import { Input } from '../ui/Input';
import { searchCodigosSiat, type CodigoSiatNode } from '../../lib/queries/siat.queries';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (codigo: string) => void;
}

export const CodigoSinModal: React.FC<Props> = ({ isOpen, onClose, onSelect }) => {
  const [search, setSearch] = useState('');
  const [results, setResults] = useState<CodigoSiatNode[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!isOpen) {
      setSearch('');
      setResults([]);
    }
  }, [isOpen]);

  useEffect(() => {
    if (search.length < 2) {
      setResults([]);
      setIsLoading(false);
      return;
    }
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      setIsLoading(true);
      try {
        const nodes = await searchCodigosSiat(search);
        setResults(nodes);
      } catch {
        setResults([]);
      } finally {
        setIsLoading(false);
      }
    }, 300);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [search]);

  const handleSelect = (codigo: string) => {
    onSelect(codigo);
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Buscar Código SIN" size="xl">
      <div className="space-y-4">
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar por código o descripción..."
          autoFocus
        />

        <div className="overflow-auto max-h-96 rounded-lg border border-coffee-200">
          {search.length < 2 ? (
            <p className="px-4 py-6 text-sm text-coffee-400 text-center">
              Escriba al menos 2 caracteres para buscar
            </p>
          ) : isLoading ? (
            <p className="px-4 py-6 text-sm text-coffee-400 text-center">Buscando...</p>
          ) : results.length === 0 ? (
            <p className="px-4 py-6 text-sm text-coffee-400 text-center">Sin resultados</p>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-coffee-50 sticky top-0">
                <tr>
                  <th className="px-4 py-2 text-left text-xs font-semibold text-coffee-600 uppercase tracking-wide w-32">
                    Código
                  </th>
                  <th className="px-4 py-2 text-left text-xs font-semibold text-coffee-600 uppercase tracking-wide">
                    Descripción Producto
                  </th>
                  <th className="px-4 py-2 text-left text-xs font-semibold text-coffee-600 uppercase tracking-wide">
                    Descripción Actividad
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-coffee-100">
                {results.map((node) => (
                  <tr
                    key={node.id}
                    onClick={() => handleSelect(node.codigoProducto)}
                    className="cursor-pointer hover:bg-coffee-50 transition-colors"
                  >
                    <td className="px-4 py-2.5 font-mono text-coffee-900 font-medium">
                      {node.codigoProducto}
                    </td>
                    <td className="px-4 py-2.5 text-coffee-700">{node.descripcionProducto}</td>
                    <td className="px-4 py-2.5 text-coffee-500 text-xs">{node.descripcionActividad}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </Modal>
  );
};
