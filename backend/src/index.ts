/**
 * Express Server Entry Point
 * Initializes Express app with all middleware and routes
 */

import express from 'express'
import cors from 'cors'
import cookieParser from 'cookie-parser'
import helmet from 'helmet'
import compression from 'compression'
import morgan from 'morgan'
import dotenv from 'dotenv'
import type { Request, Response, NextFunction } from 'express'

// Load environment variables
dotenv.config()

// Import routes and middleware
import authRoutes from './routes/auth'
import demandsRoutes from './routes/demands'
import supplyRoutes from './routes/supply'
import escrowRoutes from './routes/escrow'
import aggregationRoutes from './routes/aggregation'
import logisticsRoutes from './routes/logistics'
import qualityAuditRoutes from './routes/qualityAudit'
import { authMiddleware, optionalAuthMiddleware } from './middleware/auth'
import { AppError, isAppError } from './utils/errors'

// Initialize Express app
const app = express()

/**
 * Trust proxy - important for production deployments
 */
app.set('trust proxy', 1)

/**
 * Security Middleware
 */
app.use(helmet())

/**
 * CORS Configuration
 */
const allowedOrigins = [
  process.env.FRONTEND_URL || 'http://localhost:3000',
  'http://localhost:3000',
  'http://localhost:3001',
]

if (process.env.NODE_ENV === 'production') {
  allowedOrigins.push(process.env.PRODUCTION_FRONTEND_URL || '')
}

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true)
      } else {
        callback(new Error('Not allowed by CORS'))
      }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    maxAge: 86400, // 24 hours
  })
)

/**
 * Request Parsing Middleware
 */
app.use(express.json({ limit: '10mb' }))
app.use(express.urlencoded({ extended: true, limit: '10mb' }))
app.use(cookieParser())

/**
 * Compression Middleware
 */
app.use(compression())

/**
 * Logging Middleware
 */
if (process.env.NODE_ENV !== 'test') {
  app.use(
    morgan(':method :url :status :response-time ms - :res[content-length]')
  )
}

/**
 * Request Timing Middleware
 */
app.use((req: Request, res: Response, next: NextFunction) => {
  const startTime = Date.now()
  
  res.on('finish', () => {
    const duration = Date.now() - startTime
    // Log slow requests (> 1s)
    if (duration > 1000) {
      console.warn(
        `Slow request: ${req.method} ${req.path} took ${duration}ms`
      )
    }
  })
  
  next()
})

/**
 * Health Check Endpoint
 */
app.get('/health', (req: Request, res: Response) => {
  res.json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV,
  })
})

/**
 * API Routes — Demand-First Supply Chain
 */
app.use('/auth', authRoutes)
app.use('/api/demands', demandsRoutes)
app.use('/api/supply', supplyRoutes)
app.use('/api/escrow', escrowRoutes)
app.use('/api/aggregation', aggregationRoutes)
app.use('/api/logistics', logisticsRoutes)
app.use('/api/quality', qualityAuditRoutes)

/**
 * Protected API Routes
 */
app.use('/api', optionalAuthMiddleware)

/**
 * 404 Handler
 */
app.use((req: Request, res: Response) => {
  res.status(404).json({
    error: {
      message: 'Resource not found',
      code: 'NOT_FOUND',
      path: req.path,
    },
  })
})

/**
 * Global Error Handler
 */
app.use(
  (error: Error, req: Request, res: Response, next: NextFunction) => {
    // Log error
    console.error('Error:', {
      message: error.message,
      stack: error.stack,
      url: req.url,
      method: req.method,
    })

    // Handle AppError
    if (isAppError(error)) {
      const response = error.toJSON()
      res.status(error.statusCode).json(response)
      return
    }

    // Handle CORS errors
    if (error.message === 'Not allowed by CORS') {
      res.status(403).json({
        error: {
          message: 'CORS policy violation',
          code: 'CORS_ERROR',
        },
      })
      return
    }

    // Handle other errors
    res.status(500).json({
      error: {
        message: 'Internal server error',
        code: 'INTERNAL_ERROR',
        ...(process.env.NODE_ENV === 'development' && {
          details: error.message,
        }),
      },
    })
  }
)

/**
 * Start Server
 */
const PORT = process.env.PORT || process.env.BACKEND_PORT || 3001
const HOST = process.env.BACKEND_HOST || 'localhost'

const server = app.listen(PORT, () => {
  console.log(`
    ╔═══════════════════════════════════════╗
    ║   AgriKart Backend Server Running     ║
    ╠═══════════════════════════════════════╣
    ║ URL:         http://${HOST}:${PORT}      
    ║ Environment: ${process.env.NODE_ENV || 'development'}
    ║ Auth:        ${process.env.SUPABASE_URL ? '✓' : '✗'} Supabase configured
    ╚═══════════════════════════════════════╝
  `)
})

/**
 * Graceful Shutdown
 */
process.on('SIGTERM', () => {
  console.log('SIGTERM signal received: closing HTTP server')
  server.close(() => {
    console.log('HTTP server closed')
    process.exit(0)
  })
})

process.on('SIGINT', () => {
  console.log('SIGINT signal received: closing HTTP server')
  server.close(() => {
    console.log('HTTP server closed')
    process.exit(0)
  })
})

/**
 * Unhandled Promise Rejection Handler
 */
process.on('unhandledRejection', (reason: Error, promise: Promise<any>) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason)
})

/**
 * Uncaught Exception Handler
 */
process.on('uncaughtException', (error: Error) => {
  console.error('Uncaught Exception:', error)
  // Exit process on uncaught exception
  process.exit(1)
})

export default app
