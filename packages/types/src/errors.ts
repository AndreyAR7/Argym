export enum AppErrorCode {
  // Auth errors
  INVALID_CREDENTIALS = 'AUTH_001',
  SESSION_EXPIRED = 'AUTH_002',
  RATE_LIMIT_EXCEEDED = 'AUTH_003',
  UNAUTHORIZED = 'AUTH_004',
  FORBIDDEN = 'AUTH_005',

  // Tenant errors
  TENANT_NOT_FOUND = 'TEN_001',
  MODULE_DISABLED = 'TEN_002',

  // Validation errors
  VALIDATION_ERROR = 'VAL_001',
  FILE_TOO_LARGE = 'VAL_002',

  // Network errors
  NETWORK_ERROR = 'NET_001',
  OFFLINE = 'NET_002',

  // Generic
  UNKNOWN = 'GEN_001',
  NOT_FOUND = 'GEN_002',
  SERVER_ERROR = 'GEN_003',
}

export interface AppError {
  code: AppErrorCode;
  message: string;
  details?: Record<string, unknown>;
}
