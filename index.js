const hl7grok = require('./hl7grok/lib/hl7grok.js');
const server = require("./server");
const parseArgs = require('minimist');
const fs = require("fs");
const jute = require('./jute.js');

const messageHandler = (msg, msh) => {
  const parsedMsg = hl7grok.grok(msg, {strict: false});
  console.log("!!!!!!!!!!!!!", JSON.stringify(parsedMsg, null, 2));

  return Promise.resolve(true);
};

// const msg = fs.readFileSync("./samples/adt.hl7", 'utf8').replace(/\n/g, "\r");
//
// const mapping = yaml.safeLoad(fs.readFileSync("./samples/adt.yml", 'utf8'));

// const parsedMsg = hl7grok.grok(msg, {strict: false});

// const structurizedMsg = hl7grok.structurize(parsedMsg[0]);

// console.log("!!!!!!", JSON.stringify(structurizedMsg[1], null, 2));

// const ast = jute.compile(mapping);
// const transformed = jute.transform(structurizedMsg[0], ast, { directives: {} });

// console.log(JSON.stringify(removeBlanks(transformed), null, 2));

// daemon.startServer(4040, 'localhost', messageHandler);

const runServer = (args) => {
  console.log("!!!!! start server");
};

const help = (args) => {
  console.log(
    "Usage: hl7mapper [command]\n" +
      "Commands are:\n\n" +
      "server <host> <port>                 Starts HL7 server\n" +
      "run <message file> <template file>   Performs single run for one HL7 message\n" +
      "help                                 Displays this message");
};

const run = (args) => {
  const msgFn = args._[1];
  const templateFn = args._[2];

  if (!msgFn || !templateFn) {
    help(args);
  }

  const msg = fs.readFileSync(msgFn, 'utf8').replace(/\n/g, "\r");
  const [parsedMsg, parseErrors] = hl7grok.grok(msg, {strict: false});

  if (parseErrors.length > 0) {
    console.log("Parse Errors:", parseErrors);
  }

  const [structurizedMsg, structurizeErrors] = hl7grok.structurize(parsedMsg);

  if (structurizeErrors.length > 0) {
    console.log("Structurize Errors:", structurizeErrors);
  }

  console.log(JSON.stringify(structurizedMsg, null, 2));

  const result = jute.transform(structurizedMsg, templateFn);

  console.log(JSON.stringify(result, null, 2));
};

const commands = {
  server: runServer,
  run,
  help
};

const main = (argv) => {
  const opts = {
    string: ['fhir-url']
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
