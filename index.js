const { userInfo } = require('os');

var app = require('express')();
const { nextTick } = require('process');
var http = require('http').createServer(app);
var io = require('socket.io')(http);

var msgList = [];
var people = [];


//request, response
app.get('/', (req, res) => {
    res.sendFile(__dirname + '/index.html');
});

io.on('connection', (socket) => {
    
    var name = name = (Math.floor(Math.random() * 99) + 1).toString();
    var user = {};
    
    user[socket.id] = name;
    console.log('user[socket.id]: ' + user[socket.id]);
    user['uniqueID'] = socket.id;
    user['color'] = "";
    user['time'] = new Date();      // might delete if dont need
    people.push(user[socket.id]);   // add new client to array

    socket.emit('show chat log', msgList);

    socket.emit('display users', user[socket.id], people);    // display user list for the newly added user
    socket.broadcast.emit('update users', user[socket.id]);   // 
    
    socket.emit('self announcement', "You ("+ user[socket.id] + ") have joined the room.");
    socket.broadcast.emit('announcement', user[socket.id] + " has joined the room.");
    
    io.emit("scroll chat");

    // SENDS MSG...
    socket.on('message', (data) => {
        data.id = user['uniqueID'];
        data.color = user['color'];
        data.username = user[socket.id];
    
        var date = new Date();
        var currentTime = "[" + (date.getHours()<10?'0':'') + date.getHours() + ":" + (date.getMinutes()<10?'0':'') + date.getMinutes() + "] ";
        user['time'] = currentTime;

        message = data.message;
        cmdName = message.split(/\s(.+)/)[0];
        cmd = message.split(/\s(.+)/)[1];

        if (message !== '') {

            // NAME CHANGE COMMAND
            if (cmdName === '/name') {
                var flag = false;
                let newName = cmd;
                
                // try replacing new name to people array
                for (let i = 0; i < people.length; i++) {
                    // if proposed name matches this person's name
                    if (newName === people[i]) {
                        flag = true;    // can't use that name, not unique
                        break;
                    }
                }
                // name wasn't matched - it's unique
                if (flag === false) {
                    // change username
                    let oldName = user[socket.id];
                    let index = people.indexOf(user[socket.id]);
        
                    user[socket.id] = newName;    // new name
                    people[index] = newName;      // replace old name w/ new in people array

                    io.emit('change username', oldName, newName);
                    socket.emit('self announcement', currentTime + newName + " is now your new username.");
                    socket.broadcast.emit('announcement', currentTime + oldName + "' changed their name to '" + newName + "'.");

                // name matched - it's not unique
                } else {
                    socket.emit('self announcement', currentTime + "'" + newName + "' is already taken!");
                }

            // COLOR COMMAND
            } else if (cmdName === '/color') {
                data.color = "#"+cmd;
                user['color'] = "#"+cmd;

                io.emit('color change', data);
                socket.emit('self announcement', currentTime + "Your chat color is now " + user['color'] + ".");

            // REGULAR MESSAGE
            } else {
                //emoji check
                if (message.includes(":)")) {
                    message = message.replace(/\:\)+/g, "&#x1F642");
                }
                if (message.includes(":(")) {
                    message = message.replace(/\:\(+/g, "&#x1F641");
                }
                if (message.includes(":o")) {
                    message = message.replace(/\:\o+/gi, "&#x1F62E"); 
                }
                if (message.includes(":D")) {
                    message = message.replace(/\:[D]+/g, "&#x1F603"); 
                }
                if (message.includes(":/")) {
                    message = message.replace(/\:\/+/g, "&#x1F615"); 
                }

                // if less than 200 messages in msg list, put into list
                if (msgList.length < 200) {
                    msgList.push(currentTime + user[socket.id] + ": " + message);
                } else {
                    // 200 msgs in list, remove first, add to list
                    msgList.shift();
                    msgList.push(currentTime + user[socket.id] + ": " + message);
                }
                socket.broadcast.emit('chat message', data, currentTime, message); // to everyone else
                socket.emit('own chat message', data, currentTime, message);       // to yourself, bolded
            }
            io.emit("scroll chat");
        }
    });

    socket.on('disconnect', () => {
        io.emit('remove user', user[socket.id], user[socket.id] + " has left the room.");
        io.emit("scroll chat");
        people.splice(people.indexOf(user[socket.id]), 1);
    });
    
});

http.listen(3000, () => {
    console.log('listening on *:3000');
});