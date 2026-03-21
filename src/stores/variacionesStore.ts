import { create } from 'zustand';
import { v4 as uuidv4 } from 'uuid';
import type {
  VariacionAtributo,
  VariacionAtributoInput,
  VariacionOpcion,
  VariacionOpcionInput,
} from '../types';

interface VariacionesState {
  atributos: VariacionAtributo[];
  addAtributo: (input: VariacionAtributoInput) => VariacionAtributo;
  updateAtributo: (id: string, input: Partial<VariacionAtributoInput>) => void;
  deleteAtributo: (id: string) => void;
  getAtributosByProductId: (productId: string) => VariacionAtributo[];
  addOpcion: (atributoId: string, input: VariacionOpcionInput) => VariacionOpcion;
  updateOpcion: (
    atributoId: string,
    opcionId: string,
    input: Partial<VariacionOpcionInput>
  ) => void;
  deleteOpcion: (atributoId: string, opcionId: string) => void;
}

export const useVariacionesStore = create<VariacionesState>((set, get) => ({
  atributos: [],

  addAtributo: (input) => {
    const now = new Date();
    const atributo: VariacionAtributo = {
      id: uuidv4(),
      productId: input.productId,
      nombre: input.nombre,
      esRequerido: input.esRequerido ?? false,
      opciones: [],
      isActive: true,
      createdAt: now,
      updatedAt: now,
    };
    set((s) => ({ atributos: [...s.atributos, atributo] }));
    return atributo;
  },

  updateAtributo: (id, input) => {
    set((s) => ({
      atributos: s.atributos.map((a) =>
        a.id === id ? { ...a, ...input, updatedAt: new Date() } : a
      ),
    }));
  },

  deleteAtributo: (id) => {
    set((s) => ({ atributos: s.atributos.filter((a) => a.id !== id) }));
  },

  getAtributosByProductId: (productId) => {
    return get().atributos.filter((a) => a.productId === productId && a.isActive);
  },

  addOpcion: (atributoId, input) => {
    const opcion: VariacionOpcion = {
      id: uuidv4(),
      atributoId,
      nombre: input.nombre,
      precioAjuste: input.precioAjuste ?? 0,
      insumoExtraId: input.insumoExtraId,
      cantidadExtra: input.cantidadExtra,
      insumoReemplazadoId: input.insumoReemplazadoId,
      isActive: input.isActive ?? true,
    };
    set((s) => ({
      atributos: s.atributos.map((a) =>
        a.id === atributoId
          ? { ...a, opciones: [...a.opciones, opcion], updatedAt: new Date() }
          : a
      ),
    }));
    return opcion;
  },

  updateOpcion: (atributoId, opcionId, input) => {
    set((s) => ({
      atributos: s.atributos.map((a) =>
        a.id === atributoId
          ? {
              ...a,
              opciones: a.opciones.map((o) =>
                o.id === opcionId ? { ...o, ...input } : o
              ),
              updatedAt: new Date(),
            }
          : a
      ),
    }));
  },

  deleteOpcion: (atributoId, opcionId) => {
    set((s) => ({
      atributos: s.atributos.map((a) =>
        a.id === atributoId
          ? {
              ...a,
              opciones: a.opciones.filter((o) => o.id !== opcionId),
              updatedAt: new Date(),
            }
          : a
      ),
    }));
  },
}));
