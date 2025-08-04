export interface Table {
  id: string;
  code: string;
  status: string; // 'Available', 'Occupied', etc.
}

// Request types para la API
export interface CreateTableRequest {
  code: string;
}

export interface UpdateTableRequest {
  code: string;
  status: string;
}

// Enum para estados de mesa
export type TableStatus = 'Available' | 'Occupied';
