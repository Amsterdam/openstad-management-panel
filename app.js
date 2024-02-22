// Load environment variables from .env file
var dotenv = require('dotenv');
dotenv.load();
const express           = require('express');
const i18n              = require("i18n");
const bodyParser        = require('body-parser');
const cookieParser      = require('cookie-parser');
const expressSession    = require('express-session')
const nunjucks          = require('nunjucks');
const flash             = require('express-flash');
const app               = express();
const FileStore         = require('session-file-store')(expressSession);
const auth              = require('basic-auth');
const compare           = require('tsscmp');
const MongoStore        = require('connect-mongo')(expressSession);

//middleware
const siteMw            = require('./middleware/site');
const enrichMw          = require('./middleware/enrich');
const authMw            = require('./middleware/auth');
const bodyMw            = require('./middleware/body');
const csurf             = require('csurf');

const dateFilter                  = require('./nunjucks/dateFilter');
const currencyFilter              = require('./nunjucks/currency');
const limitTo                     = require('./nunjucks/limitTo');
const jsonFilter                  = require('./nunjucks/json');
const timestampFilter             = require('./nunjucks/timestamp');
const replaceIdeaVariablesFilter  = require('./nunjucks/replaceIdeaVariables');

const cdns = require('./services/cdns');

const mongoCredentials = {
  host: process.env.MONGO_DB_HOST || 'localhost',
  port: process.env.MONGO_DB_PORT || 27017,
};

const url = 'mongodb://'+ mongoCredentials.host +':'+mongoCredentials.port+'/db-sessions';

/*
const sessionStore =  new MongoStore({
    url: url,
    ttl: 14 * 24 * 60 * 60 // = 14 days. Default
})
*/

const sessionStore = new FileStore;

const apiUrl = process.env.API_URL;
const appUrl = process.env.APP_URL;
const siteId = process.env.SITE_ID;

//app.set('views', __dirname + '/templates');

const nunjucksEnv = nunjucks.configure('templates', {
  autoescape: true,
  express: app
});

app.set('trust proxy', true);

app.use((req, res, next) => {
  console.log(`==> [${new Date().toISOString()}] ${req.method} ${req.url}`);
  next();
});

const health = require('@cloudnative/health-connect');
let healthcheck = new health.HealthChecker();

app.use('/live', health.LivenessEndpoint(healthcheck));
app.use('/ready', health.ReadinessEndpoint(healthcheck));
app.use('/health', health.HealthEndpoint(healthcheck));

app.get('/', (req, res) => {
  let url = '/admin'

  // Set complete URL including domain for Amsterdam Azure implementation - 31415
  url = process.env.APP_URL + '/' + url

  res.redirect(url);
});

// redirect the index page to the admin section
app.use('/admin', (req, res, next) => {
  const unauthorized = (req, res) => {
      var challengeString = 'Basic realm=OpenstadAdmin';
      res.set('WWW-Authenticate', challengeString);
      return res.status(401).send('Authentication required.');
  }

  const basicAuthUser = process.env.BASIC_AUTH_USER;
  const basicAuthPassword = process.env.BASIC_AUTH_PASSWORD;


  if (basicAuthUser && basicAuthPassword) {
    var user = auth(req);

    if (!user || !compare(user.name, basicAuthUser) || ! compare(user.pass, basicAuthPassword)) {
      unauthorized(req, res);
    } else {
      next();
    }
  } else {
    next();
  }
});


app.use((req, res, next) => {
  dateFilter.setDefaultFormat('DD-MM-YYYY HH:mm');
  nunjucksEnv.addFilter('date', dateFilter);
  nunjucksEnv.addFilter('currency', currencyFilter);
  nunjucksEnv.addFilter('limitTo', limitTo);
  nunjucksEnv.addFilter('json', jsonFilter);
  nunjucksEnv.addFilter('timestamp', timestampFilter);
  nunjucksEnv.addFilter('replaceIdeaVariables', replaceIdeaVariablesFilter);
  next();
});

app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json({ limit: '200mb' }));
app.use(bodyMw.parseBoolean);

app.use(express.static('public'));

app.use(cookieParser(process.env.COOKIE_SECRET, {
  path: '/',
  maxAge:  3600000 * 24 * 7 ,
  secure: process.env.COOKIE_SECURE_OFF === 'yes' ? false : true,
  httpOnly: true,
  sameSite: false
}));

const sessionSettings = {
  saveUninitialized : true,
  resave            : true,
  secret            : process.env.SESSION_SECRET,
  //store             : new MemoryStore(),
  key               : 'authorization.sid',
  cookie            : {
    maxAge:  3600000 * 24 * 7 ,
    secure: process.env.COOKIE_SECURE_OFF === 'yes' ? false : true,
    httpOnly: true,
    sameSite: false,
    path: '/'
  },
  store: sessionStore
};

// Session Configuration
app.use(expressSession(sessionSettings));

i18n.configure({
    locales:['nl', 'en'],
    directory: __dirname + '/locales'
});

app.use(i18n.init);
app.use(flash());
app.use(enrichMw.run);

// Routes before csrf
require('./routes/image-proxy')(app);

// add csrf protection and token to global
app.use(
  csurf({
    cookie: {
      httpOnly: true,
      secure: process.env.COOKIE_SECURE_OFF === 'yes' ? false : true,
      sameSite: true
    }
  }),
  (req, res, next) => {
    res.locals.csrfToken=  req.csrfToken();
    next();
  }
);

/**
 * Check if user is isAuthenticated and fetch data
 */
app.use(
  authMw.check,
  authMw.fetchUserData
);

require('./routes/auth')(app);

/**
 * Make sure user is isAuthenticated & has rights to access
 */
app.use('/admin',
  authMw.ensureAuthenticated,
  authMw.ensureRights
);


/**
 * Display admin start page
 */
app.get('/admin',
  siteMw.withAll,
  (req, res) => {
    res.render('overview.html', {
    sites: req.sites
  });
});

/**
 * Required main routes.
 */
require('./routes/site/beta')(app);
require('./routes/site/idea-export')(app);
require('./routes/site/idea-import')(app);
require('./routes/site/uniqueCode')(app);
require('./routes/site/user-api')(app);
require('./routes/site/votes')(app);
require('./routes/site/newsletter.js')(app);
require('./routes/site/sites-with-issues')(app);
require('./routes/locks')(app);
require('./routes/user')(app);
require('./routes/server')(app);
require('./routes/site/idea')(app);
require('./routes/site/site')(app);
require('./routes/api-proxy')(app);

app.listen(process.env.PORT, function() {
  console.log('Express server listening on port ' + process.env.PORT);
});

async function start() {
  let openstadReactAdminCdn = await cdns.contructReactAdminCdn();
  app.set('openstadReactAdminCdn', openstadReactAdminCdn);
  module.exports = app;
} 

start();
