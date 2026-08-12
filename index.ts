import 'react-native-gesture-handler';
// Polyfills global.crypto.getRandomValues, which crypto-js needs for the AES salt/IV in
// checkInEncryptedStorage. Without it every offline check-in cache write throws.
import 'react-native-get-random-values';
import { registerRootComponent } from 'expo';

import App from './App';

// registerRootComponent calls AppRegistry.registerComponent('main', () => App);
// It also ensures that whether you load the app in Expo Go or in a native build,
// the environment is set up appropriately
registerRootComponent(App);
