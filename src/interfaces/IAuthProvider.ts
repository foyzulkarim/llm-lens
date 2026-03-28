export interface UserContext {
  userId: string;
  userName: string;
  apiKey: string;
}

export interface IAuthProvider {
  authenticate(apiKey: string): Promise<UserContext>;
}
