const tar = require('tar');
const fs = require('fs').promises;
const fetch = require('node-fetch');

/**
 * Handle and extract import file
 * - check if fileUrl isset then download the file
 * - otherwise assume file is upload and use multer to process local upload
 * @param newSite
 * @param file
 * @param fileUrl
 * @returns {Promise<*>}
 */
exports.handleImportFile = async (newSite, file, fileUrl) => {

  if (fileUrl) {

    const fileContent = await fetch(fileUrl);
    file = {
      originalname: newSite.getUniqueSiteId() + '.tgz', // get file name from url
      buffer: await fileContent.buffer()
    }
  }

  const filename = newSite.getTmpDir() + '/' + file.originalname;

  // createImportDir
  await fs.mkdir(newSite.getTmpDir());

  //writeFileToImportDir
  await fs.writeFile(filename, file.buffer);

  //untar import file
  await tar.extract(
    {
      cwd: newSite.getTmpDir(),
      file: filename,
    });

  return newSite.getTmpDir();
};
