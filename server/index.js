var express = require('express');
var expressRequestId = require('express-request-id')();
var app = express();
var connections = {}
  , votes = {yes: 0, no: 0};
var redis = require("redis")
// if you'd like to select database 3, instead of 0 (default), call
// client.select(3, function() { /* ... */ });

var sub = redis.createClient(), pub = redis.createClient();
var msg_count = 0;

app.use(expressRequestId);

sub.on("message", function (channel, message) {
  //notify each connections about the change
  //for(var i = 0; i < connections.length; i++) {
  //  connections[i].sseSend(votes)
  //}
  //
  for (reqId in connections){
    connections[reqId].sseSend(votes);
  }
});

sub.subscribe("vote");

app.use(express.static('./public'));

app.use(function(req, res, next){
  res.sseSetup = function(req) {
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive'
    });

    // client closes connection
    res.socket.on('close', function () {
      delete connections[req.id];
      console.log('close connection', req.id);
      res.end();
    });

    console.log('remember connection', req.id);
    connections[req.id] = res;
  }

  res.sseSend = function(data) {
    res.write("data: " + JSON.stringify(data) + "\n\n");
  }

  next()
});

app.get('/vote', function(req, res) {
  if (req.query.yes === "true") votes.yes++
  else votes.no++

  pub.publish("vote", JSON.stringify(votes));
  res.sendStatus(200)
});

//SSE connection streams
app.get('/stream', function(req, res) {
  res.sseSetup(req);
  res.sseSend(votes);
});

app.listen(3000, function() {
  console.log('Listening on port 3000...')
})
