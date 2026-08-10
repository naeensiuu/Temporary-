import { initializeApp } from "https://www.gstatic.com/firebasejs/12.17.1/firebase-app.js";

import { getFirestore } from "https://www.gstatic.com/firebasejs/12.17.1/firebase-firestore.js";

import { getDatabase } from "https://www.gstatic.com/firebasejs/12.17.1/firebase-database.js";

import {
    getAuth,
    signInAnonymously,
    onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/12.17.1/firebase-auth.js";


const firebaseConfig = {

    apiKey: "AIzaSyCLF93nw-N9H2eYPWbueQjhj4fr-Hmxfb8",

    authDomain: "secret-garden-messenger.firebaseapp.com",

    projectId: "secret-garden-messenger",

    storageBucket: "secret-garden-messenger.firebasestorage.app",

    messagingSenderId: "417880443973",

    appId: "1:417880443973:web:199c6d4638d1f7fb0e272c",

    measurementId: "G-VNX0PQ6WY2",

    databaseURL: "https://secret-garden-messenger-default-rtdb.asia-southeast1.firebasedatabase.app"

};


const app = initializeApp(firebaseConfig);

const db = getFirestore(app);

const rtdb = getDatabase(app);

const auth = getAuth(app);

signInAnonymously(auth)
.then(() => {

    console.log("Firebase Connected");

})
.catch(error => {

    console.error(error);

});

onAuthStateChanged(auth,(user)=>{

    if(user){

        console.log("Logged In:",user.uid);

    }

});

export { db, rtdb };