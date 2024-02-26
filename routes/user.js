const userMw = require('../middleware/user');
const siteMw = require('../middleware/site');
const clientMw = require('../middleware/userClient');
const roleMw = require('../middleware/role');
const userApiService = require('../services/userApi');
const apiUrl = process.env.USER_API;

const formatAuthClientsForSite = (req, res, next) => {
  const userRoles = req.editUser && req.editUser.roles ?req.editUser.roles : false;
  const userApiClients = [];

  // first add admin panel at the top
  //

  const adminSiteId = process.env.SITE_ID;
  const adminClientId = process.env.USER_API_CLIENT_ID
  const adminClientSecret = process.env.USER_API_CLIENT_SECRET


  // add the admin client
  req.sites.forEach((site) => {
      const isAdminSite = parseInt(adminSiteId, 10) === site.id;
      if (isAdminSite || site.config && site.config.oauth) {
          const defaultClientCredentials = !isAdminSite && site.config.oauth.default ? site.config.oauth.default : site.config.oauth;

          if (isAdminSite || defaultClientCredentials && defaultClientCredentials["auth-client-id"]) {
          const clientId = isAdminSite ? adminClientId : defaultClientCredentials["auth-client-id"];
          const originalClient = req.userApiClients.find(client => client.clientId === clientId);

          if (originalClient) {
            //copy so multiple clients will not have same title becasue of reference
            const client = {...originalClient}
            // get user role for clien
            //make sure correct title;
            client.siteTitle =  isAdminSite ? 'Admin panel' : site.title;
            client.siteDomain =  site.domain;
            client.userRole =  userRoles ? userRoles.find(userRole => userRole.clientId === client.id) : {};

            delete client.config;

            userApiClients.push(client);

          }
        }
      }
  });

  res.locals.userApiClients = userApiClients;

  next();
}

module.exports = function(app){
  /**
   * Overview of users
   */
  app.get('/admin/users',
  //  userMw.withAll,
    (req, res) => {
      res.render('users/overview.html', {
        apiUrl: `/admin/api/users`,
        appUrl: process.env.APP_URL
      });
    }
  );

  /**
   * "Proxy" api so AJAX works
   */
  app.get('/admin/api/users',
    userMw.withAll,
    (req, res) => { res.json(req.users); }
  );

  /**
   * Show new user form
   */
  app.get('/admin/user',
    clientMw.withAll,
    siteMw.withAll,
    roleMw.withAll,
    formatAuthClientsForSite,
    (req, res) => {
      res.render('users/form.html', {
        appUrl: process.env.APP_URL
      });
    }
  );

  /**
   * Render edit form
   */
  app.get('/admin/user/:userId',
    clientMw.withAll,
    siteMw.withAll,
    roleMw.withAll,
    userMw.withOne,
    formatAuthClientsForSite,
    (req, res) => {
      res.render('users/form.html', {
        appUrl: process.env.APP_URL
      });
    }
  );

  /**
  * "Proxy" api so AJAX works in the overview datatables
   */
  app.post('/admin/user',
    (req, res) => {

      userApiService
        .create(req.body)
        .then((response) => {
          req.flash('success', { msg: 'Created user!' });
          req.session.save( () => {
            res.redirect('/admin/users');
          });
        })
        .catch((err) => {
          let message = err && err.error && err.error.message ?  'Er gaat iets mis: '+ err.error.message : 'Er gaat iets mis!';
          req.flash('error', { msg: message });
          req.session.save( () => {
            res.redirect('/admin/user');
          });
        })
    }
  );

  /**
   * Handle post for editing user
   */
  app.post('/admin/user/:userId',
    clientMw.withAll,
    roleMw.withAll,
    (req, res) => {
        if (req.body.twoFactorReset) {
            req.body.twoFactorConfigured = false;
            req.body.twoFactorToken = null;

            delete req.body.twoFactorReset;
        }
        
      userApiService
        .update(req.params.userId, req.body)
        .then((response) => {
          req.flash('success', { msg: 'Updated user!' });
          req.session.save( () => {
            res.redirect('/admin/user/' + req.params.userId);
          });
        })
        .catch((err) => {
          let message = err && err.error && err.error.message ?  'Er gaat iets mis: '+ err.error.message : 'Er gaat iets mis!';
          req.flash('error', { msg: message });
          req.session.save( () => {
            res.redirect('/admin/user/' + req.params.userId);
          });
        })
    }
  );

  /**
   * Handle deleting user
   */
  app.post('/admin/user/:userId/delete',
    (req, res) => {
      userApiService
        .delete(req.params.userId)
        .then((response) => {
          req.flash('success', { msg: 'Deleted user!' });
          req.session.save( () => {
            res.redirect('/admin/users');
          });
        })
        .catch((err) => {
          let message = err && err.error && err.error.message ?  'Er gaat iets mis: '+ err.error.message : 'Er gaat iets mis!';
          req.flash('error', { msg: message });
          req.session.save( () => {
            res.redirect('/admin/users');
          });
        })
    }
  );
}
