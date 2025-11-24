export const SESSION_REPOSITORY = 'SESSION_REPOSITORY';

export interface SessionRepository {
  create(data: {
    id: string;
    userId: string;
    token: string;
    expiresAt: Date;
  }): Promise<void>;
  invalidate(sessionId: string): Promise<void>;
}
