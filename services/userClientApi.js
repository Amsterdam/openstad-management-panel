const fetch = require('node-fetch');
const apiUrl = process.env.USER_API + '/api/admin';
const httpBuildQuery = require('../utils/httpBuildQuery')

const apiCredentials = {
    client_id:  process.env.USER_API_CLIENT_ID,
    client_secret: process.env.USER_API_CLIENT_SECRET,
}

const encodedCredentials = "Basic " + Buffer.from(apiCredentials.client_id+":"+apiCredentials.client_secret).toString('base64');

exports.fetch = async(clientId, withUserRoles=false, excludingRoles=[]) => {

  const excludingRolesParam = excludingRoles.join(',');

  try {
    let response = await fetch(`${apiUrl}/client/${clientId}?withUserRoles=${withUserRoles}&excludingRoles=${excludingRolesParam}`, {
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'Authorization': encodedCredentials
      },
      method: 'GET',
    })
    if (!response.ok) {
      console.log(response);
      throw new Error('Fetch failed')
    }
    return await response.json();
  } catch(err) {
    console.log(err);
  }

}

exports.fetchAll = async(params) => {

  const query = params ? httpBuildQuery(params) : '';

  try {
    let response = await fetch(`${apiUrl}/clients?${query}`, {
      headers: {
        'Accept': 'application/json',
        'Authorization': encodedCredentials
      },
      method: 'GET',
    })
    if (!response.ok) {
      console.log(response);
      throw new Error('Fetch failed')
    }
    return await response.json();
  } catch(err) {
    console.log(err);
  }

};


exports.create = async(data) => {

  try {
    let response = await fetch(`${apiUrl}/client`, {
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'Authorization': encodedCredentials
      },
      method: 'POST',
      body: JSON.stringify(data),
    })
    if (!response.ok) {
      console.log(response);
      throw new Error('Fetch failed')
    }
    return await response.json();
  } catch(err) {
    console.log(err);
  }

}

exports.update = async(clientId, data) => {

  try {
    let response = await fetch(`${apiUrl}/client/${clientId}`, {
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'Authorization': encodedCredentials
      },
      method: 'POST',
      body: JSON.stringify(data),
    })
    if (!response.ok) {
      console.log(response);
      throw new Error('Fetch failed')
    }
    return await response.json();
  } catch(err) {
    console.log(err);
  }

}

exports.delete = async(clientId) => {

  try {
    let response = await fetch(`${apiUrl}/client/${clientId}/delete`, {
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'Authorization': encodedCredentials
      },
      method: 'POST',
      body: '{}',
    })
    if (!response.ok) {
      console.log(response);
      throw new Error('Fetch failed')
    }
    return await response.json();
  } catch(err) {
    console.log(err);
  }

}
