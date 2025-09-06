// Simple in-memory configuration store
// In production, you'd want to use a database or Redis

interface Config {
  pageId: string
  pageName: string
  formId: string
  formName: string
  webhookUrl: string
  accessToken: string
}

// Store configuration in memory (resets on app restart)
let globalConfig: Config | null = null

export function setConfig(config: Config) {
  globalConfig = config
  console.log('Configuration stored:', {
    pageId: config.pageId,
    pageName: config.pageName,
    formId: config.formId,
    webhookUrl: config.webhookUrl
  })
}

export function getConfig(): Config | null {
  return globalConfig
}

export function clearConfig() {
  globalConfig = null
  console.log('Configuration cleared')
}