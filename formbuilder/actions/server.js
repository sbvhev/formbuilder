import KintoClient from "kinto-client";
import btoa from "btoa";
import uuid from "uuid";

import {addNotification} from "./notifications";
import config from "../config";

export const FORM_PUBLISH = "FORM_PUBLISH";
export const FORM_PUBLICATION_PENDING = "FORM_PUBLICATION_PENDING";
export const FORM_PUBLICATION_DONE = "FORM_PUBLICATION_DONE";
export const FORM_PUBLICATION_FAILED = "FORM_PUBLICATION_FAILED";

export const FORM_RECORD_CREATION_PENDING = "FORM_RECORD_CREATION_PENDING";
export const FORM_RECORD_CREATION_DONE = "FORM_RECORD_CREATION_DONE";
export const SCHEMA_RETRIEVAL_PENDING = "SCHEMA_RETRIEVAL_PENDING";
export const SCHEMA_RETRIEVAL_DONE = "SCHEMA_RETRIEVAL_DONE";
export const RECORDS_RETRIEVAL_PENDING = "RECORDS_RETRIEVAL_PENDING";
export const RECORDS_RETRIEVAL_DONE = "RECORDS_RETRIEVAL_DONE";

const CONNECTIVITY_ISSUES = "This is probably due to an unresponsive server or some connectivity issues.";

function getAuthenticationHeaders(token) {
  return {Authorization: "Basic " + btoa(`form:${token}`)};
}

function initializeBucket() {
  const api = new KintoClient(
    config.server.remote,
    {headers: getAuthenticationHeaders(uuid.v4())}
  );
  return api.createBucket(config.server.bucket, {
    safe: true,
    permissions: {
      "collection:create": ["system.Authenticated",]
    }
  }).then(() => {
    api.bucket(config.server.bucket).setPermissions({
      "write": []
    },
    {patch: true}); // Do a PATCH request to prevent everyone to be an admin.
  })
  .catch(() => {
    console.debug("Skipping bucket creation, it probably already exist.");
  });
}

export function publishForm(callback) {
  const thunk =  (dispatch, getState, retry = true) => {

    const form = getState().form;
    const schema = form.schema;
    const uiSchema = form.uiSchema;
    // XXX Add permissions.
    dispatch({type: FORM_PUBLICATION_PENDING});
    const adminToken = uuid.v4();
    const userToken = uuid.v4();

    const userClient = new KintoClient(
      config.server.remote,
      {headers: getAuthenticationHeaders(userToken)}
    );
    userClient.fetchServerInfo().then((serverInfo) => {
      return serverInfo.user.id;
    })
    .then((userId) => {
      // Create a new client, authenticated as the admin.
      const bucket = new KintoClient(
        config.server.remote,
        {headers: getAuthenticationHeaders(adminToken)}
      ).bucket(config.server.bucket);
      bucket.createCollection(userToken, {
        data: {schema, uiSchema},
        permissions: {
          "record:create": ["system.Authenticated"],
          "read": [userId]
        }
      })
      .then(({data}) => {
        dispatch({
          type: FORM_PUBLICATION_DONE,
          collection: data.id,
        });
        if (callback) {
          callback({
            collection: data.id,
            adminToken,
          });
        }
      })
      .catch((error) => {
        // If the bucket doesn't exist, try to create it.
        if (error.response.status === 403 && retry === true) {
          return initializeBucket().then(() => {
            thunk(dispatch, getState, false);
          });
        }
        const msg = "We were unable to publish your form. " +
                    CONNECTIVITY_ISSUES;
        dispatch(addNotification(msg, {type: "error"}));
        dispatch({type: FORM_PUBLICATION_FAILED});
      });
    });
  };
  return thunk;
}

export function submitRecord(record, collection, callback) {
  return (dispatch, getState) => {
    dispatch({type: FORM_RECORD_CREATION_PENDING});

    new KintoClient(config.server.remote, {
      headers: getAuthenticationHeaders(uuid.v4())
    })
    .bucket(config.server.bucket)
    .collection(collection)
    .createRecord(record).then(({data}) => {
      dispatch({type: FORM_RECORD_CREATION_DONE});
      if (callback) {
        callback();
      }
    })
    .catch((error) => {
      const msg = "We were unable to publish your answers. " +
                  CONNECTIVITY_ISSUES;
      dispatch(addNotification(msg, {type: "error"}));
    });
  };
}

export function loadSchema(collection, callback) {
  return (dispatch, getState) => {
    dispatch({type: SCHEMA_RETRIEVAL_PENDING});
    new KintoClient(config.server.remote, {
      headers: getAuthenticationHeaders(collection)
    })
    .bucket(config.server.bucket)
    .collection(collection)
    .getAttributes().then(({data}) => {
      console.log("Metadata", data);
      dispatch({
        type: SCHEMA_RETRIEVAL_DONE,
        data: data
      });
      if (callback) {
        callback(data);
      }
    })
    .catch((error) => {
      const msg = "Due to a network error, we were unable to load your form. " +
                  CONNECTIVITY_ISSUES;
      dispatch(addNotification(msg, {type: "error"}));
    });
  };
}

export function getRecords(collection, adminToken, callback) {
  return (dispatch, getState) => {
    dispatch({type: RECORDS_RETRIEVAL_PENDING});
    new KintoClient(config.server.remote, {
      headers: getAuthenticationHeaders(adminToken)
    })
    .bucket(config.server.bucket)
    .collection(collection)
    .listRecords().then(({data}) => {
      dispatch({
        type: RECORDS_RETRIEVAL_DONE,
        records: data
      });
      if (callback) {
        callback(data);
      }
    })
    .catch((error) => {
      const msg = "We were unable to retrieve the list of records for your form. " +
                  CONNECTIVITY_ISSUES;
      dispatch(addNotification(msg, {type: "error"}));
    });
  };
}
