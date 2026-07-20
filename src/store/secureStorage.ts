import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Storage } from 'redux-persist';

// redux-persist storage engine backed by the OS keychain (iOS Keychain / Android
// Keystore) instead of AsyncStorage's plain, unencrypted on-disk file — the auth slice
// holds the JWT session token, which must not be readable via filesystem/root access.
// SecureStore keys may only contain [A-Za-z0-9.-_], but redux-persist keys are prefixed
// "persist:auth" — the colon has to be swapped out before it reaches SecureStore.
const sanitizeKey = (key: string) => key.replace(/:/g, '_');

// expo-secure-store has no web implementation (its native module is an empty stub there
// and throws on every call) — this app also ships to web via react-native-web, so web
// keeps using AsyncStorage, matching its pre-existing (already-unencrypted) behavior.
const secureStorage: Storage =
  Platform.OS === 'web'
    ? AsyncStorage
    : {
        getItem: (key) => SecureStore.getItemAsync(sanitizeKey(key)),
        setItem: (key, value) => SecureStore.setItemAsync(sanitizeKey(key), value),
        removeItem: (key) => SecureStore.deleteItemAsync(sanitizeKey(key)),
      };

export default secureStorage;
