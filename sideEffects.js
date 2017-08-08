const axios = require("axios");

const doHttp = (request) => {
  const options = Object.assign({}, request);
  options["method"] = options["method"] || "get";

  console.log("Performing HTTP request", options);

  return axios
    .request(options)
    .then(result => {
      console.log("request finished", JSON.stringify(result.data, null, 2));
      return Promise.resolve(result);
    })
    .catch(err => {
      console.log("request error", err);
      return Promise.resolve(null);
    });
};


const sideEffectFunctions = {
  "console.log": console.log,
  http: doHttp
};

const doSideEffects = (sideEffects) => {
  return Promise.all(sideEffects.map(se => {
    if (se && se[0]) {
      const f = sideEffectFunctions[se[0]];

      if (f) {
        return f(...se.slice(1));
      } else {
        console.log(`No handler found for ${se[0]} side-effect`);
      }
    }

    return Promise.resolve(false);
  }));
};

module.exports = {
  doSideEffects
};
