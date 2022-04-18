let express = require('express');
const { SocketAddress } = require('net');
let app = express();
let server = require('http').Server(app);
let port = 8080;

app.get('/', function(req, res){
    res.sendFile(__dirname + '/client/index.html');
});
app.use('/client', express.static(__dirname + '/client'));

server.listen(port);
console.log("Server Started on: " + port);

let SOCKET_LIST = {};

let Entity = function(){
    let self = {
        x: 250,
        y: 250,
        spdX: 1,
        spdY: 1,
        id: ""
    }

    self.update = function(){
        self.updatePosition();
    }

    self.updatePosition = function(){
        self.x += self.spdX;
        self.y += self.spdY;
    }

    self.getDistance = function(pt){
        return Math.sqrt(Math.pow(self.x-pt.x, 2) + Math.pow(self.y-pt.y, 2));
    }

    return self;
}

let Bolt = function(parent, angle){
    let self = Entity();
    self.id = Math.random();
    self.spdX = Math.cos(angle/180*Math.PI) * 10;
    self.spdY = Math.sin(angle/180*Math.PI) * 10;
    self.parent = parent;
    self.color = "red";
    self.damage = 0;

    self.timer = 0;
    self.maxTime = 100;
    self.toRemove = false;

    let superUpdate = self.update;
    self.update = function(){
        if(self.timer++ > self.maxTime){
            self.toRemove = true;
        }
        superUpdate();

        for(let i in Player.list){
            let p = Player.list[i];

            if(self.getDistance(p) < 32 && self.parent !== p.id){
                // Collision 
                self.toRemove = true;
            }
        }
    }

    Bolt.list[self.id] = self;
    return self;
}
Bolt.list = {};

Bolt.update = function(){
    if(Math.random() < 0.1){
        Bolt(Math.random()*360);
    }

    let pack = [];

    for(let i in Bolt.list){
        let bolt = Bolt.list[i];
        bolt.update();

        if(bolt.toRemove){
            delete Bolt.list[i];
        }else{
            pack.push({
                x: bolt.x,
                y: bolt.y
            });
        }
    }

    return pack;
};

let Ship = function(parent){
    let self = Entity();
    self.parent = parent;
    self.angle = 0;
    self.name = "";
    self.image = "";
    self.engineSound = "";
    self.shipClass = "";
    self.turnLeftSpeed = 0;
    self.turnRightSpeed = 0;
    self.maxSpeed = 0;
    self.minSpeed = 0;
    self.accelSpeed = 0;
    self.deccelSpeed = 0;
}

let Player = function(id){
    let self = Entity();
    self.id = id;
    self.number = "" + Math.floor(10 * Math.random());
    self.pressingRight = false;
    self.pressingLeft = false;
    self.pressingUp = false;
    self.pressingDown = false;
    self.pressingShoot1 = false;
    self.pressingShoot2 = false;
    self.angle = 0;
    self.rotLeftSpd = 1;
    self.rotRightSpd = 1;
    self.accelSpd = 2;
    self.deccelSpd = 1;
    self.spd = 1;
    self.minSpd = 1;
    self.maxSpd = 10;
    self.comms = true;
    self.map = true;
    self.isJammed = false;


    let superUpdate = self.update;
    self.update = function(){
        self.updateSpd();
        superUpdate();

        if(self.pressingShoot1){
            self.shootBolt(Math.random()*360);
        }
    }

    self.shootBolt = function(angle){
        let b = Bolt(self.id, angle);
        b.x = self.x;
        b.y = self.y;
    }

    self.updateSpd = function(){
        if(self.pressingRight){
            self.spdX = self.maxSpd;
            self.angle += 1;
        }
        else if(self.pressingLeft){
            self.spdX = -self.maxSpd;
            self.angle -= 1;
        }
        else{
            self.spdX = 0;
        }

        if(self.pressingUp){
            self.spdY = -self.maxSpd;
        }
        else if(self.pressingDown){
            self.spdY = self.maxSpd;
        }
        else{
            self.spdY = 0;
        }
    }
    Player.list[id] = self;
    return self;
};
Player.list = {};
Player.onConnect = function(socket){
    let player = Player(socket.id);

    socket.on('keyPress', function(data){
        if(data.inputId === 'right'){
            player.pressingRight = data.state;
        }
        else if(data.inputId === 'left'){
            player.pressingLeft = data.state;
        }
        else if(data.inputId === 'up'){
            player.pressingUp = data.state;
        }
        else if(data.inputId === 'down'){
            player.pressingDown = data.state;
        }
        else if(data.inputId === 'attack1'){
            player.pressingShoot1 = data.state;
        }
    });
}
Player.onDisconnect = function(socket){
    delete Player.list[socket.id];
}
Player.update = function(){
    let pack = []; 

    for(let i in Player.list){
        let player = Player.list[i];
        player.update();
        pack.push({
            x: player.x,
            y: player.y,
            number: player.number
        });
    }

    return pack;
};

let DEBUG = true;

let USERS = {
    //username:password
    "luke":"skywalker",
};

let isValidPassword = function(data){
    return USERS[data.username] === data.password;
}

let usernameTaken = function(data){
    return USERS[data.username];
}

let addUser = function(data){
    USERS[data.username] = data.password;
}

let io = require('socket.io')(server, {});
io.sockets.on('connection', function(socket){
    socket.id = Math.random();
    SOCKET_LIST[socket.id] = socket;

    socket.on("signIn", function(data){
        if(isValidPassword(data)){
            Player.onConnect(socket);
            socket.emit('signInResponse', {res:true});
        }else{
            socket.emit('signInResponse', {res:false});
        }
    });

    socket.on("signUp", function(data){
        if(usernameTaken(data)){
            socket.emit('signUpResponse', {res:true});
        }else{
            addUser(data);
            socket.emit('signUpResponse', {res:false});
        }
    });

    socket.on('disconnect', function(){
        delete SOCKET_LIST[socket.id];
        Player.onDisconnect(socket);
    });

    socket.on('sendMsgToServer', function(data){
        let playerName = ("" + socket.id).slice(2, 7);

        for(let i in SOCKET_LIST){
            SOCKET_LIST[i].emit('addToChat', playerName + ": " + data);
        }
    });

    socket.on('evalServer', function(data){
        if(!DEBUG){
            return;
        }else{
            let res = eval(data);
            socket.emit('evalAnswer', res);
        }
    });
});

setInterval(function(){
    let pack = {
        player: Player.update(),
        bolt: Bolt.update()
    }

    for(let i in SOCKET_LIST){
        let socket = SOCKET_LIST[i];
        socket.emit('newPositions', pack);
    }
}, 1000/25);