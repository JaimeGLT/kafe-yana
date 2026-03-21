import { create } from 'zustand';
import { v4 as uuidv4 } from 'uuid';
import type {
  User,
  UserInput,
  Role,
  RoleInput,
  Branch,
  BranchInput,
  Permission,
  SystemSettings,
  SystemSettingsInput,
} from '../types';

interface SettingsState {
  users: User[];
  roles: Role[];
  branches: Branch[];
  settings: SystemSettings;
  currentUser: User | null;
  currentBranch: Branch | null;

  // User actions
  addUser: (input: UserInput) => User;
  updateUser: (id: string, input: Partial<UserInput>) => void;
  deleteUser: (id: string) => void;
  getUser: (id: string) => User | undefined;

  // Role actions
  addRole: (input: RoleInput) => Role;
  updateRole: (id: string, input: Partial<RoleInput>) => void;
  deleteRole: (id: string) => void;
  getRole: (id: string) => Role | undefined;

  // Branch actions
  addBranch: (input: BranchInput) => Branch;
  updateBranch: (id: string, input: Partial<BranchInput>) => void;
  deleteBranch: (id: string) => void;
  getBranch: (id: string) => Branch | undefined;

  // Settings actions
  updateSettings: (input: Partial<SystemSettingsInput>) => void;

  // Auth actions
  setCurrentUser: (user: User | null) => void;
  setCurrentBranch: (branch: Branch | null) => void;
  hasPermission: (permission: Permission) => boolean;
}

const defaultSettings: SystemSettings = {
  companyName: 'Kafe-Yana',
  companyLogo: '/logo.png',
  companyRuc: '20123456789',
  companyAddress: 'Av. Principal 123, Lima',
  companyPhone: '+51 1 234-5678',
  companyEmail: 'contacto@kafe-yana.com',
  currency: 'PEN',
  currencySymbol: 'S/',
  taxPercentage: 18,
  invoicePrefix: 'FACT',
  quotePrefix: 'COT',
  purchaseOrderPrefix: 'OC',
  receiptPrefix: 'BOLE',
  defaultPaymentTerms: 30,
  lowStockAlert: true,
  lowStockThreshold: 5,
};

