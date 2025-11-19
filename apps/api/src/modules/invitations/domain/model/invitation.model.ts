/**
 * Modelo de dominio para invitaciones
 */
export class Invitation {
  private readonly _id: string;
  private readonly _token: string;
  private readonly _email: string;
  private readonly _createdBy: string;
  private readonly _expiresAt: Date;
  private readonly _usedAt: Date | null;
  private readonly _usedBy: string | null;
  private readonly _createdAt: Date;
  private readonly _role: 'admin' | 'user';

  constructor(
    id: string,
    token: string,
    email: string,
    createdBy: string,
    expiresAt: Date,
    createdAt: Date,
    role: 'admin' | 'user' = 'user',
    usedAt: Date | null = null,
    usedBy: string | null = null
  ) {
    this._id = id;
    this._token = token;
    this._email = email;
    this._createdBy = createdBy;
    this._expiresAt = expiresAt;
    this._createdAt = createdAt;
    this._role = role;
    this._usedAt = usedAt;
    this._usedBy = usedBy;
  }

  get id(): string {
    return this._id;
  }

  get token(): string {
    return this._token;
  }

  get email(): string {
    return this._email;
  }

  get createdBy(): string {
    return this._createdBy;
  }

  get expiresAt(): Date {
    return this._expiresAt;
  }

  get usedAt(): Date | null {
    return this._usedAt;
  }

  get usedBy(): string | null {
    return this._usedBy;
  }

  get createdAt(): Date {
    return this._createdAt;
  }

  get role(): 'admin' | 'user' {
    return this._role;
  }

  /**
   * Checks if the invitation is expired
   */
  isExpired(): boolean {
    return new Date() > this._expiresAt;
  }

  /**
   * Checks if the invitation has been used
   */
  isUsed(): boolean {
    return this._usedAt !== null;
  }

  /**
   * Checks if the invitation is valid (not expired and not used)
   */
  isValid(): boolean {
    return !this.isExpired() && !this.isUsed();
  }

  /**
   * Creates a new Invitation instance with the invitation marked as used
   */
  markAsUsed(userId: string): Invitation {
    return new Invitation(
      this._id,
      this._token,
      this._email,
      this._createdBy,
      this._expiresAt,
      this._createdAt,
      this._role,
      new Date(),
      userId
    );
  }

  /**
   * Creates a new Invitation instance with a new expiration date
   */
  extendExpiration(expirationHours: number): Invitation {
    const newExpiresAt = new Date();
    newExpiresAt.setHours(newExpiresAt.getHours() + expirationHours);

    return new Invitation(
      this._id,
      this._token,
      this._email,
      this._createdBy,
      newExpiresAt,
      this._createdAt,
      this._role,
      this._usedAt,
      this._usedBy
    );
  }

  /**
   * Creates a new Invitation instance with the expiration date set to now
   * (effectively revoking the invitation)
   */
  revoke(): Invitation {
    return new Invitation(
      this._id,
      this._token,
      this._email,
      this._createdBy,
      new Date(), // Immediate expiration
      this._createdAt,
      this._role,
      this._usedAt,
      this._usedBy
    );
  }
}
