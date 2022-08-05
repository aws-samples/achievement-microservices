type Constructor<T = any> = new (...args: any[]) => T;
type Field = string;
export enum Keys {
  PK = "pk",
  SK = "sk",
}

export const tableMap = new Map<Constructor, string>();
export const keyMap = new Map<Constructor, Map<Keys, Field>>();
export const gsiKeyMap = new Map<Constructor, Map<Keys, Field>>();
export const gsiIndexMap = new Map<Constructor, string>();

export function Table(tableName: string) {
  return (Class: Constructor) => {
    tableMap.set(Class, tableName);
  };
}

export function GSI(indexName: string) {
  return (Class: Constructor) => {
    gsiIndexMap.set(Class, indexName);
  };
}

export const pk = addKey(Keys.PK);
export const sk = addKey(Keys.SK);
export const gsiPk = addKey(Keys.PK, true);
export const gsiSk = addKey(Keys.SK, true);

export function addKey(key: Keys, isGSI = false) {
  return (Class: any, field: Field) => {
    if (isGSI) {
      const map = gsiKeyMap.get(Class.constructor) ?? new Map<Keys, Field>();
      map.set(key, field);
      gsiKeyMap.set(Class.constructor, map);
      return;
    }
    const map = keyMap.get(Class.constructor) ?? new Map<Keys, Field>();
    map.set(key, field);
    keyMap.set(Class.constructor, map);
  };
}
