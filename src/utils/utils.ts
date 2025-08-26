import fs from 'fs';

export const sleep = (time: number) => {
  return new Promise<void>(resolve => setTimeout(() => resolve(), time));
};

export const readJsonFile = async <T>(path: string): Promise<T | null> => {
  try {
    const content = await fs.promises.readFile(path, 'utf8');
    return JSON.parse(content);
  } catch (error) {
    return null;
  }
};
