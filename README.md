## Install

```bash
npm install
git submodule update --init
cd jute
npm install
```

## To run ADT mapping:

```bash
node index.js --hl7-version 2.5 run hl7grok/test/messages/adt-a01-01.hl7 mappings/index.yml
```