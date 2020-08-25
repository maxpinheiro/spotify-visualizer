const express = require('express'); // Express web server framework
const request = require('request'); // "Request" library
const querystring = require('querystring');
const cookieParser = require('cookie-parser');

const app = express();

app.use(cookieParser());

// my client id todo: shouldn't i hide this?
let client_id = 'd0dc8926588548e6a0266c8953dac91a';
let client_secret = 'e0cc5e983a414b89bedbd0bbbc883497';
let redirect_uri = 'http://localhost:4444/callback';

const stateKey = 'spotify_auth_state';

/**
 * Generates a random string containing numbers and letters
 * @param  {number} length The length of the string
 * @return {string} The generated string
 */
const generateRandomString = function(length) {
    let text = '';
    const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';

    for (let i = 0; i < length; i++) {
        text += possible.charAt(Math.floor(Math.random() * possible.length));
    }
    return text;
}

// default page
/*
app.get('/', function(req, res) {
    res.writeHead(200, {'Content-Type': 'text/html'});
    res.write("<a href='/login'>Log in with Spotify</a>");
    res.end();
});
 */

// login page
app.get('/login', function(req, res) {
    // create a cookie when logging in, ensures client logs in before using app
    let state = generateRandomString(16);
    res.cookie(stateKey, state);

    // request authorization
    const scope = 'user-read-private user-read-email user-read-currently-playing user-read-playback-state user-modify-playback-state';
    res.redirect('https://accounts.spotify.com/authorize?' +
        querystring.stringify({
            response_type: 'code',
            client_id: client_id,
            scope: scope,
            redirect_uri: redirect_uri,
            state: state
        }));

});

app.get('/callback', function(req, res) {
    // your application requests refresh and access tokens
    // after checking the state parameter

    let code = req.query.code || null;
    let state = req.query.state || null;
    let storedState = req.cookies ? req.cookies[stateKey] : null;

    if (state === null || state !== storedState) {
        res.redirect('/logged_in#' +
            querystring.stringify({
                error: 'state_mismatch'
            }));
    } else {
        res.clearCookie(stateKey);
        var authOptions = {
            url: 'https://accounts.spotify.com/api/token',
            form: {
                code: code,
                redirect_uri: redirect_uri,
                grant_type: 'authorization_code',
                client_id: client_id,
                client_secret: client_secret
            },
            json: true
        };

        request.post(authOptions, function(error, response, body) {

            if (!error && response.statusCode === 200) {

                let access_token = body.access_token,
                    refresh_token = body.refresh_token;

                //redirect to player page
                res.redirect('/player#' +
                    querystring.stringify({
                        access_token: access_token,
                        refresh_token: refresh_token
                    }));
            } else {
                res.redirect('/player#' +
                    querystring.stringify({
                        error: 'invalid_token'
                    }));
            }
        });
    }
});

// middleware routing :)

//app.set('view engine', 'pug');

//app.use('/player', express.static(__dirname + '/routes'));

app.use(express.static('./server/routes'));

app.get('/player', function(req, res) {
    //res.sendFile(path.join(__dirname+'/routes/player.html'));
    //res.render('player', { title: 'Hey', message: 'Hello there!' });
    res.redirect('player.html');
});


app.get('/', function(req, res) {
    res.redirect('default.html');
    //res.sendFile(path.join(__dirname+'/routes/default.html'));
    //res.render('default', { title: 'Hey', message: 'Hello there!' })
});

app.get('/refresh_token', function(req, res) {

    // requesting access token from refresh token
    let refresh_token = req.query.refresh_token;
    let authOptions = {
        url: 'https://accounts.spotify.com/api/token',
        headers: { 'Authorization': 'Basic ' + (new Buffer(client_id + ':' + client_secret).toString('base64')) },
        form: {
            grant_type: 'refresh_token',
            refresh_token: refresh_token
        },
        json: true
    };

    request.post(authOptions, function(error, response, body) {
        if (!error && response.statusCode === 200) {
            let access_token = body.access_token;
            res.send({
                'access_token': access_token
            });
        }
    });
});

console.log('Listening on 4444');
app.listen(4444);

/*
Use Audio Analysis and Audio Features. Audio Features gives you general information about the entire
song (danceability, energy, key, loudness, etc.). Within Audio Analysis, use the Segments array for
information on sections of the son (loudness, pitch, etc).
 */