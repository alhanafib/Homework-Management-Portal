// firebase-config.js
// Firebase SDK import (CDN version used in HTML)
// আপনার ফায়ারবেস কনফিগারেশন অবজেক্ট এখানে বসান

const firebaseConfig = {
    apiKey: "AIzaSyBYG447xgsQrttobj4bLKI182JKE4b73js",
    authDomain: "homework-managment.firebaseapp.com",
    projectId: "homework-managment",
    storageBucket: "homework-managment.firebasestorage.app",
    messagingSenderId: "509365261044",
    appId: "1:509365261044:web:b2f67c262f08448ea584a1",
    measurementId: "G-TD5NEYVMP0"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();
const auth = firebase.auth();

// Session Persistence (Local = stays logged in until logout)
auth.setPersistence(firebase.auth.Auth.Persistence.LOCAL);