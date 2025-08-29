/**
 * Domain model for passkey credentials
 */
export class PasskeyCredential {
  constructor(
    private readonly _id: string,
    private readonly _userId: string,
    private readonly _credentialId: string,
    private readonly _publicKey: string,
    private readonly _counter: number,
    private readonly _deviceName: string,
    private readonly _createdAt: Date,
    private readonly _lastUsedAt?: Date | null
  ) {}

  get id(): string {
    return this._id;
  }

  get userId(): string {
    return this._userId;
  }

  get credentialId(): string {
    return this._credentialId;
  }

  get publicKey(): string {
    return this._publicKey;
  }

  get counter(): number {
    return this._counter;
  }

  get deviceName(): string {
    return this._deviceName;
  }

  get createdAt(): Date {
    return this._createdAt;
  }

  get lastUsedAt(): Date | null | undefined {
    return this._lastUsedAt;
  }
}
