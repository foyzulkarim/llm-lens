import { IAuthProvider, UserContext } from "../interfaces/IAuthProvider";
import { IApiKeyRepo } from "../interfaces/IApiKeyRepo";
import { AuthenticationError } from "../errors";

export class ApiKeyAuthProvider implements IAuthProvider {
  constructor(private readonly repo: IApiKeyRepo) {}

  async authenticate(apiKey: string): Promise<UserContext> {
    const record = await this.repo.findByKey(apiKey);

    if (!record || !record.isActive) {
      throw new AuthenticationError("Invalid API key");
    }

    return {
      userId: record.userId,
      userName: record.userName,
      apiKey: record.key,
    };
  }
}
