var express = require('express');
app = express();
app.use(express.static(__dirname + '/public'));
server = require('http').createServer(app);
io = require('socket.io').listen(server);

var SerialPort = require("serialport");
var Readline = SerialPort.parsers.Readline;
var arduino = new SerialPort("/dev/ttyACM0", 9600);
var parser = new Readline();
arduino.pipe(parser);

var intervalObj = null;
var intervalObj2 = null;
var run = false;
var lock = false;
var commandBuffer = [];
var selectedBeer = null;
var recipePosition = 0;
var lastSetTemp = 0.0;

server.listen(8080);
app.use(express.static('public'));

arduino.on('open', function() {
        parser.on('data', function(data) {
                var m = data;
                m = m.replace("\n", "");
                console.log(m);

                if(m.includes("TEMP1"))
                        io.sockets.emit('message', {type: "TEMP1", value: m});
                else if(m.includes("TEMP2"))
                        io.sockets.emit('message', {type: "TEMP2", value: m});
                else if(m.includes("HEAT"))
                        io.sockets.emit('message', {type: "HEAT", value: m});
                else if(m.includes("TIME"))
                        io.sockets.emit('message', {type: "TIME", value: m});
                else if(m.includes("END") && run) {
                        recipePosition++;
                        io.sockets.emit('state', {"run": run, "selectedBeer": selectedBeer, "recipePosition": recipePosition, "lastSetTemp": lastSetTemp});
                        if(selectedBeer.recipe[recipePosition].includes("]")) {
                                commandBuffer.push(selectedBeer.recipe[recipePosition] + '\n');
                                console.log(selectedBeer.recipe[recipePosition]);
                        }
                }
                else if(m.includes("ERR"))
                        console.log("COMMAND ERROR");

                lock = false;
        });
});

io.sockets.on('connection', function (socket) {
        socket.on('start', function (data) {
                if(data.value == '1') {
                        if(intervalObj == null) {
                                intervalObj = setInterval(function() {
                                        commandBuffer.push('[getTEMP1]\n');
                                        commandBuffer.push('[getTEMP2]\n');
                                        commandBuffer.push('[getHEAT]\n');
                                        commandBuffer.push('[getTIME]\n');
                                }, 1000);
                        }

                        if(intervalObj2 == null) {
                                intervalObj2 = setInterval(function() {
                                        if(!lock && commandBuffer.length > 0){
                                                lock = true;
                                                var cmd = commandBuffer.pop();
                                                if(cmd.includes("[setTEMP]")) {
                                                        lastSetTemp = parseFloat(cmd.substring(10, cmd.indexOf('}')));
                                                        io.sockets.emit('state', {"run": run, "selectedBeer": selectedBeer, "recipePosition": recipePosition, "lastSetTemp": lastSetTemp});
                                                }
                                                arduino.write(cmd);
                                        }
                                }, 100);
                        }

                        run = true;
                        io.sockets.emit('state', {"run": run, "selectedBeer": selectedBeer, "recipePosition": recipePosition, "lastSetTemp": lastSetTemp});
                        console.log("START");
                }
                else {
                        clearInterval(intervalObj);
                        intervalObj = null;
                        selectedBeer = null;
                        recipePosition = 0;
                        lastSetTemp = 0.0;
                        while(commandBuffer.length > 0)
                                commandBuffer.pop();
                        commandBuffer.push('[STOP]\n');
                        run = false;
                        io.sockets.emit('state', {value: run});
                        console.log("STOP");
                }
        });

        socket.on('selectedBeer', function (data) {
                selectedBeer = data.value;
                io.sockets.emit('state', {"run": run, "selectedBeer": selectedBeer, "recipePosition": recipePosition, "lastSetTemp": lastSetTemp});
        });

        socket.on('recipePosition', function (data) {
                recipePosition = data.value;
                io.sockets.emit('state', {"run": run, "selectedBeer": selectedBeer, "recipePosition": recipePosition, "lastSetTemp": lastSetTemp});
                if(selectedBeer.recipe[recipePosition].includes("]")) {
                        commandBuffer.push(selectedBeer.recipe[recipePosition] + '\n');
                        console.log(selectedBeer.recipe[recipePosition]);
                }
        });

        io.sockets.emit('state', {"run": run, "selectedBeer": selectedBeer, "recipePosition": recipePosition, "lastSetTemp": lastSetTemp});
});

console.log("running");