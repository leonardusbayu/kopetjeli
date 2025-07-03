const path = require('path')
const i18next = require('i18next')
const Backend = require('i18next-fs-backend')
const { handle: i18nHandle, LanguageDetector } = require('i18next-http-middleware')

let i18nInstance = null
let middlewareInstance = null

async function initializeI18n(config = {}) {
  const {
    localesDirectory = path.join(process.cwd(), 'locales'),
    defaultLocale = 'en',
    supportedLocales = [defaultLocale],
    detection = {},
    saveMissing = false,
    debug = false,
    namespaces = ['translation'],
    defaultNS = 'translation'
  } = config

  const loadPath = path.join(localesDirectory, '{{lng}}', '{{ns}}.json')
  const backendOptions = { loadPath }
  if (saveMissing) {
    backendOptions.addPath = path.join(localesDirectory, '{{lng}}', 'missing.json')
  }

  const instance = i18next.createInstance()
  instance.use(Backend).use(LanguageDetector)

  try {
    await instance.init({
      backend: backendOptions,
      fallbackLng: defaultLocale,
      supportedLngs: supportedLocales,
      preload: supportedLocales,
      ns: namespaces,
      defaultNS,
      detection: {
        order: ['querystring', 'cookie', 'header'],
        caches: ['cookie'],
        ...detection
      },
      saveMissing,
      debug,
      interpolation: { escapeValue: false }
    })
  } catch (err) {
    console.error('Error initializing i18n:', err)
    throw err
  }

  i18nInstance = instance
  middlewareInstance = i18nHandle(instance)
  return instance
}

function translate(key, options = {}) {
  if (!i18nInstance || !i18nInstance.isInitialized) {
    throw new Error('i18n not initialized. Call initializeI18n first.')
  }
  return i18nInstance.t(key, options)
}

function i18nMiddleware(req, res, next) {
  if (!middlewareInstance) {
    throw new Error('i18n middleware not initialized. Call initializeI18n first.')
  }
  return middlewareInstance(req, res, next)
}

module.exports = {
  initializeI18n,
  translate,
  i18nMiddleware
}