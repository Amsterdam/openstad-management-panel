const fs = require('fs').promises;
const fetch = require('node-fetch');
const tar = require('tar');

const apiProvider = require('../../providers/apiProvider');
const cmsProvider = require('../../providers/cmsProvider');
const oauthProvider = require('../../providers/oauthProvider');

const siteApi = require('../siteApi');
const k8Ingress = require('../k8/ingress');

const SiteData = require('./models/siteData');

const lookupDns = require('../../utils/lookupDns');
const removeFolderRecursive = require('../../utils/removeFolderRecursive');

const protocol = process.env.FORCE_HTTP ? 'http' : 'https';



/**
 * Get all Openstad project data
 * @param uniqueSiteId
 * @param siteIdToCopy
 * @param includeChoiceGuide
 * @param includeCmsAttachments
 *
 * @returns {Promise<SiteData>}
 */
exports.collectData = async function({ uniqueSiteId, siteIdToCopy, includeChoiceGuide = false, includeCmsAttachments = true }) {

  const siteToCopy = await siteApi.fetch(siteIdToCopy);

  // TODO: Validate necessary site data.
  const [choiceGuides, attachments, oauthClients, mongoPath] = await Promise.all([
    includeChoiceGuide ? apiProvider.getChoiceGuides(siteToCopy.id) : null,
    includeCmsAttachments ? cmsProvider.getAttachments(siteToCopy.config && siteToCopy.config.cms && siteToCopy.config.cms.dbName) : null,
    oauthProvider.getData(siteToCopy.config && siteToCopy.config.oauth || {}),
    cmsProvider.exportDatabase(uniqueSiteId, siteToCopy.config.cms.dbName)
  ]);

  return new SiteData(siteToCopy, choiceGuides, attachments, mongoPath, oauthClients);

};

/**
 * Write all available openstad data to a directory
 * @param exportDir
 * @param SiteData
 * @param fromDomain
 *
 * @returns
 */
exports.writeDataToTmpDir = async function ({ exportDir, siteData, fromDomain }) {

  try {

    let accessError = await fs.access(exportDir);
    if (accessError) await fs.mkdir(exportDir);

    // export site data
    if (siteData.apiData) {
 
      await fs.mkdir(exportDir + '/api');
      await fs.writeFile(exportDir + '/api/site.json', JSON.stringify(siteData.apiData.site));

      // write choiceGuide to file
      if (siteData.apiData.choiceGuides) {
        await Promise.all(siteData.apiData.choiceGuides.map(async (choiceGuide) => {
          const json = JSON.stringify(choiceGuide);
          return await fs.writeFile(exportDir + `/api/choicesguide-${choiceGuide.id}.json`, json)
        }));
      }

    }
    
    // fetch attachments and write them to files
    if (siteData.cmsData.attachments) {
      await fs.mkdir(exportDir + '/attachments');
      // first: a check on dns is not a way to see if the domain is up and second: if it is not the fetching will fail; no need to check first
      // const domainIsUp = await lookupDns(fromDomain, 3000);
      // if (domainIsUp === false) {
      //   throw new Error('Not able to fetch attachments because the current site is down');
      // }
      const cmsUrl = protocol + '://' + fromDomain;
      await Promise.all(siteData.cmsData.attachments.map(async (filename) => {
        const res = await fetch(cmsUrl + '/uploads/attachments/' + filename)
        return await fs.writeFile(exportDir + '/attachments/' + filename, await res.buffer());
      }));
    }

    // export oauth clients
    if (siteData.oauthData) {
      await fs.mkdir(exportDir + '/oauth');
      await siteData.oauthData.clients.map(async (oauth) => {
        const {key, data} = oauth;
        const json = JSON.stringify(data);
        return await fs.writeFile(exportDir + '/oauth/' + key + '.json', json + '\n')
      });
    }

    // mv mongo export to export-dir/mongo
    if (siteData.cmsData.mongoPath) {
      await fs.rename(siteData.cmsData.mongoPath, exportDir + '/' + 'mongo');
    }

  } catch (err) {
    console.log('WRITEDATATOTMPDIR FAILED');
    console.log(err);
    return err;
  }

};

/**
 * Extract an import file to a directory
 * @param importDir
 * @param file
 * @param fileUrl
 *
 * @returns
 */
exports.extractFileToTmpDir = async function ({ importDir, file, fileUrl }) {

  try {

    // fetch file?
    if (fileUrl) {
      const fileContent = await fetch(fileUrl);
      let importId = Math.round(new Date().getTime() / 1000);
      file = {
        originalname: importId + '.tgz', // get file name from url
        buffer: await fileContent.buffer()
      }
    }

    // create import dir
    await fs.mkdir(importDir);

    // write file to import dir
    const filename = importDir + '/' + file.originalname;
    await fs.writeFile(filename, file.buffer);

    // untar import file
    await tar.extract(
      {
        cwd: importDir,
        file: filename,
      });


  } catch (err) {
    console.log('EXTRACTTARTOTMPDIR FAILED');
    console.log(err);
    return err;
  }

};

/**
 * Get all Openstad project data from import directory
 * @param dir
 *
 * @returns {Promise<void>}
 */

