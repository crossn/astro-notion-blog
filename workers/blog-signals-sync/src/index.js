import { syncReadSignals } from './sync.js'

export default {
  async scheduled(_controller, env) {
    console.log('blog read signals sync started')
    try {
      const result = await syncReadSignals(env)
      console.log(`GA rows received: ${result.received}`)
      console.log(`snapshot updated: ${result.saved}`)
    } catch {
      // Keep credential, token, and upstream response details out of Worker logs.
      console.error('blog read signals sync failed')
      throw new Error('blog read signals sync failed')
    }
  },
}