const defaultRoles: Role[] = [
  {
    id: 'admin',
    name: 'Administrador',
    description: 'Acceso completo al sistema',
    permissions: [
      'dashboard.view',
      'inventory.view', 'inventory.create', 'inventory.edit', 'inventory.delete',
      'sales.view', 'sales.create', 'sales.edit', 'sales.delete', 'sales.pos',
      'purchases.view', 'purchases.create', 'purchases.edit', 'purchases.delete',
      'cash.view', 'cash.create', 'cash.edit', 'cash.delete',
      'reports.view',
      'settings.view', 'settings.edit',
    ] as Permission[],
    isSystem: true,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: 'manager',
    name: 'Gerente',
    description: 'Gestión de operaciones',
    permissions: [
      'dashboard.view',
      'inventory.view', 'inventory.create', 'inventory.edit',
      'sales.view', 'sales.create', 'sales.edit', 'sales.pos',
      'purchases.view', 'purchases.create', 'purchases.edit',
      'cash.view', 'cash.create', 'cash.edit',
      'reports.view',
      'settings.view',
    ] as Permission[],
    isSystem: true,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: 'cashier',
    name: 'Cajero',
    description: 'Operaciones de punto de venta',
    permissions: [
      'dashboard.view',
      'inventory.view',
      'sales.view', 'sales.create', 'sales.pos',
      'cash.view', 'cash.create',
    ] as Permission[],
    isSystem: true,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
];

const defaultBranches: Branch[] = [
  {
    id: 'main-branch',
    code: '001',
    name: 'Sucursal Principal',
    address: 'Av. Principal 123, Lima',
    phone: '+51 1 234-5678',
    email: 'principal@kafe-yana.com',
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
];

const defaultUsers: User[] = [
  {
    id: 'admin',
    username: 'admin',
    email: 'admin@kafe-yana.com',
    firstName: 'Administrador',
    lastName: 'Sistema',
    roleId: 'admin',
    roleName: 'Administrador',
    branchId: 'main-branch',
    branchName: 'Sucursal Principal',
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
];

export const useSettingsStore = create<SettingsState>((set, get) => ({
  users: defaultUsers,
  roles: defaultRoles,
  branches: defaultBranches,
  settings: defaultSettings,
  currentUser: defaultUsers[0],
  currentBranch: defaultBranches[0],

  // User actions
  addUser: (input) => {
    const state = get();
    const role = state.roles.find(r => r.id === input.roleId);

    const newUser: User = {
      id: uuidv4(),
      username: input.username,
      email: input.email,
      firstName: input.firstName,
      lastName: input.lastName,
      avatar: undefined,
      roleId: input.roleId,
      roleName: role?.name,
      branchId: input.branchId,
      branchName: input.branchId ? state.branches.find(b => b.id === input.branchId)?.name : undefined,
      isActive: input.isActive ?? true,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    set((state) => ({
      users: [...state.users, newUser],
    }));

    return newUser;
  },

  updateUser: (id, input) => {
    set((state) => {
      const role = input.roleId ? state.roles.find(r => r.id === input.roleId) : undefined;
      const branch = input.branchId ? state.branches.find(b => b.id === input.branchId) : undefined;

      return {
        users: state.users.map((user) =>
          user.id === id
            ? {
                ...user,
                ...input,
                roleName: role?.name || user.roleName,
                branchName: branch?.name || user.branchName,
                updatedAt: new Date(),
              }
            : user
        ),
      };
    });
  },

  deleteUser: (id) => {
    set((state) => ({
      users: state.users.filter((user) => user.id !== id),
    }));
  },

  getUser: (id) => {
    return get().users.find((user) => user.id === id);
  },

  // Role actions
  addRole: (input) => {
    const newRole: Role = {
      id: uuidv4(),
      name: input.name,
      description: input.description,
      permissions: input.permissions,
      isSystem: false,
      isActive: input.isActive ?? true,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    set((state) => ({
      roles: [...state.roles, newRole],
    }));

    return newRole;
  },

  updateRole: (id, input) => {
    set((state) => ({
      roles: state.roles.map((role) =>
        role.id === id
          ? { ...role, ...input, updatedAt: new Date() }
          : role
      ),
    }));
  },

  deleteRole: (id) => {
    const role = get().roles.find(r => r.id === id);
    if (role?.isSystem) {
      throw new Error('No se puede eliminar un rol del sistema');
    }

    set((state) => ({
      roles: state.roles.filter((role) => role.id !== id),
    }));
  },

  getRole: (id) => {
    return get().roles.find((role) => role.id === id);
  },

  // Branch actions
  addBranch: (input) => {
    const newBranch: Branch = {
      id: uuidv4(),
      code: input.code,
      name: input.name,
      address: input.address,
      phone: input.phone,
      email: input.email,
      managerId: input.managerId,
      managerName: input.managerId ? get().users.find(u => u.id === input.managerId)?.firstName + ' ' + get().users.find(u => u.id === input.managerId)?.lastName : undefined,
      isActive: input.isActive ?? true,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    set((state) => ({
      branches: [...state.branches, newBranch],
    }));

    return newBranch;
  },

  updateBranch: (id, input) => {
    set((state) => ({
      branches: state.branches.map((branch) =>
        branch.id === id
          ? { ...branch, ...input, updatedAt: new Date() }
          : branch
      ),
    }));
  },

  deleteBranch: (id) => {
    set((state) => ({
      branches: state.branches.filter((branch) => branch.id !== id),
    }));
  },

  getBranch: (id) => {
    return get().branches.find((branch) => branch.id === id);
  },

  // Settings actions
  updateSettings: (input) => {
    set((state) => ({
      settings: { ...state.settings, ...input },
    }));
  },

  // Auth actions
  setCurrentUser: (user) => {
    set({ currentUser: user });
  },

  setCurrentBranch: (branch) => {
    set({ currentBranch: branch });
  },

  hasPermission: (permission) => {
    const { currentUser, roles } = get();
    if (!currentUser) return false;

    const role = roles.find(r => r.id === currentUser.roleId);
    if (!role) return false;

    return role.permissions.includes(permission);
  },
}));