const net = require("net");
const fs = require("fs");
const server = require("../server");
const mockConsole = require("jest-mock-console").default;

const HOST = "127.0.0.1";
const PORT = 62635;
const ONCE_FIXTURE = fs.readFileSync(__dirname + "/../fixtures/once.hl7");
const ACK_START = "\u000bMSH|^~\\&|TESTSYSTEM|TESTFACILITY|NES|NINTENDO|";
  const ACK_END = "||ACK||NINTENDO|2.3\rMSA|AA|Q123456789T123456789X123456||||\u001c\r";

describe("correct message with null handlers", () => {
  beforeEach(async () => {
    this.restoreConsole = mockConsole();

    const grok = jest.fn(m => [m, []]);
    const structurize = jest.fn(m => [m, []]);
    const doHttp = jest.fn(m => Promise.resolve(m));
    this.spies = { grok, structurize, doHttp };

    messageHandler = server.makeMessageHandler(this.spies);
    this.srv = await server.startServer(PORT, HOST, messageHandler);

    this.client = net.connect(PORT, () => this.client.write(ONCE_FIXTURE));
    this.client.setEncoding("binary");
  });

  afterEach(() => {
    this.restoreConsole();
  });

  test("parses correct message", async done => {
    let dataBuffer = new String();
    let counter = 1; // expect 1 lines
    this.client.on("data", data => {
      dataBuffer += data;
      counter -= 1;
      console.log({ dataBuffer, data, counter });
      if (!counter) this.client.destroy();
    });

    this.client.on("close", x => {
      console.log({ x });
      this.srv.close();
      this.srv.unref();

      // contains timestamp inside
      expect(dataBuffer.startsWith(ACK_START)).toBe(true);
      expect(dataBuffer.endsWith(ACK_END)).toBe(true);

      expect(this.spies.grok).toHaveBeenCalled();
      expect(this.spies.structurize).toHaveBeenCalled();
      expect(this.spies.doHttp).toHaveBeenCalled();
      done();
    });
  });
});
