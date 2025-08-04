// Tipos para la gestión de mesas
export interface Table {
  id: string;
  code: string;
  status: string; // "Available", "Occupied", etc.
}

export interface CreateTableRequest {
  code: string;
}

export interface UpdateTableRequest {
  code: string;
  status: string;
}

export interface CreateResponse {
  id: string;
}

export interface ErrorResponse {
  message: string;
}
