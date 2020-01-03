import app from "./app"

if ( process.env.RUN_LOCAL ) {
    app._app.listen(3000, () => {
       console.log('Listening');
    });
}
const server = app._app;

export {server};