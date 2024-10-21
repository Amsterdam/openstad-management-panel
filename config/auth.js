const formatLoginUrl = (slug) => {
    return `/auth/${slug}/login`;
}

const formatRegisterUrl = (slug) => {
    return `/auth/${slug}/register`;
}

let types = [
    {
        key: 'UniqueCode',
        label: 'Unieke code',
        isAuthMethod: true,
        fields: [
            {
                label: 'Title',
                key: 'title',
                default: 'Controleer stemcode',
                type: 'text'
            },
            {
                label: 'Description',
                key: 'description',
                default: 'Vul hieronder je unieke code in om een OpenStad account aan te maken. Deze code heb je thuis gestuurd gekregen van ons.',
                type: 'textarea'
            },
            {
                label: 'Label for input field',
                key: 'label',
                default: 'Mijn stemcode',
                type: 'text',
            },
            {
                label: 'Button text',
                key: 'buttonText',
                default: 'Controleer stemcode',
                type: 'text'
            },
            {
                label: 'Help text',
                key: 'helpText',
                default: 'Let op, de unieke code is hoofdlettergevoelig! Werkt deze nog steeds niet? <a href="mailto:info@openstad.nl">Neem contact met ons op.</a>',
                type: 'textarea',
            },
            {
                label: 'Error message',
                key: 'errorMessage',
                default: 'Vul een geldige stemcode in. Heb je een typefout gemaakt? Stemcodes zijn hoofdlettergevoelig.',
                type: 'textarea',
            }
        ]
    },
    /*
    {
      key: 'Local',
      label: 'Inlog via Wachtwoord',
      isAuthMethod: true,
      fields : [
        {
          label: 'Title',
          key: 'title',
          default: 'Inloggen',
          type: 'text'
        },
      ],
    },
    */
    {
        key: 'Url',
        label: 'E-mail een inloglink',
        isAuthMethod: true,
        loginUrl: formatLoginUrl('url'),
        fields: [
            {
                label: 'Title',
                key: 'title',
                default: 'Registreren of inloggen',
                type: 'text'
            },
            {
                label: 'Description',
                key: 'description',
                default: 'Om verder te gaan vul je hieronder je emailadres in. Je ontvangt dan per email een link waarmee je kunt inloggen of je registratie voltooien.',
                type: 'textarea'
            },
            {
                label: 'Label',
                key: 'label',
                default: 'E-mailadres',
                type: 'text'
            },
            {
                label: 'Button text',
                key: 'buttonText',
                default: 'Stuur link',
                type: 'text'
            },
            {
                label: 'Help text',
                key: 'helpText',
                default: 'Stuur link',
                type: 'textarea'
            },
            {
                label: 'E-mail subject ',
                key: 'emailSubject',
                default: 'Login via deze e-mail',
                type: 'text'
            },
            {
                label: 'E-mail Template  ',
                info: ' <button class="btn btn-secondary" data-target="#loginModal" data-toggle="modal" type="button">More info on the E-mail Template</button>',
                key: 'emailTemplate',
                default: '',
                type: 'textarea'
            },
        ]
    },

];


console.log('EXPERIMENTAL_AUTH_TYPES', process.env.EXPERIMENTAL_AUTH_TYPES)

if (process.env.EXPERIMENTAL_AUTH_TYPES === 'ON') {
    types = types.concat([{
        key: 'Phonenumber',
        label: 'SMS verification',
        isAuthMethod: true,
        fields: [
            {
                label: 'Title for the first screen',
                key: 'loginTitle',
                default: '',
                type: 'text'
            },
            {
                label: 'Subtitle for the  first screen',
                key: 'loginSubtitle',
                default: '',
                type: 'text'
            },
            {
                label: 'Description for the first screen',
                key: 'loginDescription',
                default: '',
                type: 'textarea'
            },
            {
                label: 'Label for the first screen',
                key: 'loginLabel',
                default: '',
                type: 'text'
            },
            {
                label: 'Button text for the first screen',
                key: 'buttonText',
                default: '',
                type: 'text'
            },
            {
                label: 'Help text for the first screen',
                key: 'loginHelpText',
                default: '',
                type: 'textarea'
            },

            {
                label: 'Title for the second screen',
                key: 'smsCodeTitle',
                default: '',
                type: 'text'
            },
            {
                label: 'Sub Title for the second screen',
                key: 'smsCodeSubtitle',
                default: '',
                type: 'text'
            },
            {
                label: 'Label for the second screen',
                key: 'smsCodeLabel',
                default: '',
                type: 'text'
            },
            {
                label: 'Button text for the second screen',
                key: 'smsCodeButtonText',
                default: '',
                type: 'text'
            },
            {
                label: 'Help text for the second screen',
                key: 'smsCodeHelpText',
                default: '',
                type: 'textarea'
            },
            {
                label: 'Sender for SMS (Default: OpenStad)',
                key: 'smsCodeSender',
                default: '',
                type: 'text'
            },
            {
                label: 'Text for SMS (Default: Code: [[code]])',
                key: 'smsCodeText',
                default: '',
                type: 'text'
            },
        ],
    },
        {
            key: 'Local',
            label: 'Password auth',
            isAuthMethod: true,
            fields: [
            ],
        },
    ])
}


