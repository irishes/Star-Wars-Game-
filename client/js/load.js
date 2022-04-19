let overlay = document.getElementsByClassName("overlay")[0];
let mainMenu = document.getElementById("main-menu");

setTimeout(function(){
    overlay.style.display = "none";
    mainMenu.style.display = "block";
}, 4000);