#!/usr/bin/env node
fs = require('fs');
var accountStream = fs.createWriteStream('AccountInfo.json', {flags: 'a'});
var amqp = require('amqplib/callback_api');
var amqpConn = null;

function startRabbitMQ() {
    amqp.connect('amqp://localhost', function(err, conn) {
      if (err) {
        console.error("[AMQP]", err.message);
        return setTimeout(startRabbitMQ, 1000);
      }
      conn.on("error", function(err) {
        if (err.message !== "Connection closing") {
          console.error("[AMQP] conn error", err.message);
        }
      });
      conn.on("close", function() {
        console.error("[AMQP] reconnecting");
        return setTimeout(startRabbitMQ, 1000);
      });
      console.log("[AMQP] connected");
      amqpConn = conn;
      startWorker();
    });
  }

// A worker that acks messages only if processed successfully
function startWorker() {
    amqpConn.createChannel(function(err, ch) {
      if (closeOnErr(err)) return;
      ch.on("error", function(err) {
        console.error("[AMQP] channel error", err.message);
      });
      ch.on("close", function() {
        console.log("[AMQP] channel closed");
      });
  
      ch.prefetch(10);
      ch.assertQueue("scrappedAccounts", { durable: true }, function(err, _ok) {
        if (closeOnErr(err)) return;
        ch.consume("scrappedAccounts", processMsg(ch), { noAck: false });
        console.log("Worker is started");
      });
    });
  }

  function processMsg( ch) {
      return (msg) => {
        (async () => {
            //write in csv then flush
            accountStream.write(msg.content.toString()+"\r\n");
            ch.ack(msg);
        })();
        }   
    }

  function closeOnErr(err) {
    if (!err) return false;
    console.error("[AMQP] error", err);
    amqpConn.close();
    return true;
  }

(async () => {

    //connect to RABITMQ
    startRabbitMQ();

   })()

