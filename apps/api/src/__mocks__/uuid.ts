// Mock for uuid to handle ESM module in Jest
export const v4 = jest.fn(() => 'mock-uuid-v4');
export const v1 = jest.fn(() => 'mock-uuid-v1');
export const v3 = jest.fn(() => 'mock-uuid-v3');
export const v5 = jest.fn(() => 'mock-uuid-v5');
