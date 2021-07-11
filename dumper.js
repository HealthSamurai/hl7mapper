const net = require("net");
const fs = require("fs");
const parseArgs = require("minimist");

let counter = 0;
const start = async (port, host, path) => {
  let server = net.createServer(sock => {
    sock.setEncoding("binary");
    const ip = sock.remoteAddress;
    port = sock.remotePort;
    fname = `${path}_${counter}.hl7`;
    console.log(`Recording HL7 traffic from ${ip}:${port} to ${fname}`);

    fs.open(fname, "a", (err, fd) => {
      if (err) throw err;
      sock.on("data", data => {
        fs.appendFile(fd, data, err => {
          if (err) throw err;
          fs.fsync(fd, err => {
            if (err) throw err;
            console.log(
              `Appended: ${data.length} bytes from ${ip}:${port} to ${fname}`
            );
          });
        });
      });

      sock.on("error", err => {
        console.log(`Socket error: ${err.stack}`);
        return sock.destroy();
      });

      return sock.on("end", () => {
        fs.closeSync(fd);
        counter += 1;
        return console.log(`HL7 connection from ${ip}:${port} was closed`);
      });
    });
  });

  server.on("error", err => {
    return console.log(`${err}`);
  });

  await server.listen(port, host, 1024);
  console.log(`Recording HL7 traffic at ${host}:${port}`);
  return server;
};

if (require.main === module) {
  const args = parseArgs(process.argv.slice(2));
  if (args._.length == 2) {
    start(Number(args._[0]), "0.0.0.0", args._[1]);
  } else {
    console.log("Usage: node dumper.js <port> <file>");
  }
}

module.exports = { start };
