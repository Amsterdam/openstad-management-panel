const slugify             = require('slugify');
const nestedObjectAssign  = require('nested-object-assign');
const { Parser }          = require('json2csv');

//middleware
const ideaMw            = require('../../middleware/idea');
const siteMw            = require('../../middleware/site');
const voteMw            = require('../../middleware/vote');
const userClientMw      = require('../../middleware/userClient');
const newsletterMw      = require('../../middleware/newsletter');
//services
const userClientApi     = require('../../services/userClientApi');
const siteApi           = require('../../services/siteApi');
//utils
const pick              = require('../../utils/pick');
//ENV constants
const apiUrl            = process.env.API_URL;
const appUrl            = process.env.APP_URL;
const siteId            = process.env.SITE_ID;

const siteFields        = [{key: 'title'}];
const siteConfigFields  = [{key: 'basicAuth'}];

const authFields                  = [{key: 'name'}, {key: 'requiredUserFields'}, {key: 'authTypes'}];
const deleteMongoDb               = require('../../services/mongo').deleteDb;
const userApiSettingFields        = require('../../config/auth').userApiSettingFields;
const userApiRequiredFields       = require('../../config/auth').userApiRequiredFields;
const siteConfigSchema            = require('../../config/site').configSchema;

const cleanUrl = (url) => {
  return url.replace('http://', '').replace('https://', '').replace(/\/$/, "");
}

const ensureUrlHasProtocol = (url) => {
  if (!url.startsWith('http://') && !url.startsWith('https://')) {
    // if no protocol, assume https
    url = 'https://' + url;
  }

  return url;
}


module.exports = function(app){

  /**
   * Display all newsletter subscribers
   */
  app.get('/admin/site/:siteId/newsletter-subscribers',
    siteMw.withOne,
    userClientMw.withOneForSite,
    newsletterMw.allForSite,
    (req, res, next) => {
      res.render(`site/newsletter-subscribers.html`, {
        appUrl: process.env.APP_URL
      });
    }
  );

  /**
   * Export all newsletter subscribers
   */
  app.get('/admin/site/:siteId/newsletter-subscribers/export',
    siteMw.withOne,
    userClientMw.withOneForSite,
    newsletterMw.allForSite,
    (req, res, next) => {
      if (req.newsletterSubsribers.length === 0) {
        req.flash('error', { msg: 'No subscribers to export'});
        req.session.save( () => {
          res.redirect(req.header('Referer'));
        });
      } else {
        const exportHeaders = [
          {key: 'id', label: 'ID'},
          {key: 'firstName', label: 'First name'},
          {key: 'lastName', label: 'Last Name'},
          {key: 'email', label: 'Email'},
          {key: 'createdAt', label: 'Subscribed at'},
        ];

        let extraDataKeys = {};
        let formattedSubscribers = [];
        if (req.newsletterSubsribers ) {

          req.newsletterSubsribers.forEach((subscriber) => {
            if (subscriber.extraData) {
              Object.keys(subscriber.extraData).forEach(key => {
                extraDataKeys[key] = true;
              });
            }
          });
          extraDataKeys = Object.keys(extraDataKeys);
          extraDataKeys.forEach(key => {
            exportHeaders.push({ key: `extraData.${key}`, label: `extraData.${key}`, extraData: true, extraDataKey: key })
          });

          

          formattedSubscribers = req.newsletterSubsribers.map((subscriber) => {
            const formattedSubscriber = {};
            exportHeaders.forEach((header) => {
              formattedSubscriber[header.key] = header.extraData && subscriber.extraData ? subscriber.extraData[header.extraDataKey] : subscriber[header.key];
            });
            return formattedSubscriber;
          });
        }

        const json2csvParser = new Parser();
        const csvString = json2csvParser.parse(formattedSubscribers);

      //  const csvString = csvParser(req.uniqueCodes);
        const filename = `subscribers-${req.params.siteId}-${new Date().getTime()}.csv`;
        res.setHeader(`Content-disposition`, `attachment; filename=${filename}`);
        res.set('Content-Type', 'text/csv');
        res.status(200).send(csvString);
      }
  });
}
