//Import middleware
const ideaMw            = require('../../middleware/idea');
const siteMw            = require('../../middleware/site');
//services
const ideaApi           = require('../../services/ideaApi');
const csvToObject       = require('../../utils/csvToObject');
const pick              = require('../../utils/pick');

/**
 * Define the idea fields, used for import, create & update
 * @type {Array}
 */
const ideaFields        = [{key: 'title'}, {key: 'description'}, {key: 'summary'}, {key: 'location'}, {key: 'theme', extraData: true}, {key: 'area', extraData: true}, {key: 'images', extraData: true}, {key: 'status'}, {key: 'advice', extraData: true}, {key: 'ranking', extraData: true}, {key: 'originalId', extraData: true}, {key: 'budget', extraData: true, type:"number"}];

/**
 * Set the appclication values
 */
const apiUrl = process.env.API_URL;
const appUrl = process.env.APP_URL;
const siteId = process.env.SITE_ID;

module.exports = function(app){
  /**
   * Display Ideas import form
   */
  app.get('/admin/site/:siteId/idea/import',
    siteMw.withOne,
    (req, res) => {
      res.render('site/idea/import.html', {
        appUrl: process.env.APP_URL
      });
    }
  );

  /**
   * Display Idea edit form
   */
  app.get('/admin/site/:siteId/idea/:ideaId',
    ideaMw.oneForSite,
    siteMw.withOne,
    (req, res) => {
      res.render('site/idea/edit.html', {
        appUrl: process.env.APP_URL
      });
    }
  );

  /**
   * Update idea
   */
  app.post('/admin/site/:siteId/idea/:ideaId',
    siteMw.withOne,
    ideaMw.oneForSite,
    (req, res, next) => {
      const idea = req.idea ? req.idea : {};

      ideaFields.forEach((field) => {
        if (req.body && req.body[field.key]) {
          let value = req.body[field.key];

          //in case of a number, parse it to int
          if (field.type && field.type === 'number') {
            value = parseInt(value, 10);
          }

          //check if field should be saved to extraData or own column
          if (field.extraData) {
            if(!idea.extraData) {
              idea.extraData = {};
            }

            idea.extraData[field.key] = value;
          } else {
            idea[field.key] = value;
          }
        }
      });

      ideaApi
        .update(req.session.jwt, req.site.id, idea )
        .then(function (response) {
           const redirectTo = req.header('Referer')  || appUrl
           res.redirect(redirectTo);
        })
        .catch(function (err) {
           let message = err && err.error && err.error.message ?  'Er gaat iets mis: '+ err.error.message : 'Er gaat iets mis!';
          req.flash('error', { msg: message});
          req.session.save( () => {
            res.redirect(req.header('Referer')  || appUrl);
          });
        });
    }
  );

  /**
   * Delete an idea
   */
  app.post('/admin/site/:siteId/idea/:ideaId/delete',
    (req, res, next) => {
      ideaApi.delete(req.session.jwt, req.params.siteId, req.params.ideaId)
        .then(function (response) {
           res.redirect(`/admin/site/${req.params.siteId}/ideas`);
        })
        .catch(function (err) {
           res.redirect(req.header('Referer'));
        });
    }
  );

  /**
   * Create an idea
   */
  app.post('/admin/site/:siteId/idea',
    ideaMw.oneForSite,
    siteMw.withOne,
    (req, res, next) => {
      const idea = req.idea ? req.idea : {};

      ideaFields.forEach((field) => {
        if (req.body && req.body[field.key]) {
          let value = req.body[field.key];

          if (field.type && field.type === 'number') {
            value = parseInt(value, 10);
          }

          if (field.extraData) {
            if(!idea.extraData) {
              idea.extraData = {};
            }

            idea.extraData[field.key] = value;
          } else {
            idea[field.key] = value;
          }
        }
      });

      ideaApi
        .create(req.session.jwt, req.params.siteId, idea)
        .then(function (response) {
          req.flash('success', { msg: 'Aangemaakt!'});
          req.session.save( () => {
            res.redirect(`/admin/site/${req.params.siteId}/ideas`);
          });
        })
        .catch(function (err) {
          let message = err && err.error && err.error.message ?  'Er gaat iets mis: '+ err.error.message : 'Er gaat iets mis!';
          req.flash('error', { msg: message});
          req.session.save( () => {
            res.redirect(req.header('Referer')  || appUrl);
          });
        });
    }
  );

  /**
   * Display edit form
   */
  app.get('/admin/site/:siteId/idea/:ideaId',
    ideaMw.oneForSite,
    siteMw.withOne,
    (req, res) => {
      res.render('site/'+ req.params.page + '.html', {
        appUrl: process.env.APP_URL
      });
    }
  );
}
