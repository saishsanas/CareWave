// Ensure React Native core runtime and globals (FormData, performance, timers, etc.)
// are fully initialized before Expo packages and winter runtime evaluate.
import 'react-native/Libraries/Core/InitializeCore';

import { registerRootComponent } from 'expo';

import App from './App';

// registerRootComponent calls AppRegistry.registerComponent('main', () => App);
// It also ensures that whether you load the app in Expo Go or in a native build,
// the environment is set up appropriately
registerRootComponent(App);

