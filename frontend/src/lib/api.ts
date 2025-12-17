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
};

// Objects API
import type { ConstructionObject, Stage, EquipmentType } from './types';

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
};

// Equipment Types API
export const equipmentTypesApi = {
  getAll: () => api.get<EquipmentType[]>('/equipment-types'),
  create: (name: string) => api.post<EquipmentType>('/equipment-types', { name }),
  update: (id: string, name: string) =>
    api.patch<EquipmentType>(`/equipment-types/${id}`, { name }),
  delete: (id: string) => api.delete(`/equipment-types/${id}`),
};