exports.collectDataFromFiles = async function(importDir) {

  const siteData = await fs.readFile(importDir + '/api/site.json');
  const siteToCopy = JSON.parse(siteData);

  const oauth = await fs.readdir(importDir + '/oauth');

  const oauthClients = await Promise.all(oauth.map(async filename => {
    const result = await fs.readFile(importDir + '/oauth/' + filename);

    const key = filename.replace(/.json$/, '');
    return {key, data: JSON.parse(result.toString())};
  }));

  const apiDir = await fs.readdir(importDir + '/api');
  const choiceGuides = await Promise.all(
    apiDir.filter(filename => filename.match(/^choicesguide-/)).map(async filename => {
      const result = await fs.readFile(importDir + '/api/' + filename);

      return JSON.parse(result.toString());
    })
  );
  const cmsAttachments = await fs.readdir(importDir + '/attachments');

  return new SiteData(siteToCopy, choiceGuides, cmsAttachments, importDir + '/mongo', oauthClients);

};

/**
 * Create new Openstad project
 * @param user
 * @param newSite
 * @param apiData
 * @param cmsData
 * @param oauthData
 *
 * @returns {Promise<*>}
 */
exports.createSite = async ({ user, dataDir, newSite, apiData, cmsData, oauthData }) => {

  console.log('CREATE');
  
  try {

    function sleep(ms) {
      return new Promise(resolve => setTimeout(resolve, ms));
    }

    // in case localhost domain skip the DNS lookup, will otherwise fail
    const isDomainUp = newSite.getDomain().includes('localhost') ? true : await lookupDns(newSite.getDomain(), 3000);

    await validateInput(apiData, oauthData, cmsData);

    let err = await cmsProvider.renameAttachments({ cmsData, domain: apiData.site.domain, attachmentsDir: `${dataDir}/attachments`, mongoPath: cmsData.mongoPath });
    if (err) throw err;

    const oauthClients = await oauthProvider.createOauth(newSite, oauthData.clients);
    await cmsProvider.importCmsDatabase(newSite, cmsData.mongoPath);
    const site = await apiProvider.createSite(newSite, apiData.site, oauthClients);
    await cmsProvider.renameSiteTitleInDatabase(newSite);

    if (apiData.choiceGuides) {
      await apiProvider.createChoiceGuides(site.id, apiData.choiceGuides);
    }

    if (apiData.site.config.oauth.default.id) {
      await oauthProvider.makeUserSiteAdmin(user.externalUserId, apiData.site.config.oauth.default.id);
    }

    console.log('Waiting for cms to restart');

    await sleep(3000);

    if (isDomainUp && cmsData.attachments && cmsData.attachments.length > 0) {
      const frontendUploadUrl = process.env.FRONTEND_URL; // Use the default frontend url for now because the new site doesn't have an ingress yet
      //const frontendUploadDomain = 'https://' + newSite.getDomain();
      try {
        let response = await cmsProvider.uploadAttachments({ targetUrl: frontendUploadUrl, attachmentsDir: `${dataDir}/attachments`, attachments: cmsData.attachments });;
      } catch(err) {
        console.log('Error while uploading the images', err); // TypeError: failed to fetch
      }
    }

    // Try to remove import files
    // try {
    //   removeFolderRecursive(dataDir);
    // } catch(error) {
    //   console.error('Error removing tmp dir for uploading', error);
    // }

    //only create ingress for domain, subdirs run under an existing domain already ??? or check if domain ingress exists
    if (process.env.KUBERNETES_NAMESPACE) {
      try {

       // await k8Ingress.add(newSite);

        // Todo: Move this to the a cronjob (api or admin).
        //const domainIp = await lookupDns(newSite.getDomain(), 2000);

        //if(process.env.PUBLIC_IP === domainIp) {

        //}
      } catch(error) {
        console.error(error);
      }
    }

    return site;
  } catch (error) {
    //Todo: rollback created entities?
    // Get oauth clients and remove them
    // Get api site and remove if exists
    // Get choiceguides and remove if exists
    console.log('Mislukt');
    console.error(error);
    throw error;
  }
};


exports.copyUsersOfSite = async (siteIdToCopy, newSiteId) => {
  console.log(`Copying users and rights from site with id ${siteIdToCopy} to site with id ${newSiteId}`);
  await oauthProvider.copyUsersFromSite(siteIdToCopy, newSiteId);
};

const validateInput = async (apiData, oauthData, cmsData) => {
  console.log('validateInput', apiData, oauthData, cmsData);

  if (!cmsData.mongoPath) {
    console.log('No mongo path found');
    throw new Error('No mongo path found');
  }

  const mongoFiles = await fs.readdir(cmsData.mongoPath);
  if(mongoFiles.length === 0) {
    console.log('No mongo path empty');

    throw new Error('No mongo path is empty');
  }

  if (!apiData.site || !apiData.site.config) {
    console.log('Site or site config is empty');

    throw new Error('Site or site config is empty');
  }
  if (!oauthData || !oauthData.clients) {
    console.log('No Oauth clients found');

    throw new Error('No Oauth clients found');
  }

  // Todo: check if there are images and the frontend url is available
  if(cmsData.attachments && cmsData.attachments.length > 0) {
    // in case of localhost, skip the DNS check, will fail
    const frontendIsUp = process.env.FRONTEND_URL.includes('localhost') ? true : await lookupDns(process.env.FRONTEND_URL, 10000);

    if(frontendIsUp === false) {
      console.log('Frontend url (${process.env.FRONTEND_URL}) is not reachable');

      throw new Error(`Frontend url (${process.env.FRONTEND_URL}) is not reachable`);
    }
  }

  return true;
};
