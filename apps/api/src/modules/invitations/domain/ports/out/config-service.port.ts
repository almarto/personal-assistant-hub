export const CONFIG_SERVICE = 'CONFIG_SERVICE';

export interface ConfigService {
  get<T = string>(key: string): T | undefined;
}
