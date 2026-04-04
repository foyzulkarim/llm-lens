import { PrismaClient } from "@prisma/client";
import { IApiKeyRepo, ApiKeyRecord } from "../interfaces/IApiKeyRepo";

export class PrismaApiKeyRepository implements IApiKeyRepo {
  constructor(private readonly prisma: PrismaClient) {}

  async findByKey(key: string): Promise<ApiKeyRecord | null> {
    return this.prisma.apiKey.findUnique({ where: { key } });
  }
}
