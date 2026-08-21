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

let replyingTo = null;

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

const messagesQuery =
    query(
        messagesRef,
        orderBy("time", "asc")
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

    const audio =
        document.createElement("iframe");

    audio.src =
        "https://drive.google.com/file/d/" +
        data.fileId +
        "/preview";

    audio.allow =
        "autoplay";

    audio.frameBorder =
        "0";

    audio.style.width =
        "100%";

    audio.style.height =
        "80px";

    bubble.appendChild(
        audio
    );

}







// Render Video Message in Chat
else if (
    (data.type === "video" || (data.mimeType && data.mimeType.startsWith("video/"))) &&
    data.fileId
) {

    const videoWrapper = document.createElement("div");
    videoWrapper.className = "chat-video-container";

    const iframe = document.createElement("iframe");
    iframe.src = "https://drive.google.com/file/d/" + data.fileId + "/preview";
    iframe.className = "chat-video-iframe";
    iframe.frameBorder = "0";

    const expandBtn = document.createElement("button");
    expandBtn.className = "chat-video-expand-btn";
    expandBtn.innerHTML = "⛶ Fullscreen";
    expandBtn.type = "button";

    expandBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        openVideoModal(data.fileId);
    });

    videoWrapper.appendChild(iframe);
    videoWrapper.appendChild(expandBtn);
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

            snapshot.forEach((docSnap) => {
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
            chatBox.appendChild(fragment);

            // 3. Force instant jump to bottom (disable smooth animation for initial load)
            const originalScrollBehavior = chatBox.style.scrollBehavior;
            chatBox.style.scrollBehavior = "auto";
            chatBox.scrollTop = chatBox.scrollHeight;
            chatBox.style.scrollBehavior = originalScrollBehavior;

            // 4. Adjust scroll automatically as images finish loading
            const images = chatBox.querySelectorAll("img.chat-photo");
            images.forEach(img => {
                if (!img.complete) {
                    img.addEventListener("load", () => {
                        chatBox.scrollTop = chatBox.scrollHeight;
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
const videoModal = document.createElemen
