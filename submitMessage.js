const axios = require('axios');
const fs = require('fs');
const uuid = require('uuid')

const msg = fs.readFileSync(process.argv[2], 'utf-8');

axios.request({
  url: 'http://ec2-54-149-115-237.us-west-2.compute.amazonaws.com:8080/v2/api/mockehr',
  method: 'post',
  headers: { 'content-type': 'application/json' },
  data: {
    message: encodeURIComponent(msg),
    messageStatus: 'Egress',
    instance: process.argv[3],
    error: ''
  }
}).then(result  => {
  console.log("Submit result", result.data);
}).catch(err => {
  console.log("Submit error", err);
})
