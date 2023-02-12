const maxApi = require("max-api");
const { google } = require('googleapis');
const http = require('http');
const https = require('https');
const url = require('url');
const util = require('util'); // included in node
const fs = require('fs'); //included in node
const open = require('open');
const destroyer = require('server-destroy');

const writeFilePromise = util.promisify(fs.writeFile);
const readFilePromise = util.promisify(fs.readFile);

let liveChatId;
let nextPage;
const intervalTime = 5000;
let interval;
let chatMessages = [];

const save = async (path, data) => {
    await writeFilePromise(path, data);
    console.log('Successfully Saved');
};

const read = async path => {

    const fileContents = await readFilePromise(path);
    return JSON.parse(fileContents);
};


const youtube = google.youtube('v3');

const Oauth2 = google.auth.OAuth2;

const clientId = "640775858134-1lggdicuadf39ejoa9kpt4lldd2e63mm.apps.googleusercontent.com"
const clientSecret = "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";

const redirectURI = 'http://localhost:3000/oauth2callback';


const scope = [
    'https://www.googleapis.com/auth/youtube.readonly',
    'https://www.googleapis.com/auth/youtube',
    'https://www.googleapis.com/auth/youtube.force-ssl'
];

const auth = new Oauth2(clientId, clientSecret, redirectURI);

const youtubeService = {};
let authorizeUrl;

function getAuthenticatedClient() {
    return new Promise((resolve, reject) => {
        // create an oAuth client to authorize the API call.  Secrets are kept in a `keys.json` file,
        // which should be downloaded from the Google Developers Console.



        // Generate the url that will be used for the consent dialog.
        authorizeUrl = auth.generateAuthUrl({
            access_type: 'offline',
            scope
        });

        // Open an http server to accept the oauth callback. In this simple example, the
        // only request to our webserver is to /oauth2callback?code=<code>
        const server = http
            .createServer(async (req, res) => {
                try {
                    if (req.url.indexOf('/oauth2callback') > -1) {
                        // acquire the code from the querystring, and close the web server.
                        const qs = new url.URL(req.url, 'http://localhost:3000')
                            .searchParams;
                        const code = qs.get('code');
                        console.log(`Code is ${code}`);
                        res.end('Authentication successful! Please return to the console.');
                        server.destroy();

                        // Now that we have the code, use that to acquire tokens.
                        const r = await auth.getToken(code);
                        // Make sure to set the credentials on the OAuth2 client.
                        auth.setCredentials(r.tokens);
                        console.info('Tokens acquired.');
                        resolve(auth);
                    }
                } catch (e) {
                    reject(e);
                }
            })
            .listen(3000, () => {
                // open the browser to the authorize url to start the workflow
                open(authorizeUrl, { wait: false }).then(cp => cp.unref());
            });
        destroyer(server);
    });
}



youtubeService.getCode = authorizeUrl



youtubeService.getTokensWithCode = async code => {
    const credentials = await auth.getToken(code);
    youtubeService.authorize(credentials);

};

youtubeService.authorize = ({ tokens }) => {
    auth.setCredentials(tokens);
    console.log('Successfully set credentials');
    console.log('tokens', tokens);
    save('./tokens.json', JSON.stringify(tokens));
};


auth.on('tokens', (tokens) => {
    console.log('new tokens recieved')
    save('./tokens.json', JSON.stringify(tokens));
});




const checkTokens = async () => {
    const tokens = await read('./tokens.json');
    if (tokens) {
        console.log('setting tokens');
        return auth.setCredentials(tokens);
    }
    console.log('no tokens found');
};

youtubeService.findActiveChat = async () => {
    const response = await youtube.liveBroadcasts.list({
        auth,
        part: 'snippet',
        broadcastStatus: 'active'
    });
    const latestChat = response.data.items[0];

    if (latestChat && latestChat.snippet.liveChatId) {
        liveChatId = latestChat.snippet.liveChatId;
        maxApi.outlet('chatstatus', '1')
        console.log("Chat ID Found:", liveChatId);
    } else {
        console.log("No Active Chat Found");
        maxApi.outlet('chatstatus', '0')
    }

};

const getChatMessages = async () => {
    const response = youtube.liveChatMessages.list({
        auth,
        part: 'snippet',
        liveChatId,
        pageToken: nextPage
    });
    const { data } = response;
    const newMessages = data.items;
    chatMessages.push(...newMessages);
    nextPage = data.nextPageToken;
    console.log("Total Chat Messages", chatMessages.length)
};


youtubeService.startTrackingChat = async () => {
    interval = setInterval(getChatMessages, intervalTime)

};

youtubeService.insertMessage = (messageText = 'Hello World') => {
    youtube.liveChatMessages.insert({
        auth,
        part: 'snippet',
        resource: {
            snippet: {
                liveChatId,
                type: 'textMessageEvent',
                textMessageDetails: {
                    messageText
                }
            }
        }
    })
};

checkTokens();


module.exports = youtubeService;





maxApi.addHandler("auth", () => {
    getAuthenticatedClient()
    //console.log()
});


maxApi.addHandler("activeChat", () => {
    youtubeService.findActiveChat();

});

maxApi.addHandler("chat", (msg) => {
    youtubeService.insertMessage(msg)
    //console.log()
});





