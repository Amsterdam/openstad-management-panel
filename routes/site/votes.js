const fetch = require('node-fetch');

//middleware
const ideaMw            = require('../../middleware/idea');
const siteMw            = require('../../middleware/site');
const voteMw            = require('../../middleware/vote');
const userClientMw      = require('../../middleware/userClient');

//ENV constants
const apiUrl            = process.env.API_URL;
const appUrl            = process.env.APP_URL;

module.exports = function(app) {
  /**
   * Display all votes
   */
  app.get('/admin/site/:siteId/votes',
    ideaMw.allForSite,
    siteMw.withOne,
    voteMw.allForSite,
    userClientMw.withOneForSite,
    (req, res, next) => {
      res.render(`site/votes.html`, {
        appUrl: process.env.APP_URL
      });
    }
  );

  /**
   * Call openstad API to toggle the validity of the vote
   * Used for invalidating real or test votes
   */
  app.get('/admin/site/:siteId/vote/:voteId/toggle',
    async (req, res, next) => {

      try {
        let response = await fetch(`${apiUrl}/api/site/${req.params.siteId}/vote/${req.params.voteId}/toggle`, {
          headers: {
            'Accept': 'application/json',
            "X-Authorization": process.env.SITE_API_KEY
          },
          method: 'GET',
        })
        if (!response.ok) {
          console.log(response);
          throw new Error('Fetch failed')
        }

        req.flash('success', { msg: 'Updated!'});
        req.session.save( () => {
          res.redirect(req.header('Referer')  || appUrl);
          return next();
        });

      } catch(err) {
        console.log(err);
        req.flash('error', { msg: 'Something whent wrong!'});
        req.session.save( () => {
          res.redirect(req.header('Referer')  || appUrl);
          return next();
        });
      }

    });
}
