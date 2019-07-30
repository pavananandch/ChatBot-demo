var express = require('express');
var app = express();
var cfEnv = require('cfenv');
var path = require('path');
var bodyParser = require('body-parser');
var http = require('http').Server(app);
var io = require('socket.io')(http)
var logoutname;
var botstatus;

//Body Parser 
app.use(bodyParser.urlencoded({
    extended: true
}));
app.use(bodyParser.json())

//App Env
var port = process.env.port | 3000;

//Routing public folder 
app.use('/', express.static('public'))

//Intiale route with '/'
app.get('/', function (req, res) {
    // res.sendFile(path.join(__dirname + '/public/login.html'));
    res.send("server running succefully");
});
count = 0;

//Socket Intilization 
var name;
var agentname;
io.on('connection', function (socket) {
    count++;
    console.log("socket id", socket.id);

    //creating individual rooms for  user/agent
    socket.on('create', function (room) {
        console.log("create socket id", socket.id)
        name = room;
        console.log("name on create", name)
        socket.join(room);
        console.log(socket.rooms)
    });

    //Triggers when user is typing something
    socket.on('typingon', function (msg) {
        console.log("typingon");
        io.to(agentname).emit('typeon', msg)
    })

    //Triggers when user is removed after typing something
    socket.on('typingoff', function (msg) {
        console.log("typingoff");
        io.to(agentname).emit('typeoff', msg)
    })

    //Triggers when agent is typing something
    socket.on('agenttypingon', function (msg) {
        console.log("agenttypingon", msg);
        io.to(msg.name).emit('agenttypeon', msg)
    })

    //Triggers when agent is removed after typing something
    socket.on('agenttypingoff', function (msg) {
        console.log("agenttypingoff");
        io.to(msg.name).emit('agenttypeoff', msg)
    })

    //Getting agentname&confirmation msg and sending to user
    socket.on('agentname', function (msg) {
        io.to(msg.name).emit('agent', msg)
        // console.log("agentname",msg)
    })

    //Triggers when any one of the agent had connected will emit to rest of the active agents
    socket.on('disablenotification', function (data) {
        socket.broadcast.emit('disablenotify', "disable")
    })

    // //Sends chathistory and notification for user connection(Accept button) to all the active agents
    // socket.on('chathistory', function (chatdata) {
    //     socket.broadcast.emit('chathist', chatdata)
    // })

    //Allocates a each room to each agent on agent login
    socket.on('agentcreate', function (room) {
        agentname = room;
        console.log("agentname on create", agentname)
        socket.join(room);
    });

    //Triggers when user clicks on end converstion button and disconnect agent with user
    socket.on('endconv', function (username) {
        io.to(username).emit('startbot', "active")
    })

    //Sends chathistory and notification for user connection(Accept button) to all the active agents
    socket.on('broadcast', function (data) { //initial broadcast accepting message emitted from user client
        console.log(data)
        io.sockets.emit('broadcaster', data) // broadcast msg emitted from server to agent client
    })

    //Sends message from user to agent
    socket.on('userdata', function (msg) { 
        console.log(msg, msg.name)
        io.to(msg.agent).emit('usermsg', msg) //to agent ui
    })

    //Sends agent message to user
    socket.on('agent message', function (data) { //from agent ui to server
        var username = data.name
        io.to(username).emit('agentmsg', {
            "text": data.text
        }) //agent server to user client UI
    })

    //Triggers when user click logout or closes the application when agent is connected
    socket.on('logoutname', function (logname) {
        logoutname = logname.name
        botstatus = logname.botstatus
        agentname = logname.agent
        console.log('logname', logname)
        console.log('logoutname', logoutname)
        io.to(logoutname).emit('remover', {
            'count': count,
            'username': logoutname,
            'botstatus': botstatus
        })
    })

    //Triggers when agent click logout or closes the application when user is connected
    socket.on('disconnect', function () {
        io.to(agentname).emit('remove', {
            'count': count,
            'username': logoutname,
            'botstatus': botstatus
        });
        count--;
    })

})

//Port Initialization 
http.listen(port, function () {
    console.log('Application port number', port);
});