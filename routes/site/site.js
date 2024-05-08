const tmpDir = process.env.TMPDIR || './tmp';

const slugify           = require('slugify');
const fs                = require('fs').promises;
const tar               = require('tar');
const fetch             = require('node-fetch');
const multer            = require('multer');
const storage = multer.memoryStorage();
const upload            = multer({ storage: storage});

//middleware
const ideaMw            = require('../../middleware/idea');
const externalSiteMw    = require('../../middleware/externalSite');
const siteMw            = require('../../middleware/site');
const voteMw            = require('../../middleware/vote');
const userClientMw      = require('../../middleware/userClient');
const roleClientMw      = require('../../middleware/role');
const requestSiteValidation = require('../../middleware/request/validation/site');

//services
const userClientApi     = require('../../services/userClientApi');
const siteApi           = require('../../services/siteApi');
const openstadSiteDataService = require('../../services/openstad/openstadSiteDataService');
const k8Ingress = require('../../services/k8/ingress');

//models
const NewSite = require('../../services/openstad/models/newSite');

//ENV constants
const apiUrl            = process.env.API_URL;
const appUrl            = process.env.APP_URL;
const siteFields        = [{key: 'title'}];

const deleteMongoDb               = require('../../services/mongo').deleteDb;

const userApiSettingFields        = require('../../config/auth').userApiSettingFields;
const userApiRequiredFields       = require('../../config/auth').userApiRequiredFields;
const twoFactorConfigureFields    = require('../../config/auth').twoFactorConfigureFields;
const twoFactorValidateFields     = require('../../config/auth').twoFactorValidateFields;

const siteConfigSchema            = require('../../config/site').configSchema;

const cleanUrl                = require('../../utils/cleanUrl');
const ensureUrlHasProtocol    = require('../../utils/ensureUrlHasProtocol');
const formatBaseDomain        = require('../../utils/formatBaseDomain');



const formatDomainFromBody = (req, res, next) => {
  //main-domain + subdir
  let domain;

  if (req.body['domain-type'] === 'subdir') {
    domain = `${req.body['main-domain']}/${req.body.subdir}`;
  } else if (req.body['domain-type'] === 'subdomain') {
    domain = `${req.body.domain}.${process.env.WILDCARD_HOST}`;
  } else {
    domain = req.body.domain
  }

  const protocol = req.body.protocol || ( process.env.FORCE_HTTP ? 'http://' : 'https://' );
  domain = protocol + cleanUrl(domain);
  req.formattedDomain = domain;

  next();
}

