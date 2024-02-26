//Import middleware
const siteMw            = require('../../middleware/site');

module.exports = function(app){

  /**
   * display react admin
   */
  app.get('/admin/site/:siteId/beta',
    siteMw.withOne,
    (req, res) => {
      let openstadReactAdminCdn = app.get('openstadReactAdminCdn');
      res.render('site/beta.html', {
        openstadReactAdminCdn,
        appUrl: process.env.APP_URL
      });
    }
  );

}