const userFields = [
    {
        key: 'firstName',
        label: 'First name',
    },
    {
        key: 'lastName',
        label: 'Last name',
    },
    {
        key: 'email',
        label: 'Email address',
    },
    {
        key: 'phoneNumber',
        label: 'Phone number',
    },
    {
        key: 'streetName',
        label: 'Street name',
    },
    {
        key: 'houseNumber',
        label: 'House number',
    },
    {
        key: 'city',
        label: 'City',
    },
    {
        key: 'suffix',
        label: 'Suffix',
    },
    {
        key: 'postcode',
        label: 'Postcode',
    }
];

const userApiSettingFields = [
    {
        key: 'backUrl',
        type: 'string',
        default: '',
        label: "Where should back url point to?"
    },
    {
        key: 'fromEmail',
        type: 'dropdown',
        options: process.env.WHITELISTED_EMAILS.split('\n'),
        default: process.env.WHITELISTED_EMAILS.split('\n')[0],
        label: "Email address for outgoing emails"
    },
    {
        key: 'fromName',
        type: 'string',
        default: '',
        label: "Email sender name  for outgoing emails"
    },
    {
        key: 'contactEmail',
        type: 'string',
        default: '2',
        label: "E-mail address for users to contact"
    },
    {
        key: 'defaultRoleId',
        type: 'select',
        values: [
            {
                value: 2,
                label: 'Member',
            },
            {
                value: 3,
                label: 'Anonymous',
            },
        ],
        default: 2,
        label: "Default role a user gets when registering the first time"
    },
    {
        label: 'Email header image',
        key: 'emailHeaderImage',
        default: 'Aanvullende gegevens',
        type: 'image'
    }
];

const userApiRequiredFields = [
    {
        label: 'Title',
        key: 'title',
        default: 'Aanvullende gegevens',
        type: 'string'
    },
    {
        label: 'Description',
        key: 'description',
        default: 'Om verder te gaan hebben we nog wat extra gegevens nodig. ',
        type: 'string',
        textarea: true
    },
    {
        label: 'Button Text',
        key: 'buttonText',
        default: 'Ga verder',
        type: 'string'
    },
    {
        label: 'Help text',
        key: 'info',
        default: '',
        type: 'string',
        textarea: true
    }
];


const twoFactorValidateFields = [
    {
        label: 'Title',
        key: 'title',
        default: 'Valideer two factor token',
        type: 'string'
    },
    {
        label: 'Description',
        key: 'description',
        default: 'Vul de token in van je two factor authentication app.',
        type: 'string',
        textarea: true
    },
    {
        label: 'Button Text',
        key: 'buttonText',
        default: 'Valideer',
        type: 'string'
    },
    {
        label: 'Help text',
        key: 'info',
        default: '',
        type: 'string',
        textarea: true
    }
];

const twoFactorConfigureFields = [
    {
        label: 'Title',
        key: 'title',
        default: 'Configureer je two-factor app',
        type: 'string'
    },
    {
        label: 'Description',
        key: 'description',
        default: 'Voor het inloggen op deze site is het vereist om met een token te valideren.\n' +
            'Dit is nog niet geconfigureerd voor je account. Dit kun je nu eenmalig doen.\n' +
            'Om dit te kunnen doen is een authenticator app nodig voor je telefoon.\n' +
            'Dit kan met  de meeste authenticator apps die het "Time-based One-Time Password" protocol\n' +
            'ondersteunen. Dit zijn onder andere: Google Authenticator, Authy and Microsoft Authenticator.\n' +
            'Vervolgens kun je de QR code scannen in de app.\n' +
            'Nadat u dit gedaan heeft click je op bevestig configuratie.\n' +
            'Let op: hierna kun je niet meer terugkomen op dit scherm.',
        type: 'string',
        textarea: true
    },
    {
        label: 'Button Text',
        key: 'buttonText',
        default: 'Bevestig configuratie',
        type: 'string'
    },
]


const get = (key) => {
    return types.find(type => type.key === key);
}

console.log('types', types)

exports.userFields = userFields;
exports.types = types;
exports.get = get;
exports.userApiSettingFields = userApiSettingFields;
exports.userApiRequiredFields = userApiRequiredFields;
exports.twoFactorConfigureFields = twoFactorConfigureFields;
exports.twoFactorValidateFields = twoFactorValidateFields;


