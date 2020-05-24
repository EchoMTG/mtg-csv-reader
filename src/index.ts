import app from "./app"


if ( process.env.RUN_LOCAL ) {
    app._app.listen(3000, () => {
       console.log("Listening on port 3000");
    });
}

module.exports = {
    server: app._app
};