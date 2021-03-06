"use strict";
var Persona = require('persona');

Persona.ApiClient.instance.basePath = process.env.PERSONA_URL;

// https://visionmedia.github.io/superagent/#timeouts
Persona.ApiClient.instance.timeout = {
  response: 60000, // the server has a whopping 60 seconds to respond
  deadline: 20000 // but up to 20 seconds of overall data transfer
};

exports.loginApi = new Persona.LoginApi(Persona.ApiClient.instance);
exports.usersApi = new Persona.UsersApi(Persona.ApiClient.instance);

exports.callApi_ = function(api, methodName, params, opts) {
  return function(onError, onSuccess) {
    var args = isEmptyObject(opts) ? params : params.concat(opts);
    var req = api[methodName].apply(api, args.concat(function(err, data, res) {
      if (err) {
        // If we have an error message we decode it and attach it as the `data`
        // so we can eventually read the error from there
        if (res && res.text) {
          try {
            err.data = JSON.parse(res.text);
          } catch (decodeErr) {
            console.error("Failed to parse persona's response body", decodeErr)
          }
        }
        console.error("Superagent error", err);
        onError(err);
      } else {
        onSuccess(data);
      }
    }));
    return function(cancelError, onCancelerError, onCancelerSuccess) {
      try {
        req.abort();
        onCancelerSuccess();
      } catch(e) {
        onCancelerError(e);
      }
    };
  }
  function isEmptyObject(obj) {
    return Object.keys(obj).length === 0 && obj.constructor === Object;
  }
}
