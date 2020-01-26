const { Parser }        = require('json2csv');
const siteMw            = require('../../middleware/site');
const uniqueCodeMw      = require('../../middleware/uniqueCode');
const userClientMw      = require('../../middleware/userClient');
const userApiUrl        = process.env.USER_API;

const uniqueCodeApi     = require('../../services/uniqueCodeApi');
const maxCodesAllowed   = 120000;

module.exports = function(app){
  /**
   * Display all unique codes
   */
  app.get('/admin/site/:siteId/unique-codes',
    siteMw.withOne,
    siteMw.addAuthClientId,
    userClientMw.withOneForSite,
    uniqueCodeMw.withAllForClient,
    (req, res) => {
      res.render('site/unique-codes.html', {
        apiUrl: `/admin/site/${req.site.id}/api/unique-codes`
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
    (req, res) => { res.render('site/unique-code-form.html'); }
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
      const amountOfCodes = req.body.amountOfCodes;

      // For performance reasons don't allow above certain nr of codes
      if (amountOfCodes > maxCodesAllowed) {
        throw new Error('Trying to make too many unique codes');
      }

      //
      uniqueCodeApi.create({clientId: req.authClientId, amount: req.body.amountOfCodes})
        .then(function (response) {
          req.flash('success', { msg: 'Codes aangemaakt!'});
          res.redirect('/admin/site/'+req.site.id+'/unique-codes'  || appUrl);
        })
        .catch(function (err) {
          let message = err && err.error && err.error.message ?  'Er gaat iets mis: '+ err.error.message : 'Er gaat iets mis!';
          req.flash('error', { msg: message});
          res.redirect(req.header('Referer')  || appUrl);
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
          res.redirect(req.header('Referer')  || appUrl);
        })
        .catch((err) => {
          let message = err && err.error && err.error.message ?  'Er gaat iets mis: '+ err.error.message : 'Er gaat iets mis!';
          req.flash('error', { msg: message});
          res.redirect(req.header('Referer')  || appUrl);
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
          res.redirect(req.header('Referer')  || appUrl);
        })
        .catch((err) => {
          let message = err && err.error && err.error.message ?  'Er gaat iets mis: '+ err.error.message : 'Er gaat iets mis!';
          req.flash('error', { msg: message});
          res.redirect(req.header('Referer')  || appUrl);
        });
    }
  );
}
