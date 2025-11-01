// firebaseConfig.ts
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth"; // 👈 dùng auth chuẩn
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: "AIzaSyBS_95q64oIeU3m1Cf8Dovja4taVJzds0M",
  authDomain: "pharmacyapp-127c8.firebaseapp.com",
  projectId: "pharmacyapp-127c8",
  storageBucket: "pharmacyapp-127c8.appspot.com",
  messagingSenderId: "603851764283",
  appId: "1:603851764283:web:ea89afbf3a286c5418a21e",
  measurementId: "G-8WDT12TPQ8",
};

const app = initializeApp(firebaseConfig);

const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);

export { auth, db, storage };
