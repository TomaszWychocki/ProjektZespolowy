var express = require('express');
app = express();
server = require('http').createServer(app);
io = require('socket.io').listen(server);

var SerialPort = require("serialport");
var arduino = new SerialPort("/dev/ttyUSB0", {
    baudRate : 9600,
    dataBits : 8,
    parity : 'none',
    stopBits: 1,
    flowControl : false,
}); 

var intervalObj = null;
var intervalObj2 = null;
var run = false;
var lock = false;
var commandBuffer = [];
var selectedBeer = null;
var recipePosition = 0;
server.listen(8080);
app.use(express.static('public'));

arduino.on('open', function() {
	arduino.on('data', function(data) {
		var m = data.toString('ascii');
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
		else if(m.includes("ACTION"))
			io.sockets.emit('message', {type: "ACTION", value: m});
		else if(m.includes("END")) {
            recipePosition++;
            io.sockets.emit('state', {"run": run, "selectedBeer": selectedBeer, "recipePosition": recipePosition});
            commandBuffer.push(selectedBeer.recipe[recipePosition] + '\n');
        }
		else if(m.includes("ERR"))
			console.log("COMMAND ERROR");
		
		lock = false;
	});
	
	/*setInterval(function() {
		console.log(".");	
	}, 1000);*/
});

io.sockets.on('connection', function (socket) {
	socket.on('start', function (data) {
		if(data.value == '1') {
			commandBuffer.push(selectedBeer.recipe[recipePosition] + '\n');
			
			if(intervalObj == null) {
				intervalObj = setInterval(function() {
					commandBuffer.push('[getTEMP1]\n');
					commandBuffer.push('[getTEMP2]\n');
					commandBuffer.push('[getHEAT]\n');
					commandBuffer.push('[getTIME]\n');
					commandBuffer.push('[getACTION]\n');		
				}, 1000);
			}
			
			if(intervalObj2 == null) {
				intervalObj2 = setInterval(function() {
					if(!lock && commandBuffer.length > 0){
						lock = true;
						var cmd = commandBuffer.pop();
						arduino.write(cmd);
					}
				}, 100);
			}

            run = true;
            io.sockets.emit('state', {"run": run, "selectedBeer": selectedBeer, "recipePosition": recipePosition});
			console.log("START");
		}
		else {
			clearInterval(intervalObj);
			clearInterval(intervalObj2);
			intervalObj = null;
			intervalObj2 = null;
            selectedBeer = null;
            recipePosition = 0;
			while(commandBuffer.length > 0)
				commandBuffer.pop();
            run = false;
			io.sockets.emit('state', {value: run});
			console.log("STOP");
		}
	});

    socket.on('selectedBeer', function (data) {
        selectedBeer = data.value;
        io.sockets.emit('state', {"run": run, "selectedBeer": selectedBeer, "recipePosition": recipePosition});
    });

    socket.on('recipePosition', function (data) {
        recipePosition = data.value;
        io.sockets.emit('state', {"run": run, "selectedBeer": selectedBeer, "recipePosition": recipePosition});
    });
	
	io.sockets.emit('state', {"run": run, "selectedBeer": selectedBeer, "recipePosition": recipePosition});
});

console.log("running");