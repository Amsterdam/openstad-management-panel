FROM node:16.16.0-alpine

# Label for tracking
LABEL nl.openstad.container="admin" nl.openstad.version="0.0.1-beta" nl.openstad.release-date="2020-05-07"

ENV PORT=7777
# site Id from the openstad api
ENV SITE_ID=1
ENV RODUCTION_SERVER_IP=""
ENV WILDCARD_HOST=""
ENV API_URL=""
ENV APP_URL=""
ENV USER_API=""
ENV USER_API=USER_API_CLIENT_ID=""
ENV USER_API_CLIENT_SECRET=""
ENV COOKIE_SECURE_OFF=""
ENV SESSION_SECRET=""
ENV SITE_API_KEY=""
ENV BASIC_AUTH_USER=""
ENV BASIC_AUTH_PASSWORD=""
ENV PUBLIC_IP=""

# Install all base dependencies.
RUN apk add --no-cache --update g++ make python3 musl-dev bash mongodb-tools

# Set the working directory to the root of the container
WORKDIR /home/app

# Bundle app source
COPY . /home/app

#
RUN npm config set unsafe-perm true

# Install all npm packages
RUN npm install --legacy-peer-deps

RUN npm install -g nodemon

# Remove unused packages only used for building.
RUN apk del g++ make && rm -rf /var/cache/apk/*


# Owner rights for node user
RUN chown -R node:node /home/app*

USER node

# Exposed ports for application
EXPOSE 7777/tcp
EXPOSE 7777/udp

# Run the application
CMD [ "npm", "start" ]
