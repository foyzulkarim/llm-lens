export interface ApiKeyRecord {
  id: string;
  key: string;
  userId: string;
  userName: string;
  isActive: boolean;
  createdAt: Date;
}

export interface IApiKeyRepo {
  findByKey(key: string): Promise<ApiKeyRecord | null>;
}
