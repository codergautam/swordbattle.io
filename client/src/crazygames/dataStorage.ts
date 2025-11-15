import { crazygamesSDK } from './sdk';

let dataStorageReady = false;

export async function initializeDataStorage(): Promise<void> {
  if (!crazygamesSDK.shouldUseSDK()) {
    console.log('[DataStorage] Not on CrazyGames platform, data storage disabled');
    return;
  }

  if (!crazygamesSDK.isUserAccountAvailable()) {
    console.log('[DataStorage] User accounts not available, data storage disabled');
    return;
  }

  try {
    const user = await crazygamesSDK.getUser();
    if (!user) {
      console.log('[DataStorage] User not logged in, data storage disabled');
      return;
    }

    dataStorageReady = true;
    console.log('[DataStorage] Initialized for CrazyGames user:', user.username);
  } catch (error) {
    console.error('[DataStorage] Failed to initialize:', error);
    dataStorageReady = false;
  }
}

export async function setData(key: string, value: string): Promise<boolean> {
  if (!dataStorageReady) {
    console.warn('[DataStorage] Not ready - data will not be saved');
    return false;
  }

  try {
    await crazygamesSDK.setData(key, value);
    return true;
  } catch (error) {
    console.error(`[DataStorage] Failed to set data for key "${key}":`, error);
    return false;
  }
}

export async function getData(key: string): Promise<string | null> {
  if (!dataStorageReady) {
    return null;
  }

  try {
    return await crazygamesSDK.getData(key);
  } catch (error) {
    console.error(`[DataStorage] Failed to get data for key "${key}":`, error);
    return null;
  }
}

export async function removeData(key: string): Promise<boolean> {
  if (!dataStorageReady) {
    return false;
  }

  try {
    await crazygamesSDK.removeData(key);
    return true;
  } catch (error) {
    console.error(`[DataStorage] Failed to remove data for key "${key}":`, error);
    return false;
  }
}

export async function clearAllData(): Promise<boolean> {
  if (!dataStorageReady) {
    return false;
  }

  try {
    await crazygamesSDK.clearData();
    return true;
  } catch (error) {
    console.error('[DataStorage] Failed to clear all data:', error);
    return false;
  }
}

export function isReady(): boolean {
  return dataStorageReady;
}
