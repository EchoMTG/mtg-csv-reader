import app from "./app"
import * as functions from 'firebase-functions'

const echoCsv = functions.https.onRequest(app._app);

if ( process.env.RUN_LOCAL ) {
    app._app.listen(3000, () => {
       console.log('Listening');
    });
}

export {echoCsv}