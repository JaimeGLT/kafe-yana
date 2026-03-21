import { create } from 'zustand';

interface UIState {
  // Sidebar
  sidebarCollapsed: boolean;
  toggleSidebar: () => void;
  setSidebarCollapsed: (collapsed: boolean) => void;

  // Modals
  activeModal: string | null;
  modalData: unknown;
  openModal: (modalId: string, data?: unknown) => void;
  closeModal: () => void;

  // Toasts
  toasts: Toast[];
  addToast: (toast: Omit<Toast, 'id'>) => void;
  removeToast: (id: string) => void;
  clearToasts: () => void;

  // Loading
  isLoading: boolean;
  loadingMessage: string;
  setLoading: (loading: boolean, message?: string) => void;

  // Filters
  activeFilters: Record<string, unknown>;
  setFilter: (key: string, value: unknown) => void;
  clearFilters: () => void;

  // Search
  searchQuery: string;
  setSearchQuery: (query: string) => void;
}

interface Toast {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  title: string;
  message?: string;
  duration?: number;
}

let toastId = 0;

export const useUIStore = create<UIState>((set, get) => ({
  // Sidebar
  sidebarCollapsed: false,
  toggleSidebar: () => {
    set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed }));
  },
  setSidebarCollapsed: (collapsed) => {
    set({ sidebarCollapsed: collapsed });
  },

  // Modals
  activeModal: null,
  modalData: null,
  openModal: (modalId, data) => {
    set({ activeModal: modalId, modalData: data });
  },
  closeModal: () => {
    set({ activeModal: null, modalData: null });
  },

  // Toasts
  toasts: [],
  addToast: (toast) => {
    const id = `toast-${++toastId}`;
    const newToast: Toast = {
      id,
      ...toast,
    };

    set((state) => ({
      toasts: [...state.toasts, newToast],
    }));

    // Auto remove after duration
    if (toast.duration !== 0) {
      setTimeout(() => {
        get().removeToast(id);
      }, toast.duration || 5000);
    }
  },
  removeToast: (id) => {
    set((state) => ({
      toasts: state.toasts.filter((t) => t.id !== id),
    }));
  },
  clearToasts: () => {
    set({ toasts: [] });
  },

  // Loading
  isLoading: false,
  loadingMessage: '',
  setLoading: (loading, message = '') => {
    set({ isLoading: loading, loadingMessage: message });
  },

  // Filters
  activeFilters: {},
  setFilter: (key, value) => {
    set((state) => ({
      activeFilters: { ...state.activeFilters, [key]: value },
    }));
  },
  clearFilters: () => {
    set({ activeFilters: {} });
  },

  // Search
  searchQuery: '',
  setSearchQuery: (query) => {
    set({ searchQuery: query });
  },
}));