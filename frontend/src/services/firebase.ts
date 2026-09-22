// import { FirebaseApp, initializeApp, getApps, getApp } from 'firebase/app';
// //import { Auth, getAuth } from 'firebase/auth';
// import { firebaseConfig } from '../constants/firebaseConfig';

// let app: FirebaseApp | undefined;
// //let auth: Auth | undefined;

// try {
//   if (getApps().length === 0) {
//     app = initializeApp(firebaseConfig);
//    // auth = getAuth(app);
//     console.log('[Firebase] Initialization successful.');
//   } else {
//     app = getApp();
//     //auth = getAuth(app);
//     console.log('[Firebase] Already initialized, reusing existing app.');
//   }
// } catch (error) {
//   console.error('[Firebase] Initialization failed:', error);
// }

// export { app, auth };

import { FirebaseApp, initializeApp, getApps, getApp } from 'firebase/app';
import { firebaseConfig } from '../constants/firebaseConfig';

let app: FirebaseApp | undefined;

try {
  if (getApps().length === 0) {
    app = initializeApp(firebaseConfig);
    console.log('[Firebase] Initialization successful.');
  } else {
    app = getApp();
    console.log('[Firebase] Already initialized, reusing existing app.');
  }
} catch (error) {
  console.error('[Firebase] Initialization failed:', error);
}

export { app };