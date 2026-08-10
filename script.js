/* ==========================================
   WHISPERING LIBRARY
   SCRIPT.JS - PART 1
========================================== */

window.addEventListener("load", function () {

    const loader = document.getElementById("loadingScreen");

    if (loader) {

        loader.style.opacity = "0";

        setTimeout(function () {

            loader.style.display = "none";

        }, 500);

    }

});

/* ==========================================
   BACK TO TOP BUTTON
========================================== */

const topButton = document.getElementById("topButton");

window.addEventListener("scroll", function () {

    if (window.scrollY > 400) {

        topButton.style.display = "block";

    } else {

        topButton.style.display = "none";

    }

});

topButton.addEventListener("click", function () {

    window.scrollTo({

        top: 0,

        behavior: "smooth"

    });

});

/* ==========================================
   EXPLORE BUTTON
========================================== */

const exploreBtn = document.getElementById("exploreBtn");

if (exploreBtn) {

    exploreBtn.addEventListener("click", function () {

        document.getElementById("featured").scrollIntoView({

            behavior: "smooth"

        });

    });

}

/* ==========================================
   NAVIGATION SMOOTH SCROLL
========================================== */

document.querySelectorAll(".navbar a").forEach(function(link){

    link.addEventListener("click",function(e){

        const target = this.getAttribute("href");

        if(target.startsWith("#")){

            e.preventDefault();

            const section = document.querySelector(target);

            if(section){

                section.scrollIntoView({

                    behavior:"smooth"

                });

            }

        }

    });

});

/* ==========================================
   SEARCH BOOKS
========================================== */

const searchInput = document.getElementById("searchInput");
const searchBtn = document.getElementById("searchBtn");

function searchBooks() {

    const value = searchInput.value.toLowerCase().trim();

    const books = document.querySelectorAll(".book-card");

    books.forEach(function(book){

        const title = book.querySelector("h3").textContent.toLowerCase();

        if(title.includes(value)){

            book.style.display = "";

        }

        else{

            book.style.display = "none";

        }

    });

}

if(searchBtn){

    searchBtn.addEventListener("click", searchBooks);

}

if(searchInput){

    searchInput.addEventListener("keyup", function(e){

        if(e.key === "Enter"){

            searchBooks();

        }

        if(searchInput.value.trim()===""){

            document.querySelectorAll(".book-card").forEach(function(book){

                book.style.display="";

            });

        }

    });

}

/* ==========================================
   SIMPLE HOVER EFFECT
========================================== */

document.querySelectorAll(".book-card").forEach(function(book){

    book.addEventListener("mouseenter",function(){

        this.style.transition=".3s";

    });

});

/* ==========================================
   PAGE TITLE
========================================== */

document.addEventListener("visibilitychange",function(){

    if(document.hidden){

        document.title="Come back to Whispering Library 📚";

    }

    else{

        document.title="Whispering Library";

    }

});
/* ==========================================
   WHISPERING LIBRARY
   SCRIPT.JS - PART 3
========================================== */

/* Highlight active navigation link */

const sections = document.querySelectorAll("section");
const navLinks = document.querySelectorAll(".navbar a");

window.addEventListener("scroll", () => {

    let current = "";

    sections.forEach(section => {

        const sectionTop = section.offsetTop - 120;

        if (window.pageYOffset >= sectionTop) {

            current = section.getAttribute("id");

        }

    });

    navLinks.forEach(link => {

        link.classList.remove("active");

        if (link.getAttribute("href") === "#" + current) {

            link.classList.add("active");

        }

    });

});

/* Search while typing */

if(searchInput){

    searchInput.addEventListener("input", searchBooks);

}

/* Simple welcome message */

window.setTimeout(function(){

    console.log("Welcome to Whispering Library");

},1000);

/* Prevent errors if elements don't exist */

window.addEventListener("error",function(e){

    console.log("Handled:",e.message);

});

/* Finished loading */

console.log("Whispering Library Loaded Successfully");