const lockMw = require('../middleware/lock');
const lockApiService = require('../services/lockApi');

module.exports = function(app){

  /**
   * Delete a locks
   */
  app.get(
    '/admin/locks/:lockId(\\d+)/delete',
    async (req, res) => {
      lockApiService
        .delete(req.params.lockId)
        .then((locks) => {
          req.flash('succes', { msg: 'Lock verwijderd'});
          console.log('Ok');
          req.session.save( () => {
            res.redirect('/admin/locks');
          });
        })
        .catch((err) => {
          req.flash('error', { msg: 'Verwijderen van de lock is mislukt!'});
          console.log('ERROR');
          console.log(err);
          req.session.save( () => {
            res.redirect('/admin/locks');
          });
        });

    }
  );

  /**
   * Overview of lockss
   */
  app.get(
    '/admin/locks',
    lockMw.withAll,
    async (req, res) => {
      req.locks.map( lock => lock.createdAtHumanized = new Date(lock.createdAt).toLocaleString("nl-NL").replace(/(\d+:\d+):\d+$/, '$1') )
      res.render('locks/overview.html', {
        locks: req.locks,
        appUrl: process.env.APP_URL
      });
    }
  );

}
