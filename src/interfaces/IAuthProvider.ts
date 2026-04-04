export interface UserContext {
  userId: string;
  userName: string;
}

export interface IAuthProvider {
  authenticate(apiKey: string): Promise<UserContext>;
}
