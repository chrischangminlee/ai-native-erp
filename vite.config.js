import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// Custom plugin to handle API routes
const apiPlugin = () => {
  return {
    name: 'api-plugin',
    configureServer(server) {
      // Import API handlers
      server.middlewares.use(async (req, res, next) => {
        if (req.url.startsWith('/api/')) {
          try {
            const [, , endpoint] = req.url.split('/')
            const handlerPath = path.join(__dirname, 'api', `${endpoint.split('?')[0]}.js`)
            const handler = await import(handlerPath)
            
            // Mock req/res for the handler
            const mockReq = {
              method: req.method,
              query: Object.fromEntries(new URLSearchParams(req.url.split('?')[1] || ''))
            }
            
            const mockRes = {
              status: (code) => {
                res.statusCode = code
                return {
                  json: (data) => {
                    res.setHeader('Content-Type', 'application/json')
                    res.end(JSON.stringify(data))
                  }
                }
              }
            }
            
            handler.default(mockReq, mockRes)
          } catch (error) {
            console.error('API Error:', error)
            res.statusCode = 500
            res.setHeader('Content-Type', 'application/json')
            res.end(JSON.stringify({ error: 'Internal server error' }))
          }
        } else {
          next()
        }
      })
    }
  }
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), apiPlugin()],
  base: '/'
})
