import { db, rtdb } from "./firebase.js";

import {
    collection,
    addDoc,
    query,
    orderBy,
    onSnapshot,
    serverTimestamp,
    updateDoc,
    arrayUnion
} from "https://www.gstatic.com/firebasejs/12.17.1/firebase-firestore.js";

import {
    ref,
    onValue,
    onDisconnect,
    set,
    serverTimestamp as rtdbServerTimestamp
} from "https://www.gstatic.com/firebasejs/12.17.1/firebase-database.js";
// ==============================
// VARIABLES
// ==============================

let currentUser = "";

const userSelection = document.getElementById("userSelection");
const messenger = document.getElementById("messenger");

const currentUserText = document.getElementById("currentUser");
const presenceStatus = document.getElementById("presenceStatus");

const chatBox = document.getElementById("chatBox");

const messageInput = document.getElementById("messageInput");
const sendButton = document.getElementById("sendButton");

const rishaBtn = document.getElementById("rishaBtn");
const naaeenBtn = document.getElementById("naaeenBtn");


// ==============================
// USER SELECTION
// ==============================

function enterGarden(name){

    currentUser = name;

    userSelection.style.display = "none";

    messenger.style.display = "flex";

    currentUserText.textContent = "You are " + name;

setupPresence(name);

    startListening();

}


// ==============================
// BUTTONS
// ==============================

rishaBtn.addEventListener("click",()=>{

    enterGarden("Risha");

});

naeenBtn.addEventListener("click",()=>{

    enterGarden("Naeen");

});


// ==============================
// FIRESTORE
// ==============================

const messagesRef = collection(db,"messages");

const messagesQuery = query(

    messagesRef,

    orderBy("time","asc")

);

function isMyMessage(data) {

    return data.sender === currentUser ||
           (currentUser === "Naeen" && data.sender === "Naaeen");

}
// ==============================
// RENDER MESSAGE
// ==============================

function renderMessage(data){

    const message = document.createElement("div");

    // Check if sender matches currentUser OR is the old spelling "Naaeen"
    const isMe = isMyMessage(data);

    if(isMe){

        message.className = "message sent";

    }else{

        message.className = "message received";

    }

    let name = null;

    if(!isMe){

        name = document.createElement("div");

        name.className = "name";

        name.textContent = data.sender;

    }

    const bubble = document.createElement("div");
    bubble.className = "bubble";
    bubble.textContent = data.text;

    const time = document.createElement("div");
    time.className = "time";
const seenStatus = document.createElement("div");
seenStatus.className = "seen-status";
    if(data.time){

        const d = data.time.toDate();

        time.textContent = d.toLocaleTimeString([],{

            hour:"2-digit",
            minute:"2-digit"

        });

    }
    
    if(isMe){

    if(data.seenBy && data.seenBy.length > 1){

        seenStatus.textContent = "✓✓ Seen";

    }else{

        seenStatus.textContent = "✓";

    }

}

    if(name){

        message.appendChild(name);

    }

    message.appendChild(bubble);

message.appendChild(time);

if(isMe){

    message.appendChild(seenStatus);

}

chatBox.appendChild(message);

}


// ==============================
// REALTIME LISTENER
// ==============================

function startListening(){

    onSnapshot(messagesQuery,(snapshot)=>{

        chatBox.innerHTML="";

        snapshot.forEach(async (docSnap)=>{

            const data = docSnap.data();

            renderMessage(data);

            // Mark messages from the other person as seen
            if(!isMyMessage(data)){

                const seenBy = data.seenBy || [];

                if(!seenBy.includes(currentUser)){

                    try{

                        await updateDoc(docSnap.ref,{

                            seenBy: arrayUnion(currentUser)

                        });

                    }
                    catch(error){

                        console.error(
                            "Failed to mark message as seen:",
                            error
                        );

                    }

                }

            }

        });

        chatBox.scrollTop = chatBox.scrollHeight;

    });

}


// ==============================
// ONLINE / LAST ACTIVE
// ==============================

// ==============================
// ONLINE / LAST ACTIVE
// ==============================

let presenceUser = "";

function setupPresence(name) {

    presenceUser = name.toLowerCase();

    const presenceRef = ref(
        rtdb,
        "presence/" + presenceUser
    );

    const connectedRef = ref(
        rtdb,
        ".info/connected"
    );

    onValue(connectedRef, (snapshot) => {

        if (snapshot.val() !== true) {
            return;
        }

        onDisconnect(presenceRef).set({

            online: false,

            lastActive: rtdbServerTimestamp()

        });

        set(presenceRef, {

            online: true,

            lastActive: rtdbServerTimestamp()

        });

    });

    // Watch the OTHER person's presence

    const otherUser =
        name.toLowerCase() === "naeen"
        ? "risha"
        : "naeen";

    const otherPresenceRef = ref(
        rtdb,
        "presence/" + otherUser
    );

    onValue(otherPresenceRef, (snapshot) => {

        const data = snapshot.val();

        if (!data) {

            presenceStatus.textContent =
                "⚪ " + otherUser + " is offline";

            return;

        }

        if (data.online === true) {

            presenceStatus.textContent =
                "🟢 " +
                capitalize(otherUser) +
                " is online";

        } else if (data.lastActive) {

            presenceStatus.textContent =
                "⚪ " +
                capitalize(otherUser) +
                " was active " +
                formatLastActive(data.lastActive);

        }

    });

}


// ==============================
// PRESENCE HELPERS
// ==============================

function capitalize(name) {

    return name.charAt(0).toUpperCase() +
           name.slice(1);

}


function formatLastActive(timestamp) {

    const now = Date.now();

    const difference = now - timestamp;

    const seconds = Math.floor(difference / 1000);

    if(seconds < 60){

        return "just now";

    }

    const minutes = Math.floor(seconds / 60);

    if(minutes < 60){

        return minutes === 1
            ? "1 minute ago"
            : minutes + " minutes ago";

    }

    const hours = Math.floor(minutes / 60);

    if(hours < 24){

        return hours === 1
            ? "1 hour ago"
            : hours + " hours ago";

    }

    const days = Math.floor(hours / 24);

    if(days === 1){

        return "yesterday";

    }

    if(days < 7){

        return days + " days ago";

    }

    return new Date(timestamp).toLocaleDateString([], {

        month: "short",
        day: "numeric"

    });

}








// ==============================
// SEND MESSAGE
// ==============================

sendButton.addEventListener("click", sendMessage);

async function sendMessage(){

    const text = messageInput.value.trim();

    if(text === "") return;

    try{

        await addDoc(messagesRef,{

    sender: currentUser,

    text: text,

    time: serverTimestamp(),

    seenBy: [currentUser]

});

        messageInput.value = "";

        messageInput.style.height = "auto";

        messageInput.focus();

    }

    catch(error){

        console.error(error);

        alert("Failed to send message.");

    }

}

// ==============================
// AUTO GROW TEXTAREA
// ==============================

messageInput.addEventListener("input", () => {

    messageInput.style.height = "auto";

    messageInput.style.height = messageInput.scrollHeight + "px";

});
