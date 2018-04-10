'use strict';

const express = require('express');
const path = require('path');
const bodyParser = require('body-parser');
const jsyaml = require('js-yaml');

const app = express();

// Health Check Middleware
const probe = require('kube-probe');

const DEFAULT_MESSAGE = 'Default hard-coded greeting: Hello, %s!';

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(express.static(path.join(__dirname, 'public')));

let configMap = null;
let message = null;

app.use('/api/greeting', (request, response) => {
  const name = (request.query && request.query.name) ? request.query.name : 'World';
  return response.send({content: message.replace(/%s/g, name)});
});

// set health check
probe(app);

setInterval(() => {
  retrieveConfigMap().then((config) => {
    if (!config) {
      message = DEFAULT_MESSAGE;
      return;
    }

    if (JSON.stringify(config) !== JSON.stringify(configMap)) {
      configMap = config;
      message = config.message;
    }
  }).catch((err) => {
    console.error(err);
  });
}, 2000);



// Find the Config Map
const openshiftRestClient = require('openshift-rest-client');
function retrieveConfigMap() {
  const settings = {
    request: {
      strictSSL: false
    }
  };

  return openshiftRestClient(settings).then((client) => {
    const configMapName = 'app-config';
    return client.configmaps.find(configMapName).then((configMap) => {
      if (configMap.data) {
        return jsyaml.safeLoad(configMap.data['app-config.yml']);  
      }
      return null;
    });
  });
}


module.exports = app;
