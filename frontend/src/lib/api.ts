const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';

class ApiClient {
  private token: string | null = null;

  setToken(token: string | null) {
    this.token = token;
    if (typeof window !== 'undefined') {
      if (token) {
        localStorage.setItem('token', token);
      } else {
        localStorage.removeItem('token');
      }
    }
  }

  getToken(): string | null {
    if (this.token) return this.token;
    if (typeof window !== 'undefined') {
      this.token = localStorage.getItem('token');
    }
    return this.token;
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const token = this.getToken();
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      ...options.headers,
    };

    if (token) {
      (headers as Record<string, string>)['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(`${API_URL}${endpoint}`, {
      ...options,
      headers,
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.message || 'Ошибка запроса');
    }

    return response.json();
  }

  async get<T>(endpoint: string): Promise<T> {
    return this.request<T>(endpoint);
  }

  async post<T>(endpoint: string, data?: unknown): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'POST',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  async put<T>(endpoint: string, data?: unknown): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'PUT',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  async patch<T>(endpoint: string, data?: unknown): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'PATCH',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  async delete<T>(endpoint: string): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'DELETE',
    });
  }
}

export const api = new ApiClient();

// Auth API
export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  accessToken: string;
  user: {
    id: string;
    email: string;
    name: string;
    role: string;
    tenantId: string | null;
  };
}

export interface User {
  id: string;
  email: string;
  name: string;
  role: string;
  tenantId: string | null;
}

export const authApi = {
  login: (data: LoginRequest) => api.post<LoginResponse>('/auth/login', data),
  me: () => api.get<User>('/auth/me'),
  impersonate: (userId: string) => api.post<LoginResponse>(`/auth/impersonate/${userId}`),
};

// Objects API
import type {
  ConstructionObject, Stage, EquipmentType, Contractor, PlannedEquipment,
  UserWithAssignments, ResourceCheck, CreateResourceCheckDto, UpdateResourceCheckDto,
  Payment, CreatePaymentDto, PaymentObjectSummary,
  VolumeCheck, CreateVolumeCheckDto, UpdateVolumeCheckDto, VolumeCheckObjectSummary,
  Appeal, AppealMessage, CreateAppealDto, AppealStats, AppealStatus, Attachment,
  StageScheduleChange, ExtendStageDto,
} from './types';

export interface CreateObjectDto {
  name: string;
  address?: string;
  contractorId?: string;
  startDate?: string;
  endDate?: string;
  budget?: number;
  status?: string;
}

export const objectsApi = {
  getAll: () => api.get<ConstructionObject[]>('/objects'),
  getOne: (id: string) => api.get<ConstructionObject>(`/objects/${id}`),
  create: (data: CreateObjectDto) => api.post<ConstructionObject>('/objects', data),
  update: (id: string, data: Partial<CreateObjectDto>) =>
    api.patch<ConstructionObject>(`/objects/${id}`, data),
  delete: (id: string) => api.delete(`/objects/${id}`),
  getProgress: (id: string) => api.get<number>(`/objects/${id}/progress`),
  assignUsers: (id: string, userIds: string[]) =>
    api.patch<ConstructionObject>(`/objects/${id}/users`, { userIds }),
};

// Stages API
export interface CreateStageDto {
  objectId: string;
  name: string;
  startDate?: string;
  endDate?: string;
  budget?: number;
  plannedPeople?: number;
  sortOrder?: number;
  plannedEquipment?: { equipmentTypeId: string; quantity: number }[];
}

export const stagesApi = {
  getByObject: (objectId: string) => api.get<Stage[]>(`/stages?objectId=${objectId}`),
  getOne: (id: string) => api.get<Stage>(`/stages/${id}`),
  create: (data: CreateStageDto) => api.post<Stage>('/stages', data),
  update: (id: string, data: Partial<Omit<CreateStageDto, 'objectId'>>) =>
    api.patch<Stage>(`/stages/${id}`, data),
  delete: (id: string) => api.delete(`/stages/${id}`),
  reorder: (objectId: string, stageIds: string[]) =>
    api.patch<Stage[]>(`/stages/reorder/${objectId}`, { stageIds }),
  extendSchedule: (id: string, data: ExtendStageDto) =>
    api.post<Stage>(`/stages/${id}/extend`, data),
  getScheduleHistory: (id: string) =>
    api.get<StageScheduleChange[]>(`/stages/${id}/schedule-history`),
};

