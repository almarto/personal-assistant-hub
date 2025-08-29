/**
 * Domain model for the user
 */
export class User {
  constructor(
    private readonly _id: string,
    private readonly _email: string,
    private readonly _role: string,
    private readonly _isActive: boolean,
    private readonly _createdAt: Date,
    private readonly _updatedAt: Date,
    private readonly _lastLoginAt?: Date | null
  ) {}

  get id(): string {
    return this._id;
  }

  get email(): string {
    return this._email;
  }

  get role(): string {
    return this._role;
  }

  get isActive(): boolean {
    return this._isActive;
  }

  get createdAt(): Date {
    return this._createdAt;
  }

  get updatedAt(): Date {
    return this._updatedAt;
  }

  get lastLoginAt(): Date | null | undefined {
    return this._lastLoginAt;
  }
}
