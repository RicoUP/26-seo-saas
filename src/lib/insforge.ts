import { createClient } from '@insforge/sdk'

const client = createClient({
    baseUrl: 'https://zchqu92m.eu-central.insforge.app',
    anonKey: 'ik_06ed0677bd5537902ae618a8442c0db8',
})

export default client
export const { auth, database, storage, functions: edgeFunctions } = client
