/// Sign In Code ///
//let mainMenu = document.getElementById("main-menu");
//let login = document.getElementById("login");
let username = document.getElementById("signin-username");
//let password = document.getElementById("signin-password");
let signIn = document.getElementById("signin");
//let signUp = document.getElementById("signup");
let gameDiv = document.getElementById("game-div");

// Sign In
signIn.onclick = function(){
    //socket.emit('signIn', {username:username.value, password:password.value});
    socket.emit('signIn', {username:username.value});
}

/*
// Sign Up
signUp.onclick = function(){
    socket.emit('signUp', {username:username.value, password:password.value});
}
*/

socket.on('signInResponse', function(data){
    if(data.res){
        loginDiv.style.display = "none";
        gameDiv.style.display = "inline-block";
    }else{
        alert("Sign In Unsuccessful");
    }
});

/*
socket.on('signUpResponse', function(data){
    if(!data.res){
        alert("Sign Up Successful");
    }else{
        alert("Sign Up Unsuccessful");
    }
});
*/