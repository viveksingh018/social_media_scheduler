import { Zernio } from '@zernio/node'

const apiKey = process.env.ZERNIO_API_KEY || ""
if (!apiKey) {
  console.warn("Warning: ZERNIO_API_KEY is not set. Zernio API calls will fail.")
}

const zernio = new Zernio({
  apiKey,
  baseURL: "https://zernio.com/api"
})

export default zernio