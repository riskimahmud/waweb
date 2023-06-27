const { Client, LocalAuth } = require("whatsapp-web.js");
const qrcode = require("qrcode");
const express = require("express");
const socketIO = require("socket.io");
const http = require("http");
const { body, validationResult } = require("express-validator");
const { phoneNumberFormatter } = require("./helpers/formatter");
const fs = require("fs");

const app = express();
const server = http.createServer(app);
const io = socketIO(server);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.get("/", (req, res) => {
  res.sendFile("index.html", { root: __dirname });
});

const client = new Client({
  authStrategy: new LocalAuth(),
  proxyAuthentication: { username: "username", password: "password" },
  puppeteer: {
    args: [
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--disable-dev-shm-usage",
      "--disable-accelerated-2d-canvas",
      "--no-first-run",
      "--no-zygote",
      "--single-process", // <- this one doesn't works in Windows
      "--disable-gpu",
    ],
    headless: true,
  },
});

client.initialize();

//socket io
io.on("connection", function (socket) {
  socket.emit("message", "Connecting...");

  //   scan qrcode
  client.on("qr", (qr) => {
    // NOTE: This event will not be fired if a session is specified.
    console.log("QR RECEIVED", qr);
    // qrcode.generate(qr, { small: true });
    qrcode.toDataURL(qr, (err, url) => {
      socket.emit("qr", url);
      socket.emit("message", "QRcode diterima silahkan scan");
    });
  });

  // sudah login
  client.on("authenticated", () => {
    console.log("AUTHENTICATED");
    socket.emit("authenticated", "authenticated");
    socket.emit("message", "Sudah Login");
  });

  //   ready
  client.on("ready", () => {
    console.log("READY");
    socket.emit("ready", "ready");
    socket.emit("message", "Whatsapp Ready");
  });

  //   loading screen
  client.on("loading_screen", (percent, message) => {
    console.log("LOADING SCREEN", percent, message);
    socket.emit("message", "LOADING SCREEN " + percent + "% " + message);
  });

  client.on("auth_failure", (msg) => {
    // Fired if session restore was unsuccessful
    console.error("AUTHENTICATION FAILURE", msg);
    socket.emit("message", "AUTHENTICATION FAILURE " + msg);
  });

  //   get message
  client.on("message", async (msg) => {
    // console.log("MESSAGE RECEIVED", msg);
    client.sendMessage(
      msg.from,
      "Hai. Harap simpan nomor ini agar tidak diblokir oleh pihak WhatsApp.\nSaya hanya akan mengirimkan Notifikasi."
    );
    socket.emit("message", "Pesan Masuk : " + msg.body);
    // logToFile("Pesan Masuk : " + msg.body);
  });
});

// cek register number
const checkRegisteredNumber = async function (number) {
  const isRegistered = await client.isRegisteredUser(number);
  return isRegistered;
};

app.post(
  "/send-message",
  [body("number").notEmpty(), body("message").notEmpty()],
  async (req, res) => {
    const errors = validationResult(req).formatWith(({ msg }) => {
      return msg;
    });
    const number = phoneNumberFormatter(req.body.number);
    const message = req.body.message;

    const isRegistered = await checkRegisteredNumber(number);

    if (!isRegistered) {
      return res.status(422).json({
        status: false,
        message: "The number is not registered",
      });
    }

    if (!errors.isEmpty()) {
      return res.status(422).json({
        status: false,
        message: errors.mapped(),
      });
    }

    if (client.info === undefined) {
      console.log("the system is not ready yet");
    } else {
      // client.sendMessage(phn, msg);
      client
        .sendMessage(number, message)
        .then((response) => {
          res.status(200).json({
            status: true,
            response: response,
          });
        })
        .catch((err) => {
          res.status(500).json({
            status: false,
            response: err,
          });
        });
    }
  }
);

server.listen(3000, function () {
  console.log(`Aplikasi running di *:` + 3000);
});
