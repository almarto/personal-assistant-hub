export class User {
  constructor(
    private readonly _id: string,
    private _email: string,
    private _role: string,
    private _isActive: boolean,
    private readonly _createdAt: Date,
    private _updatedAt: Date,
    private _lastLoginAt: Date | null
  ) {}

  // Getters
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

  get lastLoginAt(): Date | null {
    return this._lastLoginAt;
  }

  // Business methods
  updateEmail(email: string): User {
    this._email = email;
    this._updatedAt = new Date();
    return this;
  }

  updateRole(role: string): User {
    if (role !== 'admin' && role !== 'user') {
      throw new Error('Invalid role');
    }
    this._role = role;
    this._updatedAt = new Date();
    return this;
  }

  activate(): User {
    this._isActive = true;
    this._updatedAt = new Date();
    return this;
  }

  deactivate(): User {
    this._isActive = false;
    this._updatedAt = new Date();
    return this;
  }

  recordLogin(): User {
    this._lastLoginAt = new Date();
    this._updatedAt = new Date();
    return this;
  }

  // Helper methods for business rules
  canBeUpdatedBy(userId: string, userRole: string): boolean {
    return this._id === userId || userRole === 'admin';
  }

  canBeDeactivatedBy(userId: string, userRole: string): boolean {
    return this._id !== userId && userRole === 'admin';
  }

  canBeDeletedBy(userId: string, userRole: string): boolean {
    return this._id !== userId && userRole === 'admin';
  }

  // Factory method for creating a User instance from raw data
  static create(
    id: string,
    email: string,
    role: string,
    isActive: boolean,
    createdAt: Date,
    updatedAt: Date,
    lastLoginAt: Date | null
  ): User {
    return new User(
      id,
      email,
      role,
      isActive,
      createdAt,
      updatedAt,
      lastLoginAt
    );
  }
}
