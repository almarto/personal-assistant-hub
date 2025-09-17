/**
 * Domain model for password credentials
 */
export class PasswordCredential {
  constructor(
    private readonly _id: string,
    private readonly _userId: string,
    private readonly _passwordHash: string,
    private readonly _createdAt: Date,
    private readonly _updatedAt: Date
  ) {}

  get id(): string {
    return this._id;
  }

  get userId(): string {
    return this._userId;
  }

  get passwordHash(): string {
    return this._passwordHash;
  }

  get createdAt(): Date {
    return this._createdAt;
  }

  get updatedAt(): Date {
    return this._updatedAt;
  }
}
