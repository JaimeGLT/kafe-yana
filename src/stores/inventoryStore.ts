import { create } from 'zustand';
import { v4 as uuidv4 } from 'uuid';
import type {
  Product,
  Category,
  Brand,
  Location,
  ProductInput,
  CategoryInput,
  BrandInput,
  LocationInput,
  StockAdjustment,
  StockAdjustmentInput,
  Combo,
  ComboInput,
  KardexMovement,
  InventoryStats,
} from '../types';

interface InventoryState {
  products: Product[];
  categories: Category[];
  brands: Brand[];
  locations: Location[];
  combos: Combo[];
  stockAdjustments: StockAdjustment[];
  kardexMovements: Record<string, KardexMovement[]>;
  stats: InventoryStats;

  // Product actions
  addProduct: (input: ProductInput) => Product;
  updateProduct: (id: string, input: Partial<ProductInput>) => void;
  deleteProduct: (id: string) => void;
  getProduct: (id: string) => Product | undefined;

  // Category actions
  addCategory: (input: CategoryInput) => Category;
  updateCategory: (id: string, input: Partial<CategoryInput>) => void;
  deleteCategory: (id: string) => void;

  // Brand actions
  addBrand: (input: BrandInput) => Brand;
  updateBrand: (id: string, input: Partial<BrandInput>) => void;
  deleteBrand: (id: string) => void;

  // Location actions
  addLocation: (input: LocationInput) => Location;
  updateLocation: (id: string, input: Partial<LocationInput>) => void;
  deleteLocation: (id: string) => void;

  // Combo actions
  addCombo: (input: ComboInput) => Combo;
  updateCombo: (id: string, input: Partial<ComboInput>) => void;
  deleteCombo: (id: string) => void;

  // Stock adjustment actions
  createStockAdjustment: (input: StockAdjustmentInput) => StockAdjustment;

  // Stats
  calculateStats: () => void;
}

const generateCode = (prefix: string, num: number): string => {
  return `${prefix}${String(num).padStart(6, '0')}`;
};

