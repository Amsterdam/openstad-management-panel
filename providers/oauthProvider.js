const fetch = require('node-fetch');
const userClientApi = require('../services/userClientApi');
const siteApi = require('../services/siteApi');
const userApi = require('../services/userApi');

const protocol = process.env.FORCE_HTTP ? 'http' : 'https';

/**
 * Get oauth client data
 *
 * @param oauthConfig
 *
 * @returns {Promise<[{key: string, data} , any , any , any , any , any , any , any , any , any]>}
 */
exports.getData = async (oauthConfig) => {
  const promises = Object.keys(oauthConfig).map(async key => {
    return {
      key,
      data: await userClientApi.fetch(oauthConfig[key]['auth-client-id'])
    };
  });

  return await Promise.all(promises)
};

/**
 * Create new oauth clients
 *
 * @param newSite
 * @param oauthData
 *
 * @returns {Promise<void>}
 */
exports.createOauth = async (newSite, oauthData) => {
  console.log('creating oauth clients',  newSite.getTitle());
  const clients = {};

  if (oauthData.length === 0) {
    // Create default clients
    oauthData = [
      {
        key: 'default',
        data: {
          name: newSite.getTitle(),
          authTypes: ['Url'],
          description: '',
          requiredUserFields: ["firstName", "lastName", "email"],
          twoFactorRoles: process.env.TURN_OFF_2FA_FOR_NEW_SITE === 'true' || process.env.TURN_OFF_2FA_FOR_NEW_SITE === true ? [] : ["admin", "moderator", "editor"]
        }
      },
      {
        key: 'anonymous',
        data: {
          name: newSite.getTitle(),
          authTypes: ['Anonymous'],
          description: '',
          requiredUserFields: ["postcode"],
        }
      }
    ]
  }

  await Promise.all(oauthData.map(async (oauth) => {
    const {data, key} = oauth;

    const authConfig = data.config || {};
    authConfig.backUrl = newSite.getDomainWithProtocol();
    authConfig.fromEmail = newSite.getFromEmail();
    authConfig.fromName = newSite.getFromName();
    authConfig.contactEmail = newSite.getFromEmail();
    
    authConfig.authTypes = authConfig.authTypes ? authConfig.authTypes : {};

    const client = {
      name: newSite.getTitle(),
      description: data.description,
      authTypes: data.authTypes,
      requiredUserFields: data.requiredUserFields,
      exposedUserFields: data.exposedUserFields || [],
      twoFactorRoles: process.env.TURN_OFF_2FA_FOR_NEW_SITE === 'true' || process.env.TURN_OFF_2FA_FOR_NEW_SITE === true ? [] : ["admin", "moderator", "editor"],
      siteUrl: newSite.getDomainWithProtocol(),
      redirectUrl: newSite.getDomainWithProtocol(),
      allowedDomains: [
        newSite.getBaseDomain(),
        new URL(process.env.API_URL).hostname,
      ],
      config: authConfig,
    };

    if (client.config && client.config.backUrl) {
      client.config.backUrl = client.config.backUrl.replace(/^https?:\/\/[^\/]+/, protocol + '://' + newSite.getDomain());
    }
    const result = await userClientApi.create(client);

    return clients[key] = {
      'id': result.id,
      'auth-client-id': result.clientId,
      'auth-client-secret': result.clientSecret,
    };
  }));

  return clients;
};

/**
 * Make user site admin
 * @param externalUserId
 * @param oauthDefaultId
 *
 *  @returns {*|Promise}
 */
exports.makeUserSiteAdmin = (externalUserId, oauthDefaultId) => {
  console.log('make user site admin');
  const url = process.env.USER_API + '/api/admin/user/' + externalUserId;
  const body = {
    client_id: process.env.USER_API_CLIENT_ID,
    client_secret: process.env.USER_API_CLIENT_SECRET,
    roles: {},
  };
  // Todo: is admin role always 1???
  body.roles[oauthDefaultId] = 1;

  // Todo: check admin role
  // Todo: check if clientId exists
  // Todo: check if user got admin role.

  return fetch(
    url,
    {
      headers: {"Content-type": "application/json"},
      method: 'POST',
      body: JSON.stringify(body)
    });
};


exports.copyUsersFromSite = async (oldSiteId, newSiteId) => {
  const oldSite = await siteApi.fetch(oldSiteId);
  const oldClientId = oldSite.config?.oauth?.default?.['auth-client-id'];
  const oldClient = await userClientApi.fetch(oldClientId, true, []);
  const usersOfOldSite = oldClient.userRoles;

  const newSite = await siteApi.fetch(newSiteId);
  const newClientId = newSite.config?.oauth?.default?.id;
  
  const requests = usersOfOldSite.map((userRole) => {
    console.log(`Adding userrole to client with id: ${newClientId}, userId: ${userRole.userId} and roleId: ${userRole.roleId}`);
    let body = {roles:{}};
    body.roles[newClientId] = userRole.roleId;
    return userApi.update(userRole.userId, body);
  });
  await Promise.all(requests)
};
