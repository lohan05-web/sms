import 'react-native-gesture-handler';
import { registerRootComponent } from 'expo';

import App from './src/App';

// Entry point referenced by package.json `main`. registerRootComponent wires
// App to the Expo Go / native runtime root.
registerRootComponent(App);