export const useInventoryStore = create<InventoryState>((set, get) => ({
  products: [],
  categories: [],
  brands: [],
  locations: [],
  combos: [],
  stockAdjustments: [],
  kardexMovements: {},
  stats: {
    totalProducts: 0,
    activeProducts: 0,
    lowStockProducts: 0,
    outOfStockProducts: 0,
    totalValue: 0,
    categoriesCount: 0,
  },

  // Product actions
  addProduct: (input) => {
    const state = get();
    const tipo = input.tipo ?? 'comprado';
    const newProduct: Product = {
      id: uuidv4(),
      code: input.code || generateCode('PROD', state.products.length + 1),
      name: input.name,
      description: input.description || '',
      tipo,
      categoryId: input.categoryId,
      categoryName: state.categories.find(c => c.id === input.categoryId)?.name || '',
      brandId: input.brandId,
      brandName: input.brandId ? state.brands.find(b => b.id === input.brandId)?.name : undefined,
      unit: input.unit,
      costPrice: input.costPrice,
      salePrice: input.salePrice,
      wholesalePrice: input.wholesalePrice,
      stock: input.stock || 0,
      minStock: input.minStock || 5,
      maxStock: input.maxStock || 100,
      locationId: input.locationId,
      locationName: input.locationId ? state.locations.find(l => l.id === input.locationId)?.name : undefined,
      variations: (input.variations || []).map(v => ({
        id: uuidv4(),
        productId: '',
        name: v.name,
        sku: v.sku || generateCode('VAR', Math.random() * 10000),
        priceAdjustment: v.priceAdjustment,
        stock: v.stock || 0,
        minStock: v.minStock || 5,
        maxStock: v.maxStock || 100,
        isActive: v.isActive ?? true,
      })),
      barcode: input.barcode,
      image: input.image,
      isActive: input.isActive ?? true,
      hasVariations: (input.variations?.length || 0) > 0,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    // Update variation productIds
    newProduct.variations = newProduct.variations.map(v => ({
      ...v,
      productId: newProduct.id,
    }));

    set((state) => ({
      products: [...state.products, newProduct],
    }));

    get().calculateStats();
    return newProduct;
  },

  updateProduct: (id, input) => {
    set((state) => ({
      products: state.products.map((product) => {
        if (product.id !== id) return product;

        const updatedProduct = {
          ...product,
          ...input,
          updatedAt: new Date(),
        };

        // Update category name if category changed
        if (input.categoryId) {
          const category = state.categories.find(c => c.id === input.categoryId);
          if (category) {
            updatedProduct.categoryName = category.name;
          }
        }

        // Update brand name if brand changed
        if (input.brandId) {
          const brand = state.brands.find(b => b.id === input.brandId);
          if (brand) {
            updatedProduct.brandName = brand.name;
          }
        }

        return updatedProduct;
      }) as Product[],
    }));
    get().calculateStats();
  },

  deleteProduct: (id) => {
    set((state) => ({
      products: state.products.filter((product) => product.id !== id),
    }));
    get().calculateStats();
  },

  getProduct: (id) => {
    return get().products.find((product) => product.id === id);
  },

  // Category actions
  addCategory: (input) => {
    const newCategory: Category = {
      id: uuidv4(),
      name: input.name,
      description: input.description || '',
      color: input.color || '#8B4513',
      icon: input.icon,
      parentId: input.parentId,
      sortOrder: input.sortOrder || 0,
      isActive: input.isActive ?? true,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    set((state) => ({
      categories: [...state.categories, newCategory],
    }));

    get().calculateStats();
    return newCategory;
  },

  updateCategory: (id, input) => {
    set((state) => ({
      categories: state.categories.map((category) =>
        category.id === id
          ? { ...category, ...input, updatedAt: new Date() }
          : category
      ),
    }));
  },

  deleteCategory: (id) => {
    set((state) => ({
      categories: state.categories.filter((category) => category.id !== id),
    }));
    get().calculateStats();
  },

  // Brand actions
  addBrand: (input) => {
    const newBrand: Brand = {
      id: uuidv4(),
      name: input.name,
      description: input.description,
      country: input.country,
      isActive: input.isActive ?? true,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    set((state) => ({
      brands: [...state.brands, newBrand],
    }));

    return newBrand;
  },

  updateBrand: (id, input) => {
    set((state) => ({
      brands: state.brands.map((brand) =>
        brand.id === id
          ? { ...brand, ...input, updatedAt: new Date() }
          : brand
      ),
    }));
  },

  deleteBrand: (id) => {
    set((state) => ({
      brands: state.brands.filter((brand) => brand.id !== id),
    }));
  },

  // Location actions
  addLocation: (input) => {
    const newLocation: Location = {
      id: uuidv4(),
      name: input.name,
      code: input.code,
      description: input.description,
      isActive: input.isActive ?? true,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    set((state) => ({
      locations: [...state.locations, newLocation],
    }));

    return newLocation;
  },

  updateLocation: (id, input) => {
    set((state) => ({
      locations: state.locations.map((location) =>
        location.id === id
          ? { ...location, ...input, updatedAt: new Date() }
          : location
      ),
    }));
  },

  deleteLocation: (id) => {
    set((state) => ({
      locations: state.locations.filter((location) => location.id !== id),
    }));
  },

  // Combo actions
  addCombo: (input) => {
    const state = get();
    const items = input.items.map(item => {
      const prod = state.products.find(p => p.id === item.productId);
      return {
        id: uuidv4(),
        productId: item.productId,
        productName: prod?.name ?? '',
        productTipo: prod?.tipo ?? 'comprado',
        quantity: item.quantity,
        unitCost: prod?.costPrice ?? 0,
        esOpcional: item.esOpcional ?? false,
      };
    });
    const costoTotal = items.reduce((s, i) => s + i.unitCost * i.quantity, 0);

    const newCombo: Combo = {
      id: uuidv4(),
      name: input.name,
      description: input.description,
      items,
      price: input.price,
      costoTotal,
      image: input.image,
      isActive: input.isActive ?? true,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    set((s) => ({ combos: [...s.combos, newCombo] }));
    return newCombo;
  },

  updateCombo: (id, input) => {
    const state = get();
    const items = input.items
      ? input.items.map(item => {
          const prod = state.products.find(p => p.id === item.productId);
          return {
            id: uuidv4(),
            productId: item.productId,
            productName: prod?.name ?? '',
            productTipo: prod?.tipo ?? 'comprado',
            quantity: item.quantity,
            unitCost: prod?.costPrice ?? 0,
            esOpcional: item.esOpcional ?? false,
          };
        })
      : undefined;
    const costoTotal = items
      ? items.reduce((s, i) => s + i.unitCost * i.quantity, 0)
      : undefined;

    set((s) => ({
      combos: s.combos.map((combo) =>
        combo.id === id
          ? {
              ...combo,
              ...(input.name !== undefined && { name: input.name }),
              ...(input.description !== undefined && { description: input.description }),
              ...(items && { items }),
              ...(costoTotal !== undefined && { costoTotal }),
              ...(input.price !== undefined && { price: input.price }),
              ...(input.image !== undefined && { image: input.image }),
              ...(input.isActive !== undefined && { isActive: input.isActive }),
              updatedAt: new Date(),
            }
          : combo
      ),
    }));
  },

  deleteCombo: (id) => {
    set((state) => ({
      combos: state.combos.filter((combo) => combo.id !== id),
    }));
  },

  // Stock adjustment actions
  createStockAdjustment: (input) => {
    const state = get();
    const adjustment: StockAdjustment = {
      id: uuidv4(),
      code: generateCode('ADJ', state.stockAdjustments.length + 1),
      type: input.type,
      date: new Date(),
      reason: input.reason,
      notes: input.notes,
      items: input.items.map(item => {
        const product = state.products.find(p => p.id === item.productId);
        const previousStock = product?.stock || 0;
        const adjustment = input.type === 'positive' ? item.adjustment : -item.adjustment;
        return {
          id: uuidv4(),
          productId: item.productId,
          productName: product?.name || '',
          previousStock,
          adjustment,
          newStock: previousStock + adjustment,
          reason: item.reason,
        };
      }),
      userId: 'current-user',
      userName: 'Usuario Actual',
      status: 'completed',
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    // Update product stocks
    adjustment.items.forEach(item => {
      set((state) => ({
        products: state.products.map(p =>
          p.id === item.productId
            ? { ...p, stock: item.newStock, updatedAt: new Date() }
            : p
        ),
      }));
    });

    set((state) => ({
      stockAdjustments: [...state.stockAdjustments, adjustment],
    }));

    get().calculateStats();
    return adjustment;
  },

  // Stats
  calculateStats: () => {
    const state = get();
    const products = state.products;

    const totalProducts = products.length;
    const activeProducts = products.filter(p => p.isActive).length;
    const lowStockProducts = products.filter(p => p.isActive && p.stock > 0 && p.stock <= p.minStock).length;
    const outOfStockProducts = products.filter(p => p.isActive && p.stock <= 0).length;
    const totalValue = products.reduce((sum, p) => sum + (p.stock * p.costPrice), 0);
    const categoriesCount = state.categories.length;

    set({
      stats: {
        totalProducts,
        activeProducts,
        lowStockProducts,
        outOfStockProducts,
        totalValue,
        categoriesCount,
      },
    });
  },
}));