// Equipment Types API
export const equipmentTypesApi = {
  getAll: () => api.get<EquipmentType[]>('/equipment-types'),
  create: (name: string) => api.post<EquipmentType>('/equipment-types', { name }),
  update: (id: string, name: string) =>
    api.patch<EquipmentType>(`/equipment-types/${id}`, { name }),
  delete: (id: string) => api.delete(`/equipment-types/${id}`),
};

// Contractors API
export interface CreateContractorDto {
  name: string;
  inn?: string;
  phone?: string;
  email?: string;
}

export const contractorsApi = {
  getAll: () => api.get<Contractor[]>('/contractors'),
  getOne: (id: string) => api.get<Contractor>(`/contractors/${id}`),
  create: (data: CreateContractorDto) => api.post<Contractor>('/contractors', data),
  update: (id: string, data: Partial<CreateContractorDto>) =>
    api.patch<Contractor>(`/contractors/${id}`, data),
  delete: (id: string) => api.delete(`/contractors/${id}`),
};

// Users API
export interface CreateUserDto {
  email: string;
  password: string;
  name: string;
  phone?: string;
  role: string;
}

export interface UpdateUserDto {
  email?: string;
  password?: string;
  name?: string;
  phone?: string;
  role?: string;
  isActive?: boolean;
}

export const usersApi = {
  getAll: () => api.get<UserWithAssignments[]>('/users'),
  getOne: (id: string) => api.get<UserWithAssignments>(`/users/${id}`),
  create: (data: CreateUserDto) => api.post<UserWithAssignments>('/users', data),
  update: (id: string, data: UpdateUserDto) =>
    api.patch<UserWithAssignments>(`/users/${id}`, data),
  delete: (id: string) => api.delete(`/users/${id}`),
  assignObjects: (id: string, objectIds: string[]) =>
    api.patch<UserWithAssignments>(`/users/${id}/objects`, { objectIds }),
  getAssignedObjects: (id: string) =>
    api.get<ConstructionObject[]>(`/users/${id}/objects`),
};

// Planned Equipment API
export interface SetStageEquipmentDto {
  equipment: { equipmentTypeId: string; quantity: number }[];
}

export const plannedEquipmentApi = {
  getByStage: (stageId: string) =>
    api.get<PlannedEquipment[]>(`/planned-equipment/stage/${stageId}`),
  setStageEquipment: (stageId: string, data: SetStageEquipmentDto) =>
    api.post<PlannedEquipment[]>(`/planned-equipment/stage/${stageId}`, data),
  delete: (id: string) => api.delete(`/planned-equipment/${id}`),
};

// Resource Checks API (ежедневные проверки ресурсов)
export const resourceChecksApi = {
  // Получить список проверок с фильтрами
  getAll: (params?: { stageId?: string; date?: string; objectId?: string }) => {
    const queryParams = new URLSearchParams();
    if (params?.stageId) queryParams.append('stageId', params.stageId);
    if (params?.date) queryParams.append('date', params.date);
    if (params?.objectId) queryParams.append('objectId', params.objectId);
    const query = queryParams.toString();
    return api.get<ResourceCheck[]>(`/resource-checks${query ? `?${query}` : ''}`);
  },

  // Получить проверки по диапазону дат (для календаря)
  getByDateRange: (objectId: string, startDate: string, endDate: string) =>
    api.get<ResourceCheck[]>(
      `/resource-checks/by-date-range?objectId=${objectId}&startDate=${startDate}&endDate=${endDate}`
    ),

  // Получить одну проверку
  getOne: (id: string) => api.get<ResourceCheck>(`/resource-checks/${id}`),

  // Создать проверку
  create: (data: CreateResourceCheckDto) =>
    api.post<ResourceCheck>('/resource-checks', data),

  // Обновить проверку (только сегодняшнюю)
  update: (id: string, data: UpdateResourceCheckDto) =>
    api.patch<ResourceCheck>(`/resource-checks/${id}`, data),

  // Удалить проверку (только сегодняшнюю)
  delete: (id: string) => api.delete(`/resource-checks/${id}`),
};

