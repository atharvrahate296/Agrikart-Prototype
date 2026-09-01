require('dotenv').config()
const express = require('express')
const cors = require('cors')
const http = require('http')
const { createClient } = require('@supabase/supabase-js')

// Initialize Express app
const app = express()
const server = http.createServer(app)

// Middleware
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true,
}))
app.use(express.json({ limit: '10mb' }))
app.use(express.urlencoded({ extended: true }))

// Supabase Client
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
)

// Health Check
app.get('/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date() })
})

// ─────────────────────────────────────────────────────────────────
// Feature Routes — SIH 26033 Demand-First Supply Chain
// ─────────────────────────────────────────────────────────────────
app.use('/aggregation', require('./src/routes/aggregation').default)
app.use('/logistics', require('./src/routes/logistics').default)
app.use('/quality-audit', require('./src/routes/qualityAudit').default)

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err)
  res.status(500).json({ error: 'Internal server error' })
})

// Start server
const PORT = process.env.PORT || 3001
server.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`)
  console.log(`✓ REST API available at http://localhost:${PORT}`)
  console.log(`✓ Demand-first supply chain routes active`)
})

module.exports = { app, server }
