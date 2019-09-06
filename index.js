const hl7grok = require('./hl7grok/lib/hl7grok.js');
const server = require("./server");
const jsonServer = require("./jsonServer");
const parseArgs = require('minimist');
const fs = require("fs");
const jute = require('./jute.js');
const sideEffects = require('./sideEffects.js');

const runServer = (args) => {
  version = args['hl7-version'];
  server.startServer(Number(args._[1]), args._[2] || '127.0.0.1', server.makeMessageHandler({
    grok: (msg) => hl7grok.grok(msg, { version, strict: false }),
    structurize: (parsedMsg) => hl7grok.structurize(parsedMsg, { version }),
    doHttp: sideEffects.doHttp
  }));
};

const runJsonServer = (args) => {
  jsonServer.startServer(args._[1]);
};

const help = (args) => {
  console.log(
    "Usage: hl7mapper [command]\n" +
      "Commands are:\n\n" +
      "server <port> [host]                 Starts HL7 server\n" +
      "json-server <base-url>               Polls URL for HL7 messages in JSON format\n" +
      "run <message> <template> <scope>     Performs single run for one HL7 message\n" +
      "help                                 Displays this message\n\n" +
      "Options are:\n" +
      "--template / -t                      Index template name (default to /mappings/index.yml)\n" +
      "--hl7-version / -j                   Override HL7 version of incoming messages");
};

const run = (args) => {
  const msgFn = args._[1];
  const templateFn = args._[2];

  if (!msgFn || !templateFn) {
    help(args);
  }

  const msg = fs.readFileSync(msgFn, 'utf8').replace(/\n/g, "\r");
  const [parsedMsg, parseErrors] = hl7grok.grok(msg, {
    strict: false,
    version: args['hl7-version']
  });

  if (parseErrors.length > 0) {
    console.log("Parse Errors:", parseErrors);
  }

  const [structurizedMsg, structurizeErrors] = hl7grok.structurize(parsedMsg, {
    version: args['hl7-version'],
    ignoredSegments: ['CON']
  });

  if (structurizeErrors.length > 0) {
    console.log("Structurize Errors:", structurizeErrors);
  }

  console.log("Parsed message:\n", JSON.stringify(structurizedMsg, null, 2));

  const scope = args._[3] ? JSON.parse(args._[3]) : {};

  const result = jute.transform(Object.assign(structurizedMsg, scope), templateFn);

  console.log("Transform result:\n", JSON.stringify(result, null, 2));
};

const commands = {
  server: runServer,
  "json-server": runJsonServer,
  run,
  help
};

const main = (argv) => {
  const opts = {
    string: ['fhir-url', 'template', 'hl7-version'],
    default: {
      'template': __dirname + "/mappings/index.yml",
      'hl7-version': null
    },
    alias: {
      't': 'template',
      'j': 'hl7-version'
    }
  };

  const parsedArgs = parseArgs(argv.slice(2), opts);
  const commandName = parsedArgs._[0];
  const commandFn = commands[commandName];

  if (commandFn) {
    commandFn(parsedArgs);
  } else {
    help(parsedArgs);
  }

};

main(process.argv);
