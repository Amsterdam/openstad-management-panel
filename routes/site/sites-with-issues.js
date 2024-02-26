const siteMw = require('../../middleware/site');

module.exports = function(app){

  /**
   * Overview of users
   */
  app.get(
    '/admin/sites-with-issues',
    siteMw.withAllWithIssues,
    async (req, res) => {

      let issues = {};
      req.sites.forEach(site => {
        issues[ site.issue ] = issues[ site.issue ] ? issues[ site.issue ] + 1 : 1;
      });
      issues = Object.keys(issues).map( key => { return { description: key, count: issues[key] } });
      
      res.render('sites-with-issues/overview.html', {
        sites: req.sites,
        issues,
        appUrl: process.env.APP_URL
      });
    }
  );

}
