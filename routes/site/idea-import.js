const multer            = require('multer');
const upload            = multer();

/**
 * Import middleware
 */
const ideaMw            = require('../../middleware/idea');
const siteMw            = require('../../middleware/site');

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
const appUrl = process.env.APP_URL;
const siteId = process.env.SITE_ID;

module.exports = function(app){

  /**
   * Import ideas by CSV
   */
  app.post('/admin/site/:siteId/idea/import',
    siteMw.withOne,
    upload.single('import_file'),
    (req, res) => {
      const csvString = req.file.buffer.toString('utf8');
      const lines = csvToObject(csvString);
      const promises = [];

      /**
       * Create a promise to create an idea
       */
      lines.forEach((line) => {
    //    console.log('line', line);

        //format image from string to array
        line.images = line.images ? line.images.split(',') : [];
        //format location from 2 strings to 1 object
        //
        if (line.location_lat && line.location_long) {
          line.location = JSON.stringify({"type":"Point","coordinates":[line.location_lat, line.location_long]});
        }

        const data = pick(line, ideaFields.filter(field => !field.extraData).map(field => field.key));


        data.extraData = pick(line, ideaFields.filter(field => field.extraData).map(field => field.key));
        data.extraData = data.extraData ? data.extraData : {};  //      console.log('data', data);
        promises.push(ideaApi.create(req.session.jwt, req.params.siteId, data));
      });

      /**
       * Import all promises
       */
      Promise.all(promises)
        .then(function (response) {
          req.flash('success', { msg: 'Geimporteerd!'});
          req.session.save( () => {
            res.redirect(`${appUrl}/admin/site/${req.params.siteId}/ideas`);
            //      res.redirect(redirectTo);
          });
        })
        .catch(function (err) {
          console.log('errerrerrerr', err);
          let message = err && err.error && err.error.message ?  'Er gaat iets mis: '+ err.error.message : 'Er gaat iets mis!';
          req.flash('error', { msg: message});
          req.session.save( () => {
            res.redirect(req.header('Referer')  || appUrl);
          });
        });
    }
  );
}
