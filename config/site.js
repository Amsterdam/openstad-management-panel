const whitelistedEmails = process.env.WHITELISTED_EMAILS.split('\n').slice(0, -1);

exports.configSchema = {
  project: [
    {
      key: 'endDate',
      type: 'date',
      default: null,
      label: "Project end date"
    },
  ],

  anonymize: [
    {
      key: 'anonymizeUsersXDaysAfterEndDate',
      type: 'number',
      default: 60,
      label: "Anonymize users x days after the project end date"
    },
    {
      key: 'warnUsersAfterXDaysOfInactivity',
      type: 'number',
      default: 770,
      label: "Warn users after x days of inactivity",
    },
    {
      key: 'anonymizeUsersAfterXDaysOfInactivity',
      type: 'number',
      default: 860,
      label: "Anonymize Users after x days of inactivity"
    },
  ],

  inactiveWarningEmail: [
    {
      parentKey: 'anonymize',
      key: 'subject',
      type: 'string',
      default: '',
      label: 'Subject line'
    },
    {
      parentKey: 'anonymize',
      key: 'template',
      type: 'string',
      default: '',
      textarea: true,
      label: 'Template (variables available)'
    },
  ],

  basicAuth: [
    {
      key: 'active',
      type: 'boolean',
      default: false,
      label: "Is active?"
    },
    {
      key: 'user',
      type: 'string',
      default: 'openstad',
      label: "Username"
    },
    {
      key: 'password',
      type: 'string',
      default: process.env.BASIC_AUTH_DEFAULT_PW,
      label: "Password"
    },
  ],
  ideas:  [
    {
      key: 'canAddNewIdeas',
      type: 'boolean',
      default: true,
      label: "Possible to send in ideas?"
    },
    {
      key: 'minimumYesVotes',
      type: 'number',
      default: 100,
      label: "Minimum votes needed for idea?"
    },
    {
      key: 'titleMinLength',
      type: 'number',
      default: 10,
      label: "Minimum length of title"
    },
    {
      key: 'titleMaxLength',
      type: 'number',
      label: "Maximum length of title"
    },
    {
      key: 'summaryMinLength',
      type: 'number',
      default: 20,
      label: "Minimum length of summary"
    },
    {
      key: 'summaryMaxLength',
      type: 'number',
      default: 140,
      label: "Maximum length of summary"
    },
    {
      key: 'descriptionMinLength',
      type: 'number',
      default: 140,
      label: "Minimum length of description"
    },
    {
      key: 'descriptionMaxLength',
      type: 'number',
      default: 5000,
      label: "Maximum length of description"
    },
  ],
  widgetDisplaySettings: [
    {
      parentKey: 'cms',
      key: 'beta',
      type: 'boolean', // todo: add type email/list of emails
      default: false,
      label: "Display beta widgets?"
    },
    {
      parentKey: 'cms',
      key: 'deprecated',
      type: 'boolean', // todo: add type email/list of emails
      default: false,
      label: "Display deprecated widgets?"
    },
  ],
  cms: [{
    key: 'redirectURI',
    type: 'string',
    default: '',
    label: "Redirect deze site naar"
  }],

  feedbackEmail: [
    {
      parentKey: 'ideas',
      key: 'from',
      type: 'dropdown',
      options: whitelistedEmails,
      default: whitelistedEmails[0],
      label: "From Address"
    },
    {
      parentKey: 'ideas',
      key: 'subject',
      type: 'string',
      default: '',
      label: 'Subject line'
    },
    {
      parentKey: 'ideas',
      key: 'template',
      type: 'string',
      default: '',
      textarea: true,
      label: 'Template (variables available)'
    },
  ],
  conceptEmail: [
    {
      parentKey: 'ideas',
      key: 'from',
      type: 'dropdown',
      options: whitelistedEmails,
      default: whitelistedEmails[0],
      label: "From Address"
    },
    {
      parentKey: 'ideas',
      key: 'subject',
      type: 'string',
      default: '',
      label: 'Subject line'
    },
    {
      parentKey: 'ideas',
      key: 'template',
      type: 'string',
      default: '',
      textarea: true,
      label: 'Template (variables available)'
    },
  ],
  conceptToPublishedEmail: [
    {
      parentKey: 'ideas',
      key: 'from',
      type: 'dropdown',
      options: whitelistedEmails,
      default: whitelistedEmails[0],
      label: "From Address"
    },
    {
      parentKey: 'ideas',
      key: 'subject',
      type: 'string',
      default: '',
      label: 'Subject line'
    },
    {
      parentKey: 'ideas',
      key: 'template',
      type: 'string',
      default: '',
      textarea: true,
      label: 'Template (variables available)'
    },
  ],
  categories: [
    {
      key: 'themes',
      type: 'array',
      default: false,
      label: 'Themes (comma seperated)'
    },
    {
      key: 'areas',
      type: 'array',
      default: false,
      label: 'Areas (comma seperated)'
    },
  ],
  newslettersignup: [
    {
      key: 'isActive',
      type: 'boolean',
      default: false,
      label: 'Is active?'
    }
  ],
  notifications : [
    {
      key: 'fromAddress',
      type: 'dropdown',
      options: whitelistedEmails,
      default: whitelistedEmails[0],
      label: 'From e-mail address',
      trim: true,
    },
    {
      key: 'projectmanagerAddress',
      type: 'string',
      default: '',
      label: 'Projectmanager email address',
      trim: true,
      validation: [
        {
          name: 'pattern',
          value: /.*/ // email is almost impossible to validate with a regex
        }
      ]
    },
    {
      key: 'siteadminAddress',
      type: 'string',
      default: '',
      label: 'Site Admin email address',
      trim: true,
      validation: [
        {
          name: 'pattern',
          value: /.*/ // email is almost impossible to validate with a regex
        }
      ]
    },
  ],
  vimeo : [
    {
      key: 'clientId',
      type: 'string',
      default: '',
      label: 'Vimeo client id'
    },
    {
      key: 'secret',
      type: 'string',
      default: '',
      label: 'Vimeo secret id'
    },
    {
      key: 'accessToken',
      type: 'string',
      default: '',
      label: 'Access Token'
    },
  ],
  votes: [
    {
      key: 'isViewable',
      type: 'boolean',
      default: false,
      label: 'Is the vote count publicly available?'
    },
    {
      key: 'isActive',
      type: 'boolean',
      default: null,
      label: 'Is voting active?'
    },
    /*{
      key: 'isActiveFrom',
      type: 'string',
      default: '',
      label: 'Is voting active?'
    },
    {
      key: 'isActiveTo',
      type: 'string',
      default: '',
    },
    {
      key: 'requiredUserRole',
      type: 'string',
      default: 'member',
      label: 'Is voting active?'
    },*/
    {
      key: 'withExisting',
      type: 'select',
      values: [
        {
          value: 'error',
          label: 'Error',
        },
        {
          value: 'replace',
          label: 'Replace the vote',
        }
      ],
      default: 'error',
      label: 'Should voting again replace previous vote? Or give an error?'
    },
    {
      key: 'requiredUserRole',
      type: 'select',
      values: [
        {
          value: 'anonymous',
          label: 'Anonymous',
        },
        {
          value: 'member',
          label: 'Member',
        }
      ],
      default: 'member',
      label: 'For what user should voting be allowed?'
    },
    {
      key: 'voteType',
      type: 'select',
      values: [
        {
          value: 'likes',
          label: 'Likes'
        },
        {
          value: 'count',
          label: 'Count'
        },
        {
          value: 'budgeting',
          label: 'Budgeting'
        },
        {
          value: 'count-per-theme',
          label: 'Count per theme '
        },
        {
          value: 'budgeting-per-theme',
          label: 'Budgeting per theme'
        },
      ],
      default: 'likes',
      label: 'What type of voting is available?'
    },
    /*{
      key: 'voteValues',
      type: 'arrayOfObjects',
      default: [
        {
          label: 'voor',
          value: 'yes'
        },
        {
          label: 'tegen',
          value: 'no'
        },
      ],
    },*/
    {
      key: 'maxIdeas',
      type: 'number',
      default: 1,
      label: 'What is max amount of ideas users can vote for?'
    },
    {
      key: 'minIdeas',
      type: 'number',
      default: 1,
      label: 'What is min amount of ideas users can vote for?'
    },
    {
      key: 'minBudget',
      type: 'number',
      label: 'What is min budget users can vote for?'
    },
    {
      key: 'maxBudget',
      type: 'number',
      label: 'What is max budget users can vote for?'
    },

  ],
  ingress: [
    {
      key: 'www',
      type: 'boolean',
      label: 'Also make an ingress for the www. (make sure DNS is set to the server)'
    },
    {
      key: 'tlsSecretName',
      type: 'string',
      label: 'Name of the TLS secret in Kubernetes (will disable let\'s encrypt and use the TLS secret for SSL)'
    },
    {
      key: 'disabled',
      type: 'boolean',
      label: 'Disable creating an auto ingress for this site? (will delete it if it exists?)'
    },

  ]
/*  ignoreBruteForce : [

]*/
};
