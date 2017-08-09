const axios = require("axios");
const jute = require('./jute.js');
const hl7grok = require('./hl7grok/lib/hl7grok.js');

const POLL_INTERVAL = 5000;

const handleMessage = (msg) => {
  const rawMessage = decodeURIComponent(msg.message).replace(/\n/g, "\r");

  const parsedResult = hl7grok.grok(rawMessage, { strict: false, version: '2.5' });

  if (parsedResult[0] === null) {
    msg.messageStatus = 'Error';
    msg.error = "Error during message parsing:\n" + parsedResult[1].join("\n");

    return Promise.resolve(msg);
  }

  const [structurizedMsg, structurizeErrors] = hl7grok.structurize(parsedResult[0], { strict: false, version: '2.5' });

  if (structurizedMsg === null) {
    msg.messageStatus = 'Error';
    msg.error = "Error during message structurization:\n" + structurizeErrors.join("\n");

    return Promise.resolve(msg);
  }

  try {
    // const se = jute.transform(Object.assign(structurizedMsg, {
    //   MESSAGE_TYPE: msg.messageType,
    //   INSTANCE: msg.instance
    // }), './mappings/index.yml');
  } catch (err) {
    console.log("Error during mapping:", err);
    msg.messageStatus = 'Error';
    msg.error = "Error during mapping: " + err.message + "\n" + err.stack;
    return Promise.resolve(msg);
  }

  msg.messageStatus = 'Processed';
  msg.error = '';
  return Promise.resolve(msg);
};

const pollFn = (baseUrl) => {
  axios.request({
    url: `${baseUrl}/mockehr?messageStatus=Egress`
  }).then(result => {
    let promises = [];

    if (result.data.length > 0) {
      promises = result.data.map(msg => {
        console.log(`Got unprocessed message ${msg.messageId}`);

        return handleMessage(msg);
      });
    } else {
      console.log("No Egress messages found");
    }

    return Promise.all(promises).then(results => {
      const prms = results.map(result => {
        console.log(`Updating a message ${result.messageId}`);

        return axios.request({
          url: `${baseUrl}/mockehr`,
          method: 'put',
          headers: { 'content-type': 'application/json' },
          data: result
        }).then(updateResult => {
          console.log(`Message ${updateResult.data.messageId} updated`);
        });
      });
    });
  }).then(updateResults => {
    setTimeout(() => pollFn(baseUrl), POLL_INTERVAL);
  }).catch(err => {
    console.log("[ERROR] Oops! Something nasty happened:", err);

    setTimeout(() => pollFn(baseUrl), POLL_INTERVAL);
  });
};

const startServer = (baseUrl) => {
  console.log(`Starting polling ${baseUrl} for JSON-ecoded HL7 messages`);

  pollFn(baseUrl);
};

module.exports = {
  startServer
};
