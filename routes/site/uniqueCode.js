const { Parser }        = require('json2csv');
const siteMw            = require('../../middleware/site');
const uniqueCodeMw      = require('../../middleware/uniqueCode');
const userClientMw      = require('../../middleware/userClient');
const userApiUrl        = process.env.USER_API;

const uniqueCodeApi     = require('../../services/uniqueCodeApi');
const maxCodesAllowed   = parseInt(process.env.MAX_UNIQUE_CODES_PER_BATCH) || 250000;

module.exports = function(app){
  /**
   * Display all unique codes
   */
  app.get(
    '/admin/site/:siteId/unique-codes',
    siteMw.withOne,
    siteMw.addAuthClientId,
    userClientMw.withOneForSite,
    uniqueCodeMw.withAllForClient,
    uniqueCodeMw.getGeneratorStatus,
    (req, res) => {
      res.render('site/unique-codes.html', {
        apiUrl: `${process.env.APP_URL}/admin/site/${req.site.id}/api/unique-codes`,
        appUrl: process.env.APP_URL
      });
    }
  );

  /**
   * UniqueCode API proxy so it works for AJAX datatables
   */
  app.get('/admin/site/:siteId/api/unique-codes',
    siteMw.withOne,
    siteMw.addAuthClientId,
    userClientMw.withOneForSite,
    uniqueCodeMw.withAllForClient,
    (req, res) => { res.json(req.uniqueCodes); }
  );

  /**
   * Display form for creating uniqueCodes
   */
  app.get('/admin/site/:siteId/unique-code',
    siteMw.withOne,
    siteMw.addAuthClientId,
    userClientMw.withOneForSite,
    uniqueCodeMw.withAllForClient,
    (req, res) => { res.render('site/unique-code-form.html', {appUrl: process.env.APP_URL}); }
  );

  /**
   * Create & generate unique voting codes in bulk
   */
  app.post('/admin/site/:siteId/unique-codes/bulk',
    siteMw.withOne,
    siteMw.addAuthClientId,
    userClientMw.withOneForSite,
    uniqueCodeMw.withAllForClient,
    (req, res) => {

      let amountOfCodes = parseInt(req.body.amountOfCodes);

      // don't allow above certain nr of codes
      if (amountOfCodes > maxCodesAllowed) {
        let message = 'Je kunt niet meer dan ' + maxCodesAllowed + ' codes in één keer aanmaken';
        req.flash('error', { msg: message});
        req.session.save( () => {
          return res.redirect(req.header('Referer')  || appUrl);
        });
      }
      
      // create codes in the background
      uniqueCodeApi.create({clientId: req.authClientId, amount: req.body.amountOfCodes})
        .then(function (response) {
          if (response.taskId) {
            let session = req.session;
            session.uniqueCodeGenerator = { taskId: response.taskId };
            console.log(session);
            return session.save();
          }
        })
        .then(function (response) {
          req.flash('success', { msg: 'Codes worden aangemaakt!'});
          req.session.save( () => {
            res.redirect(`${appUrl}/admin/site/${req.site.id}/unique-codes`  || appUrl);
          });
        })
        .catch(function (err) {
          console.log('Create bulk codes error:', err);
          let message = err && err.error && err.error.message ?  'Er gaat iets mis: '+ err.error.message : 'Er gaat iets mis!';
          req.flash('error', { msg: message});
          req.session.save( () => {
            res.redirect(req.header('Referer')  || appUrl);
          });
        });
    }
  );

  /**
   * Export unique voting codes to CSV
   */
  app.get('/admin/site/:siteId/unique-codes/export',
    siteMw.withOne,
    siteMw.addAuthClientId,
    userClientMw.withOneForSite,
    uniqueCodeMw.withAllForClient,
    (req, res, next) => {
      const json2csvParser = new Parser(Object.keys(req.uniqueCodes.data[0]));
      const csvString = json2csvParser.parse(req.uniqueCodes.data);

    //  const csvString = csvParser(req.uniqueCodes);
      const filename = `codes-${req.params.siteId}-${new Date().getTime()}.csv`;
      res.setHeader(`Content-disposition`, `attachment; filename=${filename}`);
      res.set('Content-Type', 'text/csv');
      res.status(200).send(csvString);
  });

  /**
   * Delete a unique code
   */
  app.get('/admin/site/:siteId/unique-code/delete/:uniqueCodeId',
      siteMw.withOne,
      siteMw.addAuthClientId,
      userClientMw.withOneForSite,
      uniqueCodeMw.withAllForClient,
      (req, res) => {
      uniqueCodeApi
        .delete(req.params.uniqueCodeId)
        .then(() => {
          req.flash('success', { msg: 'Verwijderd!'});
          req.session.save( () => {
            res.redirect(req.header('Referer')  || appUrl);
          });
        })
        .catch((err) => {
          let message = err && err.error && err.error.message ?  'Er gaat iets mis: '+ err.error.message : 'Er gaat iets mis!';
          req.flash('error', { msg: message});
          req.session.save( () => {
            res.redirect(req.header('Referer')  || appUrl);
          });
        });
    }
  );

  /**
   * Reset a unique code, so the userID connected to it will be removed, making voting available again
   * It doesn't delete the vote
   */
  app.get('/admin/unique-code/reset/:uniqueCodeId',
    uniqueCodeMw.withOne,
    (req, res) => {
      uniqueCodeApi
        .reset(req.params.uniqueCodeId)
        .then(() => {
          req.flash('success', { msg: 'Verwijderd!'});
          req.session.save( () => {
            res.redirect(req.header('Referer')  || appUrl);
          });
        })
        .catch((err) => {
          let message = err && err.error && err.error.message ?  'Er gaat iets mis: '+ err.error.message : 'Er gaat iets mis!';
          req.flash('error', { msg: message});
          req.session.save( () => {
            res.redirect(req.header('Referer')  || appUrl);
          });
        });
    }
  );
}
