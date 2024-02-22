// const apiUrl  = process.env.API_URL;
// for local debugging, use:
const apiUrl = "http://app-openstad-api"
const siteId  = process.env.SITE_ID;
const fetch   = require('node-fetch');

const fetchUserData = async(req, res, next) => {
  console.log("==> fetchUserData wordt aangeroepen, met deze req.query:", req.query)
  const jwt = req.query.jwt ? req.query.jwt : req.session.jwt;
  console.log("==> daar wordt deze jwt uit gehaald:", jwt)
  if (!jwt) {
    console.log("==> Geen jwt gevonden")
    next();
  } else {
    console.log("==> Dit zit er in de headers:", req.headers)
    const thisHost = req.headers['x-forwarded-host'] || req.get('host');
    const fullUrl = req.protocol + '://' + thisHost;
    console.log("==> thisHost wordt dan:", thisHost)
    console.log("==> deze fetch gaat gedaan worden, op url:", `${apiUrl}/oauth/site/${siteId}/me`)
    try {
      let response = await fetch(`${apiUrl}/oauth/site/${siteId}/me`, {
        headers: {
            'Accept': 'application/json',
            "X-Authorization" : `Bearer ${jwt}`,
            "Cache-Control": "no-cache"
        },
        method: 'GET',
      })
      if (!response.ok) {
        console.log(response);
        throw new Error('Fetch failed')
      }

      let user = await response.json();

      if (user) {
        console.log("==> user gevonden:", user)
        req.user = user
        res.locals.user = user;
        return next();
      } else {
        console.log("==> geen user gevonden")
        req.session.jwt = '';

        req.session.save(() => {
          return res.redirect('/');
        })
      }

    } catch(err) {
      // if not valid clear the JWT and redirect
      console.log("==> error afgevangen: if not valid clear the JWT and redirect")
      req.session.jwt = '';
      req.session.save(() => {
        res.redirect('/');
        return;
      })
    }

  }
}

const ensureRights = (req, res, next) => {
   //if (req.user && req.user.role === 'admin')
  if (req.isAuthenticated && req.user && req.user.role === 'admin') {
    next();
  } else {
    req.session.destroy(() => {
      let url = '/admin/login'
      // Set complete URL including domain for Amsterdam Azure implementation - 31415
      url = process.env.APP_URL + '/' + url
      //req.flash('error', { msg: 'Sessie is verlopen of de huidige account heeft geen rechten'});
      if (req.originalUrl !== url) {
        res.redirect(url);
      }
    });
  }
}

const ensureAuthenticated = (req, res, next) => {
  if (req.isAuthenticated) {
    next();
  } else {
    let url = '/admin/login'
      // Set complete URL including domain for Amsterdam Azure implementation - 31415
      url = process.env.APP_URL + '/' + url
    if (req.originalUrl !== url) {
      res.redirect(url);
    } else {
      next();
    }
  }
};

const check = (req, res, next) => {
  const jwt = req.query.jwt;

  if (req.query.jwt) {
    req.session.jwt = req.query.jwt;
    req.isAuthenticated = true;

    req.session.save(() => {
      // redirect to remove JWT from url, otherwise browser history will save JWT, allowing people to login.
      res.redirect('/');
    })

  } else {
    /**
     * Add user call to make sure it's an active JWT.
     */
    req.isAuthenticated = !!req.session.jwt;
    next();
  }
};


exports.check = check;
exports.fetchUserData = fetchUserData;
exports.ensureAuthenticated = ensureAuthenticated;
exports.ensureRights = ensureRights;