module.exports = function(app){

  /**
   * Show new site form
   */
  app.get('/admin/site-new',
    siteMw.withAll,
    externalSiteMw.withAll,
    (req, res, next) => {
      res.render('site/new-form.html', {
        externalSites: req.externalSites, wildcardHost: process.env.WILDCARD_HOST,
        existingDomainsString: req.sites.map(site => site.domain).join(','),
        existingDomains: req.sites.map(site => site.domain),
        appUrl: process.env.APP_URL
      });
    }
  );

  /**
   * Show copy site form
   */
  app.get('/admin/site-copy',
    siteMw.withAll,
    (req, res, next) => {
      res.render('site/copy-form.html', {
        existingDomainsString: req.sites.map(site => site.domain).join(','),
        existingDomains: req.sites.map(site => site.domain),
        appUrl: process.env.APP_URL
      });
    }
  );
  
  /**
   * Show import site form
   */
  app.get('/admin/site-import',
    siteMw.withAll,
    (req, res, next) => {
      res.render('site/import-form.html', {
        existingDomainsString: req.sites.map(site => site.domain).join(','),
        existingDomains: req.sites.map(site => site.domain),
        appUrl: process.env.APP_URL
      });
    }
  );

  /**
   * Show site overview dashboard
   */
  app.get('/admin/site/:siteId',
    ideaMw.allForSite,
    siteMw.withOne,
    voteMw.allForSite,
    siteMw.addStats,
    userClientMw.withOneForSite,
    (req, res, next) => {
      res.render('site/main.html', {
        appUrl: process.env.APP_URL
      });
    }
  );

  /**
   * Generic handling of pages, will look for template from url parameter
   */
  app.get('/admin/site/:siteId/:page',
    siteMw.withOne,
    ideaMw.allForSite,
    roleClientMw.withAll,
    userClientMw.withOneForSite,
    (req, res, next) => {
      res.render(`site/${req.params.page}.html`,  {
        siteConfigSchema: siteConfigSchema,
        pageName: req.params.page,
        userApiSettingFields: userApiSettingFields,
        userApiRequiredFields: userApiRequiredFields,
        twoFactorConfigureFields: twoFactorConfigureFields,
        twoFactorValidateFields: twoFactorValidateFields,
        appUrl: process.env.APP_URL
      });
    }
  );

  /**
   * Generic handling of pages, will look for settngs template from url parameter
   */
  app.get('/admin/site/:siteId/settings/:page',
    siteMw.withOne,
    ideaMw.allForSite,
    userClientMw.withOneForSite,
    (req, res, next) => {
      res.render(`site/settings/${req.params.page}.html`, {
        siteConfigSchema: siteConfigSchema,
        ideaFields: siteConfigSchema.ideas,
        anonymizeFields: siteConfigSchema.anonymize,
        pageName: req.params.page,
        appUrl: process.env.APP_URL
      });
    }
  );

  /**
   * Copy a site
   */
  app.post('/admin/site/copy',
    formatDomainFromBody,
    async (req, res, next) => {
      try {

        // domain
        const domain = req.formattedDomain;
        const siteIdToCopy = req.body.siteIdToCopy;
        const shouldCopyUsersAndRights = req.body.copyUsers;

        // collect data
        const newSite = new NewSite(domain, req.body.siteName, req.body.fromEmail, req.body.fromName);
        let siteData = await openstadSiteDataService.collectData({
          uniqueSiteId: newSite.getUniqueSiteId(),
          siteIdToCopy: siteIdToCopy,
          includeChoiceGuide: req.body['choice-guides'],
          includeCmsAttachments: true
        });

        // write attachments to tmp dir
        let exportDir = tmpDir + '/' + newSite.getUniqueSiteId();
        if (siteData.cmsData.attachments && siteData.cmsData.attachments.length) {
          let tmpData = { cmsData: { attachments: siteData.cmsData.attachments } };
          console.log(siteData.apiData.site.domain);
          console.log(`=====> tmpData in copy site function: ${tmpData}`)
          let err = await openstadSiteDataService.writeDataToTmpDir({ exportDir, siteData: tmpData, fromDomain: siteData.apiData.site.domain });
          if (err) throw err;
        }

        // create site
        console.log('creating new site :', newSite.title );

        const site = await openstadSiteDataService.createSite({
          user: req.user, 
          dataDir: exportDir,
          newSite, 
          apiData: siteData.apiData, 
          cmsData: siteData.cmsData, 
          oauthData: siteData.oauthData
        });

        if(shouldCopyUsersAndRights) {
          await openstadSiteDataService.copyUsersOfSite(siteIdToCopy, site.id);
        }

        await k8Ingress.ensureIngressForAllDomains();

        // reset site config in frontend
        // api does this, but will fail on url change because new site wont exists yet if ingress is still being created
        if (process.env.FRONTEND_URL) {
            await fetch(process.env.FRONTEND_URL + '/config-reset')
        }

        req.flash('success', { msg: 'De site is succesvol aangemaakt'});
        req.session.save( () => {
            res.redirect(`${process.env.APP_URL}/admin/site/${site.id}`)
        });

      } catch (error) {
        console.error(error);
        req.flash('error', { msg: 'Het is helaas niet gelukt om de site aan te maken.'});
        req.session.save( () => {
          res.redirect('back');
        });
      }
    }
  );

  /**
   * Import a site
   */
  app.post(
    '/admin/site/import',
    siteMw.withAll,
    userClientMw.withAll,
    upload.single('import_file'),
    formatDomainFromBody,
    async (req, res, next) => {
      console.log("==> Reached the Import Site async function")
      try {

        // domain
        let domain = req.formattedDomain;
        const shouldCopyUsersAndRights = req.body.copyUsers;
        const siteIdToCopy = req.body.siteIdToCopy;

        // extract import file
        let importId = Math.round(new Date().getTime() / 1000);
        let importDir = tmpDir + '/' + importId;
        const err = await openstadSiteDataService.extractFileToTmpDir({ importDir, file: req.file, fileUrl: req.body.fileUrl });
        if (err) throw err;

        // collect data
        const newSite = new NewSite(domain, '', req.body.fromEmail, req.body.fromName, req.body.endDate);
        const siteData = await openstadSiteDataService.collectDataFromFiles(importDir);
        newSite.title = req.body.siteName;

        // create site
        console.log('creating new site :', newSite.title );
        const site = await openstadSiteDataService.createSite({
          user: req.user,
          dataDir: importDir,
          newSite, 
          apiData: siteData.apiData, 
          cmsData: siteData.cmsData, 
          oauthData: siteData.oauthData
        });

        if(shouldCopyUsersAndRights) {
          await openstadSiteDataService.copyUsersOfSite(siteIdToCopy, site.id);
        }

        await k8Ingress.ensureIngressForAllDomains()

          // reset site config in frontend
          // api does this, but will fail on url change because new site wont exists yet if ingress is still being created
          if (process.env.FRONTEND_URL) {
              await fetch(process.env.FRONTEND_URL + '/config-reset')
          }

        req.flash('success', { msg: 'De site is succesvol aangemaakt'});
        req.session.save( () => {
          res.redirect(`${process.env.APP_URL}/admin/site/${site.id}`);
        });
      } catch(error) {
        console.error(error);
        req.flash('error', { msg: 'Het is helaas niet gelukt om de site aan te maken'});
        req.session.save( () => {
          res.redirect('back');
        });
      }
    },
  );
  
  /**
   * Export a site
   */
  app.post(
    '/admin/site/:siteId/export',
    siteMw.withOne,
    async(req, res, next) => {

      try {
        
        // prepare
        console.log('Export prepare');
        let exportId = Math.round(new Date().getTime() / 1000);

        // collect data
        let siteData = await openstadSiteDataService.collectData({
          uniqueSiteId: exportId,
          siteIdToCopy: req.params.siteId,
          includeChoiceGuide: req.body['choice-guides'],
          includeCmsAttachments: req.body['cms-attachments']
        });

        // exists?
        let dbName = req.site.config && req.site.config.cms && req.site.config.cms.dbName;
        if (!dbName) throw new Error('Site not found');

        // write data
        let exportDir = tmpDir + '/' + exportId;
        let err = await openstadSiteDataService.writeDataToTmpDir({
          exportDir,
          siteData,
          fromDomain: req.site.domain,
        });
        if (err) throw err;

        // export tar - TODO: wegens consitent met import zou dit in openstadSiteDataService moeten
        let filename = tmpDir + '/' + exportId + '.export.tgz';
        await tar.create(
          {
            gzip: true,
            cwd: exportDir,
            file: filename,
          },
          ['.']);

        res.download(filename);

      } catch (err) {
        console.log('SITE EXPORT FAILED');
        console.log(err);
        req.flash('error', { msg: 'Het is helaas niet gelukt om de site te exporteren'});
        req.session.save( () => {
          res.redirect('back');
        });
      }

    }
  );

  /**
   * Edit config value of the site
   */
  app.post('/admin/site/:siteId(\\d+)',
    siteMw.withOne,
    siteMw.withAll,
    requestSiteValidation,
    (req, res, next) => {
      delete req.body.url;
      const siteConfigFields = Object.keys(siteConfigSchema);
      const siteData = req.site;

      if (siteFields) {
        siteFields.forEach((siteField) => {
          if (req.body[siteField.key]) {
            siteData[siteField.key] = req.body[siteField.key];
          }
        });
      }

      if (siteConfigFields && req.body.config) {
        siteConfigFields.forEach((siteConfigField) => {
          let fields = siteConfigSchema[siteConfigField];
          fields.forEach((field) => {
            if (req.body.config[siteConfigField]) {
              let value = req.body.config[siteConfigField][field.key];

              //check if not set (can be false in case of boolean or empty in case of a string)
              if (value || value === false || value === '') {
                // in case it's a number cast the type, otherwise api will not see it as valid
                if (field.type === 'number') {
                  value = parseInt(value, 10);
                }

                if (field.type === 'array') {
                  value = value.split(',').map((item) => {
                    return item.trim();
                  });
                }

                // in case it's a nested config value
                // for now just support one level deep
                // of course a recursive function would be pretyy
                if (field.parentKey) {
                  // if not set, create an empty object for the config section
                  if (!siteData.config[field.parentKey][siteConfigField]) {
                    siteData.config[field.parentKey][siteConfigField] = {};
                  }

                  siteData.config[field.parentKey][siteConfigField][field.key] = value;
                } else {
                  // if not set, create an empty object for the config section
                  if (!siteData.config[siteConfigField]) {
                    siteData.config[siteConfigField] = {};
                  }

                  siteData.config[siteConfigField][field.key] = value;
                }

              }
            }
          });
        })
      }

      siteApi
        .update(req.session.jwt, req.params.siteId, siteData)
        .then(async (site) => {
          req.flash('success', { msg: 'Aangepast!'});

          await k8Ingress.ensureIngressForAllDomains(req.sites)

          req.session.save( () => {
            res.redirect(req.header('Referer')  || appUrl);
          });
        })
        .catch((err) => { next(err) });
    }
  );


  /**
   * Edit url of the website, this has specific route because it needs to happen at specific points
   * @type {[type]}
   */
  app.post('/admin/site/:siteId/url',
    siteMw.withOne,
    siteMw.withAll,
    userClientMw.withOneForSite,
    (req, res, next) => {

      const siteData = req.site;
      const domain = cleanUrl(req.body.productionUrl).toLowerCase();
      const apiDomain = cleanUrl(apiUrl);

      // sites can run on domain.com/site1, but when checking domain should be only base domain
      const baseDomain = formatBaseDomain(domain);

      const domainWithProtocol = ensureUrlHasProtocol(req.body.productionUrl).toLowerCase();

      const promises = [];

      // set domain to site api
      // this probably should be changed names in future, since sites can also run under domain.com/subdir
      // url would be more fitting
      siteData.domain = domain;
    ///  siteData.config.cms.url = siteData.config.cms.url ? [domain] : [];


      siteData.config.allowedDomains = baseDomain ? [baseDomain] : [];
      // update CMS urls
      if (siteData.config.cms) {
        siteData.config.cms.url = domainWithProtocol;
        siteData.config.cms.domain =  domain;
        siteData.config.cms.hostname =  domain;
      }

      promises.push(siteApi.update(req.session.jwt, req.params.siteId, siteData));

      if (req.userApiClient)  {
        const clientData = req.userApiClient;
        clientData.allowedDomains = [domain, apiDomain];
        clientData.siteUrl = domainWithProtocol;
        clientData.redirectUrl = domainWithProtocol;
        clientData.config.backUrl = domainWithProtocol;
        promises.push(userClientApi.update(req.userApiClient.clientId, clientData));
      }


      /**
       * Import all promises
       */
      Promise.all(promises)
        .then(async function (response) {
          // make sure ingress update is done after the updates are done
          await k8Ingress.ensureIngressForAllDomains();

          // reset site config in frontend
          // api does this, but will fail on url change because new site wont exists yet if ingress is still being created
          if (process.env.FRONTEND_URL) {
            await fetch(process.env.FRONTEND_URL + '/config-reset')
          }


          req.flash('success', { msg: 'Url aangepast!'});
          req.session.save( () => {
            res.redirect(req.header('Referer')  || appUrl);
          });
        })
        .catch(function (err) {
          console.error(err);
          req.flash('error', { msg: 'Er gaat iets mis!'});
          req.session.save( () => {
            res.redirect(req.header('Referer')  || appUrl);
          });
        });

    }
  );


  /**
   * Edit url of the website, this has specific route because it needs to happen at specific points
   * @type {[type]}
   */
  app.post('/admin/site/:siteId/smtp',
    siteMw.withOne,
    userClientMw.withOneForSite,
    (req, res, next) => {

      const clientConfig =  clientData.config;

      const smtpSettings = {

      }

      clientConfig.smtp = smtpSettings;

      promises.push(userClientApi.update(req.userApiClient.clientId, clientData));

      if (process.env.KUBERNETES_NAMESPACE) {
        promises.push(k8Ingress.edit(domain));
      }

      /**
       * Import all promises
       */
      Promise.all(promises)
        .then(function (response) {
          req.flash('success', { msg: 'Aangepast!'});
          req.session.save( () => {
            res.redirect(req.header('Referer')  || appUrl);
          });
        })
        .catch(function (err) {
          console.error(err);
          req.flash('error', { msg: 'Er gaat iets mis!'});
          req.session.save( () => {
            res.redirect(req.header('Referer')  || appUrl);
          });
        });

    }
  );

  /**
   * Anonymize a website
   */
  app.post('/admin/site/:siteId/anonymize',
    siteMw.withOne,
    siteMw.withAll,
    siteMw.addAuthClientId,
    (req, res, next) => {

      const anonymizeActions = [
        siteApi.anonymize(req.session.jwt, req.params.siteId),
      ];

      Promise.all(anonymizeActions)
        .then((response) => {
          req.flash('success', { msg: 'Geannonimiseerd!'});
          req.session.save( () => {
            res.redirect(`${process.env.APP_URL}/admin`);
          });
        })
        .catch((err) => {
          console.log('ANONYMIZE WEBSITE FAILED');
          console.log(err);
          let message = err && err.error && err.error.message ?  'Er gaat iets mis: '+ err.error.message : 'Er gaat iets mis!';
          req.flash('error', { msg: message});
          req.session.save( () => {
            res.redirect(`${process.env.APP_URL}/admin`);
          });
        });
    }
  );


  /**
   * Delete a website
   * At the moment it's a hard delete of the mongodb database.
   * The api adds a flag "deletedAt" to the the row, but keeps the row,
   */
  app.post('/admin/site/:siteId/delete',
    siteMw.withOne,
    siteMw.withAll,
    siteMw.addAuthClientId,
    (req, res, next) => {

      siteApi
        .delete(req.session.jwt, req.params.siteId)
        .then( result => {
          if (req.site.config && req.site.config.cms && req.site.config.cms.dbName) {
            return deleteMongoDb(req.site.config.cms.dbName)
          } else {
            return 'Done'
          }
        })
        .then( result => {
          if (process.env.KUBERNETES_NAMESPACE) {
            k8Ingress.ensureIngressForAllDomains(req.sites);
          } else {
            return 'Done'
          }
        })
        .then( result => {
          req.flash('success', { msg: 'Verwijderd!'});
          req.session.save( () => {
            res.redirect(`${process.env.APP_URL}/admin`);
          });
        })
        .catch( err => {
          console.log('DELETE WEBSITE FAILED');
          console.log(err);
          let message = err && err.error && err.error.message ?  'Er gaat iets mis: '+ err.error.message : 'Er gaat iets mis!';
          req.flash('error', { msg: message});
          req.session.save( () => {
            res.redirect(`${process.env.APP_URL}/admin`);
          });
        });
    }
  );

}