// Payments API (платежи)
export const paymentsApi = {
  // Получить список платежей
  getAll: (params?: { stageId?: string; objectId?: string }) => {
    const queryParams = new URLSearchParams();
    if (params?.stageId) queryParams.append('stageId', params.stageId);
    if (params?.objectId) queryParams.append('objectId', params.objectId);
    const query = queryParams.toString();
    return api.get<Payment[]>(`/payments${query ? `?${query}` : ''}`);
  },

  // Получить один платёж
  getOne: (id: string) => api.get<Payment>(`/payments/${id}`),

  // Создать платёж
  create: (data: CreatePaymentDto) => api.post<Payment>('/payments', data),

  // Сводка по объекту
  getSummaryByObject: (objectId: string) =>
    api.get<PaymentObjectSummary>(`/payments/summary/object/${objectId}`),

  // Сводка по этапу
  getSummaryByStage: (stageId: string) =>
    api.get<PaymentObjectSummary>(`/payments/summary/stage/${stageId}`),
};

// Volume Checks API (проверки объёмов)
export const volumeChecksApi = {
  // Получить список проверок
  getAll: (params?: { stageId?: string; objectId?: string }) => {
    const queryParams = new URLSearchParams();
    if (params?.stageId) queryParams.append('stageId', params.stageId);
    if (params?.objectId) queryParams.append('objectId', params.objectId);
    const query = queryParams.toString();
    return api.get<VolumeCheck[]>(`/volume-checks${query ? `?${query}` : ''}`);
  },

  // Получить одну проверку
  getOne: (id: string) => api.get<VolumeCheck>(`/volume-checks/${id}`),

  // Создать проверку
  create: (data: CreateVolumeCheckDto) => api.post<VolumeCheck>('/volume-checks', data),

  // Обновить проверку
  update: (id: string, data: UpdateVolumeCheckDto) =>
    api.patch<VolumeCheck>(`/volume-checks/${id}`, data),

  // Сводка по объекту
  getSummaryByObject: (objectId: string) =>
    api.get<VolumeCheckObjectSummary>(`/volume-checks/summary/object/${objectId}`),

  // Получить последнюю проверку по этапу
  getLatestByStage: (stageId: string) =>
    api.get<VolumeCheck | null>(`/volume-checks/latest/stage/${stageId}`),
};

// Appeals API (обращения)
export const appealsApi = {
  // Получить список обращений
  getAll: (params?: { objectId?: string; status?: AppealStatus; my?: boolean }) => {
    const queryParams = new URLSearchParams();
    if (params?.objectId) queryParams.append('objectId', params.objectId);
    if (params?.status) queryParams.append('status', params.status);
    if (params?.my) queryParams.append('my', 'true');
    const query = queryParams.toString();
    return api.get<Appeal[]>(`/appeals${query ? `?${query}` : ''}`);
  },

  // Получить одно обращение
  getOne: (id: string) => api.get<Appeal>(`/appeals/${id}`),

  // Создать обращение
  create: (data: CreateAppealDto) => api.post<Appeal>('/appeals', data),

  // Изменить статус
  updateStatus: (id: string, status: AppealStatus) =>
    api.patch<Appeal>(`/appeals/${id}/status`, { status }),

  // Добавить сообщение
  addMessage: (appealId: string, text: string) =>
    api.post<AppealMessage>(`/appeals/${appealId}/messages`, { text }),

  // Получить сообщения
  getMessages: (appealId: string) =>
    api.get<AppealMessage[]>(`/appeals/${appealId}/messages`),

  // Статистика
  getStats: () => api.get<AppealStats>('/appeals/stats'),

  // Загрузить вложения
  uploadAttachments: async (appealId: string, files: File[]): Promise<Attachment[]> => {
    const formData = new FormData();
    files.forEach((file) => formData.append('files', file));

    const token = api.getToken();
    const response = await fetch(`${API_URL}/appeals/${appealId}/attachments`, {
      method: 'POST',
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      body: formData,
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.message || 'Ошибка загрузки файлов');
    }

    return response.json();
  },

  // Удалить вложение
  deleteAttachment: (attachmentId: string) =>
    api.delete(`/appeals/attachments/${attachmentId}`),

  // Получить URL для скачивания
  getAttachmentUrl: (path: string): string => {
    const baseUrl = API_URL.replace('/api', '');
    return `${baseUrl}/uploads/${path}`;
  },
};
