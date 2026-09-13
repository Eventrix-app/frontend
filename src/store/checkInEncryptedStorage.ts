import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import * as Crypto from 'expo-crypto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import CryptoJS from 'crypto-js';
import type { Storage } from 'redux-persist';

// The check-in cache holds a full attendee roster (name/email/ticket code/booking
// reference) per event — too large for expo-secure-store's ~2KB per-item limit, but still
// sensitive enough that it shouldn't sit in AsyncStorage's plain on-disk file. This encrypts
// the serialized blob with an AES key that itself lives in SecureStore (small, fits its
// limit), keeping the bulk data in AsyncStorage where size isn't a problem.
const KEY_STORAGE_NAME = 'checkin_cache_aes_key';

let cachedKey: string | null = null;

async function getOrCreateKey(): Promise<string> {
  if (cachedKey) return cachedKey;
  const existing = await SecureStore.getItemAsync(KEY_STORAGE_NAME);
  if (existing) {
    cachedKey = existing;
    return existing;
  }
  const bytes = await Crypto.getRandomBytesAsync(32);
  const key = Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
  await SecureStore.setItemAsync(KEY_STORAGE_NAME, key);
  cachedKey = key;
  return key;
}

const checkInEncryptedStorage: Storage =
  Platform.OS === 'web'
    ? AsyncStorage
    : {
        async getItem(key) {
          const ciphertext = await AsyncStorage.getItem(key);
          if (!ciphertext) return null;
          try {
            const aesKey = await getOrCreateKey();
            const bytes = CryptoJS.AES.decrypt(ciphertext, aesKey);
            const plaintext = bytes.toString(CryptoJS.enc.Utf8);
            return plaintext || null;
          } catch {
            // Undecryptable (key rotated/lost, corrupted write) — treat as absent rather
            // than crashing rehydration; the cache repopulates from the next online fetch.
            return null;
          }
        },
        async setItem(key, value) {
          const aesKey = await getOrCreateKey();
          const ciphertext = CryptoJS.AES.encrypt(value, aesKey).toString();
          await AsyncStorage.setItem(key, ciphertext);
        },
        removeItem(key) {
          return AsyncStorage.removeItem(key);
        },
      };

export default checkInEncryptedStorage;
