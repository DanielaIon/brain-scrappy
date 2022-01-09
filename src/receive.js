#!/usr/bin/env node
const puppeteer = require('puppeteer');
var amqp = require('amqplib/callback_api');
var amqpConn = null;

function startRabbitMQ(browser) {
    amqp.connect('amqp://localhost', function(err, conn) {
      if (err) {
        console.error("[AMQP]", err.message);
        return setTimeout(startRabbitMQ(browser), 1000);
      }
      conn.on("error", function(err) {
        if (err.message !== "Connection closing") {
          console.error("[AMQP] conn error", err.message);
        }
      });
      conn.on("close", function() {
        console.error("[AMQP] reconnecting");
        return setTimeout(startRabbitMQ(browser), 1000);
      });
      console.log("[AMQP] connected");
      amqpConn = conn;
      startWorker(browser);
    });
  }

// A worker that acks messages only if processed successfully
function startWorker(browser) {
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
        ch.consume("accounts", processMsg(browser, ch), { noAck: false });
        console.log("Worker is started");
      });
    });
  }

  function processMsg(browser, ch) {
      return (msg) => {
        (async () => {
            var myObject = await scrappAccount(browser, msg.content.toString());
            console.log(myObject)
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

async function scrappAccount(browser, url){

    var page = await browser.newPage()    
    await page.goto('https://www.brainmap.ro' + url)

    const details = {
        'keywords':[],
        'country': [],
        'affiliations': [],
        'roles':[],
        'name':[]
    }

    const myfunction = async (text) => {
        return await page.evaluate((text) => {
            let results = [];
            let items = document.querySelectorAll(text);
            items.forEach((item) => {
                let content = item.innerText.split(" | ")
                results.push(...content);
            });
            return results;
        }, text);
    }

    details.keywords = await myfunction('a.key_tag');
    details.country = await myfunction("[id*=\"idTaraLucru\"]");
    details.affiliations = await myfunction("div.profile-dash h5 label[id*=\"instNume\"]");
    details.roles = await myfunction("label[id*=\"roles\"]");
    details.name = await myfunction("[id*=\"Name\"]");

    page.close()
    return details;
}
(async () => {

    // access brainmap.ro
    const browser = await puppeteer.launch({
        headless: true,
        args: [
          '--disable-extensions-except=/path/to/manifest/folder/',
          '--load-extension=/path/to/manifest/folder/',
        ]
      });

    //connect to RABITMQ
    startRabbitMQ(browser);

    // let urls = [
    //     '/florin-pop',      
    //     '/monica-turturean'
    //   ];

    // const accountInfo = [];
   
    // for (let i = 0; i < urls.length; i++) {
    //     accountInfo.push(await scrappAccount(page, urls[i]));        
    // };

    // console.log(accountInfo)

    // fs.writeFile('AccountInfo.json', accountInfo, function (err) {
    // if (err) return console.log(err);
    // // console.log('Hello World > helloworld.txt');
    // });
   })()

