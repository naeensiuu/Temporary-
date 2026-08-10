const SCRIPT_URL = "https://script.google.com/macros/s/AKfycbybYrRbvlEj9ZTv9p419Hp8undgvQUesAeB_WpZJjb3H_-PdUz3-EwBhcldeDFje3lN/exec";

const passwordBox = document.getElementById("secretPassword");
const checkButton = document.getElementById("checkPassword");

checkButton.addEventListener("click", async function () {

    const password = passwordBox.value.trim();

    try {

        const response = await fetch(SCRIPT_URL, {
            method: "POST",
            body: JSON.stringify({
                action: "checkPassword",
                password: password
            })
        });

        const data = await response.json();


        if (data.success) {

    const expires = Date.now() + 5 * 60 * 1000; // 5 minutes

localStorage.setItem("libraryAccess", expires);

window.location.href = "notes.html";

}
        // Wrong password = do absolutely nothing.

    } catch (err) {
        console.log(err);
    }

});