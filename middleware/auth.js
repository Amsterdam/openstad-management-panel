const apiUrl  = process.env.API_URL;
const siteId  = process.env.SITE_ID;
const fetch   = require('node-fetch');

const fetchUserData = async(req, res, next) => {
  const jwt = req.query.jwt ? req.query.jwt : req.session.jwt;
  if (!jwt) {
    next();
  } else {
    const thisHost = req.headers['x-forwarded-host'] || req.get('host');
    const fullUrl = req.protocol + '://' + thisHost;
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
        req.user = user
        res.locals.user = user;
        return next();
      } else {
        req.session.jwt = '';

        req.session.save(() => {
          return res.redirect(process.env.APP_URL);
        })
      }

    } catch(err) {
      // if not valid clear the JWT and redirect
      req.session.jwt = '';
      req.session.save(() => {
        res.redirect(process.env.APP_URL);
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
      const url = `${process.env.APP_URL}/admin/login`
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
    const url = `${process.env.APP_URL}/admin/login`
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
      res.redirect(process.env.APP_URL);
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
