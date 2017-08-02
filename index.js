const hl7grok = require('./hl7grok/lib/hl7grok.js');
const server = require("./server");
const parseArgs = require('minimist');
const fs = require("fs");
const jute = require('./jute.js');
const sideEffects = require('./sideEffects.js');

const makeMessageHandler = (options) => {
  return (msg, msh) => {
    const [parsedMsg, parseErrors] = hl7grok.grok(msg, {
      strict: false,
      version: options.version
    });

    if (parseErrors.length > 0) {
      console.log("Parse Errors:", parseErrors);
    }

    const [structurizedMsg, structurizeErrors] = hl7grok.structurize(parsedMsg, {
      version: options.version
    });

    if (structurizeErrors.length > 0) {
      console.log("Structurize Errors:", structurizeErrors);
    }

    const se = jute.transform(structurizedMsg, options.template);
    sideEffects.doSideEffects(se);

    return Promise.resolve(true);
  };
};

const runServer = (args) => {
  server.startServer(Number(args._[1]), args._[2], makeMessageHandler({
    template: args['template'],
    version: args['hl7-version']
  }));
};

const help = (args) => {
  console.log(
    "Usage: hl7mapper [command]\n" +
      "Commands are:\n\n" +
      "server <host> <port>                 Starts HL7 server\n" +
      "run <message file> <template file>   Performs single run for one HL7 message\n" +
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
    version: args['hl7-version']
  });

  if (structurizeErrors.length > 0) {
    console.log("Structurize Errors:", structurizeErrors);
  }

  console.log("Parsed message:\n", JSON.stringify(structurizedMsg, null, 2));

  const result = jute.transform(structurizedMsg, templateFn);

  console.log("Transform result:\n", JSON.stringify(result, null, 2));
};

const commands = {
  server: runServer,
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
