import { store } from './index';

// Test if the store can be created and accessed
console.log('Testing Redux store...');
console.log('Store state:', store.getState());
console.log('Store dispatch:', store.dispatch);
console.log('Store reducer keys:', Object.keys(store.getState()));

export default store;
