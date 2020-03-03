import app from "./app"


app.startServer().then(() => {
    if (process.env.RUN_LOCAL) {
        app._app.listen(3000, () => {
            console.log('Listening');
        });
    } else {
        module.exports = {
            server: app._app
        }
    }
});

