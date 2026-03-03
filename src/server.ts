import { createServer } from 'node:http'
import { parse } from 'node:url'
import next from 'next'

const dev = process.env.NODE_ENV !== 'production'
const hostname = process.env.HOSTNAME || 'localhost'
const port = parseInt(process.env.PORT || '3000', 10)

const app = next({ dev, hostname, port })
const handle = app.getRequestHandler()

void app.prepare().then(() => {
  createServer(async (req, res) => {
    try {
      const parsedUrl = parse(req.url!, true)
      await handle(req, res, parsedUrl)
    } catch (err) {
      console.error('Error handling request:', err)
      res.statusCode = 500
      res.end('Internal Server Error')
    }
  }).listen(port, () => {
    console.log(`> Payload + Next.js ready on http://${hostname}:${port}`)
    console.log(`> Admin panel: http://${hostname}:${port}/admin`)
    console.log(`> Environment: ${dev ? 'development' : 'production'}`)
  })
})
