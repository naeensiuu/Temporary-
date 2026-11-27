import { db, rtdb } from "./firebase.js";

import {
    collection,
    addDoc,
    query,
    orderBy,
    onSnapshot,
    serverTimestamp,
    updateDoc,
    arrayUnion,
    doc,
    deleteField,
    limit,
    startAfter,
    getDocs
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

let replyingTo = null;

// messageId -> { Risha: "❤️", Naeen: "😂" }  (used by reactions)
const messageReactions = new Map();

const userSelection =
    document.getElementById("userSelection");

const messenger =
    document.getElementById("messenger");

const currentUserText =
    document.getElementById("currentUser");

const presenceStatus =
    document.getElementById("presenceStatus");

const chatBox =
    document.getElementById("chatBox");

const messageInput =
    document.getElementById("messageInput");

const sendButton =
    document.getElementById("sendButton");
const imageInput =
    document.getElementById("imageInput");
const cameraInput =
    document.getElementById("cameraInput");

const rishaBtn =
    document.getElementById("rishaBtn");

const naeenBtn =
    document.getElementById("naeenBtn");

const PHOTO_UPLOAD_URL =
    "https://script.google.com/macros/s/AKfycbxuprFwC5L8dB_mJ1UFjzZMOvv57i-SKuZXffseWxEubFbjaRh1IMI4PHPUG0kgasr0/exec";
// ==============================
// USER SELECTION
// ==============================

function enterGarden(name) {

    currentUser = name;

    userSelection.style.display = "none";

    messenger.style.display = "flex";

    currentUserText.textContent =
        "You are " + name;

    setupPresence(name);

    startListening();
}


// ==============================
// BUTTONS
// ==============================

rishaBtn.addEventListener("click", () => {

    enterGarden("Risha");

});

naeenBtn.addEventListener("click", () => {

    enterGarden("Naeen");

});


// ==============================
// FIRESTORE
// ==============================

const messagesRef =
    collection(db, "messages");

// Only the newest messages are loaded at first (keeps the page fast).
// Older ones load when you tap "Load older messages" at the top.
const PAGE_SIZE = 40;

let oldestLoadedDoc = null;
let loadOlderButton = null;

const messagesQuery =
    query(
        messagesRef,
        orderBy("time", "desc"),
        limit(PAGE_SIZE)
    );


// ==============================
// MESSAGE OWNERSHIP
// ==============================

function isMyMessage(data) {

    return data.sender === currentUser ||
           (
               currentUser === "Naeen" &&
               data.sender === "Naaeen"
           );
}


// ==============================
// RENDER MESSAGE
// ==============================

function renderMessage(
    data,
    messageId,
    container = chatBox
) {

    const message =
        document.createElement("div");

    message.className =
        isMyMessage(data)
            ? "message sent"
            : "message received";

    /*
       Give every message its Firestore ID.

       This lets the reply system find
       the original message later.
    */

    message.dataset.messageId =
        messageId;


    // ==============================
    // MESSAGE NAME
    // ==============================

    let name = null;

    if (!isMyMessage(data)) {

        name =
            document.createElement("div");

        name.className = "name";

        name.textContent =
            data.sender;
    }


    // ==============================
    // REPLY PREVIEW INSIDE MESSAGE
    // ==============================

    if (data.replyTo) {

        const replyPreview =
            document.createElement("div");

        replyPreview.className =
            "message-reply-preview";

        const replySender =
            document.createElement("div");

        replySender.className =
            "message-reply-sender";

        replySender.textContent =
            data.replyTo.sender;

        const replyText =
            document.createElement("div");

        replyText.className =
            "message-reply-text";

        replyText.textContent =
            data.replyTo.text;


        replyPreview.appendChild(
            replySender
        );

        replyPreview.appendChild(
            replyText
        );


        /*
           Clicking a reply preview
           jumps to the original message.
        */

        if (data.replyTo.id) {

            replyPreview.addEventListener(
                "click",
                () => {

                    const original =
                        document.querySelector(
                            `[data-message-id="${data.replyTo.id}"]`
                        );

                    if (!original) return;

                    original.scrollIntoView({
                        behavior: "smooth",
                        block: "center"
                    });

                    original.classList.add(
                        "reply-highlight"
                    );

                    setTimeout(() => {

                        original.classList.remove(
                            "reply-highlight"
                        );

                    }, 1200);

                }
            );

        }


        message.appendChild(
            replyPreview
        );
    }


   // ==============================
// MESSAGE BUBBLE
// ==============================

const bubble =
    document.createElement("div");

bubble.className =
    "bubble";


if (
    data.type === "photo" &&
    data.photoUrl
) {

    const image =
        document.createElement("img");

    image.src =
        data.photoThumbnail ||
        data.photoUrl;

    image.alt =
        data.fileName ||
        "Photo";

    image.className =
        "chat-photo";

    image.loading =
        "lazy";

    image.addEventListener(
        "click",
        () => {

            window.open(
                data.photoUrl,
                "_blank"
            );

        }
    );

    bubble.appendChild(
        image
    );

}
else if (
    data.mimeType &&
    data.mimeType.startsWith("audio/") &&
    data.fileId
) {

    const audioPlaceholder = document.createElement("button");
    audioPlaceholder.type = "button";
    audioPlaceholder.className = "chat-media-placeholder chat-audio-placeholder";
    audioPlaceholder.textContent = "🎵  Tap to play audio";

    audioPlaceholder.addEventListener("click", (e) => {

        e.stopPropagation();

        const audio = document.createElement("iframe");
        audio.src = "https://drive.google.com/file/d/" + data.fileId + "/preview";
        audio.allow = "autoplay";
        audio.frameBorder = "0";
        audio.style.width = "100%";
        audio.style.height = "80px";

        audioPlaceholder.replaceWith(audio);
    });

    bubble.appendChild(audioPlaceholder);

}







// Render Video Message in Chat (normal player, file still stored in Drive)
else if (
    (data.type === "video" || (data.mimeType && data.mimeType.startsWith("video/"))) &&
    data.fileId
) {

    const videoWrapper = document.createElement("div");
    videoWrapper.className = "chat-video-container";

    // Lightweight placeholder: Drive's heavy player only loads when tapped
    const videoPlaceholder = document.createElement("button");
    videoPlaceholder.type = "button";
    videoPlaceholder.className = "chat-media-placeholder";
    videoPlaceholder.textContent = "▶  Tap to play video";

    videoPlaceholder.addEventListener("click", (e) => {

        e.stopPropagation();

        const iframe = document.createElement("iframe");
        iframe.src = "https://drive.google.com/file/d/" + data.fileId + "/preview";
        iframe.className = "chat-video-iframe";
        iframe.frameBorder = "0";

        const expandBtn = document.createElement("button");
        expandBtn.className = "chat-video-expand-btn";
        expandBtn.innerHTML = "⛶ Fullscreen";
        expandBtn.type = "button";

        expandBtn.addEventListener("click", (ev) => {
            ev.stopPropagation();
            openVideoModal(data.fileId);
        });

        videoPlaceholder.remove();
        videoWrapper.appendChild(iframe);
        videoWrapper.appendChild(expandBtn);
    });

    videoWrapper.appendChild(videoPlaceholder);
    bubble.appendChild(videoWrapper);

}























else {

    bubble.textContent =
        data.text || "";

}

    // ==============================
    // MESSAGE TIME
    // ==============================

    const time =
        document.createElement("div");

    time.className =
        "time";


    if (data.time) {

        const d =
            data.time.toDate();

        time.textContent =
            d.toLocaleTimeString(
                [],
                {
                    hour: "2-digit",
                    minute: "2-digit"
                }
            );
    }


    // ==============================
    // SEEN STATUS
    // ==============================

    const seenStatus =
        document.createElement("div");

    seenStatus.className =
        "seen-status";


    if (isMyMessage(data)) {

        if (
            data.seenBy &&
            data.seenBy.length > 1
        ) {

            seenStatus.textContent =
                "✓✓ Seen";

        } else {

            seenStatus.textContent =
                "✓";
        }
    }


    // ==============================
    // BUILD MESSAGE
    // ==============================

    if (name) {

        message.appendChild(name);

    }

    message.appendChild(bubble);

    // Reactions row (filled now, and updated live when someone reacts)
    const reactionsRow = document.createElement("div");
    reactionsRow.className = "reactions";
    messageReactions.set(messageId, data.reactions || {});
    paintReactions(reactionsRow, data.reactions);
    message.appendChild(reactionsRow);

    message.appendChild(time);


    if (isMyMessage(data)) {

        message.appendChild(
            seenStatus
        );
    }


    container.appendChild(message);


    // ==============================
    // SWIPE TO REPLY
    // ==============================

    enableSwipeReply(
        message,
        data,
        messageId
    );
}


// ==============================
// SWIPE TO REPLY
// ==============================

function enableSwipeReply(
    messageElement,
    data,
    messageId
) {

    let startX = 0;

    let startY = 0;

    let currentX = 0;

    let dragging = false;

    const swipeLimit = 90;


    messageElement.addEventListener(
        "touchstart",
        (event) => {

            /*
               Only track one finger.
            */

            if (
                event.touches.length !== 1
            ) {
                return;
            }

            /*
               Don't start a swipe-to-reply when the finger is on a
               video / audio player (dragging the seek bar).
            */
            if (event.target.closest("video, audio, iframe")) {
                return;
            }

            startX =
                event.touches[0].clientX;

            startY =
                event.touches[0].clientY;

            currentX = startX;

            dragging = true;

            messageElement.style.transition =
                "none";

        },
        {
            passive: true
        }
    );


    messageElement.addEventListener(
        "touchmove",
        (event) => {

            if (!dragging) return;

            currentX =
                event.touches[0].clientX;

            const currentY =
                event.touches[0].clientY;

            const deltaX =
                currentX - startX;

            const deltaY =
                currentY - startY;


            /*
               If the movement is mainly vertical,
               let the chat scroll normally.
            */

            if (
                Math.abs(deltaY) >
                Math.abs(deltaX)
            ) {

                return;
            }


            /*
               Only allow swiping RIGHT.
            */

            if (deltaX <= 0) {

                messageElement.style.transform =
                    "translateX(0)";

                return;
            }


            /*
               Limit the movement.
            */

            const distance =
                Math.min(
                    deltaX,
                    110
                );


            messageElement.style.transform =
                `translateX(${distance}px)`;

        },
        {
            passive: true
        }
    );


    messageElement.addEventListener(
        "touchend",
        () => {

            if (!dragging) return;

            dragging = false;

            const distance =
                currentX - startX;


            messageElement.style.transition =
                "transform 0.18s ease";


            if (
    distance >= swipeLimit
) {

    /*
       Successful swipe.
    */

    messageElement.style.transform =
        "translateX(0)";


    // 🌸 Secret Garden reply burst
    createReplyBurst(
        messageElement
    );


    setReplyTo(
        data,
        messageId
    );

            } else {

                /*
                   Not far enough.
                */

                messageElement.style.transform =
                    "translateX(0)";
            }

        },
        {
            passive: true
        }
    );


    messageElement.addEventListener(
        "touchcancel",
        () => {

            dragging = false;

            messageElement.style.transition =
                "transform 0.18s ease";

            messageElement.style.transform =
                "translateX(0)";
        }
    );
}


// ==============================
// START REPLY
// ==============================

function setReplyTo(
    data,
    messageId
) {

    replyingTo = {

        id: messageId,

        sender: data.sender,

        text: data.text
    };


    // Show the reply composer first
    showReplyComposer();


    /*
       IMPORTANT:

       On Android, especially when the keyboard
       is already closed, focusing immediately after
       a swipe can happen before the browser has
       finished updating the layout.

       Give the browser a moment to render the
       composer before opening the keyboard.
    */

    requestAnimationFrame(() => {

        requestAnimationFrame(() => {

            messageInput.focus({
                preventScroll: true
            });


            /*
               Make sure the input is visible after
               Android resizes the viewport for the
               keyboard.
            */

            setTimeout(() => {

                messageInput.scrollIntoView({
                    behavior: "smooth",
                    block: "nearest"
                });

            }, 150);

        });

    });

}


// ==============================
// CREATE REPLY COMPOSER
// ==============================

function showReplyComposer() {

    let replyComposer =
        document.getElementById(
            "replyComposer"
        );


    /*
       If the HTML doesn't have one,
       create it automatically.

       Therefore we don't need to
       modify notes.html yet.
    */

    if (!replyComposer) {

        replyComposer =
            document.createElement("div");

        replyComposer.id =
            "replyComposer";

        messageInput.parentElement.insertBefore(
            replyComposer,
            messageInput
        );
    }


    replyComposer.innerHTML = "";


    const replyInfo =
        document.createElement("div");

    replyInfo.className =
        "reply-composer-info";


    const replyLabel =
        document.createElement("div");

    replyLabel.className =
        "reply-composer-label";

    replyLabel.textContent =
        "↩ Replying to " +
        replyingTo.sender;


    const replyText =
        document.createElement("div");

    replyText.className =
        "reply-composer-text";

    replyText.textContent =
        replyingTo.text;


    const cancelButton =
        document.createElement("button");

    cancelButton.type =
        "button";

    cancelButton.className =
        "reply-cancel";

    cancelButton.textContent =
        "×";


    cancelButton.addEventListener(
        "click",
        cancelReply
    );


    replyInfo.appendChild(
        replyLabel
    );

    replyInfo.appendChild(
        replyText
    );


    replyComposer.appendChild(
        replyInfo
    );

    replyComposer.appendChild(
        cancelButton
    );


    replyComposer.style.display =
        "flex";
}


// ==============================
// CANCEL REPLY
// ==============================

function cancelReply() {

    replyingTo = null;

    const replyComposer =
        document.getElementById(
            "replyComposer"
        );


    if (replyComposer) {

        replyComposer.style.display =
            "none";

        replyComposer.innerHTML = "";
    }


    messageInput.focus();
}


// ==============================
// REALTIME LISTENER
// ==============================

function startListening() {
    onSnapshot(messagesQuery, (snapshot) => {
        const isFirstLoad = !chatBox.dataset.initialized;

        // ==============================
        // FIRST LOAD (INSTANT JUMP)
        // ==============================
        if (isFirstLoad) {
            // 1. Use DocumentFragment to batch DOM inserts into a single repaint
            const fragment = document.createDocumentFragment();

            snapshot.docs.slice().reverse().forEach((docSnap) => {
                const data = docSnap.data();

                renderMessage(data, docSnap.id, fragment);

                // Mark unread messages asynchronously
                if (!isMyMessage(data)) {
                    const seenBy = data.seenBy || [];
                    if (!seenBy.includes(currentUser)) {
                        updateDoc(docSnap.ref, {
                            seenBy: arrayUnion(currentUser)
                        }).catch(error => console.error("Failed to mark message as seen:", error));
                    }
                }
            });

            // 2. Insert all messages at once
            // Remember the oldest loaded message, and offer older ones if there may be more
            oldestLoadedDoc = snapshot.docs[snapshot.docs.length - 1] || null;

            if (snapshot.size >= PAGE_SIZE) {
                loadOlderButton = createLoadOlderButton();
                chatBox.appendChild(loadOlderButton);
            }

            chatBox.appendChild(fragment);

            // 3. Force instant jump to bottom (disable smooth animation for initial load)
            const originalScrollBehavior = chatBox.style.scrollBehavior;
            chatBox.style.scrollBehavior = "auto";
            chatBox.scrollTop = chatBox.scrollHeight;
            chatBox.style.scrollBehavior = originalScrollBehavior;

            // 4. Keep the chat pinned to the bottom while the first photos
            //    finish loading, but ONLY until the user starts scrolling.
            //    (Before: every lazy-loaded photo yanked you back to the bottom
            //    as you scrolled up through old messages.)
            let stickToBottom = true;
            const stopSticking = () => { stickToBottom = false; };

            chatBox.addEventListener("touchstart", stopSticking, { once: true, passive: true });
            chatBox.addEventListener("wheel", stopSticking, { once: true, passive: true });
            chatBox.addEventListener("mousedown", stopSticking, { once: true });
            setTimeout(stopSticking, 3000);

            const images = chatBox.querySelectorAll("img.chat-photo");
            images.forEach(img => {
                if (!img.complete) {
                    img.addEventListener("load", () => {
                        if (!stickToBottom) return;
                        const previous = chatBox.style.scrollBehavior;
                        chatBox.style.scrollBehavior = "auto";
                        chatBox.scrollTop = chatBox.scrollHeight;
                        chatBox.style.scrollBehavior = previous;
                    }, { once: true });
                }
            });

            chatBox.dataset.initialized = "true";
            return;
        }

        // ==============================
        // LATER FIRESTORE CHANGES
        // ==============================
        snapshot.docChanges().forEach(async (change) => {
            if (change.type === "added") {
                const data = change.doc.data();



                if (!document.querySelector(`[data-message-id="${change.doc.id}"]`)) {
                    const wasNearBottom =
                        chatBox.scrollHeight - chatBox.scrollTop - chatBox.clientHeight < 120;

                    renderMessage(data, change.doc.id);

                    if (wasNearBottom) {
                        chatBox.scrollTop = chatBox.scrollHeight;
                    }
                }

                if (!isMyMessage(data)) {
                    const seenBy = data.seenBy || [];
                    if (!seenBy.includes(currentUser)) {
                        try {
                            await updateDoc(change.doc.ref, {
                                seenBy: arrayUnion(currentUser)
                            });
                        } catch (error) {
                            console.error("Failed to mark message as seen:", error);
                        }
                    }
                }
            }


            if (change.type === "modified") {

                const data =
                    change.doc.data();

                // Update reactions on this message (works for both people's messages)
                messageReactions.set(change.doc.id, data.reactions || {});
                const reactionTarget = document.querySelector(
                    `[data-message-id="${change.doc.id}"] .reactions`
                );
                if (reactionTarget) {
                    paintReactions(reactionTarget, data.reactions);
                }



                if (isMyMessage(data)) {

                    const messageElement =
                        document.querySelector(
                            `[data-message-id="${change.doc.id}"]`
                        );


                    if (!messageElement) {
                        return;
                    }


                    const seenStatus =
                        messageElement.querySelector(
                            ".seen-status"
                        );


                    if (!seenStatus) {
                        return;
                    }


                    if (
                        data.seenBy &&
                        data.seenBy.length > 1
                    ) {

                        seenStatus.textContent =
                            "✓✓ Seen";

                    }
                    else {

                        seenStatus.textContent =
                            "✓";

                    }

                }

            }
        });
    });
}








// Video Fullscreen Modal Setup (Google Drive Preview Frame)
const videoModal = document.createElement("div");
videoModal.className = "video-modal";

const videoModalClose = document.createElement("button");
videoModalClose.className = "video-modal-close";
videoModalClose.textContent = "×";

const videoModalFrame = document.createElement("iframe");
videoModalFrame.className = "video-modal-frame";
videoModalFrame.frameBorder = "0";

videoModal.appendChild(videoModalFrame);
videoModal.appendChild(videoModalClose);
document.body.appendChild(videoModal);

function openVideoModal(fileId) {
    videoModalFrame.src = "https://drive.google.com/file/d/" + fileId + "/preview";
    videoModal.style.display = "flex";
}

function closeVideoModal() {
    videoModal.style.display = "none";
    videoModalFrame.src = ""; // Clear src to stop video audio completely
}

videoModalClose.addEventListener("click", closeVideoModal);

videoModal.addEventListener("click", (e) => {
    if (e.target === videoModal) {
        closeVideoModal();
    }
});




















// ==============================
// ONLINE / LAST ACTIVE
// ==============================

let presenceUser = "";


function setupPresence(name) {

    presenceUser =
        name.toLowerCase();


    const presenceRef =
        ref(
            rtdb,
            "presence/" +
            presenceUser
        );


    const connectedRef =
        ref(
            rtdb,
            ".info/connected"
        );


    onValue(
        connectedRef,
        (snapshot) => {

            if (
                snapshot.val() !== true
            ) {

                return;
            }


            onDisconnect(
                presenceRef
            ).set({

                online: false,

                lastActive:
                    rtdbServerTimestamp()

            });


            set(
                presenceRef,
                {

                    online: true,

                    lastActive:
                        rtdbServerTimestamp()

                }
            );
        }
    );


    // ==============================
    // WATCH OTHER PERSON
    // ==============================

    const otherUser =
        name.toLowerCase() === "naeen"
            ? "risha"
            : "naeen";


    const otherPresenceRef =
        ref(
            rtdb,
            "presence/" +
            otherUser
        );


    onValue(
        otherPresenceRef,
        (snapshot) => {

            const data =
                snapshot.val();


            if (!data) {

                presenceStatus.textContent =
                    "⚪ " +
                    otherUser +
                    " is offline";

                return;
            }


            if (
                data.online === true
            ) {

                presenceStatus.textContent =
                    "🟢 " +
                    capitalize(
                        otherUser
                    ) +
                    " is online";

            }
            else if (
                data.lastActive
            ) {

                presenceStatus.textContent =
                    "⚪ " +
                    capitalize(
                        otherUser
                    ) +
                    " was active " +
                    formatLastActive(
                        data.lastActive
                    );
            }
        }
    );
}


// ==============================
// PRESENCE HELPERS
// ==============================

function capitalize(name) {

    return (
        name.charAt(0).toUpperCase() +
        name.slice(1)
    );
}


function formatLastActive(timestamp) {

    const now =
        Date.now();

    const difference =
        now - timestamp;

    const seconds =
        Math.floor(
            difference / 1000
        );


    if (seconds < 60) {

        return "just now";
    }


    const minutes =
        Math.floor(
            seconds / 60
        );


    if (minutes < 60) {

        return minutes === 1
            ? "1 minute ago"
            : minutes + " minutes ago";
    }


    const hours =
        Math.floor(
            minutes / 60
        );


    if (hours < 24) {

        return hours === 1
            ? "1 hour ago"
            : hours + " hours ago";
    }


    const days =
        Math.floor(
            hours / 24
        );


    if (days === 1) {

        return "yesterday";
    }


    if (days < 7) {

        return days +
            " days ago";
    }


    return new Date(
        timestamp
    ).toLocaleDateString(
        [],
        {
            month: "short",
            day: "numeric"
        }
    );
}


// ==============================
// SEND MESSAGE
// ==============================

sendButton.addEventListener(
    "click",
    sendMessage
);


async function sendMessage() {

    const text =
        messageInput.value.trim();


    if (text === "") {

        return;
    }


    try {

        const messageData = {

            sender:
                currentUser,

            text:
                text,

            time:
                serverTimestamp(),

            seenBy:
                [currentUser]
        };


        /*
           If we're replying to a message,
           save the original message
           information inside this message.
        */

        if (replyingTo) {

            messageData.replyTo = {

                id:
                    replyingTo.id,

                sender:
                    replyingTo.sender,

                text:
                    replyingTo.text
            };
        }


        await addDoc(
            messagesRef,
            messageData
        );


        messageInput.value = "";

        messageInput.style.height =
            "auto";


        /*
           Clear the reply after
           successfully sending.
        */

        cancelReply();


        messageInput.focus();

    }
    catch (error) {

        console.error(error);

        alert(
            "Failed to send message."
        );
    }
}


// ==============================
// AUTO GROW TEXTAREA
// ==============================

const AUTO_GROW_MAX = 120; // keep in sync with max-height in notes.css

messageInput.addEventListener(
    "input",
    (event) => {

        // Deleting text (or an emptied box) may need the box to shrink
        const mayShrink =
            messageInput.value === "" ||
            (event.inputType && event.inputType.indexOf("delete") === 0);

        if (mayShrink) {
            messageInput.style.height = "auto";
        }

        const needed =
            Math.min(messageInput.scrollHeight, AUTO_GROW_MAX);

        // Normal typing only READS the size (cheap). The page layout is
        // touched only when the box really has to grow or shrink.
        if (mayShrink || needed > messageInput.clientHeight) {
            messageInput.style.height = needed + "px";
        }
    }
);




// =========================================================
// PHOTO UPLOAD
// =========================================================









imageInput.addEventListener(
    "change",
    handlePhotoSelected
);

cameraInput.addEventListener(
    "change",
    handlePhotoSelected
);




async function handlePhotoSelected(event) {

    const file =
        event.target.files[0];

    if (!file) {
        return;
    }


    try {

        console.log(
            "File selected:",
            file.name
        );


        if (
            file.type.startsWith("image/")
        ) {

            await uploadPhoto(
                file
            );

        }
        else if (
            file.type.startsWith("audio/")
        ) {

            await uploadMedia(
                file
            );

        }
        else if (
            file.type.startsWith("video/")
        ) {

            await uploadMedia(
                file
            );

        }
        else {

            alert(
                "Please select a photo, audio, or video."
            );

        }

    }
    catch (error) {

        console.error(
            "Media upload failed:",
            error
        );

        alert(
            "Failed to send media."
        );

    }


    /*
       Reset the input.

       This allows the same file
       to be selected again later.
    */

    imageInput.value = "";
}







async function uploadPhoto(file) {

    /*
       Convert the image into Base64.
    */

    const base64 =
        await fileToBase64(file);


    /*
       Remove the Data URL prefix.

       Example:

       data:image/jpeg;base64,/9j/4AAQ...

       becomes:

       /9j/4AAQ...
    */

    const cleanBase64 =
        base64.split(",")[1];


    const uploadData = {

        base64:
            cleanBase64,

        mimeType:
            file.type,

        fileName:
            file.name
    };


    console.log(
        "Uploading photo..."
    );


    const response =
        await fetch(
            PHOTO_UPLOAD_URL,
            {
                method: "POST",

                headers: {
                    "Content-Type":
                        "text/plain;charset=utf-8"
                },

                body:
                    JSON.stringify(
                        uploadData
                    )
            }
        );


    if (!response.ok) {

        throw new Error(
            "Upload request failed: " +
            response.status
        );
    }


    const result =
        await response.json();


    console.log(
        "Upload response:",
        result
    );


    if (!result.success) {

        throw new Error(
            result.error ||
            "Google Drive upload failed."
        );
    }


    /*
       The photo is now in Drive.

       Now create the chat message.
    */

    await addPhotoMessage(
    result.thumbnailUrl,
    result.fileUrl,
    file.name,
    result.fileId,
    file.type
);
}

async function uploadMedia(file) {

    const base64 =
        await fileToBase64(file);

    const cleanBase64 =
        base64.split(",")[1];

    const uploadData = {

        base64:
            cleanBase64,

        mimeType:
            file.type,

        fileName:
            file.name
    };


    console.log(
        "Uploading media..."
    );


    const response =
        await fetch(
            PHOTO_UPLOAD_URL,
            {
                method: "POST",

                headers: {
                    "Content-Type":
                        "text/plain;charset=utf-8"
                },

                body:
                    JSON.stringify(
                        uploadData
                    )
            }
        );


    if (!response.ok) {

        throw new Error(
            "Upload request failed: " +
            response.status
        );
    }


    const result =
        await response.json();


    console.log(
        "Media upload response:",
        result
    );


    if (!result.success) {

        throw new Error(
            result.error ||
            "Media upload failed."
        );
    }


    await addMediaMessage(
    result.fileUrl,
    file.name,
    file.type.startsWith("audio/")
        ? "audio"
        : "video",
    result.fileId,
    file.type
);
}





function fileToBase64(file) {

    return new Promise(
        (resolve, reject) => {

            const reader =
                new FileReader();


            reader.onload =
                () => {

                    resolve(
                        reader.result
                    );

                };


            reader.onerror =
                reject;


            reader.readAsDataURL(
                file
            );
        }
    );
}

async function addPhotoMessage(
    thumbnailUrl,
    photoUrl,
    fileName,
    fileId,
    mimeType
) {

    const messageData = {

        sender:
            currentUser,

        text:
            "",

        type:
            "photo",

        photoUrl:
            photoUrl,

        photoThumbnail:
            thumbnailUrl,

        fileName:
            fileName,

        fileId:
            fileId,

        mimeType:
            mimeType,

        time:
            serverTimestamp(),

        seenBy:
            [currentUser]
    };


    /*
       If the photo is being sent
       as a reply, preserve the reply.
    */

    if (replyingTo) {

        messageData.replyTo = {

            id:
                replyingTo.id,

            sender:
                replyingTo.sender,

            text:
                replyingTo.text
        };
    }


    await addDoc(
        messagesRef,
        messageData
    );


    /*
       Clear reply mode after sending.
    */

    cancelReply();


    messageInput.focus();
}

async function addMediaMessage(
    mediaUrl,
    fileName,
    mediaType,
    fileId,
    mimeType
) {

    const messageData = {

        sender:
            currentUser,

        text:
            "",

        type:
            mediaType,

        mediaUrl:
            mediaUrl,

        fileName:
            fileName,

        fileId:
            fileId,

        mimeType:
            mimeType,

        time:
            serverTimestamp(),

        seenBy:
            [currentUser]
    };


    /*
       If the media is being sent
       as a reply, preserve the reply.
    */

    if (replyingTo) {

        messageData.replyTo = {

            id:
                replyingTo.id,

            sender:
                replyingTo.sender,

            text:
                replyingTo.text
        };
    }


    await addDoc(
        messagesRef,
        messageData
    );


    /*
       Clear reply mode after sending.
    */

    cancelReply();


    messageInput.focus();
}
// =========================================================
// SECRET GARDEN TOUCH EFFECT
// =========================================================

// =========================================================
// SECRET GARDEN TOUCH EFFECT
// =========================================================

const gardenParticles = [
    "🌸",
    "🌿",
    "🍃",
    "✨",
    "✿",
    "❀",
    "🌺"
];


// =========================================================
// CREATE GARDEN PARTICLE
// =========================================================

function createGardenParticle(
    x,
    y,
    burst = false
) {

    const particle =
        document.createElement("span");

    particle.className =
        "touch-particle";


    particle.textContent =
        gardenParticles[
            Math.floor(
                Math.random() *
                gardenParticles.length
            )
        ];


    particle.style.left =
        x + "px";

    particle.style.top =
        y + "px";


    /*
       Normal tap:
       small gentle movement.

       Swipe burst:
       slightly larger spread.
    */

    const moveX =
        burst
            ? (Math.random() - 0.5) * 80
            : (Math.random() - 0.5) * 55;


    const moveY =
        burst
            ? -15 - Math.random() * 65
            : -20 - Math.random() * 45;


    const rotation =
        (Math.random() - 0.5) * 100;


    particle.style.setProperty(
        "--move-x",
        moveX + "px"
    );

    particle.style.setProperty(
        "--move-y",
        moveY + "px"
    );

    particle.style.setProperty(
        "--rotation",
        rotation + "deg"
    );


    /*
       Make the burst particles
       slightly more noticeable.
    */

    if (burst) {

        particle.style.fontSize =
            (16 + Math.random() * 7) +
            "px";

    }


    document.body.appendChild(
        particle
    );


    setTimeout(() => {

        particle.remove();

    }, 800);
}


// =========================================================
// NORMAL TAP
// =========================================================

document.addEventListener(
    "click",
    (event) => {

        /*
           Don't create particles when
           touching the text input.
        */

        if (
            event.target.closest("textarea") ||
            event.target.closest("input")
        ) {

            return;
        }


        createGardenParticle(
            event.clientX,
            event.clientY,
            false
        );

    }
);


// =========================================================
// SWIPE-TO-REPLY BURST
// =========================================================

function createReplyBurst(
    messageElement
) {

    const rect =
        messageElement.getBoundingClientRect();


    /*
       Start the burst near the middle
       of the message being swiped.
    */

    const centerX =
        rect.left +
        rect.width / 2;


    const centerY =
        rect.top +
        rect.height / 2;


    /*
       Four particles with slightly
       different starting positions.
    */

    for (
        let i = 0;
        i < 7;
        i++
    ) {

        const offsetX =
            (Math.random() - 0.5) * 35;

        const offsetY =
            (Math.random() - 0.5) * 20;


        /*
           Tiny stagger makes the burst
           feel more organic.
        */

        setTimeout(() => {

            createGardenParticle(
                centerX + offsetX,
                centerY + offsetY,
                true
            );

        }, i * 20);
    }
}

// =========================================================
// FULLSCREEN PHOTO VIEWER
// =========================================================

const photoViewer =
    document.createElement("div");

photoViewer.className =
    "photo-viewer";


const photoViewerImage =
    document.createElement("img");


const photoViewerClose =
    document.createElement("button");

photoViewerClose.className =
    "photo-viewer-close";

photoViewerClose.textContent =
    "×";


photoViewer.appendChild(
    photoViewerImage
);

photoViewer.appendChild(
    photoViewerClose
);

document.body.appendChild(
    photoViewer
);


// Open fullscreen viewer
// =========================================================
// OPEN CHAT PHOTOS INSIDE WEBSITE ONLY
// =========================================================

document.addEventListener(
    "click",
    (event) => {

        const image =
            event.target.closest(
                "#chatBox img"
            );

        if (!image) return;


        // STOP the original image/link action
        event.preventDefault();
        event.stopPropagation();
        event.stopImmediatePropagation();


        // Open our own viewer
        photoViewerImage.src =
            image.src;

        photoViewer.style.display =
            "flex";

    },
    true
);


// Close viewer
photoViewerClose.addEventListener(
    "click",
    () => {

        photoViewer.style.display =
            "none";

        photoViewerImage.src =
            "";
    }
);


// Tap outside the photo to close
photoViewer.addEventListener(
    "click",
    (event) => {

        if (
            event.target === photoViewer
        ) {

            photoViewer.style.display =
                "none";

            photoViewerImage.src =
                "";
        }
    }
);


// =========================================================
// MESSAGE REACTIONS
// Long-press (or right-click) a message -> pick an emoji.
// One reaction per person; tap the same emoji again to remove it.
// Uses ONE set of listeners on the chat box (not one per message),
// and only changes a single small field in the database.
// =========================================================

const REACTION_EMOJIS = ["❤️", "😆","🙁","🤢","😡"];

let reactionPicker = null;
let pressTimer = null;
let pressStartX = 0;
let pressStartY = 0;
let longPressFired = false;

// Draw the little reaction pills under a message
function paintReactions(container, reactions) {

    container.innerHTML = "";

    const counts = new Map();

    Object.values(reactions || {}).forEach((emoji) => {
        if (!emoji) return;
        counts.set(emoji, (counts.get(emoji) || 0) + 1);
    });

    if (counts.size === 0) {
        container.style.display = "none";
        return;
    }

    container.style.display = "";

    counts.forEach((count, emoji) => {

        const chip = document.createElement("span");

        chip.className = "reaction-chip";

        chip.textContent = count > 1 ? emoji + " " + count : emoji;

        container.appendChild(chip);
    });
}

// Save (or remove) my reaction
async function setReaction(messageId, emoji) {

    const current =
        (messageReactions.get(messageId) || {})[currentUser];

    const messageDoc = doc(db, "messages", messageId);

    try {

        await updateDoc(messageDoc, {
            ["reactions." + currentUser]:
                current === emoji ? deleteField() : emoji
        });

    } catch (error) {

        console.error("Failed to save reaction:", error);
    }
}

function closeReactionPicker() {

    if (reactionPicker) {
        reactionPicker.remove();
        reactionPicker = null;
    }
}

function openReactionPicker(messageElement) {

    closeReactionPicker();

    const messageId = messageElement.dataset.messageId;

    if (!messageId) return;

    const mine =
        (messageReactions.get(messageId) || {})[currentUser];

    reactionPicker = document.createElement("div");

    reactionPicker.className = "reaction-picker";

    REACTION_EMOJIS.forEach((emoji) => {

        const option = document.createElement("button");

        option.type = "button";

        option.className =
            "reaction-option" + (mine === emoji ? " selected" : "");

        option.textContent = emoji;

        option.addEventListener("click", (event) => {

            event.stopPropagation();

            setReaction(messageId, emoji);

            closeReactionPicker();
        });

        reactionPicker.appendChild(option);
    });

    // ---- Copy / Open link (only for plain text messages) ----
    const bubbleEl = messageElement.querySelector(".bubble");

    const messageText =
        bubbleEl && bubbleEl.childElementCount === 0
            ? bubbleEl.textContent.trim()
            : "";

    if (messageText) {

        const divider = document.createElement("span");

        divider.className = "reaction-divider";

        reactionPicker.appendChild(divider);

        const copyOption = document.createElement("button");

        copyOption.type = "button";

        copyOption.className = "reaction-option";

        copyOption.textContent = "📋";

        copyOption.title = "Copy";

        copyOption.addEventListener("click", (event) => {

            event.stopPropagation();

            copyMessageText(messageText);

            closeReactionPicker();
        });

        reactionPicker.appendChild(copyOption);

        const linkMatch = messageText.match(/https?:\/\/[^\s]+/i);

        if (linkMatch) {

            const linkOption = document.createElement("button");

            linkOption.type = "button";

            linkOption.className = "reaction-option";

            linkOption.textContent = "🔗";

            linkOption.title = "Open link";

            linkOption.addEventListener("click", (event) => {

                event.stopPropagation();

                window.open(linkMatch[0], "_blank", "noopener");

                closeReactionPicker();
            });

            reactionPicker.appendChild(linkOption);
        }
    }

    document.body.appendChild(reactionPicker);

    // Position it just above the message bubble
    const anchor =
        messageElement.querySelector(".bubble") || messageElement;

    const rect = anchor.getBoundingClientRect();

    // offsetWidth/offsetHeight = real size. (getBoundingClientRect would
    // report the picker slightly smaller while its pop-in animation runs,
    // which pushed it off the right edge on your own messages.)
    const pickerWidth = reactionPicker.offsetWidth;

    const pickerHeight = reactionPicker.offsetHeight;

    const screenWidth = document.documentElement.clientWidth;

    let top = rect.top - pickerHeight - 8;

    if (top < 8) top = rect.bottom + 8;

    let left = messageElement.classList.contains("sent")
        ? rect.right - pickerWidth
        : rect.left;

    left = Math.max(
        8,
        Math.min(left, screenWidth - pickerWidth - 8)
    );

    reactionPicker.style.top = top + "px";

    reactionPicker.style.left = left + "px";
}

// ---- Long-press on phones ----

chatBox.addEventListener("touchstart", (event) => {

    if (event.touches.length !== 1) return;

    const messageElement = event.target.closest(".message");

    if (!messageElement) return;

    longPressFired = false;

    pressStartX = event.touches[0].clientX;
    pressStartY = event.touches[0].clientY;

    clearTimeout(pressTimer);

    pressTimer = setTimeout(() => {

        longPressFired = true;

        if (navigator.vibrate) navigator.vibrate(15);

        openReactionPicker(messageElement);

    }, 450);

}, { passive: true });

// Moving the finger = scrolling or swiping to reply, so cancel
chatBox.addEventListener("touchmove", (event) => {

    const touch = event.touches[0];

    if (
        Math.abs(touch.clientX - pressStartX) > 10 ||
        Math.abs(touch.clientY - pressStartY) > 10
    ) {
        clearTimeout(pressTimer);
    }

}, { passive: true });

["touchend", "touchcancel"].forEach((type) => {

    chatBox.addEventListener(type, () => {

        clearTimeout(pressTimer);

        // keep the flag briefly so the "click" that follows is ignored
        setTimeout(() => { longPressFired = false; }, 400);

    }, { passive: true });
});

// After a long-press, don't also open the photo / follow a reply link.
// Registered on window (capture) so it runs before the photo viewer.
window.addEventListener("click", (event) => {

    if (longPressFired && event.target.closest("#chatBox")) {

        event.preventDefault();
        event.stopPropagation();
        event.stopImmediatePropagation();

        longPressFired = false;
    }

}, true);

// ---- Right-click on computers / Android's long-press menu ----

chatBox.addEventListener("contextmenu", (event) => {

    const messageElement = event.target.closest(".message");

    if (!messageElement) return;

    event.preventDefault();

    openReactionPicker(messageElement);
});

// ---- Closing the picker ----

document.addEventListener("pointerdown", (event) => {

    if (reactionPicker && !event.target.closest(".reaction-picker")) {
        closeReactionPicker();
    }
});

chatBox.addEventListener("scroll", closeReactionPicker, { passive: true });


// ---- Copy helper (used by the picker's 📋 button) ----

async function copyMessageText(text) {

    try {

        await navigator.clipboard.writeText(text);

    } catch (error) {

        // Older browsers: fall back to a hidden textarea
        const box = document.createElement("textarea");

        box.value = text;

        box.style.position = "fixed";

        box.style.opacity = "0";

        document.body.appendChild(box);

        box.select();

        try { document.execCommand("copy"); } catch (e) {}

        box.remove();
    }

    const toast = document.createElement("div");

    toast.className = "copy-toast";

    toast.textContent = "Copied";

    document.body.appendChild(toast);

    setTimeout(() => toast.remove(), 1300);
}


// =========================================================
// LOAD OLDER MESSAGES
// =========================================================

function createLoadOlderButton() {

    const button = document.createElement("button");

    button.type = "button";

    button.className = "load-older-btn";

    button.textContent = "Load older messages";

    button.addEventListener("click", loadOlderMessages);

    return button;
}

async function loadOlderMessages() {

    if (!oldestLoadedDoc || !loadOlderButton) return;

    const button = loadOlderButton;

    button.disabled = true;

    button.textContent = "Loading...";

    try {

        const olderSnapshot = await getDocs(
            query(
                messagesRef,
                orderBy("time", "desc"),
                startAfter(oldestLoadedDoc),
                limit(PAGE_SIZE)
            )
        );

        const fragment = document.createDocumentFragment();

        olderSnapshot.docs.slice().reverse().forEach((docSnap) => {
            renderMessage(docSnap.data(), docSnap.id, fragment);
        });

        const previousHeight = chatBox.scrollHeight;

        const previousTop = chatBox.scrollTop;

        // insert right under the button
        button.after(fragment);

        // keep exactly the same message in view (no jumping)
        const previousBehavior = chatBox.style.scrollBehavior;

        chatBox.style.scrollBehavior = "auto";

        chatBox.scrollTop =
            previousTop + (chatBox.scrollHeight - previousHeight);

        chatBox.style.scrollBehavior = previousBehavior;

        if (olderSnapshot.docs.length > 0) {
            oldestLoadedDoc =
                olderSnapshot.docs[olderSnapshot.docs.length - 1];
        }

        if (olderSnapshot.size < PAGE_SIZE) {

            // nothing older left
            button.remove();

            loadOlderButton = null;

        } else {

            button.disabled = false;

            button.textContent = "Load older messages";
        }

    } catch (error) {

        console.error("Failed to load older messages:", error);

        button.disabled = false;

        button.textContent = "Couldn't load - tap to retry";
    }
}
