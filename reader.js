/* ==========================================
   READER.JS - PART 1
========================================== */

const slider = document.getElementById("pageSlider");
const pages = document.querySelectorAll(".page");

const prevBtn = document.getElementById("prevBtn");
const nextBtn = document.getElementById("nextBtn");

const messageBox = document.getElementById("visitorMessage");

let currentPage = 0;

const totalPages = pages.length;

/* ==========================================
   SHOW PAGE
========================================== */

function showPage(page){

    if(page < 0) page = 0;

    if(page >= totalPages) page = totalPages - 1;

    currentPage = page;

    slider.style.transform =
        `translateX(-${currentPage * 100}vw)`;

}

/* ==========================================
   NEXT / PREVIOUS
========================================== */

function nextPage(){

    showPage(currentPage + 1);

}

function previousPage(){

    showPage(currentPage - 1);

}

/* ==========================================
   BUTTONS
========================================== */

if(nextBtn){

    nextBtn.addEventListener("click", nextPage);

}

if(prevBtn){

    prevBtn.addEventListener("click", previousPage);

}

/* ==========================================
   TAP LEFT / RIGHT
========================================== */

document.addEventListener("click", function(e){

    if(
        e.target.id === "sendMessage" ||
        e.target.id === "visitorMessage"
    ){
        return;
    }

    const x = e.clientX;

    if(x > window.innerWidth * 0.65){

        nextPage();

    }

    else if(x < window.innerWidth * 0.35){

        previousPage();

    }

});

/* ==========================================
   KEYBOARD
========================================== */

document.addEventListener("keydown", function(e){

    if(e.key === "ArrowRight"){

        nextPage();

    }

    if(e.key === "ArrowLeft"){

        previousPage();

    }

});

/* ==========================================
   SWIPE
========================================== */

let touchStartX = 0;

let touchEndX = 0;

document.addEventListener("touchstart", function(e){

    touchStartX = e.changedTouches[0].screenX;

});

document.addEventListener("touchend", function(e){

    touchEndX = e.changedTouches[0].screenX;

    if(touchStartX - touchEndX > 60){

        nextPage();

    }

    if(touchEndX - touchStartX > 60){

        previousPage();

    }

});

/* ==========================================
   AUTO GROW MESSAGE BOX
========================================== */

if(messageBox){

    function resizeBox(){

        messageBox.style.height = "auto";

        messageBox.style.height =
            messageBox.scrollHeight + "px";

    }

    messageBox.addEventListener("input", resizeBox);

    resizeBox();

}

/* ==========================================
   START
========================================== */

showPage(0);



/* ==========================================
   READER.JS - PART 2
========================================== */

const sendButton = document.getElementById("sendMessage");

const SCRIPT_URL = "https://script.google.com/macros/s/AKfycbybYrRbvlEj9ZTv9p419Hp8undgvQUesAeB_WpZJjb3H_-PdUz3-EwBhcldeDFje3lN/exec";

let sending = false;

/* ==========================================
   SEND MESSAGE
========================================== */

if(sendButton){

    sendButton.addEventListener("click", sendMessage);

}

async function sendMessage(){

    if(sending) return;

    if(!messageBox) return;

    const message = messageBox.value.trim();

    if(message.length === 0){

        

        setTimeout(function(){

            sendButton.textContent = "loveliest girl";

        },1200);

        return;

    }

    sending = true;

    sendButton.textContent = "sending...";

    try{

        
        
        
        
        const response = await fetch(SCRIPT_URL, {

    method: "POST",

    body: JSON.stringify({

        book: "Again the Magic",

        message: message,

        userAgent: navigator.userAgent

    })

});
        
        
        

        if(response.ok){

            sendButton.textContent = "sent ✓";

            messageBox.value = "";

            messageBox.style.height = "auto";

        }

        else{

            sendButton.textContent = "failed";

        }

    }

    catch(error){

        sendButton.textContent = "failed";

    }

    setTimeout(function(){

        sendButton.textContent = "loveliest girl";

        sending = false;

    },1500);

}


fetch("https://script.google.com/macros/s/AKfycbybYrRbvlEj9ZTv9p419Hp8undgvQUesAeB_WpZJjb3H_-PdUz3-EwBhcldeDFje3lN/exec")
  .then(res => res.json())
  .then(data => {
    const replyBox = document.getElementById("latestReply");

    if (replyBox) {
      replyBox.innerHTML = data.reply
    .filter(line => line)
    .map(line => `<p>${line}</p>`)
    .join("");
    }
  })
  .catch(err => console.log(err));