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

    return self;
}

let Bolt = function(angle){
    let self = Entity();
    self.id = Math.random();
    self.spdX = Math.cos(angle/180*Math.PI) * 10;
    self.spdY = Math.sin(angle/180*Math.PI) * 10;
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
        pack.push({
            x: bolt.x,
            y: bolt.y
        });
    }

    return pack;
};

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

    let superUpdate = self.update;
    self.update = function(){
        self.updateSpd();
        superUpdate();
    }

    self.updateSpd = function(){
        if(self.pressingRight){
            self.spdX = self.maxSpd;
        }
        else if(self.pressingLeft){
            self.spdX = -self.maxSpd;
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
        if(data.inputId === 'left'){
            player.pressingLeft = data.state;
        }
        if(data.inputId === 'up'){
            player.pressingUp = data.state;
        }
        if(data.inputId === 'down'){
            player.pressingDown = data.state;
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

let io = require('socket.io')(server, {});
io.sockets.on('connection', function(socket){
    socket.id = Math.random();
    SOCKET_LIST[socket.id] = socket;

    Player.onConnect(socket);

    socket.on('disconnect', function(){
        delete SOCKET_LIST[socket.id];
        Player.onDisconnect(socket);
    });

    socket.on('sendMsgToServer', function(data){
        let playerName = ("" + socket.id).slice(2, 7);

        for(let i in SOCKET_LIST){
            SOCKET_LIST[i].emit('addToChat', playerName, + ": " + data);
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