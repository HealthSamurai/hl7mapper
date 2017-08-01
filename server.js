const net = require('net');
const moment = require('moment');

const MESSAGE_HEADER = String.fromCharCode(0x0b);
const MESSAGE_SEPARATOR = String.fromCharCode(0x1c) + String.fromCharCode(0x0d);

let server = null;

const hl7ts = (d) => moment(d).format("YYYYMMDDHHmmss");

const sendMessage = (socket, msg) => {
  msgStrs = [];

  msg.forEach(segment => {
    msgStrs.push(segment.join("|"));
  });

  const binaryMsg = MESSAGE_HEADER + msgStrs.join("\r") + MESSAGE_SEPARATOR;

  return new Promise((resolve, reject) => {
    socket.write(binaryMsg, 'binary', (err) => {
      console.log("Sent:\n" + msgStrs.join("\n") + "\n");
      resolve();
    });
  });
};

const buildAck = (originalMsh, success, errorMessage) => {
  const segments = [];

  const msh = [
    "MSH",
    "^~\\&",
    originalMsh[5],
    originalMsh[6],
    originalMsh[3],
    originalMsh[4],
    hl7ts(new Date()),
    "",
    "ACK",
    "",
    originalMsh[4],
    originalMsh[12]
  ];

  segments.push(msh);

  const msa = [
    "MSA",
    (success ? "AA" : "AE"),
    originalMsh[10],
    "",
    "",
    "",
    (success ? "" : "207")
  ];

  segments.push(msa);

  if (!success) {
    const err = [
      "ERR",
      "MSH^1^1^207",
      "",
      "207",
      "E",
      "",
      "",
      errorMessage.replace("\n", "\\n"),
      "",
      "",
      "",
      "",
      ""
    ];

    segments.push(err);
  }

  return segments;
};

const parseMsh = (msg) => {
  const separators = {
    segment: "\r",
    field: msg[3],
    component: msg[4],
    subcomponent: msg[7],
    repetition: msg[5],
    escape: msg[6]
  };

  const mshSegment = msg.substr(0, msg.indexOf(separators.segment));
  const mshFields = mshSegment.split(separators.field);
  mshFields.splice(1, 0, separators.field);

  return mshFields;
};

const messageReceived = (msg, socket, handler) => {
  console.log("Received:\n" + msg.replace("\r", "\n") + "\n");
  const msh = parseMsh(msg);

  handler(msg, msh).then(success => {
    const ack = buildAck(msh, true);
    return sendMessage(socket, ack);
  }).catch(err => {
    console.log("Error while processing a message:", err);
  });
};

const startHl7Server = (port, host, messageHandler) => {
  const removeHeaderBytes = (m) => {
    return m.substr(MESSAGE_HEADER.length);
  };

  server = net.createServer(sock => {
    sock.setEncoding('binary');
    const ip = sock.remoteAddress;
    port = sock.remotePort;

    console.log(`HL7 connection from ${ip}:${port}`);

    let dataBuffer = new String;
    sock.on('data', data => {
      if (data.indexOf(MESSAGE_SEPARATOR) >= 0) {
        const parts = data.split(MESSAGE_SEPARATOR);

        // first element of `parts` array is
        // remaining part of unfinished message
        messageReceived(removeHeaderBytes(dataBuffer + parts.shift()), sock, messageHandler);

        // last element of `parts` array (if present) is a
        // beginning of some message, so we put it in the buffer
        dataBuffer = parts.pop();

        // all elements between first and last elements are messages
        Array.from(parts).forEach(msg => messageReceived(removeHeaderBytes(msg), sock, messageHandler));
      }
    });

    sock.on('error', err => {
      console.log(`Socket error: ${err.stack}`);
      return sock.destroy();
    });

    return sock.on('end', () => {
      return console.log(`HL7 connection from ${ip} was closed`);
    });
  });

  // sock.on 'timeout', () =>
  //   # @globalLogger.notice "Listening socket timeout #{ip}"
  //   sock.destroy()

  server.on('error', err => {
    return console.log(`${err}`);
  });

  return new Promise((resolve, reject) => {
    server.listen(port, host, 1024, () => {
      console.log(`Listening for HL7 traffic at ${host}:${port}`);
      resolve(server);
    });
  });
};

module.exports = {
  startServer: startHl7Server
};

// const fs = require('fs');

// const msg = fs.readFileSync('./samples/adt.hl7', 'utf-8');
// messageReceived(msg.replace(/\n/g, "\r"));
