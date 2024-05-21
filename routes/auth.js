const apiUrl = process.env.API_URL;
const appUrl = process.env.APP_URL;
const siteId = process.env.SITE_ID;

module.exports = function(app){
  app.get('/admin/login', (req, res, next) => {
    res.render('login.html', {
      appUrl
    });
  });

  app.get('/admin/oauth/login', (req, res, next) => {
    const fullUrl = appUrl + '/admin' //+ req.originalUrl;
    const redirectUrl = `${apiUrl}/oauth/site/${siteId}/login?redirectUrl=${fullUrl}&forceNewLogin=1`;
    res.redirect(redirectUrl);
  });

  app.get('/admin/logout', (req, res, next) => {
    req.session.destroy(() => {
      res.redirect(appUrl);
    });
  });
};
