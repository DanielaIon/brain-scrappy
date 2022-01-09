#!/usr/bin/env node

var amqp = require('amqplib/callback_api');
var amqpConn = null;

function start() {
    amqp.connect('amqp://localhost', function(err, conn) {
      if (err) {
        console.error("[AMQP]", err.message);
        return setTimeout(start, 1000);
      }
      conn.on("error", function(err) {
        if (err.message !== "Connection closing") {
          console.error("[AMQP] conn error", err.message);
        }
      });
      conn.on("close", function() {
        console.error("[AMQP] reconnecting");
        return setTimeout(start, 1000);
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
      ch.assertQueue("accounts", { durable: true }, function(err, _ok) {
        if (closeOnErr(err)) return;
        ch.consume("accounts", processMsg, { noAck: true });
        console.log("Worker is started");
      });
    });
  }

  function processMsg(msg) {
    console.log("PDF processing of ", msg.content.toString());
  }

  function closeOnErr(err) {
    if (!err) return false;
    console.error("[AMQP] error", err);
    amqpConn.close();
    return true;
  }

start();