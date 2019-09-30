import app from "./app"
import * as functions from 'firebase-functions'

const echoCsv = functions.https.onRequest(app._app);

export {echoCsv}